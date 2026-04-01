import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setSentryUser } from '@/lib/sentry';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { initializePurchases } from '@/services/purchases';
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

        // Update Sentry user context for error tracking
        if (session?.user) {
          setSentryUser({ id: session.user.id, email: session.user.email });

          // Initialize RevenueCat for in-app purchases on native platforms
          if (Capacitor.isNativePlatform()) {
            initializePurchases(session.user.id).catch(console.error);
          }
        } else {
          setSentryUser(null);
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
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      return { error };
    }
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

      // Update user metadata with Apple-provided name if available
      if (result.response.givenName || result.response.familyName) {
        const fullName = [result.response.givenName, result.response.familyName]
          .filter(Boolean)
          .join(' ');

        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName }
          });
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
