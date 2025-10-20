import type { ListResponse } from '~/types/api.response'
import type {
        AdminDisputeAmounts,
        AdminDisputeListFilters,
        AdminDisputeListItem,
        AdminDisputeMetrics,
        AdminDisputeParties,
        AdminJoinDisputeInput,
        DecimalLike,
        Dispute,
        DisputeContractSummary,
        DisputeMilestoneSummary,
        DisputeStatus,
        DisputeUserSummary
} from '~/types/dispute'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = '/admin/disputes'

type RawListResponse = Partial<ListResponse<unknown>> & Record<string, unknown>

const asRecord = (value: unknown): Record<string, unknown> | null => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null
        }
        return value as Record<string, unknown>
}

const getString = (value: unknown): string | undefined => {
        if (typeof value === 'string') {
                const trimmed = value.trim()
                return trimmed.length ? trimmed : undefined
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
                return String(value)
        }

        return undefined
}

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

const getDecimalLike = (value: unknown): DecimalLike | undefined => {
        if (typeof value === 'number') {
                return Number.isFinite(value) ? value : undefined
        }

        if (typeof value === 'string') {
                const trimmed = value.trim()
                return trimmed.length ? trimmed : undefined
        }

        if (value && typeof value === 'object') {
                const record = value as Record<string, unknown>
                if (typeof record.value === 'number' && Number.isFinite(record.value)) {
                        return record.value
                }
                if (typeof record.value === 'string' && record.value.trim().length) {
                        return record.value.trim()
                }
        }

        return undefined
}

const normalizeUserSummary = (value: unknown): DisputeUserSummary | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id =
                getString(record.id) ??
                getString(record.userId ?? record.user_id) ??
                getString(record.accountId ?? record.account_id)

        if (!id) {
                return null
        }

        const normalized: DisputeUserSummary = { id }
        const writable = normalized as Record<string, unknown>

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

        if (typeof record.email === 'string' && record.email.trim().length) {
                writable.email = record.email.trim()
        }

        const displayName = getString(record.displayName) ?? getString(record.name) ?? getString(record.fullName)
        if (displayName) {
                writable.displayName = displayName
        }

        return normalized
}

const normalizeParties = (value: unknown): AdminDisputeParties => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

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

const normalizeAmounts = (
        value: unknown,
        dispute?: Dispute | null,
        milestone?: DisputeMilestoneSummary | null
): AdminDisputeAmounts => {
        const record = asRecord(value)
        const normalized: Partial<NonNullable<AdminDisputeAmounts>> = {}

        if (record) {
                const currency =
                        getString(record.currency) ??
                        getString(record.currencyCode ?? record.currency_code)
                if (currency) {
                        normalized.currency = currency
                }

                const funded =
                        getDecimalLike(record.funded) ??
                        getDecimalLike(record.fundedAmount ?? record.funded_amount)
                if (funded !== undefined) {
                        normalized.funded = funded
                }

                const released =
                        getDecimalLike(record.released) ??
                        getDecimalLike(record.releasedAmount ?? record.released_amount)
                if (released !== undefined) {
                        normalized.released = released
                }

                const refunded =
                        getDecimalLike(record.refunded) ??
                        getDecimalLike(record.refundedAmount ?? record.refunded_amount)
                if (refunded !== undefined) {
                        normalized.refunded = refunded
                }

                const disputable =
                        getDecimalLike(record.disputable) ??
                        getDecimalLike(record.disputableAmount ?? record.disputable_amount)
                if (disputable !== undefined) {
                        normalized.disputable = disputable
                }

                const proposedRelease =
                        getDecimalLike(record.proposedRelease ?? record.releaseAmount ?? record.proposed_release)
                if (proposedRelease !== undefined) {
                        normalized.proposedRelease = proposedRelease
                }

                const proposedRefund =
                        getDecimalLike(record.proposedRefund ?? record.refundAmount ?? record.proposed_refund)
                if (proposedRefund !== undefined) {
                        normalized.proposedRefund = proposedRefund
                }
        }

        if (dispute) {
                if (normalized.proposedRelease === undefined && dispute.proposedRelease != null) {
                        const proposedRelease = getDecimalLike(dispute.proposedRelease)
                        if (proposedRelease !== undefined) {
                                normalized.proposedRelease = proposedRelease
                        }
                }

                if (normalized.proposedRefund === undefined && dispute.proposedRefund != null) {
                        const proposedRefund = getDecimalLike(dispute.proposedRefund)
                        if (proposedRefund !== undefined) {
                                normalized.proposedRefund = proposedRefund
                        }
                }
        }

        if (milestone) {
                if (!normalized.currency) {
                        const milestoneCurrency = getString(milestone.currency)
                        if (milestoneCurrency) {
                                normalized.currency = milestoneCurrency
                        }
                }

                if (normalized.funded === undefined && milestone.amount != null) {
                        const milestoneAmount = getDecimalLike(milestone.amount)
                        if (milestoneAmount !== undefined) {
                                normalized.funded = milestoneAmount
                        }
                }
        }

        return Object.keys(normalized).length ? (normalized as AdminDisputeAmounts) : null
}

const normalizeMetrics = (value: unknown): AdminDisputeMetrics => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const normalized: Partial<NonNullable<AdminDisputeMetrics>> = {}

        const needsAdmin =
                parseBoolean(record.needsAdmin) ?? parseBoolean(record.needs_admin)
        if (needsAdmin !== undefined) {
                normalized.needsAdmin = needsAdmin
        }

        const hasAdminJoined =
                parseBoolean(record.hasAdminJoined) ?? parseBoolean(record.has_admin_joined)
        if (hasAdminJoined !== undefined) {
                normalized.hasAdminJoined = hasAdminJoined
        }

        const overdue =
                parseBoolean(record.isResponseOverdue) ?? parseBoolean(record.responseOverdue ?? record.is_overdue)
        if (overdue !== undefined) {
                normalized.isResponseOverdue = overdue
        }

        const negotiationRaw =
                record.negotiationCount ?? record.negotiation_count ?? record.negotiations
        if (typeof negotiationRaw === 'number' && Number.isFinite(negotiationRaw)) {
                normalized.negotiationCount = negotiationRaw
        } else if (typeof negotiationRaw === 'string' && negotiationRaw.trim()) {
                const parsed = Number(negotiationRaw)
                if (!Number.isNaN(parsed)) {
                        normalized.negotiationCount = parsed
                }
        }

        const lastProposalCreatedAt =
                getString(record.lastProposalCreatedAt ?? record.last_proposal_created_at)
        if (lastProposalCreatedAt) {
                normalized.lastProposalCreatedAt = lastProposalCreatedAt
        }

        const lastProposalRespondedAt =
                getString(record.lastProposalRespondedAt ?? record.last_proposal_responded_at)
        if (lastProposalRespondedAt) {
                normalized.lastProposalRespondedAt = lastProposalRespondedAt
        }

        const lastAdminJoinedAt =
                getString(record.lastAdminJoinedAt ?? record.last_admin_joined_at)
        if (lastAdminJoinedAt) {
                normalized.lastAdminJoinedAt = lastAdminJoinedAt
        }

        return Object.keys(normalized).length ? (normalized as AdminDisputeMetrics) : null
}

const extractAdminDispute = (value: unknown): AdminDisputeListItem | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const dispute = looksLikeDispute(record.dispute) ? (record.dispute as Dispute) : null
        const contract = looksLikeContractSummary(record.contract)
                ? (record.contract as DisputeContractSummary)
                : null
        const milestone = looksLikeMilestoneSummary(record.milestone)
                ? (record.milestone as DisputeMilestoneSummary)
                : null

        const id = getString(record.id) ?? (dispute?.id ? getString(dispute.id) : undefined)
        if (!id) {
                return null
        }

        const statusFromRecord =
                getString(record.status) ??
                getString(record.disputeStatus ?? record.state) ??
                (dispute?.status ? getString(dispute.status) : undefined)
        const status = statusFromRecord && isDisputeStatusValue(statusFromRecord)
                ? (statusFromRecord as DisputeStatus)
                : dispute?.status ?? null

        const parties = normalizeParties(record.parties)
        const client = normalizeUserSummary(record.client) ?? parties?.client ?? null
        const freelancer = normalizeUserSummary(record.freelancer) ?? parties?.freelancer ?? null
        const adminUser = normalizeUserSummary(record.admin)

        const amounts = normalizeAmounts(record.amounts, dispute, milestone)
        const metrics = normalizeMetrics(record.metrics)

        const needsAdminFallback =
                parseBoolean(record.needsAdmin ?? record.needs_admin ?? record.requiresAdmin ?? record.awaitingAdmin)
        const joinedFallback =
                parseBoolean(
                        record.joined ?? record.isAdminParticipant ?? record.adminJoined ?? record.hasJoined
                )

        const createdAt =
                getString(record.createdAt ?? record.created_at) ?? (dispute?.createdAt ?? null)
        const updatedAt =
                getString(record.updatedAt ?? record.updated_at) ?? (dispute?.updatedAt ?? null)

        return {
                id,
                status,
                dispute: dispute ?? null,
                contract,
                milestone,
                client,
                freelancer,
                parties,
                amounts,
                metrics,
                needsAdmin: metrics?.needsAdmin ?? (needsAdminFallback ?? null),
                joined: metrics?.hasAdminJoined ?? (joinedFallback ?? null),
                admin: adminUser,
                createdAt,
                updatedAt
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
