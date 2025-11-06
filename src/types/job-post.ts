import type {
	JobDurationCommitment,
	JobExperienceLevel,
	JobLocationType,
	JobPaymentMode,
	JobStatus,
	JobVisibility
} from '~/constants/job'

export type JobPostListItem = {
	id: string
	clientId: string
	formVersion: string
	specialty: {
		id: string
		name: string
		category: {
			id: string
			name: string
		}
	}
	title: string
	description: string
	paymentMode: JobPaymentMode
	budgetAmount: number | null
	budgetCurrency: string | null
	duration: JobDurationCommitment | null
	experienceLevel: JobExperienceLevel
	locationType: JobLocationType
	visibility: JobVisibility
        status: JobStatus
        publishedAt: string | null
        attachmentsCount: number
        createdAt?: string
        updatedAt?: string
        isSaved?: boolean
        isDeleted?: boolean | null
        deletedAt?: string | null
        [key: string]: unknown
}

export type JobPostDetail = JobPostListItem & {
	preferredLocations?: unknown
	customTerms?: Record<string, unknown> | null
	languages?: unknown
	skills?: unknown
	screeningQuestions?: unknown
	attachments?: unknown
}

export type JobPostFilterInput = {
	page?: number
	limit?: number
	search?: string
	statuses?: JobStatus[]
	paymentModes?: JobPaymentMode[]
	experienceLevels?: JobExperienceLevel[]
	locationTypes?: JobLocationType[]
	visibility?: JobVisibility
	formVersions?: string[]
	specialtyId?: string
	categoryId?: string
	languageCodes?: string[]
	skillIds?: string[]
	clientId?: string
	mine?: boolean
	hasAttachments?: boolean
	budgetMin?: number
	budgetMax?: number
	createdFrom?: string | Date
	createdTo?: string | Date
	sortBy?: 'newest' | 'oldest'
}

export type PaginatedJobPostResponse = {
        data: JobPostListItem[]
        total: number
        page: number
        limit: number
}

export type FreelancerJobPostFilterInput = Omit<JobPostFilterInput, 'mine' | 'clientId' | 'visibility'> & {
        savedOnly?: boolean
}

export type AdminJobPostFilterInput = JobPostFilterInput & {
        includeDeleted?: boolean
}

export type AdminJobPostListResponse = {
        data: JobPostListItem[]
        meta: {
                page: number
                limit: number
                total: number
        }
}
