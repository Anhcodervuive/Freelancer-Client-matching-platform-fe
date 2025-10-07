import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { JobProposalFilterInput } from '~/types/job-proposal'
import type { ClientJobProposal, PaginatedClientJobProposalResponse } from '~/types/client-job-proposal'

const baseUrl = '/client/job-posts'

const serializeFilters = (filters: Partial<JobProposalFilterInput> = {}) => {
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

export const listClientJobProposals = async (
        jobId: string,
        filters: Partial<JobProposalFilterInput> = {}
): Promise<PaginatedClientJobProposalResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedClientJobProposalResponse>(
                `${baseUrl}/${jobId}/proposals${serializeFilters(filters)}`
        )
        return response.data
}

export const acceptClientJobProposalInterview = async (
        jobId: string,
        proposalId: string,
): Promise<ClientJobProposal> => {
        const response = await authorizeAxiosInstance.post<ClientJobProposal>(
                `${baseUrl}/${jobId}/proposals/${proposalId}/interview`,
        )
        return response.data
}

export const hireClientJobProposal = async (
        jobId: string,
        proposalId: string,
): Promise<ClientJobProposal> => {
        const response = await authorizeAxiosInstance.post<ClientJobProposal>(
                `${baseUrl}/${jobId}/proposals/${proposalId}/hire`,
        )
        return response.data
}

export const declineClientJobProposal = async (
        jobId: string,
        proposalId: string,
): Promise<ClientJobProposal> => {
        const response = await authorizeAxiosInstance.post<ClientJobProposal>(
                `${baseUrl}/${jobId}/proposals/${proposalId}/decline`,
        )
        return response.data
}
