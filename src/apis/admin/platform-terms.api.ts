import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        CreatePlatformTermPayload,
        PlatformTerm,
        PlatformTermsListResponse,
        PlatformTermsStatus,
        UpdatePlatformTermPayload
} from '~/types/platform-terms'

type ListParams = {
        page: number
        limit: number
        status?: PlatformTermsStatus
        search?: string
}

const baseUrl = '/admin/platform-terms'

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

const extractListEnvelope = (value: unknown): PlatformTermsEnvelope | null => {
        const record = asRecord(value)
        if (!record) return null

        if (Array.isArray(record.data)) {
                return record as PlatformTermsEnvelope
        }

        const nested = asRecord(record.data)
        if (nested && Array.isArray(nested.data)) {
                return nested as PlatformTermsEnvelope
        }

        return record as PlatformTermsEnvelope
}

const ensurePlatformTermsListResponse = (
        raw: unknown,
        params: ListParams
): PlatformTermsListResponse => {
        const envelope = extractListEnvelope(raw) ?? {}
        const data = Array.isArray(envelope.data) ? (envelope.data as PlatformTerm[]) : []

        const metaRecord = asRecord(envelope.meta) ?? asRecord((raw as PlatformTermsEnvelope)?.meta) ?? {}

        const meta = {
                page: typeof metaRecord.page === 'number' ? metaRecord.page : params.page,
                limit: typeof metaRecord.limit === 'number' ? metaRecord.limit : params.limit,
                total:
                        typeof metaRecord.total === 'number'
                                ? metaRecord.total
                                : Array.isArray(envelope.data)
                                ? envelope.data.length
                                : data.length
        }

        return { data, meta }
}

export const listPlatformTerms = async (params: ListParams): Promise<PlatformTermsListResponse> => {
        const searchParams = new URLSearchParams({
                page: params.page.toString(),
                limit: params.limit.toString()
        })

        if (params.status) {
                searchParams.set('status', params.status)
        }

        if (params.search) {
                searchParams.set('search', params.search)
        }

        const response = await authorizeAxiosInstance.get(`${baseUrl}?${searchParams.toString()}`)
        return ensurePlatformTermsListResponse(response.data, params)
}

const unwrapPlatformTerm = (raw: unknown): PlatformTerm => {
        const record = asRecord(raw)
        if (record && 'data' in record) {
                const nested = (record as PlatformTermsEnvelope).data
                if (nested !== undefined && nested !== null) {
                        return unwrapPlatformTerm(nested)
                }
        }

        return (record ?? raw ?? {}) as PlatformTerm
}

export const getPlatformTermDetail = async (termsId: string): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${termsId}`)
        return unwrapPlatformTerm(response.data)
}

export const createPlatformTerm = async (payload: CreatePlatformTermPayload): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.post(baseUrl, payload)
        return unwrapPlatformTerm(response.data)
}

export const updatePlatformTerm = async (
        termsId: string,
        payload: UpdatePlatformTermPayload
): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.patch(`${baseUrl}/${termsId}`, payload)
        return unwrapPlatformTerm(response.data)
}
