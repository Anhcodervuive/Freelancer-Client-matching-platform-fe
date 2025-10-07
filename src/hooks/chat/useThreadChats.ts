import { QueryClient, useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import {
	getAllChatThread,
	getChatThreadMessages,
	type ChatSearchParam,
	type ChatThreadsSearchParam
} from '~/apis/chat.api'
import { useChatSocket } from './useChatSocket'
import type { ChatMessage, ChatMessageReceipt, ChatsReponse, chatThread } from '~/types/chat'
import type { ListResponse } from '~/types/api.response'

const sleep = (ms: number, signal?: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		const t = setTimeout(resolve, ms)
		if (signal) {
			signal.addEventListener(
				'abort',
				() => {
					clearTimeout(t)
					reject(new DOMException('Aborted', 'AbortError'))
				},
				{ once: true }
			)
		}
	})

export const ThreadChatsQCkey = 'threadChats'

export type ViewModel = {
	items: ChatMessage[]
	hasMore: boolean
	limit: number
	direction: 'before' | 'after'
	nextCursor?: string | null
}

type Key = ['thread', string, 'messages', number]

export function appendRealtimeMessage(
	qc: QueryClient,
	threadId: string,
	msg: ChatMessage,
	limit = 5 // khớp với key bạn đang dùng
) {
	const key: Key = ['thread', threadId, 'messages', limit]

	qc.setQueryData<InfiniteData<ChatsReponse>>(key, old => {
		if (!old) return old

		// chống trùng
		if (old.pages.some(p => p.data.some(m => m.id === msg.id))) return old

		const pages = old.pages.slice()
		const lastIdx = pages.length - 1
		if (lastIdx < 0) return old

		const last = pages[lastIdx]

		// Khi bạn gửi 1 tin nhắn mới tới thì bên những participant khác bạn cũng phải đã đọc tin nhắn đó rồi
		// Và tin nhắn cuối cùng bạn đọc phải là tin nhắn bạn mới gửi
		// Nhưng dữ liệu cũ thì tin nhắn cuối cùng bạn đọc lại là tin nhắn trước cuối cùng 1 tin nhắn, vì vậy chúng ta phải thay đổi nó
		const newData = last.data
		for (let i = newData.length - 1; i >= 0; i--) {
			const m = newData[i]
			msg.receipts.forEach(r => {
				const msgNeedUpdateLastRead = m.receipts.find(
					m =>
						m.participantId === r.participantId && m.participant?.lastReadMessageId !== r.participant?.lastReadMessageId
				)
				if (msgNeedUpdateLastRead?.participant) {
					msgNeedUpdateLastRead.participant.lastReadMessageId = msg.id
				}
			})
		}
		const updatedLast: ChatsReponse = {
			...last,
			// nếu server trả data đã theo thời gian tăng dần thì append cuối
			data: [...newData, msg]
			// giữ nguyên hasMore, limit, direction, nextCursor của trang
		}

		return {
			...old,
			pages: [...pages.slice(0, lastIdx), updatedLast],
			pageParams: old.pageParams // giữ nguyên
		}
	})
}

export function UpdateMessageIsReadBySomeOne(
	qc: QueryClient,
	threadId: string,
	receipt: ChatMessageReceipt,
	limit = 5
) {
	const key: Key = ['thread', threadId, 'messages', limit]
	qc.setQueryData<InfiniteData<ChatsReponse>>(key, old => {
		if (!old) return old

		const newPages = old.pages.map(p => {
			const newData = p.data.map(m => {
				m.receipts.forEach((r, i) => {
					if (r.participantId === receipt.participantId) {
						const needUpdateReceipt = m.receipts[i]
						if (needUpdateReceipt.participant) {
							needUpdateReceipt.participant.lastReadMessageId = receipt.messageId
						}
					}
				})
				if (m.id !== receipt.messageId) return m

				const receiptIndex = m.receipts.findIndex(r => r.id === receipt.id)
				if (receiptIndex === -1) return m

				// Tạo bản sao receipts với receipt được cập nhật
				const newReceipts = [...m.receipts]
				newReceipts[receiptIndex] = { ...receipt }

				// Trả về message mới (với receipts mới)
				return {
					...m,
					receipts: newReceipts
				}
			})

			// Trả về trang mới (với data mới)
			return {
				...p,
				data: newData
			}
		})

		return {
			...old,
			pages: newPages,
			pageParams: old.pageParams
		}
	})
}

export function MarkThreadChatAsReaAll(qc: QueryClient, threadId: string) {
	qc.setQueryData<ListResponse<chatThread>>([ThreadChatsQCkey], old => {
		if (!old) return old

		const newData = cloneDeep(old)

		newData.data.forEach((t, i) => {
			if (t.id === threadId) {
				newData.data[i] = {
					...t,
					unreadMessagesCount: 0
				}
			}
		})

		return {
			...newData
		}
	})
}

export function addUnReadMessageToThread(qc: QueryClient, threadId: string, message: ChatMessage) {
	qc.setQueryData<ListResponse<chatThread>>([ThreadChatsQCkey], old => {
		if (!old) return old
		console.log('time 1')

		const newData = cloneDeep(old)

		newData.data.forEach((t, i) => {
			if (t.id === threadId) {
				console.log(newData.data[i])
				newData.data[i] = {
					...t,
					messages: [message],
					unreadMessagesCount: newData.data[i].unreadMessagesCount + 1
				}
			}
		})

		return {
			...newData
		}
	})
}

export default function useThreadChats(searchParams: ChatThreadsSearchParam) {
	const {
		socket,
		participantOnlineIds,
		joinChat,
		typingMessage,
		joinThreadRes,
		sendMessage,
		leaveChat,
		typingUserList,
		isSendingMessage
	} = useChatSocket()

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
		queryKey: ['thread', joinThreadRes?.data?.thread.id, 'messages', 5],
		enabled: !!joinThreadRes?.data?.thread.id,
		// pageParam ban đầu phải đúng ChatSearchParam
		initialPageParam: {
			limit: 5,
			cursor: undefined,
			direction: 'before',
			includeReceipts: true,
			includeAttachments: true
		},

		queryFn: async ({ pageParam }) => {
			const api = getChatThreadMessages(joinThreadRes?.data?.thread?.id ?? '', pageParam)
			const [page] = await Promise.all([api, sleep(1000)])
			return page
		},
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
		sendMessage,
		joinThreadRes,
		typingUserList,
		messageListQuery,
		isSendingMessage
	}
}
