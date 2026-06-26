package com.parkgolf.app.util

import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * 채팅 메시지 시각 처리 (UNI-38).
 *
 * - 서버는 createdAt/timestamp 를 UTC ISO("...Z")로 내려줌.
 * - 화면 표시는 KST(Asia/Seoul) "오전/오후 hh:mm" (web 과 동일 포맷).
 * - 저장은 KST-naive LocalDateTime 으로 통일(수신 시점에 1회 변환) → 표시단은 변환 없이 포맷만.
 *   로컬 생성 메시지는 [nowKst], 서버 시각은 [parseServerToKst] 로 통일해 정렬 시계도 일치.
 */
object ChatDateTime {
    private val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
    private val UTC: ZoneId = ZoneId.of("UTC")
    private val timeFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("a hh:mm", Locale.KOREAN)

    /** 현재 KST 시각(naive). 로컬 생성 메시지 createdAt 용. */
    fun nowKst(): LocalDateTime = LocalDateTime.now(SEOUL)

    /** 서버 UTC ISO → KST LocalDateTime. 파싱 실패 시 null. */
    fun parseServerToKst(iso: String?): LocalDateTime? {
        if (iso.isNullOrBlank()) return null
        // 1) "...Z" instant
        runCatching { return Instant.parse(iso).atZone(SEOUL).toLocalDateTime() }
        // 2) offset 포함 ("+09:00" 등)
        runCatching { return OffsetDateTime.parse(iso).atZoneSameInstant(SEOUL).toLocalDateTime() }
        // 3) offset 없는 ISO_LOCAL_DATE_TIME 은 UTC 로 간주 후 변환
        runCatching {
            return LocalDateTime.parse(iso, DateTimeFormatter.ISO_DATE_TIME)
                .atZone(UTC).withZoneSameInstant(SEOUL).toLocalDateTime()
        }
        return null
    }

    /** KST-naive LocalDateTime → "오전/오후 hh:mm". */
    fun formatTime(dateTime: LocalDateTime): String = dateTime.format(timeFormatter)
}
