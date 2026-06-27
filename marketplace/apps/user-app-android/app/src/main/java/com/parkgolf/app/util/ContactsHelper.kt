package com.parkgolf.app.util

import android.content.Context
import android.provider.ContactsContract
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 연락처에서 전화번호를 추출하는 유틸리티
 *
 * iOS ContactsManager와 동일한 로직:
 * - 연락처에서 전화번호 추출
 * - 번호 정규화 (공백, 하이픈, 괄호 제거, +82 → 0 변환)
 * - 중복 제거
 */
@Singleton
class ContactsHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {

    /**
     * 연락처에서 전화번호 목록 추출
     */
    fun fetchPhoneNumbers(): List<String> {
        val phoneNumbers = mutableSetOf<String>()

        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            null,
            null,
            null
        )

        cursor?.use {
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (it.moveToNext()) {
                val number = it.getString(numberIndex) ?: continue
                val normalized = normalizePhoneNumber(number)
                if (normalized.isNotEmpty()) {
                    phoneNumbers.add(normalized)
                }
            }
        }

        return phoneNumbers.toList()
    }

    /**
     * 전화번호 정규화 (iOS와 동일한 로직)
     * - 공백, 하이픈, 괄호 제거
     * - +82 → 0 변환
     */
    private fun normalizePhoneNumber(number: String): String {
        return number
            .replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
            .replace("+82", "0")
    }
}
