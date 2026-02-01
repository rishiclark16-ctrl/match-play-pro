import Foundation
import Capacitor
import RevenueCat
import UIKit

/// Capacitor plugin to bridge RevenueCat functionality to JavaScript
@objc(RevenueCatPlugin)
public class RevenueCatPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "RevenueCatPlugin"
    public let jsName = "RevenueCat"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCustomerInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOfferings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchasePackage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkProStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openManagementUrl", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Configure

    @objc func configure(_ call: CAPPluginCall) {
        let userId = call.getString("userId")

        Task { @MainActor in
            RevenueCatManager.shared.configure(userId: userId)
            call.resolve(["success": true])
        }
    }

    // MARK: - Login/Logout

    @objc func login(_ call: CAPPluginCall) {
        guard let userId = call.getString("userId") else {
            call.reject("userId is required")
            return
        }

        Task { @MainActor in
            do {
                try await RevenueCatManager.shared.login(userId: userId)
                call.resolve(RevenueCatManager.shared.customerInfoToDictionary())
            } catch {
                call.reject("Login failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func logout(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await RevenueCatManager.shared.logout()
                call.resolve(["success": true])
            } catch {
                call.reject("Logout failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Customer Info

    @objc func getCustomerInfo(_ call: CAPPluginCall) {
        Task { @MainActor in
            await RevenueCatManager.shared.refreshCustomerInfo()
            call.resolve(RevenueCatManager.shared.customerInfoToDictionary())
        }
    }

    @objc func checkProStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            let isPro = await RevenueCatManager.shared.checkProStatus()
            call.resolve(["isPro": isPro])
        }
    }

    // MARK: - Offerings

    @objc func getOfferings(_ call: CAPPluginCall) {
        Task { @MainActor in
            await RevenueCatManager.shared.fetchOfferings()
            if let offerings = RevenueCatManager.shared.offeringsToDictionary() {
                call.resolve(offerings)
            } else {
                call.resolve(["error": "No offerings available"])
            }
        }
    }

    // MARK: - Purchases

    @objc func purchasePackage(_ call: CAPPluginCall) {
        guard let packageId = call.getString("packageId") else {
            call.reject("packageId is required")
            return
        }

        Task { @MainActor in
            guard let offering = RevenueCatManager.shared.currentOffering else {
                call.reject("No offering available")
                return
            }

            guard let package = offering.availablePackages.first(where: { $0.identifier == packageId }) else {
                call.reject("Package not found: \(packageId)")
                return
            }

            do {
                _ = try await RevenueCatManager.shared.purchase(package: package)
                call.resolve([
                    "success": true,
                    "customerInfo": RevenueCatManager.shared.customerInfoToDictionary()
                ])
            } catch {
                if let error = error as NSError?, error.domain == "RevenueCat.ErrorCode" && error.code == 1 {
                    // User cancelled
                    call.resolve(["success": false, "cancelled": true])
                    return
                }
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                _ = try await RevenueCatManager.shared.restorePurchases()
                call.resolve([
                    "success": true,
                    "customerInfo": RevenueCatManager.shared.customerInfoToDictionary()
                ])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Management URL

    @objc func openManagementUrl(_ call: CAPPluginCall) {
        Task { @MainActor in
            if let url = RevenueCatManager.shared.managementURL ?? URL(string: "https://apps.apple.com/account/subscriptions") {
                UIApplication.shared.open(url)
                call.resolve(["success": true])
            } else {
                call.reject("Could not open subscription management")
            }
        }
    }
}
