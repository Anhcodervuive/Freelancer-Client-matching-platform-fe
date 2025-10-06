import type { ChatMessageType } from '~/types/chat'
import type { Role } from '~/types/user'

export const CHAT_NAMESPACE = '/chat'

export interface CHAT_PRESENCE_REPSONSE {
	threadId: string
	userId: string
	status: 'online' | 'offline'
}

type ChatThreadParticipantSummary = {
	id: string
	userId: string
	role: Role
	profile: {
		firstName: string | null
		lastName: string | null
	}
}

export interface CHAT_PRESENCE_SYNC_REPSPONSE {
	threads: {
		threadId: string
		presence: Record<string, boolean>
		participants: ChatThreadParticipantSummary[]
	}[]
}

export interface SendMessagePayload {
	threadId: string
	body: string
	tempId?: string
	type?: ChatMessageType
	metadata?: Record<string, unknown>
	attachments: {
		provider: 'cloudinary' | 'r2'
		kind: 'image' | 'video' | 'file'
		url: string
		publicId?: string
		width?: number
		height?: number
		duration?: number
		mime: string
		name: string
		size: number
		key?: string
		bucket?: string
	}[]
}

// client emit to server
export const ChatServerEvent = {
	CHAT_JOIN: 'chat:join',
	CHAT_LEAVE: 'chat:leave',
	CHAT_TYPING: 'chat:typing',
	CHAT_SEND_MESSAGE: 'chat:send-message',
	CHAT_READ: 'chat:read'
}

// client listen event from server
export const ChatClientEvent = {
	CHAT_JOIN: 'chat:join',
	CHAT_LEAVE: 'chat:leave',
	CHAT_TYPING: 'chat:typing',
	CHAT_NEW_MESSAGE: 'chat:message',
	CHAT_READ: 'chat:read',
	CHAT_PRESENCE: 'chat:presence',
	CHAT_PRESENCE_SYNC: 'chat:presence-sync',
	CHAT_THREAD_UNREAD: 'chat:thread-unread'
}

export type ChatServerEventKey = (typeof ChatServerEvent)[keyof typeof ChatServerEvent]
export type ChatClientEventKey = (typeof ChatClientEvent)[keyof typeof ChatClientEvent]
