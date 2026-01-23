import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setSentryUser } from '@/lib/sentry';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';

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

  const signInWithAppleAuth = async () => {
    // Only available on native iOS
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return { error: new Error('Sign in with Apple is only available on iOS devices') };
    }

    try {
      const options: SignInWithAppleOptions = {
        clientId: 'dev.matchgolf.app',
        redirectURI: 'https://matchgolf.dev',
        scopes: 'email name',
        state: 'signIn',
        nonce: generateNonce(),
      };

      const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);

      if (!result.response?.identityToken) {
        return { error: new Error('No identity token received from Apple') };
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: result.response.identityToken,
        nonce: options.nonce,
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

  return { user, session, loading, signUp, signIn, signOut, signInWithApple: signInWithAppleAuth };
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
