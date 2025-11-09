import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { CreateFreelancerPayoutInput, PayoutSnapshot } from '~/types/payout'

const baseUrl = '/freelancer/payouts'

export type PayoutSnapshotFilters = {
        currency?: string
        limit?: number
}

const buildQueryString = (filters: PayoutSnapshotFilters) => {
        const params = new URLSearchParams()

        if (filters.currency) {
                const trimmed = filters.currency.trim()
                if (trimmed) {
                        params.set('currency', trimmed.toUpperCase())
                }
        }

        if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
                const bounded = Math.min(Math.max(Math.floor(filters.limit), 1), 200)
                params.set('limit', String(bounded))
        }

        const query = params.toString()
        return query ? `?${query}` : ''
}

export const getFreelancerPayoutSnapshot = async (
        filters: PayoutSnapshotFilters = {}
): Promise<PayoutSnapshot> => {
        const query = buildQueryString(filters)
        const response = await authorizeAxiosInstance.get<PayoutSnapshot>(`${baseUrl}${query}`)
        return response.data
}

export const createFreelancerPayout = async (
        payload: CreateFreelancerPayoutInput
): Promise<void> => {
        await authorizeAxiosInstance.post(baseUrl, payload)
}
