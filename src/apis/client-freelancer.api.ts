import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { PaginatedClientFreelancerResponse } from '~/types/client-freelancer'

export type ClientFreelancerFilterInput = {
	page?: number
	limit?: number
	search?: string
	specialtyId?: string
	skillIds?: string[]
	country?: string
	saved?: boolean
	invitedJobId?: string
	jobId?: string
}

const baseUrl = '/client/freelancers'

const serializeFilters = (filters: ClientFreelancerFilterInput = {}) => {
	const params = new URLSearchParams()

	Object.entries(filters).forEach(([key, value]) => {
		if (value === undefined || value === null) return

		if (Array.isArray(value)) {
			value
				.map(item => {
					if (item === undefined || item === null) return null
					const normalized = typeof item === 'string' ? item.trim() : String(item)
					return normalized ? normalized : null
				})
				.filter((item): item is string => Boolean(item))
				.forEach(item => params.append(key, item))
			return
		}

		if (typeof value === 'string') {
			const trimmed = value.trim()
			if (!trimmed) return
			params.set(key, trimmed)
			return
		}

		params.set(key, String(value))
	})

	return params.toString()
}

const buildListUrl = (filters: ClientFreelancerFilterInput = {}) => {
	const query = serializeFilters(filters)
	return query ? `${baseUrl}?${query}` : baseUrl
}

export const listClientFreelancers = async (
	filters: ClientFreelancerFilterInput = {}
): Promise<PaginatedClientFreelancerResponse> => {
	const response = await authorizeAxiosInstance.get<PaginatedClientFreelancerResponse>(buildListUrl(filters))
	return response.data
}

export const saveClientFreelancer = async (freelancerId: string) => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/${freelancerId}/save`)
	return response.data
}

export const unsaveClientFreelancer = async (freelancerId: string) => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/${freelancerId}/save`)
	return response.data
}
