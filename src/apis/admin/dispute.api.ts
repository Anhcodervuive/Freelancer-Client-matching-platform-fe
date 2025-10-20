import type { ListResponse } from '~/types/api.response'
import type {
        AdminDisputeAmounts,
        AdminDisputeListFilters,
        AdminDisputeListItem,
        AdminDisputeMetrics,
        AdminDisputeParties,
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

const normalizeUserSummary = (value: unknown): DisputeUserSummary | null => {
        if (!value || typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const id =
                pickString(record, ['id', 'userId', 'user_id']) ??
                (typeof record.accountId === 'string' ? record.accountId : undefined)

        if (!id) {
                return null
        }

        const normalized: DisputeUserSummary = { id }

        if (typeof record.firstName === 'string') {
                normalized.firstName = record.firstName
        }

        if (typeof record.lastName === 'string') {
                normalized.lastName = record.lastName
        }

        if (typeof record.avatar === 'string') {
                normalized.avatar = record.avatar
        }

        if (record.profile && typeof record.profile === 'object') {
                normalized.profile = record.profile as DisputeUserSummary['profile']
        }

        if (typeof record.role === 'string') {
                normalized.role = record.role as DisputeUserSummary['role']
        }

        if (typeof record.email === 'string') {
                ;(normalized as Record<string, unknown>).email = record.email
        }

        const displayName =
                (typeof record.displayName === 'string' && record.displayName.trim()) ||
                (typeof record.name === 'string' && record.name.trim()) ||
                undefined

        if (displayName) {
                ;(normalized as Record<string, unknown>).displayName = displayName
        }

        return normalized
}

const normalizeParties = (value: unknown): AdminDisputeParties => {
        if (!value || typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const client = normalizeUserSummary(record.client)
        const freelancer = normalizeUserSummary(record.freelancer)

        if (!client && !freelancer) {
                return null
        }

        return {
                client: client ?? null,
                freelancer: freelancer ?? null
        }
}

const pickDecimal = (container: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
                const value = container[key]
                if (typeof value === 'number' || (typeof value === 'string' && value !== '')) {
                        return value
                }
        }
        return undefined
}

const normalizeAmounts = (value: unknown, dispute?: Dispute | null): AdminDisputeAmounts => {
        const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
        const normalized: Partial<NonNullable<AdminDisputeAmounts>> = {}

        if (record) {
                const currency = pickString(record, ['currency', 'currencyCode'])
                if (currency) {
                        normalized.currency = currency
                }

                const funded = pickDecimal(record, ['funded', 'fundedAmount', 'funded_amount'])
                if (funded !== undefined) {
                        normalized.funded = funded
                }

                const released = pickDecimal(record, ['released', 'releasedAmount', 'released_amount'])
                if (released !== undefined) {
                        normalized.released = released
                }

                const refunded = pickDecimal(record, ['refunded', 'refundedAmount', 'refunded_amount'])
                if (refunded !== undefined) {
                        normalized.refunded = refunded
                }

                const disputable = pickDecimal(record, ['disputable', 'disputableAmount', 'disputable_amount'])
                if (disputable !== undefined) {
                        normalized.disputable = disputable
                }

                const proposedRelease = pickDecimal(record, ['proposedRelease', 'releaseAmount', 'proposed_release'])
                if (proposedRelease !== undefined) {
                        normalized.proposedRelease = proposedRelease
                }

                const proposedRefund = pickDecimal(record, ['proposedRefund', 'refundAmount', 'proposed_refund'])
                if (proposedRefund !== undefined) {
                        normalized.proposedRefund = proposedRefund
                }
        }

        if (dispute) {
                if (normalized.proposedRelease === undefined && dispute.proposedRelease != null) {
                        normalized.proposedRelease = dispute.proposedRelease
                }

                if (normalized.proposedRefund === undefined && dispute.proposedRefund != null) {
                        normalized.proposedRefund = dispute.proposedRefund
                }
        }

        return Object.keys(normalized).length ? (normalized as AdminDisputeAmounts) : null
}

const normalizeMetrics = (value: unknown): AdminDisputeMetrics => {
        if (!value || typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const normalized: Partial<NonNullable<AdminDisputeMetrics>> = {}

        const needsAdmin = parseBoolean(record.needsAdmin)
        if (needsAdmin !== undefined) {
                        normalized.needsAdmin = needsAdmin
        }

        const hasAdminJoined = parseBoolean(record.hasAdminJoined)
        if (hasAdminJoined !== undefined) {
                normalized.hasAdminJoined = hasAdminJoined
        }

        const overdue = parseBoolean(record.isResponseOverdue)
        if (overdue !== undefined) {
                normalized.isResponseOverdue = overdue
        }

        const negotiationCount = record.negotiationCount
        if (typeof negotiationCount === 'number') {
                normalized.negotiationCount = negotiationCount
        } else if (typeof negotiationCount === 'string' && negotiationCount.trim()) {
                const parsed = Number(negotiationCount)
                if (!Number.isNaN(parsed)) {
                        normalized.negotiationCount = parsed
                }
        }

        const lastProposalCreatedAt = pickString(record, ['lastProposalCreatedAt', 'last_proposal_created_at'])
        if (lastProposalCreatedAt) {
                normalized.lastProposalCreatedAt = lastProposalCreatedAt
        }

        const lastProposalRespondedAt = pickString(record, ['lastProposalRespondedAt', 'last_proposal_responded_at'])
        if (lastProposalRespondedAt) {
                normalized.lastProposalRespondedAt = lastProposalRespondedAt
        }

        const lastAdminJoinedAt = pickString(record, ['lastAdminJoinedAt', 'last_admin_joined_at'])
        if (lastAdminJoinedAt) {
                normalized.lastAdminJoinedAt = lastAdminJoinedAt
        }

        return Object.keys(normalized).length ? (normalized as AdminDisputeMetrics) : null
}

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
        const parties = normalizeParties(record.parties)
        const client = normalizeUserSummary(record.client) ?? parties?.client ?? null
        const freelancer = normalizeUserSummary(record.freelancer) ?? parties?.freelancer ?? null
        const adminUser = normalizeUserSummary(record.admin)

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

        const amounts = normalizeAmounts(record.amounts, dispute)
        const metrics = normalizeMetrics(record.metrics)

        const normalizedNeedsAdmin =
                metrics?.needsAdmin !== undefined ? metrics.needsAdmin : needsAdmin
        const normalizedJoined = metrics?.hasAdminJoined !== undefined ? metrics.hasAdminJoined : joined

        return {
                id,
                status: status ?? dispute?.status ?? null,
                dispute: dispute ?? null,
                contract,
                milestone,
                client,
                freelancer,
                parties,
                amounts,
                metrics,
                needsAdmin: normalizedNeedsAdmin ?? null,
                joined: normalizedJoined ?? null,
                admin: adminUser,
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
