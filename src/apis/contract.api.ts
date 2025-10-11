import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        ApproveMilestoneSubmissionInput,
        Contract,
        ContractListFilterInput,
        ContractMilestone,
        CreateContractMilestoneInput,
        DeclineMilestoneSubmissionInput,
        PaginatedContractResponse,
        PayContractMilestoneInput,
        SubmitMilestoneWorkInput
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
	const response = await authorizeAxiosInstance.get<PaginatedContractResponse>(`${baseUrl}${serializeFilters(filters)}`)
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
	const response = await authorizeAxiosInstance.post<ContractMilestone>(`${baseUrl}/${contractId}/milestones`, payload)
	return response.data
}

export const uploadContractMilestoneAttachments = async (contractId: string, milestoneId: string, files: File[]) => {
	if (!files.length) {
		return
	}

	const formData = new FormData()

	files.forEach(file => {
		formData.append('files', file)
	})

	await authorizeAxiosInstance.post(`${baseUrl}/${contractId}/milestones/${milestoneId}/resources`, formData)
}

export const deleteContractMilestone = async (contractId: string, milestoneId: string) => {
        await authorizeAxiosInstance.delete(`${baseUrl}/${contractId}/milestones/${milestoneId}`)
}

export const deleteContractMilestoneResource = async (
        contractId: string,
        milestoneId: string,
        resourceId: string
) => {
        await authorizeAxiosInstance.delete(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/resources/${resourceId}`
        )
}

export const submitMilestoneWork = async (
        contractId: string,
        milestoneId: string,
        payload: SubmitMilestoneWorkInput
) => {
        const formData = new FormData()
        formData.set('message', payload.message)

        if (payload.note) {
                formData.set('note', payload.note)
        }

        payload.files?.forEach(file => {
                formData.append('files', file)
        })

        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/submissions`,
                formData
        )

        return response.data
}

export const approveMilestoneSubmission = async (
        contractId: string,
        milestoneId: string,
        submissionId: string,
        payload: ApproveMilestoneSubmissionInput = {}
) => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/submissions/${submissionId}/approve`,
                payload
        )

        return response.data
}

export const declineMilestoneSubmission = async (
        contractId: string,
        milestoneId: string,
        submissionId: string,
        payload: DeclineMilestoneSubmissionInput
) => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/submissions/${submissionId}/decline`,
                payload
        )

        return response.data
}

export const payMilestone = async (
        contractId: string,
        milestoneId: string,
        payload: PayContractMilestoneInput
) => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/pay`,
                payload
        )

        return response.data
}
