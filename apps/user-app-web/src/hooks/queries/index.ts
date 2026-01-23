// Query Keys
export * from './keys';

// Auth Queries & Mutations
export {
  useProfileQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} from './auth';

// Game Queries
export {
  useGamesQuery,
  useSearchGamesQuery,
  useGamesByClubQuery,
  useGameQuery,
  useGameTimeSlotsQuery,
  useAvailableTimeSlotsQuery,
} from './game';

// Booking Queries & Mutations
export {
  useTimeSlotsQuery,
  useTimeSlotAvailabilityQuery,
  useMyBookingsQuery,
  useSearchBookingsQuery,
  useBookingByNumberQuery,
  useBookingQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useCancelBookingMutation,
} from './booking';

// Friend Queries & Mutations
export {
  friendKeys,
  useFriendsQuery,
  useFriendRequestsQuery,
  useSentFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
} from './friend';

// Chat Queries & Mutations
export {
  chatKeys,
  useChatRoomsQuery,
  useChatRoomQuery,
  useMessagesQuery,
  useCreateChatRoomMutation,
  useGetOrCreateDirectChatMutation,
  useSendMessageMutation,
  useLeaveChatRoomMutation,
} from './chat';
