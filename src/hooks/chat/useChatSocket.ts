import { useContext } from 'react'
import { ChatSocketContext } from '~/contexts/chat-socket/chatSocketContext'

export const useChatSocket = () => {
	const context = useContext(ChatSocketContext)

	if (!context) {
		throw new Error('useChatSocket must be used within a ChatSocketProvider')
	}

	return context
}
