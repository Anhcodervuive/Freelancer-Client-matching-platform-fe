import authorizeAxiosInstance from '~/utils/authorizeAxios'
import { serializeJobPostFilters } from '~/apis/job-post.api'
import type {
        AdminJobPostDetail,
        AdminJobPostFilterInput,
        AdminJobPostListResponse,
        AdminRemoveJobPostAttachmentInput,
        AdminUpdateJobPostStatusInput
} from '~/types/job-post'

type RawAdminJobPostListResponse = Partial<AdminJobPostListResponse> & Record<string, unknown>

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

export const listAdminJobPosts = async (
        filters: AdminJobPostFilterInput = {}
): Promise<AdminJobPostListResponse> => {
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
