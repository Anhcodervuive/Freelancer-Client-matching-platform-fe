import type { ListResponse } from '~/types/api.response'
import type {
        AdminDisputeListFilters,
        AdminDisputeListItem,
        AdminJoinDisputeInput,
        Dispute,
        DisputeContractSummary,
        DisputeMilestoneSummary,
        DisputeStatus,
        DisputeUserSummary
} from '~/types/dispute'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/admin/disputes'

type RawListResponse = Partial<ListResponse<unknown>> & Record<string, unknown>

const isDisputeStatusValue = (value: unknown): value is DisputeStatus =>
        typeof value === 'string' && (Object.values(DisputeStatus) as string[]).includes(value as DisputeStatus)

const parseBoolean = (value: unknown): boolean | undefined => {
        if (typeof value === 'boolean') return value
        if (typeof value === 'number') return value !== 0
        if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase()
                if (['true', '1', 'yes', 'y'].includes(normalized)) return true
                if (['false', '0', 'no', 'n'].includes(normalized)) return false
        }
        return undefined
}

const looksLikeDispute = (value: unknown): value is Dispute =>
        Boolean(value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string')

const looksLikeContractSummary = (value: unknown): value is DisputeContractSummary =>
        Boolean(value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string')

const looksLikeMilestoneSummary = (value: unknown): value is DisputeMilestoneSummary =>
        Boolean(value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string')

const looksLikeUserSummary = (value: unknown): value is DisputeUserSummary =>
        Boolean(value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string')

const pickString = (container: Record<string, unknown>, keys: string[]): string | undefined => {
        for (const key of keys) {
                const value = container[key]
                if (typeof value === 'string' && value) {
                        return value
                }
        }
        return undefined
}

const pickBoolean = (container: Record<string, unknown>, keys: string[]): boolean | undefined => {
        for (const key of keys) {
                const parsed = parseBoolean(container[key])
                if (parsed !== undefined) {
                        return parsed
                }
        }
        return undefined
}

const extractAdminDispute = (value: unknown): AdminDisputeListItem | null => {
        if (!value || typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const dispute = looksLikeDispute(record.dispute) ? (record.dispute as Dispute) : null
        const contract = looksLikeContractSummary(record.contract)
                ? (record.contract as DisputeContractSummary)
                : null
        const milestone = looksLikeMilestoneSummary(record.milestone)
                ? (record.milestone as DisputeMilestoneSummary)
                : null
        const client = looksLikeUserSummary(record.client) ? (record.client as DisputeUserSummary) : null
        const freelancer = looksLikeUserSummary(record.freelancer)
                ? (record.freelancer as DisputeUserSummary)
                : null

        const id =
                pickString(record, ['id', 'disputeId', 'dispute_id']) ??
                (dispute?.id ? String(dispute.id) : undefined)

        if (!id) {
                return null
        }

        const statusFromRecord =
                pickString(record, ['status', 'disputeStatus', 'state']) ??
                (dispute?.status ? String(dispute.status) : undefined)
        const status = statusFromRecord && isDisputeStatusValue(statusFromRecord)
                ? (statusFromRecord as DisputeStatus)
                : undefined

        const needsAttention = record.needsAttention as unknown
        const needsAdmin =
                pickBoolean(record, ['needsAdmin', 'needs_admin', 'requiresAdmin', 'awaitingAdmin']) ??
                parseBoolean(needsAttention)

        const isParticipant = record.isParticipant as unknown
        const joined =
                pickBoolean(record, ['joined', 'isAdminParticipant', 'adminJoined', 'hasJoined']) ??
                parseBoolean(isParticipant)

        const createdAt =
                pickString(record, ['createdAt', 'created_at']) ??
                (dispute?.createdAt ? String(dispute.createdAt) : undefined)
        const updatedAt =
                pickString(record, ['updatedAt', 'updated_at']) ??
                (dispute?.updatedAt ? String(dispute.updatedAt) : undefined)

        return {
                id,
                status: status ?? dispute?.status ?? null,
                dispute: dispute ?? null,
                contract,
                milestone,
                client,
                freelancer,
                needsAdmin: needsAdmin ?? null,
                joined: joined ?? null,
                createdAt: createdAt ?? (dispute?.createdAt ?? null),
                updatedAt: updatedAt ?? (dispute?.updatedAt ?? null)
        }
}

const serializeFilters = (filters: AdminDisputeListFilters = {}) => {
        const params = new URLSearchParams()

        if (filters.page) params.set('page', String(filters.page))
        if (filters.limit) params.set('limit', String(filters.limit))
        if (filters.status && filters.status.length) params.set('status', filters.status.join(','))
        if (filters.needsAdmin !== undefined) params.set('needsAdmin', String(filters.needsAdmin))
        if (filters.contractId) params.set('contractId', filters.contractId)
        if (filters.clientId) params.set('clientId', filters.clientId)
        if (filters.freelancerId) params.set('freelancerId', filters.freelancerId)
        if (filters.search) params.set('search', filters.search)
        if (filters.createdFrom) params.set('createdFrom', filters.createdFrom)
        if (filters.createdTo) params.set('createdTo', filters.createdTo)

        return params
}

export const getAdminDisputes = async (
        filters: AdminDisputeListFilters
): Promise<ListResponse<AdminDisputeListItem>> => {
        const response = await authorizeAxiosInstance.get(baseUrl, { params: serializeFilters(filters) })
        const payload = response.data as RawListResponse
        const rawItems = Array.isArray(payload.data) ? payload.data : []
        const items = rawItems
                .map(extractAdminDispute)
                .filter((item): item is AdminDisputeListItem => Boolean(item))

        const total = typeof payload.total === 'number' ? payload.total : undefined
        const limit = typeof payload.limit === 'number' ? payload.limit : filters.limit
        const hasMore = typeof payload.hasMore === 'boolean' ? payload.hasMore : undefined
        const message = typeof payload.message === 'string' ? payload.message : undefined

        return {
                data: items,
                total: total ?? items.length,
                limit,
                hasMore,
                message
        }
}

export const joinDisputeAsAdmin = async (disputeId: string, payload: AdminJoinDisputeInput = {}) => {
        const response = await authorizeAxiosInstance.post(`${baseUrl}/${disputeId}/join`, payload)
        return response.data
}
