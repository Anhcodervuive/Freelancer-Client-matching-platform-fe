import type {
        JobDurationCommitment,
        JobExperienceLevel,
        JobLocationType,
        JobPaymentMode,
        JobStatus,
        JobVisibility
} from '~/constants/job'

export type JsonValue =
        | string
        | number
        | boolean
        | null
        | { [key: string]: JsonValue }
        | JsonValue[]

export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

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
        [key: string]: unknown
}

export type JobPostDetail = JobPostListItem & {
        preferredLocations?: JsonValue
        customTerms?: JsonObject | null
        languages?: JsonValue
        skills?: JsonValue
        screeningQuestions?: JsonValue
        attachments?: JsonValue
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
        createdFrom?: string
        createdTo?: string
        sortBy?: 'newest' | 'oldest'
}

export type PaginatedJobPostResponse = {
        data: JobPostListItem[]
        total: number
        page: number
        limit: number
}
