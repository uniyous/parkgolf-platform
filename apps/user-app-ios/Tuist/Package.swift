// swift-tools-version: 6.0
import PackageDescription

#if TUIST
import ProjectDescription

let packageSettings = PackageSettings(
    productTypes: [
        "Alamofire": .framework,
        "KeychainAccess": .framework,
        "SocketIO": .framework,
    ]
)
#endif

let package = Package(
    name: "ParkGolf",
    dependencies: [
        // Networking
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0"),
        // Keychain
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
        // Socket.IO
        .package(url: "https://github.com/socketio/socket.io-client-swift.git", from: "16.1.1"),
    ]
)
