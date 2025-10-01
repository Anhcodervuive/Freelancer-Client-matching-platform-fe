import { useQuery } from '@tanstack/react-query'

import { getAllChatThread, type ChatThreadsSearchParam } from '~/apis/chat.api'
import { useChatSocket } from './useChatSocket'

export const ThreadChatsQCkey = 'threadChats'

export default function useThreadChats(searchParams: ChatThreadsSearchParam) {
	const { socket, participantOnlineIds } = useChatSocket()

	const {
		data: threadChats,
		isLoading: isLoadingThreadChats,
		error: threadChatError
	} = useQuery({
		queryKey: [ThreadChatsQCkey],
		queryFn: () => getAllChatThread(searchParams)
	})

	return {
		socket,
		threadChats,
		isLoadingThreadChats,
		threadChatError,
		participantOnlineIds
	}
}
