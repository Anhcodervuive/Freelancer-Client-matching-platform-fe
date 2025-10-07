import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        CreateJobOfferInput,
        FreelancerJobOfferFilterInput,
        JobOffer,
        JobOfferFilterInput,
        JobOfferRespondAction,
        PaginatedJobOfferResponse,
        UpdateJobOfferInput
} from '~/types/job-offer'

const clientBaseUrl = '/client/job-offers'
const freelancerBaseUrl = '/freelancer/job-offers'

const serializeFilters = (filters: Partial<JobOfferFilterInput> = {}) => {
        const params = new URLSearchParams()

        Object.entries(filters).forEach(([key, value]) => {
                if (value === undefined || value === null) return

                if (Array.isArray(value)) {
                        value
                                .map(item => {
                                        if (item === undefined || item === null) return null
                                        const normalized = typeof item === 'string' ? item.trim() : String(item)
                                        return normalized ? normalized : null
                                })
                                .filter((item): item is string => Boolean(item))
                                .forEach(item => params.append(key, item))
                        return
                }

                if (value instanceof Date) {
                        params.set(key, value.toISOString())
                        return
                }

                if (typeof value === 'string') {
                        const trimmed = value.trim()
                        if (!trimmed) return
                        params.set(key, trimmed)
                        return
                }

                params.set(key, String(value))
        })

        const query = params.toString()
        return query ? `?${query}` : ''
}

export const createJobOffer = async (payload: CreateJobOfferInput): Promise<JobOffer> => {
        const response = await authorizeAxiosInstance.post<JobOffer>(clientBaseUrl, payload)
        return response.data
}

export const listClientJobOffers = async (
        filters: Partial<JobOfferFilterInput> = { page: 1, limit: 10 }
): Promise<PaginatedJobOfferResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedJobOfferResponse>(
                `${clientBaseUrl}${serializeFilters(filters)}`
        )
        return response.data
}

export const getClientJobOfferDetail = async (offerId: string): Promise<JobOffer> => {
        const response = await authorizeAxiosInstance.get<JobOffer>(`${clientBaseUrl}/${offerId}`)
        return response.data
}

export const updateClientJobOffer = async (
        offerId: string,
        payload: UpdateJobOfferInput
): Promise<JobOffer> => {
        const response = await authorizeAxiosInstance.patch<JobOffer>(`${clientBaseUrl}/${offerId}`, payload)
        return response.data
}

export const withdrawClientJobOffer = async (offerId: string) => {
        const response = await authorizeAxiosInstance.delete(`${clientBaseUrl}/${offerId}`)
        return response.data
}

export const listFreelancerJobOffers = async (
        filters: Partial<FreelancerJobOfferFilterInput> = { page: 1, limit: 10 }
): Promise<PaginatedJobOfferResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedJobOfferResponse>(
                `${freelancerBaseUrl}${serializeFilters(filters)}`
        )
        return response.data
}

export const getFreelancerJobOfferDetail = async (offerId: string): Promise<JobOffer> => {
        const response = await authorizeAxiosInstance.get<JobOffer>(`${freelancerBaseUrl}/${offerId}`)
        return response.data
}

export const updateFreelancerJobOffer = async (
        offerId: string,
        payload: UpdateJobOfferInput
): Promise<JobOffer> => {
        const response = await authorizeAxiosInstance.patch<JobOffer>(`${freelancerBaseUrl}/${offerId}`, payload)
        return response.data
}

export const respondFreelancerJobOffer = async (
        offerId: string,
        action: JobOfferRespondAction
) => {
        const response = await authorizeAxiosInstance.post<JobOffer>(
                `${freelancerBaseUrl}/${offerId}/respond`,
                { action }
        )
        return response.data
}
