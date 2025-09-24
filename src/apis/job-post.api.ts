import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { JobPostDetail, JobPostFilterInput, PaginatedJobPostResponse } from '~/types/job-post'

const jobPostBaseUrl = '/job-posts'

type JobPostPayload = {
	specialtyId: string
	title: string
	description: string
	paymentMode: string
	formVersion: string
	budgetAmount?: number | null
	budgetCurrency?: string | null
	duration?: string | null
	experienceLevel: string
	locationType?: string | null
	preferredLocations?: unknown
	customTerms?: Record<string, unknown>
	visibility?: string
	status?: string
	languages?: unknown
	skills?: unknown
	screeningQuestions?: unknown
	attachments?: string[]
}

type UpdateJobPostPayload = Partial<JobPostPayload>

type JobPostDetailResponse = { jobPost: JobPostDetail }

type JobPostListResponse = PaginatedJobPostResponse

const serializeFilters = (filters: JobPostFilterInput = {}) => {
	const serialized = new URLSearchParams()

	Object.entries(filters).forEach(([key, value]) => {
		if (value === undefined || value === null) {
			return
		}

		if (Array.isArray(value)) {
			value
				.map(item => {
					if (item === undefined || item === null) return null
					const asString = typeof item === 'string' ? item.trim() : String(item)
					return asString ? asString : null
				})
				.filter((item): item is string => Boolean(item))
				.forEach(item => serialized.append(key, item))

			return
		}

		if (value instanceof Date) {
			serialized.append(key, value.toISOString())
			return
		}

		if (typeof value === 'string') {
			const trimmed = value.trim()
			if (!trimmed) return
			serialized.append(key, trimmed)
			return
		}

		serialized.append(key, String(value))
	})

	return serialized.toString()
}

export const listJobPosts = async (params: JobPostFilterInput = {}): Promise<JobPostListResponse> => {
	const queryString = serializeFilters(params)
	const response = await authorizeAxiosInstance.get(queryString ? `${jobPostBaseUrl}?${queryString}` : jobPostBaseUrl)
	return response.data
}

export const getJobPost = async (id: string): Promise<JobPostDetailResponse> => {
	const response = await authorizeAxiosInstance.get(`${jobPostBaseUrl}/${id}`)
	return response.data
}

export const fetchJobPostDetail = async (id: string): Promise<JobPostDetail> => {
	const response = await getJobPost(id)
	const jobPost = response?.jobPost

	if (!jobPost) {
		throw new Error('Job post not found')
	}

	return jobPost
}

export const createJobPost = async (payload: JobPostPayload) => {
	const response = await authorizeAxiosInstance.post(jobPostBaseUrl, payload)
	return response.data
}

export const updateJobPost = async (id: string, payload: UpdateJobPostPayload) => {
	const response = await authorizeAxiosInstance.patch(`${jobPostBaseUrl}/${id}`, payload)
	return response.data
}

export const deleteJobPost = async (id: string) => {
	const response = await authorizeAxiosInstance.delete(`${jobPostBaseUrl}/${id}`)
	return response.data
}
