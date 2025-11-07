import type {
        JobDurationCommitment,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobStatus,
        JobVisibility
} from '~/constants/job'

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

export type AdminJobPostClientProfile = {
        firstName?: string | null
        lastName?: string | null
        user?: {
                id?: string
                email?: string | null
                role?: string | null
                isActive?: boolean | null
        } | null
        [key: string]: unknown
} | null

export type AdminJobPostClientSummary = {
        id?: string
        userId?: string
        companyName?: string | null
        profile?: AdminJobPostClientProfile
        [key: string]: unknown
} | null

export type AdminJobPostAttachmentAsset = {
        id: string
        kind?: string | null
        url?: string | null
        publicId?: string | null
        mimeType?: string | null
        bytes?: number | null
        width?: number | null
        height?: number | null
        [key: string]: unknown
}

export type AdminJobPostAttachment = {
        id: string
        assetLinkId: string
        addedBy: string | null
        createdAt: string
        updatedAt: string
        position: number
        isPrimary: boolean
        label: string | null
        caption: string | null
        asset: AdminJobPostAttachmentAsset
        [key: string]: unknown
}

export type AdminJobPostLanguageRequirement = {
        languageCode: string
        proficiency: string | null
}

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
        moderationScore?: number | null
        moderationCategory?: string | null
        moderationSummary?: string | null
        moderationCheckedAt?: string | null
        [key: string]: unknown
}

export type JobPostDetail = JobPostListItem & {
        preferredLocations?: unknown
        customTerms?: Record<string, unknown> | null
        languages?: unknown
        skills?: unknown
        screeningQuestions?: unknown
        attachments?: unknown
        moderationPayload?: unknown
}

export type AdminJobPostDetail = JobPostDetail & {
        client: AdminJobPostClientSummary
        proposalsCount?: number
        viewsCount?: number
        languages?: AdminJobPostLanguageRequirement[]
        screeningQuestions?: Array<{
                id: string
                question: string
                isRequired: boolean
                orderIndex: number
        }>
        attachments?: AdminJobPostAttachment[]
}

export type AdminJobPostActivityActor = {
        id: string | null
        email: string | null
        role: string | null
        firstName: string | null
        lastName: string | null
}

export type AdminJobPostActivity = {
        id: string
        action: string
        metadata: JsonValue
        createdAt: string
        actorRole: string | null
        actor: AdminJobPostActivityActor | null
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

export type AdminUpdateJobPostStatusInput = {
        status: JobStatus
        reason?: string
        note?: string
}

export type AdminRemoveJobPostAttachmentInput = {
        reason?: string
        note?: string
}

export type AdminJobPostActivityResponse = {
        data: AdminJobPostActivity[]
        meta: {
                page: number
                limit: number
                total: number
        }
}
