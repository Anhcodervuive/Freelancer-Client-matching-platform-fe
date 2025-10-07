import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { CHAT_NAMESPACE, ChatClientEvent, ChatServerEvent } from '~/constants/chat'
import { useCredentialedSocket } from '~/hooks/useCredentialedSocket'
import { selectCurrentUser } from '~/redux/user/userSlice'

import { ChatSocketContext } from './chatSocketContext'
import type { CHAT_PRESENCE_REPSONSE, CHAT_PRESENCE_SYNC_REPSPONSE, SendMessagePayload } from '~/constants/chat'
import type {
	ChatSocketContextValue,
	ChatThreadParticipantSummary,
	ClientToServerEvents,
	JoinThreadPayload,
	JoinThreadRes,
	OurMessageIsReadBySomeOneRes,
	responsePayloadOfNewMessageReceive,
	ServerToClientEvents,
	SubmitIsReadMessagePayload,
	TypingPayload,
	TypingResponse,
	UnReadThreadMessageRes
} from './types'
import type { UploadedMeta } from '~/utils/directUploader'
import { toast } from 'react-toastify'
import {
	addUnReadMessageToThread,
	appendRealtimeMessage,
	MarkThreadChatAsReaAll,
	UpdateMessageIsReadBySomeOne
} from '~/hooks/chat/useThreadChats'
import { useQueryClient } from '@tanstack/react-query'

export const ChatSocketProvider = ({ children }: { children: ReactNode }) => {
	const qc = useQueryClient()
	const currentUser = useSelector(selectCurrentUser)
	const currentUserId = currentUser?.id
	const [participantOnlineIds, setParticipantOnlineIds] = useState<string[]>([])

	// Join chat
	const [joinThreadRes, setJoinThreadRes] = useState<JoinThreadRes>()
	const [typingUserList, setTyingUserList] = useState<ChatThreadParticipantSummary[]>([])
	const [isSendingMessage, setIsSendingMesaage] = useState(false)

	const { socket, isConnected, isConnecting, connect, disconnect } = useCredentialedSocket<
		ServerToClientEvents,
		ClientToServerEvents
	>(CHAT_NAMESPACE, {
		enabled: Boolean(currentUserId),
		autoConnect: true,
		maxAuthRetries: 2
	})

	const submitMessageIsRead = useCallback(
		(payload: SubmitIsReadMessagePayload) => {
			socket?.emit(ChatServerEvent.CHAT_READ, payload)
		},
		[socket]
	)

	useEffect(() => {
		if (!socket) {
			return undefined
		}

		const handlePresence = (presence: CHAT_PRESENCE_REPSONSE) => {
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
			if (payload.isTyping && payload.threadId === joinThreadRes?.data?.thread.id) {
				const participant = joinThreadRes.data.thread.participants.find(p => p.userId === payload.userId)
				setTyingUserList(prev => [...prev.filter(p => p.userId !== payload.userId), participant!])
			} else if (!payload.isTyping && payload.threadId === joinThreadRes?.data?.thread.id) {
				setTyingUserList(prev => [...prev.filter(p => p.userId !== payload.userId)])
			}
		}

		const handleNewMessageReceiveInThread = (payload: responsePayloadOfNewMessageReceive) => {
			appendRealtimeMessage(qc, payload.message.threadId, payload.message)
			// Nếu mà mình đang ở trong phòng chat hiện tại thì chắc chắn khi tin nhắn mới sẽ được gửi tới mình
			// Khi đó mình sẽ bắn 1 event là đã đọc cho tin nhắn hiện tại
			submitMessageIsRead({
				threadId: payload.message.threadId,
				messageId: payload.message.id
			})
		}

		const handleNewMessageFromVariousThread = (payload: UnReadThreadMessageRes) => {
			addUnReadMessageToThread(qc, payload.threadId, payload.message)
		}

		const handleMessgeIsReadBySomeOne = (payload: OurMessageIsReadBySomeOneRes) => {
			console.log(payload)
			UpdateMessageIsReadBySomeOne(qc, payload.threadId, payload.receipt)
		}

		socket.on(ChatClientEvent.CHAT_PRESENCE, handlePresence)
		socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
		socket.on(ChatClientEvent.CHAT_TYPING, handleOtherParticipantTyping)
		socket.on(ChatClientEvent.CHAT_NEW_MESSAGE, handleNewMessageReceiveInThread)
		socket.on(ChatClientEvent.CHAT_READ, handleMessgeIsReadBySomeOne)
		socket.on(ChatClientEvent.CHAT_THREAD_UNREAD, handleNewMessageFromVariousThread)

		return () => {
			socket.off(ChatClientEvent.CHAT_PRESENCE, handlePresence)
			socket.off(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
			socket.off(ChatClientEvent.CHAT_TYPING, handleOtherParticipantTyping)
			socket.off(ChatClientEvent.CHAT_NEW_MESSAGE, handleNewMessageReceiveInThread)
			socket.off(ChatClientEvent.CHAT_READ, handleMessgeIsReadBySomeOne)
			socket.off(ChatClientEvent.CHAT_THREAD_UNREAD, handleNewMessageFromVariousThread)
		}
	}, [currentUserId, joinThreadRes, qc, socket, submitMessageIsRead])

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
			socket?.emit(ChatServerEvent.CHAT_LEAVE, payload)
		},
		[socket]
	)

	const joinChat = useCallback(
		(payload: JoinThreadPayload) => {
			if (joinThreadRes?.data?.thread.id) {
				leaveChat({ threadId: joinThreadRes?.data?.thread.id })
			}
			socket?.emit(ChatServerEvent.CHAT_JOIN, payload, (res: JoinThreadRes) => {
				setJoinThreadRes(res)
				MarkThreadChatAsReaAll(qc, payload.threadId)
			})
		},
		[joinThreadRes?.data?.thread.id, leaveChat, qc, socket]
	)

	const typingMessage = useCallback(
		(payload: TypingPayload) => {
			socket?.emit(ChatServerEvent.CHAT_TYPING, payload)
		},
		[socket]
	)

	const sendMessage = useCallback(
		(message: string, uploadMeta: UploadedMeta[] = []) => {
			if (!joinThreadRes?.data?.thread.id) return

			const payload: SendMessagePayload = {
				threadId: joinThreadRes?.data?.thread.id,
				body: message,
				type: 'USER',
				attachments: uploadMeta
			}
			setIsSendingMesaage(true)
			socket?.emit(ChatServerEvent.CHAT_SEND_MESSAGE, payload, (res: { success: boolean }) => {
				setIsSendingMesaage(false)
				if (!res.success) {
					toast.error('Xảy ra lỗi trong quá trình lỗi tin nhắn')
				}
			})
		},
		[joinThreadRes?.data?.thread.id, socket]
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
			typingUserList,
			sendMessage,
			isSendingMessage
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
			typingUserList,
			sendMessage,
			isSendingMessage
		]
	)

	return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}
