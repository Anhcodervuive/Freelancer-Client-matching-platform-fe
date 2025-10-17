import { isAxiosError } from 'axios'
import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        ApproveMilestoneSubmissionInput,
        CancelContractMilestoneInput,
        Contract,
        ContractListFilterInput,
        ContractMilestone,
        CreateContractMilestoneInput,
        DeclineMilestoneSubmissionInput,
        RespondMilestoneCancellationInput,
        PaginatedContractResponse,
        PayContractMilestoneInput,
        PayContractMilestoneResponse,
        SubmitMilestoneWorkInput
} from '~/types/contract'
import type {
        CreateDisputeNegotiationInput,
        Dispute,
        DisputeNegotiation,
        OpenDisputeInput,
        RespondDisputeNegotiationInput,
        UpdateDisputeNegotiationInput
} from '~/types/dispute'

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

const looksLikeDispute = (value: unknown): value is Dispute => {
        if (!value || typeof value !== 'object') {
                return false
        }

        const record = value as Record<string, unknown>
        return typeof record.id === 'string' && typeof record.status === 'string'
}

const extractDispute = (value: unknown): Dispute | null => {
        if (!value) {
                return null
        }

        if (looksLikeDispute(value)) {
                return value
        }

        if (Array.isArray(value)) {
                for (const item of value) {
                        const extracted = extractDispute(item)
                        if (extracted) {
                                return extracted
                        }
                }
                return null
        }

        if (typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const candidates = ['dispute', 'data', 'result', 'item', 'payload']

        for (const key of candidates) {
                if (!(key in record)) continue
                const extracted = extractDispute(record[key])
                if (extracted) {
                        return extracted
                }
        }

        return null
}

const looksLikeNegotiation = (value: unknown): value is DisputeNegotiation => {
        if (!value || typeof value !== 'object') {
                return false
        }

        const record = value as Record<string, unknown>
        return typeof record.id === 'string' && typeof record.disputeId === 'string'
}

const extractNegotiation = (value: unknown): DisputeNegotiation | null => {
        if (!value) {
                return null
        }

        if (looksLikeNegotiation(value)) {
                return value
        }

        if (Array.isArray(value)) {
                for (const item of value) {
                        const extracted = extractNegotiation(item)
                        if (extracted) {
                                return extracted
                        }
                }
                return null
        }

        if (typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const candidates = ['negotiation', 'data', 'result', 'item', 'payload']

        for (const key of candidates) {
                if (!(key in record)) continue
                const extracted = extractNegotiation(record[key])
                if (extracted) {
                        return extracted
                }
        }

        return null
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

export const cancelContractMilestone = async (
        contractId: string,
        milestoneId: string,
        payload: CancelContractMilestoneInput
) => {
        await authorizeAxiosInstance.post(`${baseUrl}/${contractId}/milestones/${milestoneId}/cancel`, payload)
}

export const respondMilestoneCancellation = async (
        contractId: string,
        milestoneId: string,
        payload: RespondMilestoneCancellationInput
) => {
        await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/cancel/respond`,
                payload
        )
}

export const deleteContractMilestoneResource = async (contractId: string, milestoneId: string, resourceId: string) => {
        await authorizeAxiosInstance.delete(`${baseUrl}/${contractId}/milestones/${milestoneId}/resources/${resourceId}`)
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
): Promise<PayContractMilestoneResponse> => {
        const response = await authorizeAxiosInstance.post<PayContractMilestoneResponse>(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/pay`,
                {
                        ...payload,
                        paymentMethodRefId: payload.paymentMethodId
                }
        )

        return response.data ?? {}
}

export const getMilestoneDispute = async (
        contractId: string,
        milestoneId: string
): Promise<Dispute | null> => {
        try {
                const response = await authorizeAxiosInstance.get(
                        `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes`
                )

                return extractDispute(response.data)
        } catch (error) {
                if (isAxiosError(error) && error.response?.status === 404) {
                        return null
                }

                throw error
        }
}

export const openMilestoneDispute = async (
        contractId: string,
        milestoneId: string,
        payload: OpenDisputeInput
): Promise<Dispute | null> => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes`,
                payload
        )

        return extractDispute(response.data)
}

export const createDisputeNegotiation = async (
        contractId: string,
        milestoneId: string,
        disputeId: string,
        payload: CreateDisputeNegotiationInput
): Promise<DisputeNegotiation | null> => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes/${disputeId}/negotiations`,
                payload
        )

        return extractNegotiation(response.data)
}

export const updateDisputeNegotiation = async (
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string,
        payload: UpdateDisputeNegotiationInput
): Promise<DisputeNegotiation | null> => {
        const response = await authorizeAxiosInstance.patch(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes/${disputeId}/negotiations/${negotiationId}`,
                payload
        )

        return extractNegotiation(response.data)
}

export const respondDisputeNegotiation = async (
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string,
        payload: RespondDisputeNegotiationInput
): Promise<DisputeNegotiation | null> => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes/${disputeId}/negotiations/${negotiationId}/respond`,
                payload
        )

        return extractNegotiation(response.data)
}

export const deleteDisputeNegotiation = async (
        contractId: string,
        milestoneId: string,
        disputeId: string,
        negotiationId: string
) => {
        await authorizeAxiosInstance.delete(
                `${baseUrl}/${contractId}/milestones/${milestoneId}/disputes/${disputeId}/negotiations/${negotiationId}`
        )
}
