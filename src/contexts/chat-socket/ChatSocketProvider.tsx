import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { CHAT_NAMESPACE, ChatClientEvent, ChatServerEvent } from '~/constants/chat'
import { useCredentialedSocket } from '~/hooks/useCredentialedSocket'
import { selectCurrentUser } from '~/redux/user/userSlice'

import { ChatSocketContext } from './chatSocketContext'
import type { CHAT_PRESENCE_REPSONSE, CHAT_PRESENCE_SYNC_REPSPONSE } from '~/constants/chat'
import type {
	ChatSocketContextValue,
	ChatThreadParticipantSummary,
	ClientToServerEvents,
	JoinThreadPayload,
	JoinThreadRes,
	ServerToClientEvents,
	TypingPayload,
	TypingResponse
} from './types'

export const ChatSocketProvider = ({ children }: { children: ReactNode }) => {
	const currentUser = useSelector(selectCurrentUser)
	const currentUserId = currentUser?.id
	const [participantOnlineIds, setParticipantOnlineIds] = useState<string[]>([])

	// Join chat
	const [joinThreadRes, setJoinThreadRes] = useState<JoinThreadRes>()
	const [typingUserList, setTyingUserList] = useState<ChatThreadParticipantSummary[]>([])

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

		const handleOtherParticipantTyping = (payload: TypingResponse) => {
			console.log(payload)
			if (payload.isTyping && payload.threadId === joinThreadRes?.data?.thread.id) {
				const participant = joinThreadRes.data.thread.participants.find(p => p.userId === payload.userId)
				setTyingUserList(prev => [...prev.filter(p => p.userId !== payload.userId), participant!])
			} else if (!payload.isTyping && payload.threadId === joinThreadRes?.data?.thread.id) {
				setTyingUserList(prev => [...prev.filter(p => p.userId !== payload.userId)])
			}
		}

		socket.on(ChatClientEvent.CHAT_PRESENCE, handlePresence)
		socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
		socket.on(ChatClientEvent.CHAT_TYPING, handleOtherParticipantTyping)

		return () => {
			socket.off(ChatClientEvent.CHAT_PRESENCE, handlePresence)
			socket.off(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
		}
	}, [currentUserId, joinThreadRes, socket])

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

	const leaveChat = useCallback(
		(payload: JoinThreadPayload) => {
			socket?.emit(ChatServerEvent.CHAT_LEAVE, payload, (res: { success: boolean; message?: string }) =>
				console.log('leave chat', res)
			)
		},
		[socket]
	)

	const joinChat = useCallback(
		(payload: JoinThreadPayload) => {
			if (joinThreadRes?.data?.thread.id) {
				leaveChat({ threadId: joinThreadRes?.data?.thread.id })
			}
			socket?.emit(ChatServerEvent.CHAT_JOIN, payload, (res: JoinThreadRes) => {
				console.log('join chat', res)
				setJoinThreadRes(res)
			})
		},
		[joinThreadRes?.data?.thread.id, leaveChat, socket]
	)

	const typingMessage = useCallback(
		(payload: TypingPayload) => {
			socket?.emit(ChatServerEvent.CHAT_TYPING, payload)
		},
		[socket]
	)

	const value = useMemo<ChatSocketContextValue>(
		() => ({
			socket,
			isConnected,
			isConnecting,
			participantOnlineIds,
			connect,
			disconnect,
			joinChat,
			leaveChat,
			joinThreadRes,
			typingMessage,
			typingUserList
		}),
		[
			socket,
			isConnected,
			isConnecting,
			participantOnlineIds,
			connect,
			disconnect,
			joinChat,
			leaveChat,
			joinThreadRes,
			typingMessage,
			typingUserList
		]
	)

	return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}
