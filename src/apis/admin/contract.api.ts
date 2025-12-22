import type {
	AdminContractListFilters,
	AdminContractListResponse,
	AdminContractDetail,
	AdminContractStats,
	AdminContractPaymentDetails
} from '~/types/admin-contract'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/admin/contracts'

export const getAdminContracts = async (
	filters: AdminContractListFilters = {}
): Promise<AdminContractListResponse> => {
	const params = new URLSearchParams()

	if (filters.page) params.append('page', String(filters.page))
	if (filters.limit) params.append('limit', String(filters.limit))
	if (filters.search) params.append('search', filters.search)
	if (filters.status) params.append('status', filters.status)
	if (filters.clientId) params.append('clientId', filters.clientId)
	if (filters.freelancerId) params.append('freelancerId', filters.freelancerId)
	if (filters.createdFrom) params.append('createdFrom', filters.createdFrom)
	if (filters.createdTo) params.append('createdTo', filters.createdTo)
	if (filters.sortBy) params.append('sortBy', filters.sortBy)
	if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

	const response = await authorizeAxiosInstance.get(`${baseUrl}?${params.toString()}`)
	return response.data
}

export const getAdminContractDetail = async (contractId: string): Promise<AdminContractDetail> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/${contractId}`)
	return response.data
}

export const getAdminContractStats = async (): Promise<AdminContractStats> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/stats`)
	return response.data
}

export const getAdminContractPaymentDetails = async (contractId: string): Promise<AdminContractPaymentDetails> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/${contractId}/payments`)
	return response.data
}
