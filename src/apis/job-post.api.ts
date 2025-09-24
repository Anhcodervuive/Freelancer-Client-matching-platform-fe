import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        JobDurationCommitment,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobStatus,
        JobVisibility
} from '~/constants/job'
import type { LanguageProficiency } from '~/types/profile'
import type { JobPostDetail, JobPostFilterInput, PaginatedJobPostResponse } from '~/types/job-post'

const jobPostBaseUrl = '/job-posts'

type JobPostPreferredLocation = string | { code: string; label: string }

type JobPostLanguageRequirement = {
        languageCode: string
        proficiency: LanguageProficiency
}

type JobPostSkillsPayload = {
        required: string[]
        preferred: string[]
}

type JobPostScreeningQuestionPayload = {
        question: string
        isRequired: boolean
}

type JobPostPayload = {
        specialtyId: string
        title: string
        description: string
        paymentMode: JobPaymentMode
        formVersion: string
        budgetAmount?: number | null
        budgetCurrency?: string | null
        duration?: JobDurationCommitment | null
        experienceLevel: JobExperienceLevel
        locationType?: JobLocationType | null
        preferredLocations?: JobPostPreferredLocation[]
        customTerms?: Record<string, unknown>
        visibility?: JobVisibility
        status?: JobStatus
        languages?: JobPostLanguageRequirement[]
        skills?: JobPostSkillsPayload
        screeningQuestions?: JobPostScreeningQuestionPayload[]
        attachments?: string[]
}

type UpdateJobPostPayload = Partial<JobPostPayload>

type JobPostDetailResponse = { jobPost: JobPostDetail }

type JobPostListResponse = PaginatedJobPostResponse

type JobPostRequest = {
        payload: JobPostPayload | UpdateJobPostPayload
        attachmentFiles?: File[]
}

const JSON_FIELD_KEYS: Array<keyof JobPostPayload> = [
        'preferredLocations',
        'customTerms',
        'languages',
        'skills',
        'screeningQuestions',
        'attachments'
]

const jsonFieldSet = new Set<string>(JSON_FIELD_KEYS)

const appendFormDataValue = (formData: FormData, key: string, value: unknown) => {
        if (value === undefined || value === null) {
                return
        }

        if (jsonFieldSet.has(key)) {
                formData.append(key, JSON.stringify(value))
                return
        }

        if (value instanceof Date) {
                formData.append(key, value.toISOString())
                return
        }

        formData.append(key, String(value))
}

const buildJobPostFormData = ({ payload, attachmentFiles = [] }: JobPostRequest): FormData => {
        const formData = new FormData()

        Object.entries(payload).forEach(([key, value]) => {
                appendFormDataValue(formData, key, value)
        })

        attachmentFiles.forEach(file => {
                formData.append('attachmentFiles', file)
        })

        return formData
}

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
        const response = await authorizeAxiosInstance.get(
                queryString ? `${jobPostBaseUrl}?${queryString}` : jobPostBaseUrl
        )
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

export const createJobPost = async ({ payload, attachmentFiles = [] }: JobPostRequest) => {
        const formData = buildJobPostFormData({ payload, attachmentFiles })
        const response = await authorizeAxiosInstance.post(jobPostBaseUrl, formData)
        return response.data
}

export const updateJobPost = async (
        id: string,
        { payload, attachmentFiles = [] }: JobPostRequest
) => {
        const formData = buildJobPostFormData({ payload, attachmentFiles })
        const response = await authorizeAxiosInstance.patch(`${jobPostBaseUrl}/${id}`, formData)
        return response.data
}

export const deleteJobPost = async (id: string) => {
        const response = await authorizeAxiosInstance.delete(`${jobPostBaseUrl}/${id}`)
        return response.data
}
