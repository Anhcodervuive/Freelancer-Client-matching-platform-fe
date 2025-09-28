import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        CreateJobProposalInput,
        JobProposal,
        JobProposalFilterInput,
        PaginatedJobProposalResponse,
        UpdateJobProposalInput
} from '~/types/job-proposal'

const baseUrl = '/freelancer/job-proposals'

const serializeFilters = (filters: JobProposalFilterInput = {}) => {
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

export const listFreelancerJobProposals = async (
        filters: JobProposalFilterInput = {}
): Promise<PaginatedJobProposalResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedJobProposalResponse>(
                `${baseUrl}${serializeFilters(filters)}`
        )
        return response.data
}

export const getFreelancerJobProposalDetail = async (proposalId: string): Promise<JobProposal> => {
        const response = await authorizeAxiosInstance.get<JobProposal>(`${baseUrl}/${proposalId}`)
        return response.data
}

export const createJobProposal = async (payload: CreateJobProposalInput): Promise<JobProposal> => {
        const response = await authorizeAxiosInstance.post<JobProposal>(baseUrl, payload)
        return response.data
}

export const updateJobProposal = async (
        proposalId: string,
        payload: UpdateJobProposalInput
): Promise<JobProposal> => {
        const response = await authorizeAxiosInstance.patch<JobProposal>(`${baseUrl}/${proposalId}`, payload)
        return response.data
}

export const withdrawJobProposal = async (proposalId: string) => {
        const response = await authorizeAxiosInstance.delete(`${baseUrl}/${proposalId}`)
        return response.data
}
