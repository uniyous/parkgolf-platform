import {
  useMyBookingsQuery,
  useBookingByNumberQuery,
  useBookingQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useCancelBookingMutation,
} from './queries/booking';
import type { CreateBookingRequest, UpdateBookingRequest } from '@/lib/api/bookingApi';

// Note: useGameTimeSlots is exported from useGames.ts

export const useBooking = () => {
  const createBookingMutation = useCreateBookingMutation();
  const updateBookingMutation = useUpdateBookingMutation();
  const cancelBookingMutation = useCancelBookingMutation();

  const createBooking = async (bookingData: CreateBookingRequest) => {
    try {
      const result = await createBookingMutation.mutateAsync(bookingData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Booking creation failed:', error);
      return { success: false, error };
    }
  };

  const updateBooking = async (id: number, updates: UpdateBookingRequest) => {
    try {
      const result = await updateBookingMutation.mutateAsync({ id, updates });
      return { success: true, data: result };
    } catch (error) {
      console.error('Booking update failed:', error);
      return { success: false, error };
    }
  };

  const cancelBooking = async (id: number, reason?: string) => {
    try {
      const result = await cancelBookingMutation.mutateAsync({ id, reason });
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
    isCreating: createBookingMutation.isPending,
    isUpdating: updateBookingMutation.isPending,
    isCanceling: cancelBookingMutation.isPending,
    isLoading:
      createBookingMutation.isPending ||
      updateBookingMutation.isPending ||
      cancelBookingMutation.isPending,
  };
};

export const useMyBookings = () => {
  const { data: bookings, isLoading, error, refetch } = useMyBookingsQuery();

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
  } = useBookingByNumberQuery(bookingNumber || '');

  const {
    data: bookingById,
    isLoading: isLoadingById,
    error: errorById,
  } = useBookingQuery(bookingId || 0);

  const booking = bookingNumber ? bookingByNumber : bookingById;
  const isLoading = isLoadingByNumber || isLoadingById;
  const error = errorByNumber || errorById;

  return {
    booking,
    isLoading,
    error,
  };
};
