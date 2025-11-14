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
        return response.data
}

export const getPlatformTermDetail = async (termsId: string): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${termsId}`)
        return response.data.data
}

export const createPlatformTerm = async (payload: CreatePlatformTermPayload): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.post(baseUrl, payload)
        return response.data.data
}

export const updatePlatformTerm = async (
        termsId: string,
        payload: UpdatePlatformTermPayload
): Promise<PlatformTerm> => {
        const response = await authorizeAxiosInstance.patch(`${baseUrl}/${termsId}`, payload)
        return response.data.data
}
