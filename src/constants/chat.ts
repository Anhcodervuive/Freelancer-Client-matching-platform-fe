export const CHAT_NAMESPACE = '/chat'

export interface CHAT_PRESENCE_REPSONSE {
	threadId: string
	userId: string
	status: 'online' | 'offline'
}

export const ChatServerEvent = {
	CHAT_JOIN: 'chat:join',
	CHAT_LEAVE: 'chat:leave',
	CHAT_TYPING: 'chat:typing',
	CHAT_SEND_MESSAGE: 'chat:send-message',
	CHAT_READ: 'chat:send-message'
}

export const ChatClientEvent = {
	CHAT_TYPING: 'chat:typing',
	CHAT_NEW_MESSAGE: 'chat:message',
	CHAT_READ: 'chat:read',
	CHAT_PRESENCE: 'chat:presence'
}

export type ChatServerEventKey = (typeof ChatServerEvent)[keyof typeof ChatServerEvent]
export type ChatClientEventKey = (typeof ChatClientEvent)[keyof typeof ChatClientEvent]
