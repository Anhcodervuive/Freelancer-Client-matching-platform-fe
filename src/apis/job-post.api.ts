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

export const listJobPosts = async (params: JobPostFilterInput = {}): Promise<JobPostListResponse> => {
        const response = await authorizeAxiosInstance.get(jobPostBaseUrl, { params })
        return response.data
}

export const getJobPost = async (id: string): Promise<JobPostDetailResponse> => {
        const response = await authorizeAxiosInstance.get(`${jobPostBaseUrl}/${id}`)
        return response.data
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
