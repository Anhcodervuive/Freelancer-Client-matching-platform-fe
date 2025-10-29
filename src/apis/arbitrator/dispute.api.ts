import type {
        AdminDisputeDetail,
        ArbitrationContext,
        ArbitrationContextResponse,
        ArbitrationContextMeta,
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

const extractListItems = (value: unknown): unknown[] => {
        if (!value) {
                return []
        }

        if (Array.isArray(value)) {
                return value
        }

        if (typeof value === 'object') {
                const record = value as Record<string, unknown>
                const candidates = [record.data, record.items, record.disputes, record.results]
                for (const candidate of candidates) {
                        if (Array.isArray(candidate)) {
                                return candidate
                        }
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
                getString(record.at ?? record.timestamp ?? record.occurredAt ?? record.createdAt ?? record.created_at) ??
                undefined
        const action = getString(record.action ?? record.event ?? record.type)

        if (!at || !action) {
                return null
        }

        const entry: ArbitrationTimelineEntry = { at, action }

        const actor = getString(record.actor ?? record.user ?? record.by ?? record.actorName ?? record.actor_name)
        if (actor) {
                entry.actor = actor
        }

        const details =
                record.details ??
                record.context ??
                record.metadata ??
                record.description ??
                record.note ??
                null

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

        return value
                .map(item => parseTimelineEntry(item))
                .filter((item): item is ArbitrationTimelineEntry => Boolean(item))
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

        const versionCandidate =
                getNumber(record.currentDossierVersion ?? record.current_dossier_version ?? record.dossierVersion ?? record.version)
        if (versionCandidate !== undefined) {
                meta.currentDossierVersion = versionCandidate
        }

        return meta
}

const parseArbitrationContext = (value: unknown): ArbitrationContext => {
        const record = asRecord(value)
        if (!record) {
                throw new Error('INVALID_ARBITRATION_CONTEXT')
        }

        const meta = parseMeta(record.meta ?? record.overview)
        const timeline = parseTimeline(record.timeline)

        const sections: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(record)) {
                if (key === 'meta' || key === 'overview' || key === 'timeline') continue
                sections[key] = val
        }

        return { meta, timeline, sections }
}

export const listArbitratorDisputes = async (): Promise<ArbitratorDisputeListItem[]> => {
        const response = await authorizeAxiosInstance.get(baseUrl)
        const payload = response.data as Record<string, unknown> | undefined

        const rawItems = extractListItems(payload)

        return rawItems
                .map(extractArbitratorDisputeListItem)
                .filter((item): item is ArbitratorDisputeListItem => Boolean(item))
}

export const getArbitratorDisputeContext = async (
        disputeId: string
): Promise<ArbitrationContextResponse> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${disputeId}/arbitration/context`)
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

export const recordArbitrationDecision = async (
        disputeId: string,
        payload: RecordArbitrationDecisionInput
) => {
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

        const response = await authorizeAxiosInstance.post(
                `${baseUrl}/${disputeId}/arbitration/decision`,
                body
        )

        return response.data
}

export type { ArbitrationDecisionAwardType }
