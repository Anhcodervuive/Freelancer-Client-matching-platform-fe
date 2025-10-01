import type { Socket } from 'socket.io-client'

import type {
	CHAT_PRESENCE_REPSONSE,
	CHAT_PRESENCE_SYNC_REPSPONSE,
	ChatClientEvent,
	ChatServerEvent
} from '~/constants/chat'
import type { ChatMessage } from '~/types/chat'

export type ServerToClientEvents = {
	[ChatServerEvent.CHAT_SEND_MESSAGE]: (_message: ChatMessage) => void
}

export type ClientToServerEvents = {
	[ChatClientEvent.CHAT_PRESENCE_SYNC]: (_presences: CHAT_PRESENCE_SYNC_REPSPONSE) => void
	[ChatClientEvent.CHAT_PRESENCE]: (_presence: CHAT_PRESENCE_REPSONSE) => void
}

export type ChatSocketContextValue = {
	socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
	isConnected: boolean
	isConnecting: boolean
	participantOnlineIds: string[]
	disconnect: () => void
	connect: () => void
}
