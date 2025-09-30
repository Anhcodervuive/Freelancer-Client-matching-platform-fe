import type { ListResponse } from '~/types/api.response'
import type { chatThread, ChatThreadType } from '~/types/chat'
import type { Role } from '~/types/user'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/chat'

export type ChatThreadsSearchParam = {
	page: number
	limit: number
	type: ChatThreadType
	jobPostId: string
	contractId: string
	search: string
	participantRole: Role
	includeParticipants: boolean
	includeLastMessage: boolean
}

export type ChatSearchParam = {
	limit: number
	cursor: string
	direction: 'before' | 'after'
	includeReceipts: boolean
	includeAttachments: boolean
}

export const getAllChatThread = async (params: ChatThreadsSearchParam): Promise<ListResponse<chatThread>> => {
	const res = await authorizeAxiosInstance.get(`${baseUrl}/threads`, {
		params
	})
	return res.data
}

export const getChatDetail = async (threadId: string) => {
	const res = await authorizeAxiosInstance.get(`${baseUrl}/threads/${threadId}`)

	return res.data
}

export const getChatThreadMessages = async (threadId: string, params: ChatSearchParam) => {
	const res = await authorizeAxiosInstance.get(`${baseUrl}/threads/${threadId}/messages`, {
		params
	})

	return res.data
}

export const markChatThreadAsRead = async (threadId: string, messageId?: string) => {
	const res = await authorizeAxiosInstance.post(`${baseUrl}/threads/${threadId}/read`, {
		messageId
	})

	return res.data
}
