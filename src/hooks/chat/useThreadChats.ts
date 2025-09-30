import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllChatThread, type ChatThreadsSearchParam } from '~/apis/chat.api'
import { CHAT_NAMESPACE, type CHAT_PRESENCE_REPSONSE, ChatClientEvent, type ChatServerEvent } from '~/constants/chat'
import type { ChatMessage } from '~/types/chat'
import { useCredentialedSocket } from '../useCredentialedSocket'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { useEffect, useState } from 'react'

type ServerToClientEvents = {
	[ChatServerEvent.CHAT_JOIN]: (_chats: ChatMessage[]) => void
}

type ClientToServerEvents = {
	[ChatClientEvent.CHAT_PRESENCE]: (_presence: CHAT_PRESENCE_REPSONSE) => void
}

export const ThreadChatsQCkey = 'threadChats'

export default function useThreadChats(searchParams: ChatThreadsSearchParam) {
	const qc = useQueryClient()
	const currentUser = useSelector(selectCurrentUser)
	const currentUserId = currentUser?.id
	const [participantOnline, setParticipantOnline] = useState<CHAT_PRESENCE_REPSONSE[]>([])
	const { socket } = useCredentialedSocket<ServerToClientEvents, ClientToServerEvents>(CHAT_NAMESPACE, {
		enabled: Boolean(currentUserId),
		autoConnect: Boolean(currentUserId),
		maxAuthRetries: 2
	})

	const {
		data: threadChats,
		isLoading: isLoadingThreadChats,
		error: threadChatError
	} = useQuery({
		queryKey: [ThreadChatsQCkey],
		queryFn: () => getAllChatThread(searchParams)
	})

	useEffect(() => {
		if (!socket) {
			return undefined
		}

		const handleUserPresence = (presence: CHAT_PRESENCE_REPSONSE) => {
			setParticipantOnline(prev => [...prev, presence])
		}

		socket.on(ChatClientEvent.CHAT_PRESENCE, handleUserPresence)

		return () => {
			socket.off(ChatClientEvent.CHAT_PRESENCE, handleUserPresence)
		}
	}, [socket])

	return {
		threadChats,
		isLoadingThreadChats,
		threadChatError,
		participantOnline
	}
}
