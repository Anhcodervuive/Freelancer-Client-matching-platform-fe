import { useQuery } from '@tanstack/react-query'
import { getAllChatThread, type ChatThreadsSearchParam } from '~/apis/chat.api'
import {
	CHAT_NAMESPACE,
	type CHAT_PRESENCE_REPSONSE,
	type CHAT_PRESENCE_SYNC_REPSPONSE,
	ChatClientEvent,
	type ChatServerEvent
} from '~/constants/chat'
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
	[ChatClientEvent.CHAT_PRESENCE_SYNC]: (_presences: CHAT_PRESENCE_SYNC_REPSPONSE) => void
}

export const ThreadChatsQCkey = 'threadChats'

export default function useThreadChats(searchParams: ChatThreadsSearchParam) {
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
			console.log(presence)
			if (presence.status === 'online') {
				setParticipantOnline(prev => [...prev, presence])
			} else {
				setParticipantOnline(prev => prev.filter(p => p.userId !== presence.userId))
			}
		}

		const handleUserPresenceSync = (presences: CHAT_PRESENCE_SYNC_REPSPONSE) => {
			console.log(presences)
		}

		// Khi người dùng khác trong 1 thread chat mà chúng ta tham gia online
		socket.on(ChatClientEvent.CHAT_PRESENCE, handleUserPresence)
		// Khi chúng ta online thì server lấy dang sách thread chứa người dùng online và báo cho người dùng đang online là chúng ta đã online
		socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handleUserPresenceSync)

		return () => {
			socket.off(ChatClientEvent.CHAT_PRESENCE, handleUserPresence)
			socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handleUserPresenceSync)
		}
	}, [socket])

	return {
		threadChats,
		isLoadingThreadChats,
		threadChatError,
		participantOnline
	}
}
