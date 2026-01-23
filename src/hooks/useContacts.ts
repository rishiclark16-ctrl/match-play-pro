import { useState, useCallback } from 'react';
import { Contacts } from '@capacitor-community/contacts';
import { supabase } from '@/integrations/supabase/client';

// Contact Picker API result type (Web Contacts API)
interface WebContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

export interface DeviceContact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
}

export interface MatchedContact extends DeviceContact {
  profileId: string;
  avatarUrl?: string;
  handicap?: number;
  friendCode?: string;
  isAlreadyFriend: boolean;
  isPendingRequest: boolean;
}

export interface ContactSyncResult {
  matched: MatchedContact[];
  unmatched: DeviceContact[];
}

export function useContacts() {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceContacts = async (): Promise<DeviceContact[]> => {
    try {
      // Try Capacitor Contacts first (for native apps)
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts !== 'granted') {
        throw new Error('Contact permission denied');
      }

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          emails: true,
          phones: true,
        },
      });

      return result.contacts
        .filter(c => c.name?.display && (c.emails?.length || c.phones?.length))
        .map(c => ({
          id: c.contactId || crypto.randomUUID(),
          name: c.name?.display || 'Unknown',
          emails: c.emails?.map(e => e.address?.toLowerCase() || '').filter(Boolean) || [],
          phones: c.phones?.map(p => p.number?.replace(/\D/g, '') || '').filter(Boolean) || [],
        }));
    } catch {
      // Fallback to Contact Picker API (web)
      if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
          const props = ['name', 'email', 'tel'];
          const opts = { multiple: true };
          // @ts-expect-error - Contact Picker API not typed
          const webContacts = await navigator.contacts.select(props, opts);
          
          return (webContacts as WebContact[]).map((c) => ({
            id: crypto.randomUUID(),
            name: c.name?.[0] || 'Unknown',
            emails: (c.email || []).map((e) => e.toLowerCase()),
            phones: (c.tel || []).map((p) => p.replace(/\D/g, '')),
          }));
        } catch (webError) {
          throw new Error('Contact access not available on this device');
        }
      }
      
      throw new Error('Contact access not available on this device');
    }
  };

  const matchContactsWithUsers = async (
    deviceContacts: DeviceContact[],
    currentUserId: string
  ): Promise<ContactSyncResult> => {
    // Collect all emails and phones to query
    const allEmails = deviceContacts.flatMap(c => c.emails);
    const allPhones = deviceContacts.flatMap(c => c.phones);

    // Query profiles that match any email or phone
    const { data: matchedProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, handicap, friend_code, email, phone')
      .or(`email.in.(${allEmails.map(e => `"${e}"`).join(',')}),phone.in.(${allPhones.join(',')})`)
      .neq('id', currentUserId);

    if (profileError) {
      // Error handled
    }

    // Get current friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id, user_id, status')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

    const friendMap = new Map<string, 'accepted' | 'pending'>();
    friendships?.forEach(f => {
      const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id;
      friendMap.set(otherId, f.status as 'accepted' | 'pending');
    });

    // Create a map for quick lookup
    type ProfileType = NonNullable<typeof matchedProfiles>[number];
    const profileByEmail = new Map<string, ProfileType>();
    const profileByPhone = new Map<string, ProfileType>();

    matchedProfiles?.forEach(p => {
      if (p.email) profileByEmail.set(p.email.toLowerCase(), p);
      if (p.phone) profileByPhone.set(p.phone.replace(/\D/g, ''), p);
    });

    const matched: MatchedContact[] = [];
    const unmatched: DeviceContact[] = [];
    const matchedContactIds = new Set<string>();

    deviceContacts.forEach(contact => {
      let matchedProfile: ProfileType | undefined;

      // Try to match by email first
      for (const email of contact.emails) {
        if (profileByEmail.has(email)) {
          matchedProfile = profileByEmail.get(email);
          break;
        }
      }

      // If no email match, try phone
      if (!matchedProfile) {
        for (const phone of contact.phones) {
          if (profileByPhone.has(phone)) {
            matchedProfile = profileByPhone.get(phone);
            break;
          }
        }
      }

      if (matchedProfile && !matchedContactIds.has(matchedProfile.id)) {
        matchedContactIds.add(matchedProfile.id);
        const friendStatus = friendMap.get(matchedProfile.id);
        
        matched.push({
          ...contact,
          profileId: matchedProfile.id,
          avatarUrl: matchedProfile.avatar_url || undefined,
          handicap: matchedProfile.handicap || undefined,
          friendCode: matchedProfile.friend_code || undefined,
          isAlreadyFriend: friendStatus === 'accepted',
          isPendingRequest: friendStatus === 'pending',
        });
      } else if (!matchedProfile) {
        unmatched.push(contact);
      }
    });

    return { matched, unmatched };
  };

  const syncContacts = useCallback(async (currentUserId: string) => {
    setLoading(true);
    setError(null);

    try {
      const deviceContacts = await fetchDeviceContacts();
      const result = await matchContactsWithUsers(deviceContacts, currentUserId);
      setContacts(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync contacts');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearContacts = useCallback(() => {
    setContacts(null);
    setError(null);
  }, []);

  return {
    contacts,
    loading,
    error,
    syncContacts,
    clearContacts,
  };
}
