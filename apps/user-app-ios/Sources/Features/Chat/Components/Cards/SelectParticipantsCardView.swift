import SwiftUI

struct SelectParticipantsCardView: View {
    let data: Any
    var onConfirm: (([TeamConfirmData]) -> Void)?
    var onCancel: (() -> Void)?

    @State private var teams: [EditableTeam] = []
    @State private var unassigned: [MemberInfo] = []

    private var dict: [String: Any] {
        data as? [String: Any] ?? [:]
    }

    private var clubName: String { dict["clubName"] as? String ?? "" }
    private var pricePerPerson: Int { dict["pricePerPerson"] as? Int ?? 0 }

    private var totalAssigned: Int {
        teams.reduce(0) { $0 + $1.members.count }
    }

    private var totalAmount: Int {
        pricePerPerson * totalAssigned
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "person.3.sequence.fill")
                    .foregroundColor(Color.parkPrimary)
                Text("팀 편성")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
                Text("배정 \(totalAssigned) / 미배정 \(unassigned.count)")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.5))
            }

            // Teams
            ForEach(Array(teams.enumerated()), id: \.element.id) { teamIndex, team in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("팀\(team.teamNumber)")
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(Color.parkPrimary)
                        if !team.slotTime.isEmpty {
                            Text("\(team.slotTime) · \(team.gameName)")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.5))
                        }
                        Spacer()
                        Text("\(team.members.count)/\(team.maxPlayers)")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.4))
                    }

                    // Members in team
                    ForEach(team.members, id: \.userId) { member in
                        HStack {
                            Text(member.userName)
                                .font(.body)
                                .foregroundColor(.white.opacity(0.8))
                            Spacer()
                            Button {
                                removeMember(member, fromTeamAt: teamIndex)
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.red.opacity(0.6))
                            }
                        }
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                    }

                    if team.members.count < team.maxPlayers {
                        Text("+ 멤버 추가 가능")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.3))
                            .padding(.horizontal, 8)
                    }
                }
                .padding(10)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }

            // Unassigned members
            if !unassigned.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("미배정 멤버")
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(.white.opacity(0.5))

                    ForEach(unassigned, id: \.userId) { member in
                        HStack {
                            Text(member.userName)
                                .font(.body)
                                .foregroundColor(.white.opacity(0.7))
                            Spacer()

                            // Add to team buttons
                            ForEach(Array(teams.enumerated()), id: \.element.id) { teamIndex, team in
                                if team.members.count < team.maxPlayers {
                                    Button {
                                        addMember(member, toTeamAt: teamIndex)
                                    } label: {
                                        Text("팀\(team.teamNumber)")
                                            .font(.subheadline)
                                            .foregroundColor(Color.parkPrimary)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.parkPrimary.opacity(0.15))
                                            .clipShape(RoundedRectangle(cornerRadius: 6))
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(10)
                .background(Color.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            // Summary
            if pricePerPerson > 0 {
                HStack {
                    Text("1인당 ₩\(pricePerPerson.formatted()) × \(totalAssigned)명")
                        .font(.body)
                        .foregroundColor(.white.opacity(0.5))
                    Spacer()
                    Text("₩\(totalAmount.formatted())")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(Color.parkPrimary)
                }
            }

            // Buttons
            HStack(spacing: 10) {
                Button {
                    onCancel?()
                } label: {
                    Text("취소")
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(.white.opacity(0.7))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    let result = teams.map { team in
                        TeamConfirmData(
                            teamNumber: team.teamNumber,
                            slotId: team.slotId,
                            members: team.members.map { m in
                                TeamMemberDto(userId: m.userId, userName: m.userName, userEmail: m.userEmail)
                            }
                        )
                    }
                    onConfirm?(result)
                } label: {
                    Text("확정 (\(totalAssigned)명)")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(totalAssigned > 0 ? Color.parkPrimary : Color.gray)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(totalAssigned == 0)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
        .onAppear {
            parseData()
        }
    }

    // MARK: - Data Parsing

    private func parseData() {
        guard let teamsData = dict["teams"] as? [[String: Any]] else { return }

        teams = teamsData.enumerated().map { index, teamDict in
            let teamNumber = teamDict["teamNumber"] as? Int ?? (index + 1)
            let slotId = teamDict["slotId"] as? String ?? ""
            let slotTime = teamDict["slotTime"] as? String ?? ""
            let gameName = teamDict["gameName"] as? String ?? ""
            let maxPlayers = teamDict["maxPlayers"] as? Int ?? 4
            let membersData = teamDict["members"] as? [[String: Any]] ?? []
            let members = membersData.map { parseMember($0) }

            return EditableTeam(
                teamNumber: teamNumber,
                slotId: slotId,
                slotTime: slotTime,
                gameName: gameName,
                maxPlayers: maxPlayers,
                members: members
            )
        }

        if let unassignedData = dict["unassigned"] as? [[String: Any]] {
            unassigned = unassignedData.map { parseMember($0) }
        }
    }

    private func parseMember(_ dict: [String: Any]) -> MemberInfo {
        let userId: Int
        if let id = dict["userId"] as? Int {
            userId = id
        } else if let idStr = dict["userId"] as? String, let id = Int(idStr) {
            userId = id
        } else {
            userId = 0
        }
        return MemberInfo(
            userId: userId,
            userName: dict["userName"] as? String ?? "",
            userEmail: dict["userEmail"] as? String ?? ""
        )
    }

    // MARK: - Actions

    private func addMember(_ member: MemberInfo, toTeamAt index: Int) {
        guard index < teams.count, teams[index].members.count < teams[index].maxPlayers else { return }
        unassigned.removeAll { $0.userId == member.userId }
        teams[index].members.append(member)
    }

    private func removeMember(_ member: MemberInfo, fromTeamAt index: Int) {
        guard index < teams.count else { return }
        teams[index].members.removeAll { $0.userId == member.userId }
        unassigned.append(member)
    }
}

// MARK: - Helper Models

private struct EditableTeam: Identifiable {
    let id = UUID()
    let teamNumber: Int
    let slotId: String
    let slotTime: String
    let gameName: String
    let maxPlayers: Int
    var members: [MemberInfo]
}

private struct MemberInfo: Identifiable {
    var id: Int { userId }
    let userId: Int
    let userName: String
    let userEmail: String
}
