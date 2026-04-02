import UIKit
import Capacitor

class MatchBridgeViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RevenueCatPlugin())
    }
}
