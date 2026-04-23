/**
 * RevenueCat Purchases Service
 *
 * Handles Apple In-App Purchase integration via RevenueCat native SDK.
 * This service manages subscription purchases, restoration, and status checks.
 *
 * App Store Connect Products:
 * - monthly: $3.99/month
 * - yearly: $24.99/year
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { capture } from '@/lib/posthog';

// Define the plugin interface
interface RevenueCatPlugin {
  configure(options: { userId?: string }): Promise<{ success: boolean }>;
  login(options: { userId: string }): Promise<CustomerInfoResponse>;
  logout(): Promise<{ success: boolean }>;
  getCustomerInfo(): Promise<CustomerInfoResponse>;
  getOfferings(): Promise<OfferingsResponse>;
  purchasePackage(options: { packageId: string }): Promise<PurchaseResponse>;
  restorePurchases(): Promise<PurchaseResponse>;
  checkProStatus(): Promise<{ isPro: boolean }>;
  openManagementUrl(): Promise<{ success: boolean }>;
  presentCodeRedemptionSheet(): Promise<{ success: boolean }>;
}

interface CustomerInfoResponse {
  isPro: boolean;
  activeSubscription: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  managementUrl: string | null;
}

interface PackageInfo {
  identifier: string;
  productId: string;
  localizedPrice: string;
  price: number;
  currencyCode: string;
}

interface OfferingsResponse {
  identifier?: string;
  availablePackages?: PackageInfo[];
  monthly?: PackageInfo;
  annual?: PackageInfo;
  error?: string;
}

interface PurchaseResponse {
  success: boolean;
  cancelled?: boolean;
  customerInfo?: CustomerInfoResponse;
}

// Register the native plugin
const RevenueCat = registerPlugin<RevenueCatPlugin>('RevenueCat');

// Entitlement ID in RevenueCat
export const ENTITLEMENT_ID = 'Pro';

export interface PurchasePackage {
  identifier: string;
  productId: string;
  localizedPrice: string;
  price: number;
  currencyCode: string;
  subscriptionPeriod?: string;
}

export interface PurchaseOffering {
  identifier: string;
  availablePackages: PurchasePackage[];
  monthly?: PurchasePackage;
  annual?: PurchasePackage;
}

export interface CustomerInfo {
  isPro: boolean;
  activeSubscription: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  managementUrl: string | null;
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}

// Track initialization state
let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Should be called once on app startup after user authentication
 */
export async function initializePurchases(userId: string): Promise<boolean> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    // Login with user ID
    await RevenueCat.login({ userId });
    isInitialized = true;
    return true;
  } catch (error) {
    logger.error('Failed to initialize purchases', error);
    return false;
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchaseOffering | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const response = await RevenueCat.getOfferings();

    if (response.error || !response.availablePackages) {
      logger.warn('No offerings available');
      return null;
    }

    return {
      identifier: response.identifier || 'default',
      availablePackages: response.availablePackages.map((pkg) => ({
        identifier: pkg.identifier,
        productId: pkg.productId,
        localizedPrice: pkg.localizedPrice,
        price: pkg.price,
        currencyCode: pkg.currencyCode,
      })),
      monthly: response.monthly
        ? {
            identifier: response.monthly.identifier,
            productId: response.monthly.productId,
            localizedPrice: response.monthly.localizedPrice,
            price: response.monthly.price,
            currencyCode: response.monthly.currencyCode,
          }
        : undefined,
      annual: response.annual
        ? {
            identifier: response.annual.identifier,
            productId: response.annual.productId,
            localizedPrice: response.annual.localizedPrice,
            price: response.annual.price,
            currencyCode: response.annual.currencyCode,
          }
        : undefined,
    };
  } catch (error) {
    logger.error('Failed to get offerings', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(packageIdentifier: string): Promise<PurchaseResult> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not a native platform' };
  }

  try {
    const response = await RevenueCat.purchasePackage({ packageId: packageIdentifier });

    if (response.cancelled) {
      return { success: false, cancelled: true };
    }

    logger.debug('Purchase response', { data: { response } });

    const customerInfo = response.customerInfo
      ? parseCustomerInfo(response.customerInfo)
      : undefined;

    logger.debug('Parsed customerInfo', { data: { customerInfo } });

    // Sync to Supabase
    if (customerInfo) {
      const synced = await syncSubscriptionToSupabase(customerInfo);
      logger.debug('Sync result', { data: { synced } });
    } else {
      logger.warn('No customerInfo returned from purchase');
    }

    if (response.success) {
      capture('subscription_started', { package_id: packageIdentifier });
    }

    return { success: response.success, customerInfo };
  } catch (error) {
    logger.error('Purchase failed', error);
    return { success: false, error: error instanceof Error ? error.message : 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not a native platform' };
  }

  try {
    const response = await RevenueCat.restorePurchases();

    const customerInfo = response.customerInfo
      ? parseCustomerInfo(response.customerInfo)
      : undefined;

    // Sync to Supabase
    if (customerInfo) {
      await syncSubscriptionToSupabase(customerInfo);
    }

    if (response.success) {
      capture('subscription_restored');
    }

    return { success: response.success, customerInfo };
  } catch (error) {
    logger.error('Restore failed', error);
    return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
  }
}

/**
 * Get current customer subscription info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const response = await RevenueCat.getCustomerInfo();
    return parseCustomerInfo(response);
  } catch (error) {
    logger.error('Failed to get customer info', error);
    return null;
  }
}

/**
 * Check if user currently has Pro entitlement
 */
export async function checkProStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const response = await RevenueCat.checkProStatus();
    return response.isPro;
  } catch (error) {
    logger.error('Failed to check pro status', error);
    return false;
  }
}

/**
 * Parse customer info response
 */
function parseCustomerInfo(response: CustomerInfoResponse): CustomerInfo {
  return {
    isPro: response.isPro,
    activeSubscription: response.activeSubscription,
    expirationDate: response.expirationDate,
    willRenew: response.willRenew,
    managementUrl: response.managementUrl,
  };
}

/**
 * Sync subscription status to Supabase via Edge Function
 */
export async function syncSubscriptionToSupabase(customerInfo: CustomerInfo): Promise<boolean> {
  try {
    logger.debug('Syncing to Supabase', {
      data: {
        isPro: customerInfo.isPro,
        activeSubscription: customerInfo.activeSubscription,
        expirationDate: customerInfo.expirationDate,
      },
    });

    // Refresh session before calling edge function to avoid 401 on stale tokens
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      logger.warn('Session refresh failed before sync', refreshError);
      return false;
    }

    const { data, error } = await supabase.functions.invoke('sync-subscription', {
      body: {
        isPro: customerInfo.isPro,
        activeSubscription: customerInfo.activeSubscription,
        expirationDate: customerInfo.expirationDate,
        willRenew: customerInfo.willRenew,
      },
    });

    if (error) {
      logger.warn('Failed to sync to Supabase', error);
      return false;
    }

    logger.debug('Sync successful', { data: { result: data } });
    return true;
  } catch (error) {
    // Catch FunctionsHttpError so it doesn't bubble to Sentry as unhandled
    logger.warn('Sync subscription error (non-fatal)', error);
    return false;
  }
}

/**
 * Present Apple's native offer-code redemption sheet.
 * Codes are generated in App Store Connect (Subscriptions → Offer Codes) and distributed externally.
 * Apple's sheet handles entry & validation; RevenueCat picks up the entitlement on next refresh.
 */
export async function presentCodeRedemptionSheet(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const response = await RevenueCat.presentCodeRedemptionSheet();
    return response.success;
  } catch (error) {
    logger.error('Failed to present code redemption sheet', error);
    return false;
  }
}

/**
 * Open subscription management URL (App Store subscription management)
 */
export async function openManagementUrl(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const response = await RevenueCat.openManagementUrl();
    return response.success;
  } catch (error) {
    logger.error('Failed to open management URL', error);
    return false;
  }
}
