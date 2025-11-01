import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        FreelancerFinancialOverview,
        Granularity,
        SpendingStatisticsQueryInput
} from '~/types/financial'

const baseUrl = '/freelancer/financial'

const toIsoString = (value?: string) => {
        if (!value) return undefined
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toISOString()
}

const serializeFilters = (filters: SpendingStatisticsQueryInput = {}) => {
        const params = new URLSearchParams()

        if (filters.from) {
                const fromIso = toIsoString(filters.from)
                if (fromIso) params.set('from', fromIso)
        }

        if (filters.to) {
                const toIso = toIsoString(filters.to)
                if (toIso) params.set('to', toIso)
        }

        if (filters.granularity) {
                params.set('granularity', filters.granularity)
        }

        if (filters.currency) {
                const trimmed = filters.currency.trim()
                if (trimmed) params.set('currency', trimmed.toUpperCase())
        }

        return params.toString()
}

export type FreelancerFinancialOverviewFilters = {
        from?: string
        to?: string
        granularity?: Granularity
        currency?: string
}

export const getFreelancerFinancialOverview = async (
        filters: FreelancerFinancialOverviewFilters = {}
): Promise<FreelancerFinancialOverview> => {
        const query = serializeFilters(filters)
        const url = query ? `${baseUrl}/overview?${query}` : `${baseUrl}/overview`
        const response = await authorizeAxiosInstance.get<FreelancerFinancialOverview>(url)
        return response.data
}
