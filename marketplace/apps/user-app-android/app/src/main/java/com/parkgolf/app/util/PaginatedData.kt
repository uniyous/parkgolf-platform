package com.parkgolf.app.util

data class PaginatedData<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
) {
    val hasNextPage: Boolean
        get() = page < totalPages

    val hasPreviousPage: Boolean
        get() = page > 1

    val isEmpty: Boolean
        get() = data.isEmpty()
}
