#import <Capacitor/Capacitor.h>

CAP_PLUGIN(RevenueCatPlugin, "RevenueCat",
    CAP_PLUGIN_METHOD(configure, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(login, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(logout, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCustomerInfo, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getOfferings, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchasePackage, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkProStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(openManagementUrl, CAPPluginReturnPromise);
)
