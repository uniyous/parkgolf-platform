package com.parkgolf.app.util

/**
 * 전화번호 포맷팅 (010-1234-5678 형식)
 * 입력: "01012345678" 또는 "010-1234-5678"
 * 출력: "010-1234-5678"
 */
fun String.formatPhoneNumber(): String {
    // 숫자만 추출
    val digits = this.filter { it.isDigit() }

    return when {
        digits.length == 11 && digits.startsWith("010") -> {
            "${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7, 11)}"
        }
        digits.length == 10 && digits.startsWith("02") -> {
            // 서울 지역번호 (02-1234-5678)
            "${digits.substring(0, 2)}-${digits.substring(2, 6)}-${digits.substring(6, 10)}"
        }
        digits.length == 10 -> {
            // 기타 지역번호 (031-123-4567)
            "${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6, 10)}"
        }
        else -> this // 형식이 맞지 않으면 원본 반환
    }
}

/**
 * 전화번호에서 숫자만 추출
 * 입력: "010-1234-5678"
 * 출력: "01012345678"
 */
fun String.unformatPhoneNumber(): String {
    return this.filter { it.isDigit() }
}
