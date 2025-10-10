import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        Contract,
        ContractListFilterInput,
        ContractMilestone,
        CreateContractMilestoneInput,
        PaginatedContractResponse
} from '~/types/contract'

const baseUrl = '/contracts'

const serializeFilters = (filters: Partial<ContractListFilterInput> = {}) => {
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

export const listContracts = async (
        filters: Partial<ContractListFilterInput> = { page: 1, limit: 10 }
): Promise<PaginatedContractResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedContractResponse>(
                `${baseUrl}${serializeFilters(filters)}`
        )
        return response.data
}

export const getContractDetail = async (contractId: string): Promise<Contract> => {
        const response = await authorizeAxiosInstance.get<Contract>(`${baseUrl}/${contractId}`)
        return response.data
}

const extractMilestones = (value: unknown): ContractMilestone[] | undefined => {
        if (Array.isArray(value)) {
                return value as ContractMilestone[]
        }

        if (!value || typeof value !== 'object') {
                return undefined
        }

        const container = value as Record<string, unknown>
        const candidates = ['data', 'results', 'items', 'milestones'] as const

        for (const key of candidates) {
                if (!(key in container)) continue
                const extracted = extractMilestones(container[key])
                if (extracted !== undefined) {
                        return extracted
                }
        }

        return undefined
}

export const listContractMilestones = async (contractId: string): Promise<ContractMilestone[]> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${contractId}/milestones`)
        const extracted = extractMilestones(response.data)
        return extracted ?? []
}

export const createContractMilestone = async (
        contractId: string,
        payload: CreateContractMilestoneInput
): Promise<ContractMilestone> => {
        const response = await authorizeAxiosInstance.post<ContractMilestone>(
                `${baseUrl}/${contractId}/milestones`,
                payload
        )
        return response.data
}
