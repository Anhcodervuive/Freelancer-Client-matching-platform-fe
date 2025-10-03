import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
	getAllChatThread,
	getChatThreadMessages,
	type ChatSearchParam,
	type ChatThreadsSearchParam
} from '~/apis/chat.api'
import { useChatSocket } from './useChatSocket'
import type { ChatMessage, ChatsReponse } from '~/types/chat'

export const ThreadChatsQCkey = 'threadChats'

export type ViewModel = {
	items: ChatMessage[]
	hasMore: boolean
	limit: number
	direction: 'before' | 'after'
	nextCursor?: string | null
}

export default function useThreadChats(searchParams: ChatThreadsSearchParam) {
	const { socket, participantOnlineIds, joinChat, typingMessage, joinThreadRes, leaveChat, typingUserList } =
		useChatSocket()

	const {
		data: threadChats,
		isLoading: isLoadingThreadChats,
		error: threadChatError
	} = useQuery({
		queryKey: [ThreadChatsQCkey],
		queryFn: () => getAllChatThread(searchParams)
	})

	const messageListQuery = useInfiniteQuery<
		ChatsReponse, // TQueryFnData
		Error, // TError
		ViewModel, // TData (giữ nguyên)
		['thread', string | undefined, 'messages', number], // TQueryKey
		ChatSearchParam // TPageParam  <-- quan trọng
	>({
		queryKey: ['thread', joinThreadRes?.data?.thread.id, 'messages', 20],
		enabled: !!joinThreadRes?.data?.thread.id,
		// pageParam ban đầu phải đúng ChatSearchParam
		initialPageParam: {
			limit: 20,
			cursor: undefined,
			direction: 'before',
			includeReceipts: true,
			includeAttachments: true
		},

		queryFn: ({ pageParam }) => getChatThreadMessages(joinThreadRes?.data?.thread?.id ?? '', pageParam),
		// trả về pageParam cho lần kế tiếp (giữ nguyên limit & flags, thay cursor)
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.nextCursor ? { ...lastPageParam, cursor: lastPage.nextCursor } : undefined,
		select: inf => {
			const items = inf.pages.flatMap(p => p.data) // gộp tất cả tin nhắn
			// đảm bảo thứ tự tăng dần theo thời gian (tuỳ server trả)
			items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

			const last = inf.pages[inf.pages.length - 1]
			return {
				items,
				hasMore: last?.hasMore ?? false,
				limit: last?.limit ?? 20,
				direction: last?.direction ?? 'before',
				nextCursor: last?.nextCursor ?? undefined
			} as ViewModel
		},
		refetchOnWindowFocus: false,
		staleTime: 5_000,
		gcTime: 30 * 60 * 1000 // 30 phút
	})

	return {
		socket,
		threadChats,
		isLoadingThreadChats,
		threadChatError,
		participantOnlineIds,
		joinChat,
		leaveChat,
		typingMessage,
		joinThreadRes,
		typingUserList,
		messageListQuery
	}
}
