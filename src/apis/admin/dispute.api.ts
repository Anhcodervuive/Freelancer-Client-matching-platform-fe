import type { ListResponse } from '~/types/api.response'
import type {
        AdminDisputeAmounts,
        AdminDisputeChatAccessLog,
        AdminDisputeDetail,
        AdminDisputeEscrow,
        AdminDisputeListFilters,
        AdminDisputeListItem,
        AdminDisputeMetrics,
        AdminDisputeParties,
        AdminGenerateArbitrationDossierInput,
        AdminJoinDisputeInput,
        AdminRequestArbitrationFeesInput,
        AdminLockDisputeInput,
        DecimalLike,
        Dispute,
        DisputeContractSummary,
        DisputeEvidenceAsset,
        DisputeEvidencePerson,
        DisputeFinalEvidenceSubmission,
        DisputeFinalEvidenceSubmissionItem,
        DisputeMilestoneSummary,
        DisputeNegotiation,
        DisputeUserSummary
} from '~/types/dispute'
import authorizeAxiosInstance from '~/utils/authorizeAxios'
import { DisputeNegotiationStatus, DisputeStatus } from '~/types/dispute'

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

const isNegotiationStatusValue = (value: unknown): value is DisputeNegotiationStatus =>
        typeof value === 'string' &&
        (Object.values(DisputeNegotiationStatus) as string[]).includes(value as DisputeNegotiationStatus)

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

const normalizeEvidencePerson = (value: unknown): DisputeEvidencePerson | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: DisputeEvidencePerson = { id }

        if (typeof record.firstName === 'string') {
                normalized.firstName = record.firstName
        }

        if (typeof record.lastName === 'string') {
                normalized.lastName = record.lastName
        }

        if (typeof record.displayName === 'string' && record.displayName.trim().length) {
                normalized.displayName = record.displayName.trim()
        }

        const fallbackName =
                getString(record.name) ?? getString(record.fullName ?? record.full_name) ?? undefined

        if (fallbackName) {
                normalized.name = fallbackName
                if (!normalized.displayName) {
                        normalized.displayName = fallbackName
                }
        }

        return normalized
}

const normalizeEvidenceAsset = (value: unknown): DisputeEvidenceAsset | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: DisputeEvidenceAsset = {
                id,
                kind: getString(record.kind) ?? null,
                url: getString(record.url ?? record.previewUrl ?? record.preview_url) ?? null,
                mimeType: getString(record.mimeType ?? record.mime_type) ?? null,
                bytes: null,
                status: getString(record.status) ?? null
        }

        const sizeCandidates = [
                record.bytes,
                record.size,
                record.fileSize,
                record.file_size,
                record.length
        ]

        for (const candidate of sizeCandidates) {
                if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                        normalized.bytes = candidate
                        break
                }

                if (typeof candidate === 'string') {
                        const parsed = Number(candidate)
                        if (Number.isFinite(parsed)) {
                                normalized.bytes = parsed
                                break
                        }
                }
        }

        return normalized
}

const normalizeEvidenceSubmissionItem = (
        value: unknown
): DisputeFinalEvidenceSubmissionItem | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: DisputeFinalEvidenceSubmissionItem = {
                id,
                submissionId: getString(record.submissionId ?? record.submission_id) ?? null,
                label: getString(record.label ?? record.title) ?? null,
                description: getString(record.description ?? record.note) ?? null,
                sourceType: getString(record.sourceType ?? record.source_type) ?? null,
                sourceId: getString(record.sourceId ?? record.source_id) ?? null,
                url: getString(record.url ?? record.link ?? record.href) ?? null,
                assetId: getString(record.assetId ?? record.asset_id) ?? null,
                asset: normalizeEvidenceAsset(record.asset) ?? null,
                createdAt: getString(record.createdAt ?? record.created_at) ?? null,
                updatedAt: getString(record.updatedAt ?? record.updated_at) ?? null
        }

        return normalized
}

const normalizeEvidenceSubmissionItems = (
        value: unknown
): DisputeFinalEvidenceSubmissionItem[] | null => {
        if (!value) {
                return null
        }

        if (Array.isArray(value)) {
                const normalized = value
                        .map(item => normalizeEvidenceSubmissionItem(item))
                        .filter((item): item is DisputeFinalEvidenceSubmissionItem => Boolean(item))

                return normalized.length ? normalized : []
        }

        const record = asRecord(value)
        if (!record) {
                return null
        }

        const candidates = ['data', 'items', 'results', 'evidences', 'attachments'] as const

        for (const key of candidates) {
                if (!(key in record)) continue
                const normalized = normalizeEvidenceSubmissionItems(record[key])
                if (normalized) {
                        return normalized
                }
        }

        return null
}

const normalizeEvidenceSubmission = (value: unknown): DisputeFinalEvidenceSubmission | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: DisputeFinalEvidenceSubmission = {
                id,
                disputeId: getString(record.disputeId ?? record.dispute_id) ?? null,
                milestoneId: getString(record.milestoneId ?? record.milestone_id) ?? null,
                freelancerId: getString(record.freelancerId ?? record.freelancer_id) ?? null,
                submittedById:
                        getString(record.submittedById ?? record.submitted_by_id ?? record.submitterId ?? record.submitter_id) ?? null,
                submittedBy: normalizeEvidencePerson(record.submittedBy ?? record.submitter ?? record.user) ?? null,
                submittedAt: getString(record.submittedAt ?? record.submitted_at) ?? null,
                updatedAt: getString(record.updatedAt ?? record.updated_at) ?? null,
                statement: getString(record.statement ?? record.message ?? record.note) ?? null,
                noAdditionalEvidence:
                        parseBoolean(record.noAdditionalEvidence ?? record.no_additional_evidence ?? record.noMoreEvidence) ?? null,
                items: normalizeEvidenceSubmissionItems(
                        record.items ?? record.evidenceItems ?? record.evidence_items ?? record.attachments
                ) ?? []
        }

        return normalized
}

const normalizeEvidenceSubmissions = (
        value: unknown
): DisputeFinalEvidenceSubmission[] | null => {
        if (!value) {
                return null
        }

        if (Array.isArray(value)) {
                const normalized = value
                        .map(item => normalizeEvidenceSubmission(item))
                        .filter((item): item is DisputeFinalEvidenceSubmission => Boolean(item))

                return normalized.length ? normalized : []
        }

        const record = asRecord(value)
        if (!record) {
                return null
        }

        const candidates = ['data', 'items', 'results', 'submissions', 'evidenceSubmissions', 'evidences'] as const

        for (const key of candidates) {
                if (!(key in record)) continue
                const normalized = normalizeEvidenceSubmissions(record[key])
                if (normalized) {
                        return normalized
                }
        }

        return null
}

const normalizeAmounts = (
	value: unknown,
	dispute?: Dispute | null,
	milestone?: DisputeMilestoneSummary | null
): AdminDisputeAmounts => {
	const record = asRecord(value)
	const normalized: Partial<NonNullable<AdminDisputeAmounts>> = {}

	if (record) {
		const currency = getString(record.currency) ?? getString(record.currencyCode ?? record.currency_code)
		if (currency) {
			normalized.currency = currency
		}

		const funded = getDecimalLike(record.funded) ?? getDecimalLike(record.fundedAmount ?? record.funded_amount)
		if (funded !== undefined) {
			normalized.funded = funded
		}

		const released = getDecimalLike(record.released) ?? getDecimalLike(record.releasedAmount ?? record.released_amount)
		if (released !== undefined) {
			normalized.released = released
		}

		const refunded = getDecimalLike(record.refunded) ?? getDecimalLike(record.refundedAmount ?? record.refunded_amount)
		if (refunded !== undefined) {
			normalized.refunded = refunded
		}

		const disputable =
			getDecimalLike(record.disputable) ?? getDecimalLike(record.disputableAmount ?? record.disputable_amount)
		if (disputable !== undefined) {
			normalized.disputable = disputable
		}

		const proposedRelease = getDecimalLike(record.proposedRelease ?? record.releaseAmount ?? record.proposed_release)
		if (proposedRelease !== undefined) {
			normalized.proposedRelease = proposedRelease
		}

		const proposedRefund = getDecimalLike(record.proposedRefund ?? record.refundAmount ?? record.proposed_refund)
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

	const needsAdmin = parseBoolean(record.needsAdmin) ?? parseBoolean(record.needs_admin)
	if (needsAdmin !== undefined) {
		normalized.needsAdmin = needsAdmin
	}

	const hasAdminJoined = parseBoolean(record.hasAdminJoined) ?? parseBoolean(record.has_admin_joined)
	if (hasAdminJoined !== undefined) {
		normalized.hasAdminJoined = hasAdminJoined
	}

	const overdue = parseBoolean(record.isResponseOverdue) ?? parseBoolean(record.responseOverdue ?? record.is_overdue)
	if (overdue !== undefined) {
		normalized.isResponseOverdue = overdue
	}

	const negotiationRaw = record.negotiationCount ?? record.negotiation_count ?? record.negotiations
	if (typeof negotiationRaw === 'number' && Number.isFinite(negotiationRaw)) {
		normalized.negotiationCount = negotiationRaw
	} else if (typeof negotiationRaw === 'string' && negotiationRaw.trim()) {
		const parsed = Number(negotiationRaw)
		if (!Number.isNaN(parsed)) {
			normalized.negotiationCount = parsed
		}
	}

	const lastProposalCreatedAt = getString(record.lastProposalCreatedAt ?? record.last_proposal_created_at)
	if (lastProposalCreatedAt) {
		normalized.lastProposalCreatedAt = lastProposalCreatedAt
	}

	const lastProposalRespondedAt = getString(record.lastProposalRespondedAt ?? record.last_proposal_responded_at)
	if (lastProposalRespondedAt) {
		normalized.lastProposalRespondedAt = lastProposalRespondedAt
	}

	const lastAdminJoinedAt = getString(record.lastAdminJoinedAt ?? record.last_admin_joined_at)
	if (lastAdminJoinedAt) {
		normalized.lastAdminJoinedAt = lastAdminJoinedAt
	}

        return Object.keys(normalized).length ? (normalized as AdminDisputeMetrics) : null
}

const normalizeEscrow = (value: unknown): AdminDisputeEscrow => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: Partial<NonNullable<AdminDisputeEscrow>> = { id }

        const status = getString(record.status)
        if (status) {
                normalized.status = status
        }

        const currency =
                getString(record.currency) ??
                getString(record.currencyCode ?? record.currency_code ?? record.milestoneCurrency ?? record.milestone_currency)
        if (currency) {
                normalized.currency = currency
        }

        const funded =
                getDecimalLike(record.amountFunded ?? record.amount_funded ?? record.fundedAmount ?? record.funded_amount)
        if (funded !== undefined) {
                normalized.amountFunded = funded
        }

        const released =
                getDecimalLike(record.amountReleased ?? record.amount_released ?? record.releasedAmount ?? record.released_amount)
        if (released !== undefined) {
                normalized.amountReleased = released
        }

        const refunded =
                getDecimalLike(record.amountRefunded ?? record.amount_refunded ?? record.refundedAmount ?? record.refunded_amount)
        if (refunded !== undefined) {
                normalized.amountRefunded = refunded
        }

        const milestoneRecord = asRecord(record.milestone)
        if (milestoneRecord) {
                const milestoneId = getString(milestoneRecord.id)
                if (milestoneId) {
                        const milestone: Partial<NonNullable<NonNullable<AdminDisputeEscrow>['milestone']>> = { id: milestoneId }

                        const milestoneTitle =
                                getString(milestoneRecord.title ?? milestoneRecord.name ?? milestoneRecord.label ?? milestoneRecord.description)
                        if (milestoneTitle) {
                                milestone.title = milestoneTitle
                        }

                        const milestoneStatus = getString(milestoneRecord.status)
                        if (milestoneStatus) {
                                milestone.status = milestoneStatus
                        }

                        const milestoneAmount = getDecimalLike(milestoneRecord.amount)
                        if (milestoneAmount !== undefined) {
                                milestone.amount = milestoneAmount
                        }

                        const milestoneCurrency = getString(milestoneRecord.currency)
                        if (milestoneCurrency) {
                                milestone.currency = milestoneCurrency
                        }

                        const milestoneStart = getString(milestoneRecord.startAt ?? milestoneRecord.start_at)
                        if (milestoneStart) {
                                milestone.startAt = milestoneStart
                        }

                        const milestoneEnd = getString(milestoneRecord.endAt ?? milestoneRecord.end_at)
                        if (milestoneEnd) {
                                milestone.endAt = milestoneEnd
                        }

                        const milestoneContractId = getString(milestoneRecord.contractId ?? milestoneRecord.contract_id)
                        if (milestoneContractId) {
                                milestone.contractId = milestoneContractId
                        }

                        const contractRecord = asRecord(milestoneRecord.contract)
                        if (contractRecord) {
                                const contractId = getString(contractRecord.id)
                                if (contractId) {
                                        const contract: Partial<
                                                NonNullable<NonNullable<NonNullable<AdminDisputeEscrow>['milestone']>['contract']>
                                        > = {
                                                id: contractId
                                        }

                                        const contractTitle =
                                                getString(contractRecord.title ?? contractRecord.name ?? contractRecord.label ?? contractRecord.description)
                                        if (contractTitle) {
                                                contract.title = contractTitle
                                        }

                                        const contractClientId = getString(contractRecord.clientId ?? contractRecord.client_id)
                                        if (contractClientId) {
                                                contract.clientId = contractClientId
                                        }

                                        const contractFreelancerId = getString(
                                                contractRecord.freelancerId ?? contractRecord.freelancer_id
                                        )
                                        if (contractFreelancerId) {
                                                contract.freelancerId = contractFreelancerId
                                        }

                                        if (contractRecord.client && typeof contractRecord.client === 'object') {
                                                contract.client = contractRecord.client as Record<string, unknown>
                                        }

                                        if (contractRecord.freelancer && typeof contractRecord.freelancer === 'object') {
                                                contract.freelancer = contractRecord.freelancer as Record<string, unknown>
                                        }

                                        milestone.contract = contract as NonNullable<NonNullable<AdminDisputeEscrow>['milestone']>['contract']
                                }
                        }

                        normalized.milestone = milestone as NonNullable<AdminDisputeEscrow>['milestone']
                }
        }

        return normalized as AdminDisputeEscrow
}

const normalizeChatAccessLog = (value: unknown): AdminDisputeChatAccessLog | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        if (!id) {
                return null
        }

        const normalized: AdminDisputeChatAccessLog = {
                id,
                threadId: getString(record.threadId ?? record.thread_id) ?? null,
                disputeId: getString(record.disputeId ?? record.dispute_id) ?? null,
                adminId: getString(record.adminId ?? record.admin_id) ?? null,
                action: getString(record.action) ?? null,
                reason: getString(record.reason) ?? null,
                metadata: record.metadata && typeof record.metadata === 'object' ? (record.metadata as Record<string, unknown>) : null,
                createdAt: getString(record.createdAt ?? record.created_at) ?? null,
                admin: normalizeUserSummary(record.admin) ?? null
        }

        return normalized
}

const normalizeChatAccessLogs = (value: unknown): AdminDisputeChatAccessLog[] | null => {
        if (!Array.isArray(value)) {
                return null
        }

        const normalized = value
                .map(item => normalizeChatAccessLog(item))
                .filter((item): item is AdminDisputeChatAccessLog => Boolean(item))

        return normalized.length ? normalized : []
}

const normalizeNegotiation = (value: unknown): DisputeNegotiation | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const id = getString(record.id)
        const disputeId = getString(record.disputeId ?? record.dispute_id)
        const proposerId = getString(record.proposerId ?? record.proposer_id)
        const counterpartyId = getString(record.counterpartyId ?? record.counterparty_id)
        const statusRaw = getString(record.status ?? record.state)

        if (!id || !disputeId || !proposerId || !counterpartyId || !statusRaw) {
                return null
        }

        const status = isNegotiationStatusValue(statusRaw) ? (statusRaw as DisputeNegotiationStatus) : null
        if (!status) {
                return null
        }

        const normalized: DisputeNegotiation = {
                id,
                disputeId,
                proposerId,
                counterpartyId,
                status,
                releaseAmount: getDecimalLike(record.releaseAmount ?? record.release_amount) ?? null,
                refundAmount: getDecimalLike(record.refundAmount ?? record.refund_amount) ?? null,
                message: getString(record.message) ?? null,
                respondedById: getString(record.respondedById ?? record.responded_by_id) ?? null,
                respondedAt: getString(record.respondedAt ?? record.responded_at) ?? null,
                responseMessage: getString(record.responseMessage ?? record.response_message) ?? null,
                createdAt: getString(record.createdAt ?? record.created_at) ?? null,
                updatedAt: getString(record.updatedAt ?? record.updated_at) ?? null,
                proposer: normalizeUserSummary(record.proposer) ?? null,
                counterparty: normalizeUserSummary(record.counterparty) ?? null,
                respondedBy: normalizeUserSummary(record.respondedBy ?? record.responder) ?? null
        }

        return normalized
}

const normalizeNegotiations = (value: unknown): DisputeNegotiation[] | null => {
        if (!Array.isArray(value)) {
                return null
        }

        const normalized = value
                .map(item => normalizeNegotiation(item))
                .filter((item): item is DisputeNegotiation => Boolean(item))

        return normalized.length ? normalized : []
}

const normalizeCounts = (value: unknown): AdminDisputeDetail['counts'] => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const normalized: Record<string, unknown> = {}

        const negotiations = record.negotiations ?? record.negotiation ?? record.negotiationCount ?? record.negotiations_count
        if (typeof negotiations === 'number' && Number.isFinite(negotiations)) {
                normalized.negotiations = negotiations
        } else if (typeof negotiations === 'string' && negotiations.trim()) {
                const parsed = Number(negotiations)
                if (!Number.isNaN(parsed)) {
                        normalized.negotiations = parsed
                }
        }

        return Object.keys(normalized).length ? (normalized as AdminDisputeDetail['counts']) : null
}

const extractAdminDisputeDetail = (value: unknown): AdminDisputeDetail | null => {
        const record = asRecord(value)
        if (!record) {
                return null
        }

        const disputeRecord = looksLikeDispute(record)
                ? (record as Record<string, unknown>)
                : looksLikeDispute(record.dispute)
                ? (record.dispute as Record<string, unknown>)
                : null

        const dispute = disputeRecord ? (disputeRecord as Dispute) : null

        const id = getString(record.id) ?? (disputeRecord ? getString(disputeRecord.id) : undefined)
        if (!id) {
                return null
        }

        const escrow = normalizeEscrow(record.escrow ?? (disputeRecord ? disputeRecord.escrow : undefined))
        const chatAccessLogs = normalizeChatAccessLogs(
                record.chatAccessLogs ?? record.chat_access_logs ?? (disputeRecord ? disputeRecord.chatAccessLogs : undefined)
        )
        const negotiations = normalizeNegotiations(record.negotiations ?? (disputeRecord ? disputeRecord.negotiations : undefined))
        const counts = normalizeCounts(record._count ?? (disputeRecord ? disputeRecord._count : undefined))
        const evidenceSubmissions = normalizeEvidenceSubmissions(
                record.evidenceSubmissions ??
                        record.evidence_submissions ??
                        (disputeRecord ? (disputeRecord as Record<string, unknown>).evidenceSubmissions : undefined)
        )

        return {
                id,
                dispute,
                escrow,
                chatAccessLogs,
                negotiations,
                counts,
                evidenceSubmissions
        }
}

const extractAdminDispute = (value: unknown): AdminDisputeListItem | null => {
	const record = asRecord(value)
	if (!record) {
		return null
	}

	const dispute = looksLikeDispute(record.dispute) ? (record.dispute as Dispute) : null
	const contract = looksLikeContractSummary(record.contract) ? (record.contract as DisputeContractSummary) : null
	const milestone = looksLikeMilestoneSummary(record.milestone) ? (record.milestone as DisputeMilestoneSummary) : null

	const id = getString(record.id) ?? (dispute?.id ? getString(dispute.id) : undefined)
	if (!id) {
		return null
	}

	const statusFromRecord =
		getString(record.status) ??
		getString(record.disputeStatus ?? record.state) ??
		(dispute?.status ? getString(dispute.status) : undefined)
	const status =
		statusFromRecord && isDisputeStatusValue(statusFromRecord)
			? (statusFromRecord as DisputeStatus)
			: dispute?.status ?? null

	const parties = normalizeParties(record.parties)
	const client = normalizeUserSummary(record.client) ?? parties?.client ?? null
	const freelancer = normalizeUserSummary(record.freelancer) ?? parties?.freelancer ?? null
	const adminUser = normalizeUserSummary(record.admin)

	const amounts = normalizeAmounts(record.amounts, dispute, milestone)
	const metrics = normalizeMetrics(record.metrics)

	const needsAdminFallback = parseBoolean(
		record.needsAdmin ?? record.needs_admin ?? record.requiresAdmin ?? record.awaitingAdmin
	)
	const joinedFallback = parseBoolean(
		record.joined ?? record.isAdminParticipant ?? record.adminJoined ?? record.hasJoined
	)

	const createdAt = getString(record.createdAt ?? record.created_at) ?? dispute?.createdAt ?? null
	const updatedAt = getString(record.updatedAt ?? record.updated_at) ?? dispute?.updatedAt ?? null

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
		needsAdmin: metrics?.needsAdmin ?? needsAdminFallback ?? null,
		joined: metrics?.hasAdminJoined ?? joinedFallback ?? null,
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

export const getAdminDisputeDetail = async (disputeId: string): Promise<AdminDisputeDetail> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${disputeId}`)
        const payload = response.data as Record<string, unknown> | undefined
        const rawDetail = payload && 'data' in payload ? (payload.data as unknown) : payload

        const detail = extractAdminDisputeDetail(rawDetail)
        if (!detail) {
                throw new Error('INVALID_ADMIN_DISPUTE_DETAIL_RESPONSE')
        }

        return detail
}

export const getAdminDisputes = async (
        filters: AdminDisputeListFilters
): Promise<ListResponse<AdminDisputeListItem>> => {
	const response = await authorizeAxiosInstance.get(baseUrl, { params: serializeFilters(filters) })
	const payload = response.data as RawListResponse
	const rawItems = Array.isArray(payload.data) ? payload.data : []
	const items = rawItems.map(extractAdminDispute).filter((item): item is AdminDisputeListItem => Boolean(item))

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

export const requestArbitrationFees = async (
        disputeId: string,
        payload: AdminRequestArbitrationFeesInput = {}
) => {
        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${disputeId}/request-arbitration-fees`,
                payload
        )

        return response.data
}

export const lockDispute = async (disputeId: string, payload: AdminLockDisputeInput = {}) => {
        const response = await authorizeAxiosInstance.post(`${baseUrl}/${disputeId}/lock`, payload)
        return response.data
}

export const generateArbitrationDossier = async (
        disputeId: string,
        payload: AdminGenerateArbitrationDossierInput = {}
) => {
        const response = await authorizeAxiosInstance.post(`${baseUrl}/${disputeId}/dossiers`, payload)
        return response.data
}
