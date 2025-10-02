import type { Socket } from 'socket.io-client'

import type {
	CHAT_PRESENCE_REPSONSE,
	CHAT_PRESENCE_SYNC_REPSPONSE,
	ChatClientEvent,
	ChatServerEvent
} from '~/constants/chat'
import type { ChatMessage, ChatThreadType } from '~/types/chat'
import type { Role } from '~/types/user'

export type JoinThreadPayload = {
	threadId: string
}

export type ChatThreadParticipantSummary = {
	id: string
	userId: string
	role: Role
	avatar: string | null
	profile: {
		firstName: string | null
		lastName: string | null
	}
}

export type ChatThreadSummary = {
	id: string
	type: ChatThreadType
	subject: string | null
	jobPostId: string | null
	contractId: string | null
	participants: ChatThreadParticipantSummary[]
}

export type JoinThreadRes = {
	success: boolean
	data?: {
		thread: ChatThreadSummary
		presence: Record<string, boolean>
	}
	message: unknown
}

export interface TypingPayload {
	threadId: string
	isTyping: boolean
}

export interface TypingResponse {
	threadId: string
	userId: string
	isTyping: boolean
}

export type ServerToClientEvents = {
	[ChatServerEvent.CHAT_SEND_MESSAGE]: (_message: ChatMessage) => void
	[ChatServerEvent.CHAT_JOIN]: (_joinThreadPayload: JoinThreadPayload) => void
	[ChatServerEvent.CHAT_TYPING]: () => void
}

export type ClientToServerEvents = {
	[ChatClientEvent.CHAT_PRESENCE_SYNC]: (_presences: CHAT_PRESENCE_SYNC_REPSPONSE) => void
	[ChatClientEvent.CHAT_PRESENCE]: (_presence: CHAT_PRESENCE_REPSONSE) => void
	[ChatServerEvent.CHAT_TYPING]: () => void
}

export type ChatSocketContextValue = {
	socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
	isConnected: boolean
	isConnecting: boolean
	participantOnlineIds: string[]
	disconnect: () => void
	connect: () => void
	joinChat: (_joinThreadPayload: JoinThreadPayload) => void
	leaveChat: (_joinThreadPayload: JoinThreadPayload) => void
	joinThreadRes: JoinThreadRes | undefined
	typingMessage: (_typingThreadPayload: TypingPayload) => void
	typingUserList: ChatThreadParticipantSummary[]
}
