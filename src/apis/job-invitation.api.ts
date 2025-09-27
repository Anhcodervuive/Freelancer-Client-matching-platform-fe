import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
        CreateJobInvitationInput,
        JobInvitation,
        JobInvitationFilterInput,
        PaginatedJobInvitationResponse
} from '~/types/job-invitation'

const baseUrl = '/client/job-invitations'

const serializeFilters = (filters: JobInvitationFilterInput = {}) => {
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

export const createJobInvitation = async (
        payload: CreateJobInvitationInput
): Promise<JobInvitation> => {
        const response = await authorizeAxiosInstance.post<JobInvitation>(baseUrl, payload)
        return response.data
}

export const listJobInvitations = async (
        filters: JobInvitationFilterInput = {}
): Promise<PaginatedJobInvitationResponse> => {
        const response = await authorizeAxiosInstance.get<PaginatedJobInvitationResponse>(
                `${baseUrl}${serializeFilters(filters)}`
        )
        return response.data
}

export const getJobInvitationDetail = async (invitationId: string): Promise<JobInvitation> => {
        const response = await authorizeAxiosInstance.get<JobInvitation>(`${baseUrl}/${invitationId}`)
        return response.data
}

export const deleteJobInvitation = async (invitationId: string) => {
        const response = await authorizeAxiosInstance.delete(`${baseUrl}/${invitationId}`)
        return response.data
}
