import authorizeAxiosInstance from '~/utils/authorizeAxios'
import { serializeJobPostFilters } from '~/apis/job-post.api'
import type {
	AdminJobPostActivity,
	AdminJobPostActivityResponse,
	AdminJobPostDetail,
	AdminJobPostFilterInput,
	AdminJobPostListResponse,
	AdminRemoveJobPostAttachmentInput,
	AdminUpdateJobPostStatusInput,
	JsonArray,
	JsonObject,
	JsonValue
} from '~/types/job-post'

type RawAdminJobPostListResponse = Partial<AdminJobPostListResponse> & Record<string, unknown>
type RawAdminJobPostActivityResponse = Partial<AdminJobPostActivityResponse> & Record<string, unknown>

type RawMeta = { page?: unknown; limit?: unknown; total?: unknown; [key: string]: unknown }

const baseUrl = '/admin/job-posts'

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value && typeof value === 'object' && !Array.isArray(value))

const parseNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined
	}

	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed.length) return undefined
		const parsed = Number(trimmed)
		return Number.isFinite(parsed) ? parsed : undefined
	}

	return undefined
}

const normalizeMeta = (meta: unknown, fallback: { page: number; limit: number; total: number }) => {
	if (!isRecord(meta)) {
		return fallback
	}

	const raw = meta as RawMeta
	const page = parseNumber(raw.page) ?? fallback.page
	const limit = parseNumber(raw.limit) ?? fallback.limit
	const total = parseNumber(raw.total) ?? fallback.total

	return { page, limit, total }
}

const buildListUrl = (filters: AdminJobPostFilterInput = {}) => {
	const queryString = serializeJobPostFilters(filters)
	return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

const buildActivityUrl = (jobId: string, params: AdminJobPostActivityQuery = {}) => {
	const search = new URLSearchParams()

	if (params.page != null) {
		search.set('page', String(params.page))
	}

	if (params.limit != null) {
		search.set('limit', String(params.limit))
	}

	const query = search.toString()
	return query ? `${baseUrl}/${jobId}/activity?${query}` : `${baseUrl}/${jobId}/activity`
}

const normalizeJsonValue = (value: unknown): JsonValue => {
	if (value == null) {
		return null
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value
	}

	if (Array.isArray(value)) {
		return value.map(item => normalizeJsonValue(item)) as JsonArray
	}

	if (isRecord(value)) {
		return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, normalizeJsonValue(val)])) as JsonObject
	}

	return String(value)
}

const normalizeActivityActor = (value: unknown): AdminJobPostActivity['actor'] => {
	if (!isRecord(value)) {
		return null
	}

	return {
		id: typeof value.id === 'string' ? value.id : null,
		email: typeof value.email === 'string' ? value.email : null,
		role: typeof value.role === 'string' ? value.role : null,
		firstName: typeof value.firstName === 'string' ? value.firstName : null,
		lastName: typeof value.lastName === 'string' ? value.lastName : null
	}
}

const normalizeActivity = (value: unknown): AdminJobPostActivity | null => {
	if (!isRecord(value)) {
		return null
	}

	const idRaw = value.id
	const id = typeof idRaw === 'string' ? idRaw : idRaw != null ? String(idRaw) : null
	const action = typeof value.action === 'string' ? value.action : null
	const createdAtRaw = value.createdAt
	let createdAt = ''

	if (typeof createdAtRaw === 'string') {
		createdAt = createdAtRaw
	} else if (createdAtRaw instanceof Date) {
		createdAt = createdAtRaw.toISOString()
	} else if (typeof createdAtRaw === 'number' && Number.isFinite(createdAtRaw)) {
		createdAt = new Date(createdAtRaw).toISOString()
	}

	if (!id || !action) {
		return null
	}

	const actorRole = typeof value.actorRole === 'string' ? value.actorRole : null
	const metadata = normalizeJsonValue((value as { metadata?: unknown }).metadata)
	const actor = normalizeActivityActor((value as { actor?: unknown }).actor)

	return {
		id,
		action,
		metadata,
		createdAt,
		actorRole,
		actor
	}
}

export type AdminJobPostActivityQuery = {
	page?: number
	limit?: number
}

export const listAdminJobPosts = async (filters: AdminJobPostFilterInput = {}): Promise<AdminJobPostListResponse> => {
	const response = await authorizeAxiosInstance.get<RawAdminJobPostListResponse>(buildListUrl(filters))
	const payload = response.data ?? {}
	const data = Array.isArray(payload.data) ? payload.data : []
	const fallbackMeta = {
		page: filters.page ?? 1,
		limit: filters.limit ?? data.length ?? 0,
		total:
			typeof payload.meta?.total === 'number'
				? payload.meta.total
				: Array.isArray(payload.data)
				? payload.data.length
				: 0
	}
	const meta = normalizeMeta(payload.meta, fallbackMeta)

	return {
		data,
		meta
	}
}

export type { AdminJobPostListResponse }

export const getAdminJobPostDetail = async (jobId: string): Promise<AdminJobPostDetail> => {
	const response = await authorizeAxiosInstance.get<AdminJobPostDetail | { data: AdminJobPostDetail }>(
		`${baseUrl}/${jobId}`
	)
	const payload = response.data

	if (!payload) {
		throw new Error('Job post not found')
	}

	if ('data' in (payload as Record<string, unknown>) && (payload as Record<string, unknown>).data) {
		return (payload as { data: AdminJobPostDetail }).data
	}

	return payload as AdminJobPostDetail
}

export const updateAdminJobPostStatus = async (
	jobId: string,
	payload: AdminUpdateJobPostStatusInput
): Promise<AdminJobPostDetail> => {
	const response = await authorizeAxiosInstance.patch<AdminJobPostDetail | { data: AdminJobPostDetail }>(
		`${baseUrl}/${jobId}/status`,
		payload
	)
	const data = response.data

	if (!data) {
		throw new Error('Không thể cập nhật trạng thái job post')
	}

	if ('data' in (data as Record<string, unknown>) && (data as Record<string, unknown>).data) {
		return (data as { data: AdminJobPostDetail }).data
	}

	return data as AdminJobPostDetail
}

export const removeAdminJobPostAttachment = async (
	jobId: string,
	attachmentId: string,
	payload: AdminRemoveJobPostAttachmentInput
): Promise<void> => {
	await authorizeAxiosInstance.delete(`${baseUrl}/${jobId}/attachments/${attachmentId}` as const, {
		data: payload ?? {}
	})
}

export const listAdminJobPostActivities = async (
	jobId: string,
	params: AdminJobPostActivityQuery = {}
): Promise<AdminJobPostActivityResponse> => {
	const response = await authorizeAxiosInstance.get<RawAdminJobPostActivityResponse>(buildActivityUrl(jobId, params))
	const payload = response.data ?? {}
	const rawData = Array.isArray(payload.data) ? (payload.data as unknown[]) : []
	const data = rawData
		.map(item => normalizeActivity(item))
		.filter((item): item is AdminJobPostActivity => Boolean(item))

	const fallbackMeta = {
		page: params.page ?? 1,
		limit: params.limit ?? (data.length || 0),
		total: data.length
	}
	const meta = normalizeMeta(payload.meta, fallbackMeta)

	return { data, meta }
}
