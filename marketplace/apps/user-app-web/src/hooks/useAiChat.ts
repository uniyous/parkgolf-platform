import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatApi, type AiChatRequest, type AiChatResponse, type ConversationState } from '@/lib/api/chatApi';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

export function useAiChat(roomId: string) {
  const [isAiMode, setIsAiMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversationState, setConversationState] = useState<ConversationState>('IDLE');
  const { latitude, longitude } = useCurrentLocation();

  const mutation = useMutation({
    mutationFn: (request: string | AiChatRequest) => {
      const req: AiChatRequest = typeof request === 'string'
        ? { message: request, conversationId, latitude, longitude }
        : { ...request, conversationId: request.conversationId ?? conversationId, latitude: request.latitude ?? latitude, longitude: request.longitude ?? longitude };
      return chatApi.sendAiMessage(roomId, req);
    },
    onSuccess: (data: AiChatResponse) => {
      setConversationId(data.conversationId);
      setConversationState(data.state);
    },
  });

  const toggleAiMode = useCallback(() => {
    setIsAiMode((prev) => {
      if (prev) {
        // Turning off: reset conversation
        setConversationId(undefined);
        setConversationState('IDLE');
      }
      return !prev;
    });
  }, []);

  const sendAiMessage = useCallback(
    async (request: string | AiChatRequest) => {
      return mutation.mutateAsync(request);
    },
    [mutation],
  );

  return {
    isAiMode,
    toggleAiMode,
    conversationId,
    conversationState,
    sendAiMessage,
    isAiLoading: mutation.isPending,
    aiError: mutation.error,
  };
}
