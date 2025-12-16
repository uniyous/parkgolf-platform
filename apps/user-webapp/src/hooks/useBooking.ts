import { useState } from 'react';
import {
  useGetTimeSlotsQuery,
  useCreateBookingMutation,
  useGetMyBookingsQuery,
  useGetBookingByNumberQuery,
  useGetBookingByIdQuery,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  CreateBookingRequest,
  UpdateBookingRequest,
} from '../redux/api/bookingApi';

export const useTimeSlots = (courseId: number, date: string) => {
  const {
    data: timeSlots,
    isLoading,
    error,
    refetch,
  } = useGetTimeSlotsQuery(
    { courseId, date },
    {
      skip: !courseId || !date,
    }
  );

  return {
    timeSlots: timeSlots || [],
    isLoading,
    error,
    refetch,
  };
};

export const useBooking = () => {
  const [createBookingMutation, { isLoading: isCreating }] = useCreateBookingMutation();
  const [updateBookingMutation, { isLoading: isUpdating }] = useUpdateBookingMutation();
  const [cancelBookingMutation, { isLoading: isCanceling }] = useCancelBookingMutation();

  const createBooking = async (bookingData: CreateBookingRequest) => {
    try {
      const result = await createBookingMutation(bookingData).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('Booking creation failed:', error);
      return { success: false, error };
    }
  };

  const updateBooking = async (id: number, updates: UpdateBookingRequest) => {
    try {
      const result = await updateBookingMutation({ id, updates }).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('Booking update failed:', error);
      return { success: false, error };
    }
  };

  const cancelBooking = async (id: number, reason?: string) => {
    try {
      const result = await cancelBookingMutation({ id, reason }).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('Booking cancellation failed:', error);
      return { success: false, error };
    }
  };

  return {
    createBooking,
    updateBooking,
    cancelBooking,
    isCreating,
    isUpdating,
    isCanceling,
    isLoading: isCreating || isUpdating || isCanceling,
  };
};

export const useMyBookings = () => {
  const {
    data: bookings,
    isLoading,
    error,
    refetch,
  } = useGetMyBookingsQuery();

  return {
    bookings: bookings || [],
    isLoading,
    error,
    refetch,
  };
};

export const useBookingDetail = (bookingNumber?: string, bookingId?: number) => {
  const {
    data: bookingByNumber,
    isLoading: isLoadingByNumber,
    error: errorByNumber,
  } = useGetBookingByNumberQuery(bookingNumber!, {
    skip: !bookingNumber,
  });

  const {
    data: bookingById,
    isLoading: isLoadingById,
    error: errorById,
  } = useGetBookingByIdQuery(bookingId!, {
    skip: !bookingId,
  });

  const booking = bookingByNumber || bookingById;
  const isLoading = isLoadingByNumber || isLoadingById;
  const error = errorByNumber || errorById;

  return {
    booking,
    isLoading,
    error,
  };
};