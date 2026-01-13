import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Deep linking routes supported by MATCH Golf
 * 
 * Custom URL Scheme (matchgolf://):
 * - matchgolf://round/ABC123 → Opens round with join code
 * - matchgolf://join/ABC123 → Joins round with code
 * - matchgolf://profile → Opens profile
 * - matchgolf://friends → Opens friends list
 * 
 * Universal Links (https://matchgolf.app):
 * - https://matchgolf.app/round/ABC123 → Opens/joins round
 * - https://matchgolf.app/join?code=ABC123 → Joins round
 */

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up deep link handling on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] Received URL:', event.url);

      try {
        const url = new URL(event.url);
        const path = url.pathname || url.host; // Custom schemes put path in host
        
        // Parse the path and navigate
        const route = parseDeepLinkPath(path, url.searchParams);
        
        if (route) {
          console.log('[DeepLink] Navigating to:', route);
          navigate(route);
        }
      } catch (error) {
        console.error('[DeepLink] Failed to parse URL:', error);
      }
    };

    // Listen for app URL open events
    const listener = App.addListener('appUrlOpen', handleDeepLink);

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        console.log('[DeepLink] App launched with URL:', launchUrl.url);
        handleDeepLink({ url: launchUrl.url });
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate]);
}

/**
 * Parse deep link path and return the app route
 */
function parseDeepLinkPath(path: string, params: URLSearchParams): string | null {
  // Clean up the path
  const cleanPath = path.replace(/^\/+/, '').toLowerCase();
  
  // Round deep links - matchgolf://round/ABC123 or /round/ABC123
  if (cleanPath.startsWith('round/')) {
    const roundId = cleanPath.replace('round/', '');
    if (roundId) {
      return `/round/${roundId}`;
    }
  }
  
  // Join round - matchgolf://join/ABC123 or /join?code=ABC123
  if (cleanPath.startsWith('join')) {
    const code = cleanPath.replace('join/', '') || params.get('code');
    if (code) {
      // Navigate to join page with the code pre-filled
      return `/join?code=${code}`;
    }
    return '/join';
  }
  
  // Profile
  if (cleanPath === 'profile') {
    return '/profile';
  }
  
  // Friends
  if (cleanPath === 'friends') {
    return '/friends';
  }
  
  // Groups
  if (cleanPath === 'groups') {
    return '/groups';
  }
  
  // Stats
  if (cleanPath === 'stats') {
    return '/stats';
  }
  
  // New round
  if (cleanPath === 'new' || cleanPath === 'new-round') {
    return '/new-round';
  }
  
  // Home/default
  if (cleanPath === '' || cleanPath === 'home') {
    return '/';
  }
  
  console.warn('[DeepLink] Unknown path:', cleanPath);
  return null;
}

/**
 * Generate a deep link URL for sharing
 */
export function generateDeepLink(
  type: 'round' | 'join',
  id: string,
  options: { preferUniversal?: boolean } = {}
): string {
  const { preferUniversal = true } = options;
  
  if (preferUniversal) {
    // Universal links work on web and redirect to app if installed
    return `https://matchgolf.app/${type}/${id}`;
  }
  
  // Custom URL scheme - only works if app is installed
  return `matchgolf://${type}/${id}`;
}
