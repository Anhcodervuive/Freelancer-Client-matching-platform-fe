import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { PlatformTerm, PlatformTermsListResponse } from '~/types/platform-terms'

const baseUrl = '/platform-terms'

type PublicListParams = {
        page?: number
        limit?: number
}

type ResolvedListParams = {
        page: number
        limit: number
}

type PlatformTermsEnvelope = {
        data?: unknown
        meta?: unknown
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null
        }

        return value as Record<string, unknown>
}

const unwrapTerm = (raw: unknown): PlatformTerm => {
        const record = asRecord(raw)
        if (record && 'data' in record) {
                const nested = (record as PlatformTermsEnvelope).data
                if (nested !== undefined && nested !== null) {
                        return unwrapTerm(nested)
                }
        }

        return (record ?? raw ?? {}) as PlatformTerm
}

const ensureListResponse = (raw: unknown, params: ResolvedListParams): PlatformTermsListResponse => {
        const record = asRecord(raw)

        if (record && Array.isArray(record.data)) {
                const metaRecord = asRecord(record.meta)
                const meta = {
                        page: typeof metaRecord?.page === 'number' ? metaRecord.page : params.page,
                        limit: typeof metaRecord?.limit === 'number' ? metaRecord.limit : params.limit,
                        total:
                                typeof metaRecord?.total === 'number'
                                        ? metaRecord.total
                                        : (record.data as unknown[]).length
                }

                return {
                        data: record.data as PlatformTerm[],
                        meta
                }
        }

        if (Array.isArray(raw)) {
                return {
                        data: raw as PlatformTerm[],
                        meta: {
                                page: params.page,
                                limit: params.limit,
                                total: (raw as unknown[]).length
                        }
                }
        }

        return {
                data: [],
                meta: {
                        page: params.page,
                        limit: params.limit,
                        total: 0
                }
        }
}

export const listPublicPlatformTerms = async ({
        page = 1,
        limit = 10
}: PublicListParams = {}): Promise<PlatformTermsListResponse> => {
        const searchParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
        })

        const response = await authorizeAxiosInstance.get(`${baseUrl}?${searchParams.toString()}`)
        return ensureListResponse(response.data, { page, limit })
}

export const getLatestPlatformTerms = async (): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/latest`)
        return unwrapTerm(response.data)
}

export const getPlatformTermsByVersion = async (version: string): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${encodeURIComponent(version)}`)
        return unwrapTerm(response.data)
}
