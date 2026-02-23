import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatApi, type AiChatResponse } from '@/lib/api/chatApi';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

export function useAiChat(roomId: string) {
  const [isAiMode, setIsAiMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const { latitude, longitude } = useCurrentLocation();

  const mutation = useMutation({
    mutationFn: (message: string) =>
      chatApi.sendAiMessage(roomId, message, conversationId, latitude, longitude),
    onSuccess: (data: AiChatResponse) => {
      setConversationId(data.conversationId);
    },
  });

  const toggleAiMode = useCallback(() => {
    setIsAiMode((prev) => !prev);
  }, []);

  const sendAiMessage = useCallback(
    async (message: string) => {
      return mutation.mutateAsync(message);
    },
    [mutation],
  );

  return {
    isAiMode,
    toggleAiMode,
    conversationId,
    sendAiMessage,
    isAiLoading: mutation.isPending,
    aiError: mutation.error,
  };
}
