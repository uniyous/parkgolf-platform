// periphery:ignore:all
// swiftlint:disable:this file_name
// swiftlint:disable all
// swift-format-ignore-file
// swiftformat:disable all
import Foundation
// MARK: - Swift Bundle Accessor for Static Frameworks
extension Foundation.Bundle {
/// Since Starscream is a static framework, a cut down framework is embedded, with all the resources but only a stub Mach-O image.
    static let module: Bundle = {
        class BundleFinder {}
        let hostBundle = Bundle(for: BundleFinder.self)
        var candidates: [URL?] = [
            hostBundle.privateFrameworksURL,
            hostBundle.bundleURL.appendingPathComponent("Frameworks"),
            hostBundle.bundleURL,
            hostBundle.bundleURL.deletingLastPathComponent(),
            hostBundle.resourceURL,
            Bundle.main.privateFrameworksURL,
            Bundle.main.bundleURL.appendingPathComponent("Frameworks"),
            Bundle.main.bundleURL,
            Bundle.main.resourceURL,
        ].map({ $0?.appendingPathComponent("Starscream.framework") })

        for candidate in candidates {
            if let bundle = candidate.flatMap(Bundle.init(url:)) {
                return bundle
            }
        }

        var bundleCandidates: [URL?] = [
            hostBundle.resourceURL,
            hostBundle.bundleURL,
            hostBundle.privateFrameworksURL,
            hostBundle.bundleURL.appendingPathComponent("Frameworks"),
            hostBundle.bundleURL.deletingLastPathComponent(),
            Bundle.main.resourceURL,
            Bundle.main.bundleURL,
            Bundle.main.privateFrameworksURL,
            Bundle.main.bundleURL.appendingPathComponent("Frameworks"),
        ]
        if ProcessInfo.processInfo.processName == "xctest"
            || ProcessInfo.processInfo.processName == "swift-testing"
        {
            bundleCandidates.append(hostBundle.bundleURL.appendingPathComponent(".."))
        }

        for candidate in bundleCandidates {
            let bundlePath = candidate?.appendingPathComponent("Starscream_Starscream.bundle")
            if let bundle = bundlePath.flatMap(Bundle.init(url:)) {
                return bundle
            }
        }

        return Bundle.main
    }()
}

// swiftformat:enable all
// swiftlint:enable all