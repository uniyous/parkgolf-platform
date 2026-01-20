import ProjectDescription

// MARK: - Project

let project = Project(
    name: "ParkGolf",
    organizationName: "com.parkgolf",
    options: .options(
        automaticSchemesOptions: .disabled,
        disableBundleAccessors: false,
        disableSynthesizedResourceAccessors: false
    ),
    settings: .settings(
        base: [
            "SWIFT_VERSION": "6.0",
            "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
            "CODE_SIGN_STYLE": "Automatic",
        ],
        configurations: [
            .debug(name: "Debug", settings: [:], xcconfig: nil),
            .release(name: "Release", settings: [:], xcconfig: nil),
        ]
    ),
    targets: [
        // MARK: - Main App Target
        .target(
            name: "ParkGolf",
            destinations: .iOS,
            product: .app,
            bundleId: "com.parkgolf.app",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .extendingDefault(with: [
                "CFBundleDisplayName": "ParkMate",
                "CFBundleShortVersionString": "1.0.0",
                "CFBundleVersion": "1",
                "UILaunchScreen": [:],
                "UISupportedInterfaceOrientations": ["UIInterfaceOrientationPortrait"],
                "NSCameraUsageDescription": "QR 코드 스캔을 위해 카메라가 필요합니다.",
                "NSLocationWhenInUseUsageDescription": "주변 골프장을 찾기 위해 위치 정보가 필요합니다.",
                "NSContactsUsageDescription": "친구를 찾기 위해 주소록 접근이 필요합니다.",
            ]),
            sources: ["Sources/**"],
            resources: ["Resources/**"],
            dependencies: [
                // Swift Package Manager dependencies
                .external(name: "Alamofire"),
                .external(name: "KeychainAccess"),
                .external(name: "SocketIO"),
            ],
            settings: .settings(
                base: [
                    "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
                    "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
                ]
            )
        ),

        // MARK: - Unit Tests Target
        .target(
            name: "ParkGolfTests",
            destinations: .iOS,
            product: .unitTests,
            bundleId: "com.parkgolf.app.tests",
            deploymentTargets: .iOS("17.0"),
            sources: ["Tests/UnitTests/**"],
            dependencies: [
                .target(name: "ParkGolf"),
            ]
        ),

        // MARK: - UI Tests Target
        .target(
            name: "ParkGolfUITests",
            destinations: .iOS,
            product: .uiTests,
            bundleId: "com.parkgolf.app.uitests",
            deploymentTargets: .iOS("17.0"),
            sources: ["Tests/UITests/**"],
            dependencies: [
                .target(name: "ParkGolf"),
            ]
        ),
    ],
    schemes: [
        .scheme(
            name: "ParkGolf",
            shared: true,
            buildAction: .buildAction(targets: ["ParkGolf"]),
            testAction: .targets(
                ["ParkGolfTests", "ParkGolfUITests"],
                configuration: "Debug",
                options: .options(coverage: true)
            ),
            runAction: .runAction(configuration: "Debug"),
            archiveAction: .archiveAction(configuration: "Release")
        ),
    ]
)
