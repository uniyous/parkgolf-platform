import { baseApi } from './baseApi';

export interface TimeSlot {
  id: number;
  time: string;
  date: string;
  available: boolean;
  price: number;
  isPremium?: boolean;
  remaining: number;
}

export interface CreateBookingRequest {
  courseId: number;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
}

export interface BookingResponse {
  id: number;
  bookingNumber: string;
  userId: number;
  courseId: number;
  courseName: string;
  courseLocation: string;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  pricePerPerson: number;
  serviceFee: number;
  totalPrice: number;
  status: string;
  paymentMethod?: string;
  specialRequests?: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBookingRequest {
  playerCount?: number;
  specialRequests?: string;
  userPhone?: string;
}

export const bookingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTimeSlots: builder.query<TimeSlot[], { courseId: number; date: string }>({
      query: ({ courseId, date }) => ({
        url: `/bookings/courses/${courseId}/time-slots`,
        params: { date },
      }),
      providesTags: (result, error, { courseId, date }) => [
        { type: 'TimeSlot', id: `${courseId}-${date}` },
      ],
    }),

    createBooking: builder.mutation<BookingResponse, CreateBookingRequest>({
      query: (bookingData) => ({
        url: '/bookings',
        method: 'POST',
        body: bookingData,
      }),
      invalidatesTags: ['Booking', 'TimeSlot'],
    }),

    getMyBookings: builder.query<BookingResponse[], void>({
      query: () => '/bookings',
      providesTags: ['Booking'],
    }),

    getBookingByNumber: builder.query<BookingResponse, string>({
      query: (bookingNumber) => `/bookings/number/${bookingNumber}`,
      providesTags: (result, error, bookingNumber) => [
        { type: 'Booking', id: bookingNumber },
      ],
    }),

    getBookingById: builder.query<BookingResponse, number>({
      query: (id) => `/bookings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),

    updateBooking: builder.mutation<BookingResponse, { id: number; updates: UpdateBookingRequest }>({
      query: ({ id, updates }) => ({
        url: `/bookings/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Booking', id }],
    }),

    cancelBooking: builder.mutation<BookingResponse, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${id}`,
        method: 'DELETE',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Booking', id },
        'TimeSlot',
      ],
    }),
  }),
});

export const {
  useGetTimeSlotsQuery,
  useCreateBookingMutation,
  useGetMyBookingsQuery,
  useGetBookingByNumberQuery,
  useGetBookingByIdQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
} = bookingApi;