import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  full_name: string | null;
  handicap: number | null;
  home_course_id: string | null;
  home_course_name: string | null;
  avatar_url: string | null;
  tee_preference: string | null;
  friend_code: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileUpdate {
  full_name?: string | null;
  handicap?: number | null;
  home_course_id?: string | null;
  home_course_name?: string | null;
  avatar_url?: string | null;
  tee_preference?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // Profile might not exist yet for new users
        if (fetchError.code === 'PGRST116') {
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            handicap: null,
            home_course_id: null,
            home_course_name: null,
            avatar_url: null,
            tee_preference: null,
            friend_code: null,
            email: user.email || null,
            phone: null,
            created_at: null,
            updated_at: null,
          });
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: ProfileUpdate): Promise<boolean> => {
    if (!user) return false;

    // Validate handicap if provided (valid range: -5 to 54)
    if (updates.handicap !== undefined && updates.handicap !== null) {
      const handicap = Number(updates.handicap);
      if (isNaN(handicap) || handicap < -5 || handicap > 54) {
        setError('Handicap must be between -5 and 54');
        return false;
      }
      // Round to one decimal place
      updates.handicap = Math.round(handicap * 10) / 10;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
      return false;
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError('Avatar image must be less than 5MB');
      return null;
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Avatar must be a JPEG, PNG, WebP, or GIF image');
      return null;
    }

    try {
      // Sanitize file extension from mime type (not user-provided filename)
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const fileExt = mimeToExt[file.type] || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with error handling
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to generate public URL for avatar');
      }

      // Update profile with new URL
      const success = await updateProfile({ avatar_url: urlData.publicUrl });
      if (success) {
        return urlData.publicUrl;
      }
      return null;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
      return null;
    }
  };

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
