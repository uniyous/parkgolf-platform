import SwiftUI

struct SlotCardView: View {
    let data: Any
    var onSelect: ((String, String, Int, String?, String?, String?) -> Void)?
    var selectedSlotId: String?

    private var dataDict: [String: Any]? {
        data as? [String: Any]
    }

    private var slots: [[String: Any]] {
        guard let dict = dataDict,
              let slots = dict["slots"] as? [[String: Any]] else { return [] }
        return slots
    }

    private var rounds: [[String: Any]] {
        guard let dict = dataDict,
              let rounds = dict["rounds"] as? [[String: Any]] else { return [] }
        return rounds
    }

    private var clubId: String? {
        dataDict?["clubId"] as? String
    }

    private var clubName: String? {
        dataDict?["clubName"] as? String
    }

    private var clubAddress: String? {
        dataDict?["clubAddress"] as? String
    }

    private var date: String? {
        dataDict?["date"] as? String
    }

    static func stringValue(_ value: Any?) -> String {
        if let str = value as? String { return str }
        if let num = value as? Int { return "\(num)" }
        if let num = value as? Double { return "\(Int(num))" }
        return ""
    }

    private var hasSelection: Bool { selectedSlotId != nil }

    private static let slotsPerPage = 4

    var body: some View {
        if !rounds.isEmpty {
            roundsLayout
        } else {
            flatLayout
        }
    }

    // MARK: - 라운드 그룹 레이아웃

    private var roundsLayout: some View {
        VStack(spacing: 0) {
            // 골프장 헤더
            if let name = clubName, !name.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "flag.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Color.parkPrimary)
                        Text(name)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    if let addr = clubAddress, !addr.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                            Text(addr)
                                .font(.body)
                                .foregroundColor(.white.opacity(0.4))
                                .lineLimit(1)
                        }
                    }
                    if let d = date, !d.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: "calendar")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                            Text(Self.formatDateKorean(d))
                                .font(.body)
                                .foregroundColor(.white.opacity(0.4))
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                Divider().background(Color.white.opacity(0.1))
            }

            // 라운드 목록
            ForEach(Array(rounds.enumerated()), id: \.offset) { index, round in
                RoundSectionView(
                    round: round,
                    hasSelection: hasSelection,
                    selectedSlotId: selectedSlotId,
                    onSelect: onSelect
                )

                if index < rounds.count - 1 {
                    Divider()
                        .background(Color.white.opacity(0.04))
                        .padding(.horizontal, 16)
                }
            }
        }
        .background(Color.parkPrimary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.parkPrimary.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Flat 레이아웃 (하위호환)

    private var flatLayout: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: columns, spacing: 8) {
            ForEach(Array(slots.enumerated()), id: \.offset) { _, slot in
                SlotItemView(
                    slot: slot,
                    selectedSlotId: selectedSlotId,
                    hasSelection: hasSelection,
                    clubId: clubId,
                    clubName: clubName,
                    onSelect: onSelect
                )
            }
        }
    }

    // MARK: - 날짜 포맷

    static func formatDateKorean(_ dateStr: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateStr) else { return dateStr }
        let calendar = Calendar.current
        let days = ["일", "월", "화", "수", "목", "금", "토"]
        let weekday = calendar.component(.weekday, from: date) - 1
        let year = calendar.component(.year, from: date)
        let month = calendar.component(.month, from: date)
        let day = calendar.component(.day, from: date)
        return "\(year)년 \(month)월 \(day)일 (\(days[weekday]))"
    }
}

// MARK: - 라운드 섹션 (페이지네이션 포함)

private struct RoundSectionView: View {
    let round: [String: Any]
    let hasSelection: Bool
    let selectedSlotId: String?
    let onSelect: ((String, String, Int, String?, String?, String?) -> Void)?

    @State private var currentPage = 0
    private let slotsPerPage = 4

    private var gameId: String {
        SlotCardView.stringValue(round["gameId"])
    }
    private var roundName: String {
        round["name"] as? String ?? ""
    }
    private var roundPrice: Int {
        round["price"] as? Int ?? 0
    }
    private var allSlots: [[String: Any]] {
        round["slots"] as? [[String: Any]] ?? []
    }

    private var totalPages: Int {
        max(1, Int(ceil(Double(allSlots.count) / Double(slotsPerPage))))
    }

    private var effectivePage: Int {
        // 선택된 슬롯이 이 라운드에 있으면 해당 페이지로 자동 이동
        if let selectedId = selectedSlotId {
            if let idx = allSlots.firstIndex(where: { SlotCardView.stringValue($0["id"]) == selectedId }) {
                return idx / slotsPerPage
            }
        }
        return currentPage
    }

    private var visibleSlots: [[String: Any]] {
        let start = effectivePage * slotsPerPage
        let end = min(start + slotsPerPage, allSlots.count)
        guard start < allSlots.count else { return [] }
        return Array(allSlots[start..<end])
    }

    private var needsPagination: Bool {
        totalPages > 1
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // 라운드 헤더: 이름 + 가격
            HStack {
                Text(roundName)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
                Text("₩\(roundPrice.formatted())")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(Color.parkPrimary)
            }

            // 타임슬롯 칩
            FlowLayout(spacing: 6) {
                ForEach(Array(visibleSlots.enumerated()), id: \.offset) { _, slot in
                    let slotId = SlotCardView.stringValue(slot["id"])
                    let time = slot["time"] as? String ?? ""
                    let availableSpots = slot["availableSpots"] as? Int
                    let isSelected = selectedSlotId == slotId
                    let isDisabled = hasSelection && !isSelected

                    TimeSlotChipView(
                        time: time,
                        availableSpots: availableSpots,
                        isSelected: isSelected,
                        isDisabled: isDisabled
                    ) {
                        onSelect?(slotId, time, roundPrice, nil, nil, roundName)
                    }
                }
            }

            // 페이지네이션
            if needsPagination {
                HStack {
                    Button {
                        if currentPage > 0 { currentPage -= 1 }
                    } label: {
                        HStack(spacing: 2) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 10))
                            Text("이전")
                                .font(.caption)
                        }
                        .foregroundColor(effectivePage == 0 ? .white.opacity(0.2) : .white.opacity(0.6))
                    }
                    .disabled(effectivePage == 0)

                    Spacer()

                    Text("\(effectivePage + 1) / \(totalPages)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))

                    Spacer()

                    Button {
                        if currentPage < totalPages - 1 { currentPage += 1 }
                    } label: {
                        HStack(spacing: 2) {
                            Text("다음")
                                .font(.caption)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(effectivePage >= totalPages - 1 ? .white.opacity(0.2) : .white.opacity(0.6))
                    }
                    .disabled(effectivePage >= totalPages - 1)
                }
                .padding(.top, 4)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// MARK: - 타임슬롯 칩

private struct TimeSlotChipView: View {
    let time: String
    let availableSpots: Int?
    let isSelected: Bool
    let isDisabled: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            if !isDisabled { onTap() }
        } label: {
            HStack(spacing: 4) {
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color.parkPrimary)
                }
                Text(time)
                    .font(.body)
                    .fontWeight(isSelected ? .bold : .medium)
                    .foregroundColor(isSelected ? Color.parkPrimary : .white)

                if let spots = availableSpots {
                    Text("\(spots)명")
                        .font(.caption2)
                        .foregroundColor(isSelected ? Color.parkPrimary.opacity(0.7) : .white.opacity(0.4))
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(
                isSelected
                    ? Color.parkPrimary.opacity(0.15)
                    : Color.white.opacity(0.06)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(
                        isSelected ? Color.parkPrimary : Color.white.opacity(0.1),
                        lineWidth: isSelected ? 1.5 : 1
                    )
            )
            .opacity(isDisabled ? 0.4 : 1.0)
        }
        .disabled(isDisabled)
    }
}

// MARK: - FlowLayout (flex-wrap 대응)

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}

// MARK: - Flat Slot Item (하위호환)

struct SlotItemView: View {
    let slot: [String: Any]
    let selectedSlotId: String?
    let hasSelection: Bool
    let clubId: String?
    let clubName: String?
    var onSelect: ((String, String, Int, String?, String?, String?) -> Void)?

    var body: some View {
        let id = SlotCardView.stringValue(slot["id"])
        let time = slot["time"] as? String ?? ""
        let gameName = slot["gameName"] as? String ?? ""
        let price = slot["price"] as? Int ?? 0
        let isSelected = selectedSlotId == id
        let isDisabled = hasSelection && !isSelected

        Button {
            if !isDisabled {
                onSelect?(id, time, price, clubId, clubName, gameName)
            }
        } label: {
            ZStack(alignment: .topTrailing) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.system(size: 10))
                            .foregroundColor(Color.parkPrimary)
                        Text(time)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    Text(gameName)
                        .font(.body)
                        .foregroundColor(.white.opacity(0.6))
                    Text("₩\(price.formatted())")
                        .font(.body)
                        .foregroundColor(Color.parkPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(Color.parkPrimary)
                }
            }
            .padding(12)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? Color.parkPrimary.opacity(0.4) : Color.white.opacity(0.1),
                        lineWidth: isSelected ? 1.5 : 1
                    )
            )
            .opacity(isDisabled ? 0.5 : 1.0)
        }
        .disabled(onSelect == nil || isDisabled)
    }
}
