import type {
	AdminReviewListFilters,
	AdminReviewListResponse,
	AdminReviewDetail,
	AdminReviewStats,
	AdminUserReviewSummary
} from '~/types/admin-review'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/admin/reviews'

export const getAdminReviews = async (filters: AdminReviewListFilters = {}): Promise<AdminReviewListResponse> => {
	const params = new URLSearchParams()
	
	if (filters.page) params.append('page', String(filters.page))
	if (filters.limit) params.append('limit', String(filters.limit))
	if (filters.search) params.append('search', filters.search)
	if (filters.reviewerRole) params.append('reviewerRole', filters.reviewerRole)
	if (filters.minRating) params.append('minRating', String(filters.minRating))
	if (filters.maxRating) params.append('maxRating', String(filters.maxRating))
	if (filters.reviewerId) params.append('reviewerId', filters.reviewerId)
	if (filters.revieweeId) params.append('revieweeId', filters.revieweeId)
	if (filters.contractId) params.append('contractId', filters.contractId)
	if (filters.createdFrom) params.append('createdFrom', filters.createdFrom)
	if (filters.createdTo) params.append('createdTo', filters.createdTo)
	if (filters.sortBy) params.append('sortBy', filters.sortBy)
	if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

	const response = await authorizeAxiosInstance.get(`${baseUrl}?${params.toString()}`)
	return response.data
}

export const getAdminReviewDetail = async (reviewId: string): Promise<AdminReviewDetail> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/${reviewId}`)
	return response.data
}

export const getAdminReviewStats = async (): Promise<AdminReviewStats> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/stats`)
	return response.data
}

export const getAdminUserReviewSummary = async (userId: string): Promise<AdminUserReviewSummary> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/user/${userId}`)
	return response.data
}
