import Foundation
import RevenueCat
import StoreKit

/// Manages RevenueCat subscription functionality for MATCH Golf
@MainActor
final class RevenueCatManager: NSObject, ObservableObject {

    static let shared = RevenueCatManager()

    // MARK: - Configuration
    private var apiKey: String {
        guard let key = Bundle.main.infoDictionary?["RevenueCatAPIKey"] as? String, !key.isEmpty, !key.hasPrefix("$(") else {
            fatalError("RevenueCat API key not configured. Set REVENUECAT_API_KEY in build settings.")
        }
        return key
    }
    static let entitlementID = "MATCH Golf"

    // MARK: - Published Properties
    @Published var customerInfo: CustomerInfo?
    @Published var offerings: Offerings?
    @Published var isProUser: Bool = false
    @Published var isLoading: Bool = false

    // MARK: - Initialization
    override init() {
        super.init()
    }

    /// Configure RevenueCat SDK - call this on app launch
    func configure(userId: String? = nil) {
        Purchases.logLevel = .debug

        if let userId = userId {
            Purchases.configure(withAPIKey: apiKey, appUserID: userId)
        } else {
            Purchases.configure(withAPIKey: apiKey)
        }

        // Set delegate
        Purchases.shared.delegate = self

        // Fetch initial data
        Task {
            await refreshCustomerInfo()
            await fetchOfferings()
        }
    }

    /// Login user with their ID
    func login(userId: String) async throws {
        let (customerInfo, _) = try await Purchases.shared.logIn(userId)
        await MainActor.run {
            self.customerInfo = customerInfo
            self.isProUser = customerInfo.entitlements[Self.entitlementID]?.isActive == true
        }
    }

    /// Logout current user
    func logout() async throws {
        let customerInfo = try await Purchases.shared.logOut()
        await MainActor.run {
            self.customerInfo = customerInfo
            self.isProUser = false
        }
    }

    // MARK: - Customer Info

    /// Refresh customer info from RevenueCat
    func refreshCustomerInfo() async {
        do {
            let info = try await Purchases.shared.customerInfo()
            await MainActor.run {
                self.customerInfo = info
                self.isProUser = info.entitlements[Self.entitlementID]?.isActive == true
            }
        } catch {
            print("[RevenueCat] Error fetching customer info: \(error)")
        }
    }

    /// Check if user has active Pro subscription
    func checkProStatus() async -> Bool {
        await refreshCustomerInfo()
        return isProUser
    }

    // MARK: - Offerings

    /// Fetch available offerings
    func fetchOfferings() async {
        do {
            let offerings = try await Purchases.shared.offerings()
            await MainActor.run {
                self.offerings = offerings
            }
        } catch {
            print("[RevenueCat] Error fetching offerings: \(error)")
        }
    }

    /// Get the current offering
    var currentOffering: Offering? {
        offerings?.current
    }

    /// Get monthly package
    var monthlyPackage: Package? {
        currentOffering?.monthly
    }

    /// Get annual package
    var annualPackage: Package? {
        currentOffering?.annual
    }

    // MARK: - Purchases

    /// Purchase a package
    func purchase(package: Package) async throws -> CustomerInfo {
        isLoading = true
        defer { isLoading = false }

        let result = try await Purchases.shared.purchase(package: package)

        await MainActor.run {
            self.customerInfo = result.customerInfo
            self.isProUser = result.customerInfo.entitlements[Self.entitlementID]?.isActive == true
        }

        return result.customerInfo
    }

    /// Purchase monthly subscription
    func purchaseMonthly() async throws -> CustomerInfo {
        guard let package = monthlyPackage else {
            throw RevenueCatError.packageNotFound
        }
        return try await purchase(package: package)
    }

    /// Purchase annual subscription
    func purchaseAnnual() async throws -> CustomerInfo {
        guard let package = annualPackage else {
            throw RevenueCatError.packageNotFound
        }
        return try await purchase(package: package)
    }

    /// Restore purchases
    func restorePurchases() async throws -> CustomerInfo {
        isLoading = true
        defer { isLoading = false }

        let customerInfo = try await Purchases.shared.restorePurchases()

        await MainActor.run {
            self.customerInfo = customerInfo
            self.isProUser = customerInfo.entitlements[Self.entitlementID]?.isActive == true
        }

        return customerInfo
    }

    // MARK: - Subscription Info

    /// Get active subscription product ID
    var activeSubscriptionProductId: String? {
        customerInfo?.entitlements[Self.entitlementID]?.productIdentifier
    }

    /// Get subscription expiration date
    var expirationDate: Date? {
        customerInfo?.entitlements[Self.entitlementID]?.expirationDate
    }

    /// Check if subscription will renew
    var willRenew: Bool {
        customerInfo?.entitlements[Self.entitlementID]?.willRenew ?? false
    }

    /// Get management URL
    var managementURL: URL? {
        customerInfo?.managementURL
    }

    // MARK: - Customer Info Dictionary

    /// Convert customer info to dictionary for JavaScript bridge
    func customerInfoToDictionary() -> [String: Any] {
        guard let info = customerInfo else {
            return ["isPro": false]
        }

        let entitlement = info.entitlements[Self.entitlementID]

        return [
            "isPro": entitlement?.isActive == true,
            "activeSubscription": entitlement?.productIdentifier ?? NSNull(),
            "expirationDate": entitlement?.expirationDate?.iso8601String ?? NSNull(),
            "willRenew": entitlement?.willRenew ?? false,
            "managementUrl": info.managementURL?.absoluteString ?? NSNull()
        ]
    }

    /// Convert offerings to dictionary for JavaScript bridge
    func offeringsToDictionary() -> [String: Any]? {
        guard let current = currentOffering else { return nil }

        var result: [String: Any] = [
            "identifier": current.identifier,
            "availablePackages": current.availablePackages.map { packageToDictionary($0) }
        ]

        if let monthly = current.monthly {
            result["monthly"] = packageToDictionary(monthly)
        }

        if let annual = current.annual {
            result["annual"] = packageToDictionary(annual)
        }

        return result
    }

    private func packageToDictionary(_ package: Package) -> [String: Any] {
        return [
            "identifier": package.identifier,
            "productId": package.storeProduct.productIdentifier,
            "localizedPrice": package.storeProduct.localizedPriceString,
            "price": package.storeProduct.price,
            "currencyCode": package.storeProduct.currencyCode ?? "USD"
        ]
    }
}

// MARK: - PurchasesDelegate

extension RevenueCatManager: PurchasesDelegate {
    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            self.customerInfo = customerInfo
            self.isProUser = customerInfo.entitlements[Self.entitlementID]?.isActive == true
        }
    }
}

// MARK: - Errors

enum RevenueCatError: LocalizedError {
    case packageNotFound
    case purchaseFailed(String)
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .packageNotFound:
            return "Subscription package not found"
        case .purchaseFailed(let message):
            return "Purchase failed: \(message)"
        case .notConfigured:
            return "RevenueCat is not configured"
        }
    }
}

// MARK: - Date Extension

extension Date {
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: self)
    }
}
