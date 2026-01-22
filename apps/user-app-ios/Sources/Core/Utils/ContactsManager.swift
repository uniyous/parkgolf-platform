import Contacts
import Foundation

// MARK: - Contacts Manager

actor ContactsManager {
    static let shared = ContactsManager()

    private let contactStore = CNContactStore()

    // MARK: - Authorization

    func requestAccess() async -> Bool {
        let status = CNContactStore.authorizationStatus(for: .contacts)

        switch status {
        case .authorized:
            return true
        case .notDetermined:
            do {
                return try await contactStore.requestAccess(for: .contacts)
            } catch {
                return false
            }
        case .denied, .restricted:
            return false
        case .limited:
            return true
        @unknown default:
            return false
        }
    }

    func checkAuthorizationStatus() -> CNAuthorizationStatus {
        CNContactStore.authorizationStatus(for: .contacts)
    }

    // MARK: - Fetch Phone Numbers

    func fetchPhoneNumbers() async throws -> [String] {
        let keysToFetch: [CNKeyDescriptor] = [
            CNContactPhoneNumbersKey as CNKeyDescriptor
        ]

        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        var phoneNumbers: [String] = []

        try contactStore.enumerateContacts(with: request) { contact, _ in
            for phoneNumber in contact.phoneNumbers {
                let number = phoneNumber.value.stringValue
                // Normalize phone number (remove spaces, dashes, parentheses)
                let normalized = number
                    .replacingOccurrences(of: " ", with: "")
                    .replacingOccurrences(of: "-", with: "")
                    .replacingOccurrences(of: "(", with: "")
                    .replacingOccurrences(of: ")", with: "")
                    .replacingOccurrences(of: "+82", with: "0")

                if !normalized.isEmpty {
                    phoneNumbers.append(normalized)
                }
            }
        }

        // Remove duplicates
        return Array(Set(phoneNumbers))
    }
}

// MARK: - Contacts Manager Error

enum ContactsManagerError: Error, LocalizedError {
    case accessDenied
    case fetchFailed(Error)

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "주소록 접근이 거부되었습니다. 설정에서 권한을 허용해주세요."
        case .fetchFailed(let error):
            return "연락처를 불러오는데 실패했습니다: \(error.localizedDescription)"
        }
    }
}
