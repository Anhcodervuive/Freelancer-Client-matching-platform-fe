export const PLATFORM_TERMS_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const

export type PlatformTermsStatus = (typeof PLATFORM_TERMS_STATUSES)[number]

export type PlatformTermsSection = {
        code: string
        title: string
        body: unknown
        version?: string | null
        metadata?: Record<string, unknown> | null
}

export type PlatformTermsBody = {
        sections?: PlatformTermsSection[]
        [key: string]: unknown
} | null

export type PlatformTermsUser = {
        id: string
        email?: string | null
        name?: string | null
} | null

export type PlatformTerm = {
        id: string
        version: string
        title: string
        body: PlatformTermsBody
        status: PlatformTermsStatus
        effectiveFrom?: string | null
        effectiveTo?: string | null
        createdAt: string
        updatedAt: string
        createdBy?: PlatformTermsUser
        updatedBy?: PlatformTermsUser
}

export type PlatformTermsListResponse = {
        data: PlatformTerm[]
        meta: {
                page: number
                limit: number
                total: number
        }
}

export type CreatePlatformTermPayload = {
        version: string
        title: string
        body: Record<string, unknown>
        status?: PlatformTermsStatus
        effectiveFrom?: string
        effectiveTo?: string | null
}

export type UpdatePlatformTermPayload = Partial<CreatePlatformTermPayload>
