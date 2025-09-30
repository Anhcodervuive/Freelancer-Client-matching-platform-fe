import type { Role } from './user'

export enum ChatThreadType {
	'PROJECT',
	'ADMIN_CLIENT',
	'ADMIN_FREELANCER'
}

export interface ChatMessage {
	id: string
	createdAt: Date
	deletedAt: Date | null
	metadata: object | null
	threadId: string
	senderId: string | null
	senderRole: Role | null
	body: string | null
	richPayload: object | null
	sentAt: Date
	editedAt: Date | null
}

export interface chatThread {
	id: string
	type: ChatThreadType
	jobPostId: string | null
	contractId: string | null
	subject: string | null
	metadata: object | null
	createdAt: Date
	updatedAt: Date
}

export interface ChatParticipant {
	id: string
	threadId: string
	userId: string
	role: Role
	joinedAt: Date
	leftAt: Date | null
	lastReadMessageId: string | null
	lastReadAt: Date | null
	isMuted: Boolean
	metadata: object | null
}

export interface ChatMessageAttachment {
	id: string
	messageId: string
	assetId: string | null
	url: string | null
	name: string | null
	mimeType: string | null
	size: number | null
	metadata: object | null
	createdAt: Date
}

export interface ChatMessageReceipt {
	id: string
	messageId: string
	participantId: string
	deliveredAt: Date | null
	readAt: Date | null
	metadata: object | null
	createdAt: Date
}
