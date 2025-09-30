import type { CHAT_PRESENCE_REPSONSE, ChatClientEvent, ChatServerEvent } from '~/constants/chat'
import type { ChatMessage } from '~/types/chat'

type ServerToClientEvents = {
	[ChatServerEvent.CHAT_JOIN]: (_chats: ChatMessage[]) => void
}

type ClientToServerEvents = {
	[ChatClientEvent.CHAT_PRESENCE]: (_presence: CHAT_PRESENCE_REPSONSE) => void
}

export default function useChatGateway() {}
