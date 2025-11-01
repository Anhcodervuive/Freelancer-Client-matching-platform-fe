import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { ClientSpendingStatistics, Granularity, SpendingStatisticsQueryInput } from '~/types/financial'
import { normalizeGranularity } from '~/types/financial'

const baseUrl = '/client/financial'

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
		params.set('granularity', normalizeGranularity(filters.granularity))
	}

	if (filters.currency) {
		const trimmed = filters.currency.trim()
		if (trimmed) params.set('currency', trimmed.toUpperCase())
	}

	return params.toString()
}

export type ClientSpendingFilters = {
	from?: string
	to?: string
	granularity?: Granularity
	currency?: string
}

export const getClientSpendingStatistics = async (
	filters: ClientSpendingFilters = {}
): Promise<ClientSpendingStatistics> => {
	const query = serializeFilters(filters)
	const url = query ? `${baseUrl}/spending-statistics?${query}` : `${baseUrl}/spending_statistics`
	const response = await authorizeAxiosInstance.get<ClientSpendingStatistics>(url)
	return response.data
}
