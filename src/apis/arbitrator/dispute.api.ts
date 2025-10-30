import type {
	AdminDisputeDetail,
	ArbitrationContext,
	ArbitrationContextEvidenceItem,
	ArbitrationContextEvidenceSubmission,
	ArbitrationContextFinancials,
	ArbitrationContextMeta,
	ArbitrationContextMilestone,
	ArbitrationContextMilestoneSubmission,
	ArbitrationContextMilestoneSubmissionAttachment,
	ArbitrationContextParty,
	ArbitrationContextResponse,
	ArbitrationDecisionAwardType,
	ArbitrationTimelineEntry,
	ArbitratorDisputeListItem,
	RecordArbitrationDecisionInput
} from '~/types/dispute'
import { DisputeStatus } from '~/types/dispute'
import authorizeAxiosInstance from '~/utils/authorizeAxios'
import { extractAdminDisputeDetail, extractAdminDisputeListItem } from '~/apis/admin/dispute.api'

const baseUrl = '/arbitrator/disputes'

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

const getNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed.length) return undefined
		const parsed = Number(trimmed)
		if (!Number.isNaN(parsed)) {
			return parsed
		}
	}

	return undefined
}

const isDisputeStatusValue = (value: unknown): value is DisputeStatus =>
	typeof value === 'string' && (Object.values(DisputeStatus) as string[]).includes(value as DisputeStatus)

const getFirstString = (...values: unknown[]): string | null => {
	for (const value of values) {
		const str = getString(value)
		if (str) {
			return str
		}
	}

	return null
}

const extractDisputeRecord = (record: Record<string, unknown> | null): Record<string, unknown> | null => {
	if (!record) return null

	const direct = record.dispute
	if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
		return direct as Record<string, unknown>
	}

	const detail = record.detail ?? record.disputeDetail ?? record.dispute_detail
	if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
		return detail as Record<string, unknown>
	}

	return null
}

const extractArbitratorDisputeListItem = (value: unknown): ArbitratorDisputeListItem | null => {
	const base = extractAdminDisputeListItem(value)
	if (!base) {
		return null
	}

	const record = asRecord(value)
	const disputeRecord = extractDisputeRecord(record)

	const lockedAt =
		getFirstString(
			base.dispute?.lockedAt,
			record?.lockedAt,
			record?.locked_at,
			disputeRecord?.lockedAt,
			disputeRecord?.locked_at
		) ?? null

	const arbitrationDeadline =
		getFirstString(
			base.dispute?.arbitrationDeadline,
			record?.arbitrationDeadline,
			record?.arbitration_deadline,
			disputeRecord?.arbitrationDeadline,
			disputeRecord?.arbitration_deadline
		) ?? null

	const arbitratorAssignedAt =
		getFirstString(
			base.dispute?.arbitratorAssignedAt,
			record?.arbitratorAssignedAt,
			record?.arbitrator_assigned_at,
			disputeRecord?.arbitratorAssignedAt,
			disputeRecord?.arbitrator_assigned_at
		) ?? null

	return {
		...base,
		lockedAt,
		arbitrationDeadline,
		arbitratorAssignedAt
	}
}

const extractListItems = (value: unknown, depth = 0): unknown[] => {
	if (!value || depth > 3) {
		return []
	}

	if (Array.isArray(value)) {
		return value
	}

	const record = asRecord(value)
	if (!record) {
		return []
	}

	const directCandidates = [
		record.items,
		record.results,
		record.disputes,
		record.list,
		record.collection,
		record.data,
		record.payload,
		record.response,
		record.result
	]
	for (const candidate of directCandidates) {
		if (Array.isArray(candidate)) {
			return candidate
		}
	}

	const nestedSources = [record.data, record.payload, record.response, record.result]
	for (const source of nestedSources) {
		const extracted = extractListItems(source, depth + 1)
		if (extracted.length) {
			return extracted
		}
	}

	return []
}

const parseTimelineEntry = (value: unknown): ArbitrationTimelineEntry | null => {
	const record = asRecord(value)
	if (!record) {
		return null
	}

	const at =
		getString(record.at ?? record.timestamp ?? record.occurredAt ?? record.createdAt ?? record.created_at) ?? undefined
	const action = getString(record.action ?? record.event ?? record.type)

	if (!at || !action) {
		return null
	}

	const entry: ArbitrationTimelineEntry = { at, action }

	const actor = getString(record.actor ?? record.user ?? record.by ?? record.actorName ?? record.actor_name)
	if (actor) {
		entry.actor = actor
	}

	const details = record.details ?? record.context ?? record.metadata ?? record.description ?? record.note ?? null

	if (details !== undefined) {
		entry.details = details as unknown
	} else {
		entry.details = null
	}

	return entry
}

const parseTimeline = (value: unknown): ArbitrationTimelineEntry[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value.map(item => parseTimelineEntry(item)).filter((item): item is ArbitrationTimelineEntry => Boolean(item))
}

const parseMeta = (value: unknown): ArbitrationContextMeta => {
	const record = asRecord(value)
	if (!record) {
		throw new Error('INVALID_ARBITRATION_CONTEXT_META')
	}

	const disputeId = getString(record.disputeId ?? record.dispute_id)
	const statusRaw = getString(record.status)
	const lockedAt = getString(record.lockedAt ?? record.locked_at)

	if (!disputeId || !statusRaw || !lockedAt) {
		throw new Error('INVALID_ARBITRATION_CONTEXT_META_REQUIRED_FIELDS')
	}

	if (!isDisputeStatusValue(statusRaw)) {
		throw new Error('INVALID_ARBITRATION_CONTEXT_STATUS')
	}

	const meta: ArbitrationContextMeta = {
		disputeId,
		status: statusRaw,
		lockedAt
	}

	const arbitrationDeadline = getString(record.arbitrationDeadline ?? record.arbitration_deadline)
	if (arbitrationDeadline) {
		meta.arbitrationDeadline = arbitrationDeadline
	}

	const versionCandidate = getNumber(
		record.currentDossierVersion ?? record.current_dossier_version ?? record.dossierVersion ?? record.version
	)
	if (versionCandidate !== undefined) {
		meta.currentDossierVersion = versionCandidate
	}

	return meta
}

const getBoolean = (value: unknown): boolean | undefined => {
	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		if (value === 1) return true
		if (value === 0) return false
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (!normalized.length) return undefined
		if (['true', '1', 'yes', 'y'].includes(normalized)) return true
		if (['false', '0', 'no', 'n'].includes(normalized)) return false
	}

	return undefined
}

const parseParties = (value: unknown): ArbitrationContextParty[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map(item => {
			const record = asRecord(item)
			if (!record) return null

			const userId =
				getString(record.userId ?? record.user_id ?? record.uid ?? record.id ?? record.userIdRef) ?? undefined
			if (!userId) return null

			const role =
				getString(
					record.role ??
						record.participantRole ??
						record.participant_role ??
						record.type ??
						record.userRole ??
						record.user_role
				) ?? 'UNKNOWN'

			const displayName =
				getFirstString(
					record.displayName,
					record.display_name,
					record.name,
					record.fullName,
					record.full_name,
					record.label
				) ?? null

			const feePaid = getBoolean(record.feePaid ?? record.fee_paid ?? record.hasPaidFee ?? record.feeStatus) ?? null

			return {
				role,
				userId,
				displayName,
				feePaid,
				...record
			} as ArbitrationContextParty
		})
		.filter((party): party is ArbitrationContextParty => Boolean(party))
}

const parseFinancials = (value: unknown): ArbitrationContextFinancials | null => {
	const record = asRecord(value)
	if (!record) {
		return null
	}

	const financials: ArbitrationContextFinancials = {
		...record
	}

	const currency = getString(record.currency ?? record.currencyCode ?? record.currency_code)
	if (currency) {
		financials.currency = currency
	}

	const escrowAmount = getNumber(record.escrowAmount ?? record.escrow_amount ?? record.totalEscrow ?? record.total)
	if (escrowAmount !== undefined) {
		financials.escrowAmount = escrowAmount
	}

	const released = getNumber(record.released ?? record.amountReleased ?? record.amount_released)
	if (released !== undefined) {
		financials.released = released
	}

	const refunded = getNumber(record.refunded ?? record.amountRefunded ?? record.amount_refunded)
	if (refunded !== undefined) {
		financials.refunded = refunded
	}

	const disputed = getNumber(record.disputed ?? record.disputable ?? record.disputedAmount ?? record.disputed_amount)
	if (disputed !== undefined) {
		financials.disputed = disputed
	}

	const requestedRecord = asRecord(record.requested ?? record.requestedAllocation ?? record.requested_allocation)
	if (requestedRecord) {
		financials.requested = {
			...requestedRecord,
			client: getNumber(requestedRecord.client ?? requestedRecord.clientAmount ?? requestedRecord.client_amount),
			freelancer: getNumber(
				requestedRecord.freelancer ??
					requestedRecord.freelancerAmount ??
					requestedRecord.freelancer_amount ??
					requestedRecord.contractor ??
					requestedRecord.contractorAmount
			)
		}
	}

	const decidedRecord = asRecord(record.decided ?? record.decidedAllocation ?? record.decided_allocation)
	if (decidedRecord) {
		financials.decided = {
			...decidedRecord,
			client: getNumber(decidedRecord.client ?? decidedRecord.clientAmount ?? decidedRecord.client_amount),
			freelancer: getNumber(
				decidedRecord.freelancer ??
					decidedRecord.freelancerAmount ??
					decidedRecord.freelancer_amount ??
					decidedRecord.contractor ??
					decidedRecord.contractorAmount
			)
		}
	}

	return financials
}

const parseMilestone = (value: unknown): ArbitrationContextMilestone | null => {
	const record = asRecord(value)
	if (!record) {
		return null
	}

	const id = getString(record.id ?? record.milestoneId ?? record.milestone_id)
	if (!id) {
		return null
	}

	const milestone: ArbitrationContextMilestone = {
		...record,
		id
	}

	const title = getString(record.title ?? record.name ?? record.label)
	if (title) {
		milestone.title = title
	}

	const status = getString(record.status ?? record.milestoneStatus ?? record.milestone_status)
	if (status) {
		milestone.status = status
	}

	const amount = getNumber(record.amount ?? record.value ?? record.budget)
	if (amount !== undefined) {
		milestone.amount = amount
	}

	const currency = getString(record.currency ?? record.currencyCode ?? record.currency_code)
	if (currency) {
		milestone.currency = currency
	}

	const startAt = getString(record.startAt ?? record.start_at ?? record.startedAt ?? record.started_at)
	if (startAt) {
		milestone.startAt = startAt
	}

	const endAt = getString(record.endAt ?? record.end_at ?? record.endedAt ?? record.ended_at)
	if (endAt) {
		milestone.endAt = endAt
	}

	const contractId = getString(record.contractId ?? record.contract_id)
	if (contractId) {
		milestone.contractId = contractId
	}

	const contractTitle = getString(record.contractTitle ?? record.contract_title)
	if (contractTitle) {
		milestone.contractTitle = contractTitle
	}

	return milestone
}

const parseSubmissionAttachments = (value: unknown): ArbitrationContextMilestoneSubmissionAttachment[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map(item => {
			const record = asRecord(item)
			if (!record) return null

			const id = getString(record.id ?? record.attachmentId ?? record.attachment_id)
			if (!id) return null

			const attachment: ArbitrationContextMilestoneSubmissionAttachment = {
				...record,
				id
			}

			const name = getString(record.name ?? record.label ?? record.title)
			if (name) {
				attachment.name = name
			}

			const url = getString(record.url ?? record.href ?? record.downloadUrl ?? record.download_url)
			if (url) {
				attachment.url = url
			}

			const mimeType = getString(record.mimeType ?? record.mime_type ?? record.type)
			if (mimeType) {
				attachment.mimeType = mimeType
			}

			const size = getNumber(record.size ?? record.bytes ?? record.length)
			if (size !== undefined) {
				attachment.size = size
			}

			const assetId = getString(record.assetId ?? record.asset_id)
			if (assetId) {
				attachment.assetId = assetId
			}

			const createdAt = getString(record.createdAt ?? record.created_at)
			if (createdAt) {
				attachment.createdAt = createdAt
			}

			return attachment
		})
		.filter((attachment): attachment is ArbitrationContextMilestoneSubmissionAttachment => Boolean(attachment))
}

const parseMilestoneSubmissions = (value: unknown): ArbitrationContextMilestoneSubmission[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map(item => {
			const record = asRecord(item)
			if (!record) return null

			const id = getString(record.id ?? record.submissionId ?? record.submission_id)
			if (!id) return null

			const submission: ArbitrationContextMilestoneSubmission = {
				...record,
				id
			}

			const milestoneId = getString(record.milestoneId ?? record.milestone_id)
			if (milestoneId) {
				submission.milestoneId = milestoneId
			}

			const freelancerId = getString(
				record.freelancerId ?? record.freelancer_id ?? record.contractorId ?? record.contractor_id
			)
			if (freelancerId) {
				submission.freelancerId = freelancerId
			}

			const freelancer = getString(record.freelancer ?? record.freelancerName ?? record.freelancer_name)
			if (freelancer) {
				submission.freelancer = freelancer
			}

			const status = getString(record.status ?? record.reviewStatus ?? record.review_status)
			if (status) {
				submission.status = status
			}

			const message = getString(record.message ?? record.title ?? record.summary)
			if (message) {
				submission.message = message
			}

			const reviewNote = getString(record.reviewNote ?? record.review_note ?? record.feedback)
			if (reviewNote) {
				submission.reviewNote = reviewNote
			}

			const reviewRating = getNumber(record.reviewRating ?? record.review_rating ?? record.rating)
			if (reviewRating !== undefined) {
				submission.reviewRating = reviewRating
			}

			const reviewedAt = getString(record.reviewedAt ?? record.reviewed_at)
			if (reviewedAt) {
				submission.reviewedAt = reviewedAt
			}

			const reviewedById = getString(record.reviewedById ?? record.reviewed_by_id)
			if (reviewedById) {
				submission.reviewedById = reviewedById
			}

			const reviewedBy = getString(record.reviewedBy ?? record.reviewed_by ?? record.reviewer)
			if (reviewedBy) {
				submission.reviewedBy = reviewedBy
			}

			const createdAt = getString(record.createdAt ?? record.created_at)
			if (createdAt) {
				submission.createdAt = createdAt
			}

			const updatedAt = getString(record.updatedAt ?? record.updated_at)
			if (updatedAt) {
				submission.updatedAt = updatedAt
			}

			const attachments = parseSubmissionAttachments(record.attachments ?? record.files ?? record.assets)
			if (attachments.length) {
				submission.attachments = attachments
			}

			return submission
		})
		.filter((submission): submission is ArbitrationContextMilestoneSubmission => Boolean(submission))
}

const parseEvidenceItems = (value: unknown): ArbitrationContextEvidenceItem[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map(item => {
			const record = asRecord(item)
			if (!record) return null

			const id = getString(record.id ?? record.itemId ?? record.item_id)
			if (!id) return null

			const evidenceItem: ArbitrationContextEvidenceItem = {
				...record,
				id
			}

			const label = getString(record.label ?? record.name ?? record.title)
			if (label) {
				evidenceItem.label = label
			}

			const description = getString(record.description ?? record.note ?? record.details)
			if (description) {
				evidenceItem.description = description
			}

			const sourceType = getString(record.sourceType ?? record.source_type ?? record.origin)
			if (sourceType) {
				evidenceItem.sourceType = sourceType
			}

			const sourceId = getString(record.sourceId ?? record.source_id)
			if (sourceId) {
				evidenceItem.sourceId = sourceId
			}

			const url = getString(record.url ?? record.href ?? record.downloadUrl ?? record.download_url)
			if (url) {
				evidenceItem.url = url
			}

			const assetId = getString(record.assetId ?? record.asset_id)
			if (assetId) {
				evidenceItem.assetId = assetId
			}

			const createdAt = getString(record.createdAt ?? record.created_at)
			if (createdAt) {
				evidenceItem.createdAt = createdAt
			}

			const assetRecord = asRecord(record.asset ?? record.file ?? record.attachment)
			if (assetRecord) {
				evidenceItem.asset = {
					...assetRecord,
					id: getString(assetRecord.id ?? assetRecord.assetId ?? assetRecord.asset_id) ?? ''
				}
			}

			const referenceRecord = asRecord(record.reference ?? record.ref)
			if (referenceRecord) {
				evidenceItem.reference = referenceRecord
			}

			return evidenceItem
		})
		.filter((item): item is ArbitrationContextEvidenceItem => Boolean(item))
}

const parseEvidenceSubmissions = (value: unknown): ArbitrationContextEvidenceSubmission[] => {
	if (!Array.isArray(value)) {
		return []
	}

	return value
		.map(item => {
			const record = asRecord(item)
			if (!record) return null

			const id = getString(record.id ?? record.submissionId ?? record.submission_id)
			if (!id) return null

			const submittedById = getString(record.submittedById ?? record.submitted_by_id ?? record.userId ?? record.user_id)
			if (!submittedById) return null

			const submission: ArbitrationContextEvidenceSubmission = {
				...record,
				id,
				submittedById
			}

			const disputeId = getString(record.disputeId ?? record.dispute_id)
			if (disputeId) {
				submission.disputeId = disputeId
			}

			const submittedByRecord = asRecord(record.submittedBy ?? record.submitted_by ?? record.user)
			if (submittedByRecord) {
				submission.submittedBy = {
					...submittedByRecord,
					id:
						getString(
							submittedByRecord.id ?? submittedByRecord.userId ?? submittedByRecord.user_id ?? submittedByRecord.uid
						) ?? submittedById
				}
			}

			const statement = getString(record.statement ?? record.summary ?? record.note)
			if (statement) {
				submission.statement = statement
			}

			const noAdditionalEvidence = getBoolean(
				record.noAdditionalEvidence ?? record.no_additional_evidence ?? record.noEvidence ?? record.no_evidence
			)
			if (noAdditionalEvidence !== undefined) {
				submission.noAdditionalEvidence = noAdditionalEvidence
			}

			const submittedAt = getString(record.submittedAt ?? record.submitted_at ?? record.createdAt ?? record.created_at)
			if (submittedAt) {
				submission.submittedAt = submittedAt
			}

			const updatedAt = getString(record.updatedAt ?? record.updated_at)
			if (updatedAt) {
				submission.updatedAt = updatedAt
			}

			const items = parseEvidenceItems(record.items ?? record.evidence ?? record.attachments)
			if (items.length) {
				submission.items = items
			}

			return submission
		})
		.filter((submission): submission is ArbitrationContextEvidenceSubmission => Boolean(submission))
}

const parseArbitrationContext = (value: unknown): ArbitrationContext => {
	const record = asRecord(value)
	if (!record) {
		throw new Error('INVALID_ARBITRATION_CONTEXT')
	}

	const meta = parseMeta(record.meta ?? record.overview)
	const timeline = parseTimeline(record.timeline)

	const context: ArbitrationContext = { meta, timeline }

	const parties = parseParties(
		record.parties ?? record.participants ?? record.people ?? record.involved ?? record.stakeholders ?? record.roles
	)
	if (parties.length) {
		context.parties = parties
	}

	const financials = parseFinancials(record.financials ?? record.amounts ?? record.financial ?? record.summary)
	if (financials) {
		context.financials = financials
	}

	const milestone = parseMilestone(record.milestone ?? record.task ?? record.scope)
	if (milestone) {
		context.milestone = milestone
	}

	const milestoneSubmissions = parseMilestoneSubmissions(
		record.milestoneSubmissions ??
			record.milestone_submissions ??
			record.submissions ??
			record.deliveries ??
			record.handovers
	)
	if (milestoneSubmissions.length) {
		context.milestoneSubmissions = milestoneSubmissions
	}

	const evidence = parseEvidenceSubmissions(
		record.evidence ?? record.evidenceSubmissions ?? record.evidence_submissions ?? record.proofs
	)
	if (evidence.length) {
		context.evidence = evidence
	}

	const sections: Record<string, unknown> = {}
	for (const [key, val] of Object.entries(record)) {
		if (['meta', 'overview', 'timeline'].includes(key)) continue
		if (
			[
				'parties',
				'participants',
				'people',
				'involved',
				'stakeholders',
				'roles',
				'financials',
				'amounts',
				'financial',
				'summary',
				'milestone',
				'task',
				'scope',
				'milestoneSubmissions',
				'milestone_submissions',
				'submissions',
				'deliveries',
				'handovers',
				'evidence',
				'evidenceSubmissions',
				'evidence_submissions',
				'proofs'
			].includes(key)
		) {
			continue
		}
		sections[key] = val
	}

	if (Object.keys(sections).length) {
		context.sections = sections
	}

	return context
}

export const listArbitratorDisputes = async (): Promise<ArbitratorDisputeListItem[]> => {
	const response = await authorizeAxiosInstance.get(baseUrl)
	const payload = response.data as Record<string, unknown> | undefined

	const rawItems = extractListItems(payload)

	return rawItems
		.map(extractArbitratorDisputeListItem)
		.filter((item): item is ArbitratorDisputeListItem => Boolean(item))
}

export const getArbitratorDisputeContext = async (disputeId: string): Promise<ArbitrationContextResponse> => {
	const response = await authorizeAxiosInstance.get(`/admin/disputes/${disputeId}/arbitration/context`)
	const payload = response.data as Record<string, unknown> | undefined
	const raw = (() => {
		if (!payload) return null
		if ('data' in payload && payload.data) {
			const data = (payload as Record<string, unknown>).data
			return asRecord(data) ?? asRecord(payload)
		}
		return asRecord(payload)
	})()

	if (!raw) {
		throw new Error('INVALID_ARBITRATION_CONTEXT_RESPONSE')
	}

	const disputeDetail = extractAdminDisputeDetail(raw.dispute ?? raw.detail ?? raw.disputeDetail)
	if (!disputeDetail) {
		throw new Error('INVALID_ARBITRATION_CONTEXT_DISPUTE_DETAIL')
	}

	const arbitrationContext = parseArbitrationContext(raw.arbitrationContext ?? raw.context ?? raw.case)

	return { dispute: disputeDetail as AdminDisputeDetail, arbitrationContext }
}

export const recordArbitrationDecision = async (disputeId: string, payload: RecordArbitrationDecisionInput) => {
	const body: Record<string, unknown> = {
		awardType: payload.awardType,
		releaseAmount: payload.releaseAmount,
		refundAmount: payload.refundAmount,
		summary: payload.summary
	}

	if (payload.reasoning !== undefined && payload.reasoning !== null && payload.reasoning.trim().length) {
		body.reasoning = payload.reasoning
	}

	if (payload.attachments && payload.attachments.length) {
		body.attachments = payload.attachments
	}

	const response = await authorizeAxiosInstance.post(`/admin/disputes/${disputeId}/arbitration/decision`, body)

	return response.data
}

export type { ArbitrationDecisionAwardType }
