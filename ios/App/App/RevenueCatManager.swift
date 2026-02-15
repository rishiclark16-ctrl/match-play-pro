import Foundation
import RevenueCat
import StoreKit

/// Manages RevenueCat subscription functionality for MATCH Golf
@MainActor
final class RevenueCatManager: NSObject, ObservableObject {

    static let shared = RevenueCatManager()

    // MARK: - Configuration
    private var apiKey: String? {
        guard let key = Bundle.main.infoDictionary?["RevenueCatAPIKey"] as? String, !key.isEmpty, !key.hasPrefix("$(") else {
            print("[RevenueCat] ERROR: API key not configured. Set REVENUECAT_API_KEY in build settings.")
            return nil
        }
        return key
    }
    static let entitlementID = "Pro"

    // MARK: - Published Properties
    @Published var customerInfo: CustomerInfo?
    @Published var offerings: Offerings?
    @Published var isProUser: Bool = false
    @Published var isLoading: Bool = false

    /// Whether the SDK has been configured
    private(set) var isConfigured: Bool = false

    // MARK: - Initialization
    override init() {
        super.init()
    }

    /// Configure RevenueCat SDK - call this on app launch
    func configure(userId: String? = nil) {
        guard !isConfigured else { return }
        guard let key = apiKey else {
            print("[RevenueCat] Skipping configuration - no API key")
            return
        }

        Purchases.logLevel = .debug

        if let userId = userId {
            Purchases.configure(withAPIKey: key, appUserID: userId)
        } else {
            Purchases.configure(withAPIKey: key)
        }

        // Set delegate
        Purchases.shared.delegate = self
        isConfigured = true

        // Fetch initial data
        Task {
            await refreshCustomerInfo()
            await fetchOfferings()
        }
    }

    /// Ensure SDK is configured before making calls
    func ensureConfigured() -> Bool {
        if !isConfigured {
            configure()
        }
        return isConfigured
    }

    /// Login user with their ID
    func login(userId: String) async throws {
        guard ensureConfigured() else {
            throw RevenueCatError.notConfigured
        }

        let (customerInfo, _) = try await Purchases.shared.logIn(userId)
        self.customerInfo = customerInfo
        self.isProUser = checkIsPro(customerInfo)
    }

    /// Logout current user
    func logout() async throws {
        guard isConfigured else { return }

        let customerInfo = try await Purchases.shared.logOut()
        self.customerInfo = customerInfo
        self.isProUser = false
    }

    // MARK: - Customer Info

    /// Refresh customer info from RevenueCat
    func refreshCustomerInfo() async {
        guard isConfigured else { return }

        do {
            let info = try await Purchases.shared.customerInfo()
            self.customerInfo = info
            self.isProUser = checkIsPro(info)
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
        guard isConfigured else {
            print("[RevenueCat] Cannot fetch offerings - not configured")
            return
        }

        do {
            let offerings = try await Purchases.shared.offerings()
            self.offerings = offerings
            print("[RevenueCat] Fetched offerings. Current: \(offerings.current?.identifier ?? "nil"). All: \(offerings.all.keys.joined(separator: ", "))")
        } catch {
            print("[RevenueCat] Error fetching offerings: \(error)")
        }
    }

    /// Get the current offering, fetching if needed
    func getCurrentOffering() async -> Offering? {
        if let current = offerings?.current {
            return current
        }
        // Offerings not loaded yet, try fetching
        await fetchOfferings()

        // Try .current first, then fall back to first available offering
        if let current = offerings?.current {
            return current
        }
        if let first = offerings?.all.values.first {
            print("[RevenueCat] No current offering set, falling back to: \(first.identifier)")
            return first
        }
        print("[RevenueCat] No offerings available at all")
        return nil
    }

    /// Get the current offering (cached only)
    var currentOffering: Offering? {
        offerings?.current ?? offerings?.all.values.first
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
        guard isConfigured else {
            throw RevenueCatError.notConfigured
        }

        isLoading = true
        defer { isLoading = false }

        let result = try await Purchases.shared.purchase(package: package)

        self.customerInfo = result.customerInfo
        self.isProUser = checkIsPro(result.customerInfo)

        print("[RevenueCat] Purchase complete. isProUser: \(self.isProUser)")

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
        guard isConfigured else {
            throw RevenueCatError.notConfigured
        }

        isLoading = true
        defer { isLoading = false }

        let customerInfo = try await Purchases.shared.restorePurchases()

        self.customerInfo = customerInfo
        self.isProUser = checkIsPro(customerInfo)

        return customerInfo
    }

    // MARK: - Pro Status Check

    /// Check if a CustomerInfo object indicates pro access.
    /// First checks the named entitlement, then falls back to checking activeSubscriptions.
    private func checkIsPro(_ info: CustomerInfo) -> Bool {
        // 1. Check the named entitlement (preferred)
        if info.entitlements[Self.entitlementID]?.isActive == true {
            return true
        }

        // 2. Check ANY active entitlement (handles entitlement name mismatch)
        for (_, entitlement) in info.entitlements.all {
            if entitlement.isActive {
                print("[RevenueCat] Pro via entitlement '\(entitlement.identifier)' (not '\(Self.entitlementID)')")
                return true
            }
        }

        // 3. Fallback: check activeSubscriptions directly (handles missing entitlement config)
        if !info.activeSubscriptions.isEmpty {
            print("[RevenueCat] Pro via activeSubscriptions fallback: \(info.activeSubscriptions)")
            return true
        }

        return false
    }

    // MARK: - Subscription Info

    /// Get active subscription product ID
    var activeSubscriptionProductId: String? {
        guard let info = customerInfo else { return nil }
        // Try entitlement first, then activeSubscriptions
        if let productId = info.entitlements[Self.entitlementID]?.productIdentifier {
            return productId
        }
        // Fallback: first active entitlement or first active subscription
        for (_, ent) in info.entitlements.all where ent.isActive {
            return ent.productIdentifier
        }
        return info.activeSubscriptions.first
    }

    /// Get subscription expiration date
    var expirationDate: Date? {
        guard let info = customerInfo else { return nil }
        if let date = info.entitlements[Self.entitlementID]?.expirationDate {
            return date
        }
        for (_, ent) in info.entitlements.all where ent.isActive {
            return ent.expirationDate
        }
        return nil
    }

    /// Check if subscription will renew
    var willRenew: Bool {
        guard let info = customerInfo else { return false }
        if let ent = info.entitlements[Self.entitlementID] {
            return ent.willRenew
        }
        for (_, ent) in info.entitlements.all where ent.isActive {
            return ent.willRenew
        }
        return false
    }

    /// Get management URL
    var managementURL: URL? {
        customerInfo?.managementURL
    }

    // MARK: - Customer Info Dictionary

    /// Convert customer info to dictionary for JavaScript bridge
    func customerInfoToDictionary() -> [String: Any] {
        guard let info = customerInfo else {
            print("[RevenueCat] customerInfoToDictionary: no customerInfo available")
            return ["isPro": false]
        }

        // Debug logging
        let allEntitlementIDs = info.entitlements.all.map { "\($0.key)(\($0.value.isActive ? "active" : "inactive"))" }.joined(separator: ", ")
        let activeSubIds = info.activeSubscriptions.joined(separator: ", ")
        print("[RevenueCat] Entitlements: [\(allEntitlementIDs)], Active subs: [\(activeSubIds)]")

        let isPro = checkIsPro(info)

        return [
            "isPro": isPro,
            "activeSubscription": activeSubscriptionProductId ?? NSNull(),
            "expirationDate": expirationDate?.iso8601String ?? NSNull(),
            "willRenew": willRenew,
            "managementUrl": info.managementURL?.absoluteString ?? NSNull()
        ]
    }

    /// Convert offerings to dictionary for JavaScript bridge
    func offeringsToDictionary() -> [String: Any]? {
        guard let current = currentOffering else {
            print("[RevenueCat] offeringsToDictionary: no current offering. All offerings: \(offerings?.all.keys.joined(separator: ", ") ?? "none")")
            return nil
        }

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
            self.isProUser = checkIsPro(customerInfo)
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
