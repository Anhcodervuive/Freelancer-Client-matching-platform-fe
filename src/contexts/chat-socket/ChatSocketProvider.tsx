import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { CHAT_NAMESPACE, ChatClientEvent } from '~/constants/chat'
import { useCredentialedSocket } from '~/hooks/useCredentialedSocket'
import { selectCurrentUser } from '~/redux/user/userSlice'

import { ChatSocketContext } from './chatSocketContext'
import type { CHAT_PRESENCE_REPSONSE, CHAT_PRESENCE_SYNC_REPSPONSE } from '~/constants/chat'
import type { ChatSocketContextValue, ClientToServerEvents, ServerToClientEvents } from './types'

export const ChatSocketProvider = ({ children }: { children: ReactNode }) => {
	const currentUser = useSelector(selectCurrentUser)
	const currentUserId = currentUser?.id
	const [participantOnlineIds, setParticipantOnlineIds] = useState<string[]>([])

	const { socket, isConnected, isConnecting, connect, disconnect } = useCredentialedSocket<
		ServerToClientEvents,
		ClientToServerEvents
	>(CHAT_NAMESPACE, {
		enabled: Boolean(currentUserId),
		autoConnect: true,
		maxAuthRetries: 2
	})

	useEffect(() => {
		if (!socket) {
			return undefined
		}

		const handlePresence = (presence: CHAT_PRESENCE_REPSONSE) => {
			console.log(presence)
			if (presence.userId !== currentUserId && presence.status === 'online')
				setParticipantOnlineIds(prev => {
					const setParticipantOnlineIds = new Set([...prev, presence.userId])
					return Array.from(setParticipantOnlineIds)
				})
			else if (presence.userId !== currentUserId && presence.status === 'offline') {
				setParticipantOnlineIds(prev => {
					const setParticipantOnlineIds = new Set(prev.filter(p => !p.includes(presence.userId)))
					return Array.from(setParticipantOnlineIds)
				})
			}
		}

		const handlePresenceSync = (payload: CHAT_PRESENCE_SYNC_REPSPONSE) => {
			const hasOnlineParticipantThreads = payload.threads

			if (hasOnlineParticipantThreads?.length === 0) return

			const onlinePartipantIds = new Set<string>()
			hasOnlineParticipantThreads?.forEach(t => {
				Object.keys(t.presence).forEach(userId => {
					if (t.presence[userId] && userId !== currentUserId) {
						onlinePartipantIds.add(userId)
					}
				})
			})

			setParticipantOnlineIds(Array.from(onlinePartipantIds.keys()))
		}

		socket.on(ChatClientEvent.CHAT_PRESENCE, handlePresence)
		socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)

		return () => {
			socket.off(ChatClientEvent.CHAT_PRESENCE, handlePresence)
			socket.off(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
		}
	}, [currentUserId, socket])

	useEffect(() => {
		if (!currentUserId) {
			setParticipantOnlineIds([])
		}
	}, [currentUserId])

	useEffect(() => {
		return () => {
			disconnect()
		}
	}, [disconnect])

	const value = useMemo<ChatSocketContextValue>(
		() => ({
			socket,
			isConnected,
			isConnecting,
			participantOnlineIds,
			connect,
			disconnect
		}),
		[socket, isConnected, isConnecting, participantOnlineIds, connect, disconnect]
	)

	return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}
