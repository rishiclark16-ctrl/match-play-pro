import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setSentryUser } from '@/lib/sentry';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { initializePurchases } from '@/services/purchases';
import { identifyUser, resetUser, capture } from '@/lib/posthog';
import { authRateLimiter, formatResetTime } from '@/lib/rateLimiter';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update Sentry + PostHog user context
        if (session?.user) {
          setSentryUser({ id: session.user.id, email: session.user.email });
          identifyUser(session.user.id, { email: session.user.email });

          // Initialize RevenueCat for in-app purchases on native platforms
          if (Capacitor.isNativePlatform()) {
            initializePurchases(session.user.id).catch(console.error);
          }
        } else {
          setSentryUser(null);
          resetUser();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Check rate limit using email as identifier (user not authenticated yet)
    const rateLimitResult = authRateLimiter.checkAndRecord(email.toLowerCase());
    if (!rateLimitResult.allowed) {
      const resetTime = formatResetTime(rateLimitResult.resetInMs);
      return {
        error: new Error(`Too many sign up attempts. Please try again in ${resetTime}.`)
      };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    if (!error) {
      capture('user_signed_up', { method: 'email' });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit using email as identifier (user not authenticated yet)
    const rateLimitResult = authRateLimiter.checkAndRecord(email.toLowerCase());
    if (!rateLimitResult.allowed) {
      const resetTime = formatResetTime(rateLimitResult.resetInMs);
      return {
        error: new Error(`Too many sign in attempts. Please try again in ${resetTime}.`)
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    // Remove all realtime subscriptions before signing out
    supabase.removeAllChannels();

    // Unregister this device's push token so a subsequent user on the same
    // device doesn't inherit notifications targeted at the previous user.
    try {
      const deviceToken = localStorage.getItem('device_push_token');
      if (deviceToken) {
        await supabase.from('device_tokens').delete().eq('token', deviceToken);
        localStorage.removeItem('device_push_token');
      }
    } catch {
      // Non-critical
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      return { error };
    }
    // Device_tokens rows cascade-delete from profiles; just clear the local marker.
    localStorage.removeItem('device_push_token');
    // Sign out locally after server-side deletion
    await supabase.auth.signOut();
    return { error: null };
  };

  const signInWithAppleAuth = async () => {
    // Only available on native iOS
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return { error: new Error('Sign in with Apple is only available on iOS devices') };
    }

    // Check rate limit using device identifier for Apple Sign In
    // Since we don't have email upfront, use a per-device fingerprint key
    // so one device's limit does not affect other users/devices
    const deviceFingerprint = `${navigator.userAgent}|${screen.width}|${screen.height}`;
    const deviceKey = `apple-sign-in-${deviceFingerprint}`;
    const rateLimitResult = authRateLimiter.checkAndRecord(deviceKey);
    if (!rateLimitResult.allowed) {
      const resetTime = formatResetTime(rateLimitResult.resetInMs);
      return {
        error: new Error(`Too many sign in attempts. Please try again in ${resetTime}.`)
      };
    }

    try {
      const rawNonce = generateNonce();
      const hashedNonce = await sha256(rawNonce);

      const options: SignInWithAppleOptions = {
        clientId: 'dev.matchgolf.app',
        redirectURI: 'https://matchgolf.dev',
        scopes: 'email name',
        state: 'signIn',
        nonce: hashedNonce,
      };

      const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);

      if (!result.response?.identityToken) {
        return { error: new Error('No identity token received from Apple') };
      }

      // Sign in to Supabase with the Apple identity token
      // Supabase needs the RAW nonce (it hashes internally to compare with Apple's token)
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        return { error };
      }

      // Detect first-time sign-in (sign up) by checking if created_at ≈ last_sign_in_at
      if (data.user?.created_at && data.user?.last_sign_in_at) {
        const createdMs = new Date(data.user.created_at).getTime();
        const lastSignInMs = new Date(data.user.last_sign_in_at).getTime();
        if (Math.abs(createdMs - lastSignInMs) < 60_000) {
          capture('user_signed_up', { method: 'apple' });
        }
      }

      // Persist the Apple-provided name. Apple delivers the name in the native
      // credential (not the identity-token JWT), so the handle_new_user trigger
      // has already created the profile row with a NULL name by this point.
      // Write the name to BOTH auth metadata and the profile row directly so
      // the user is searchable by name immediately. The profile UPDATE only
      // fills a NULL so a returning user's edited name is never clobbered.
      if (result.response.givenName || result.response.familyName) {
        const fullName = [result.response.givenName, result.response.familyName]
          .filter(Boolean)
          .join(' ')
          .trim();

        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName }
          });
          if (data.user?.id) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName })
              .eq('id', data.user.id)
              .is('full_name', null);
          }
        }
      }

      return { error: null };
    } catch (err) {
      // User cancelled or other error
      const errorObj = err as { message?: string; code?: string | number };
      if (errorObj?.message?.includes('cancelled') || errorObj?.code === '1001') {
        return { error: new Error('Sign in cancelled') };
      }
      return { error: err instanceof Error ? err : new Error('Sign in failed') };
    }
  };

  return { user, session, loading, signUp, signIn, signOut, deleteAccount, signInWithApple: signInWithAppleAuth };
}

// Generate a random nonce for Apple Sign In security
function generateNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// SHA-256 hash for Apple Sign In nonce
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
