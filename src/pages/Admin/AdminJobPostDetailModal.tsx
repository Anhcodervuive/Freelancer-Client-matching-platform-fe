import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        AlertCircle,
        BadgeDollarSign,
        CheckCircle2,
        Clock,
        Eye,
        FileText,
        Globe,
        Loader2,
        MapPin,
        Paperclip,
        RefreshCcw,
        ShieldQuestion,
        Trash2,
        UserRound,
        X
} from 'lucide-react'
import { toast } from 'react-toastify'

import {
        getAdminJobPostDetail,
        listAdminJobPostActivities,
        removeAdminJobPostAttachment,
        updateAdminJobPostStatus
} from '~/apis/admin/job-post.api'
import {
        ADMIN_JOB_STATUS_OPTIONS,
        JOB_DURATION_COMMITMENTS,
        JOB_EXPERIENCE_LEVELS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        JOB_VISIBILITY_OPTIONS,
        type JobDurationCommitment,
        type JobExperienceLevel,
        type JobLocationType,
        type JobPaymentMode,
        type JobStatus,
        type JobVisibility
} from '~/constants/job'
import { languageNameFromCode, PROFICIENCY_OPTIONS } from '~/constants/language'
import type {
        AdminJobPostActivity,
        AdminJobPostAttachment,
        AdminJobPostDetail,
        AdminJobPostLanguageRequirement,
        AdminRemoveJobPostAttachmentInput,
        AdminUpdateJobPostStatusInput
} from '~/types/job-post'
import { normalizeSkills } from '~/utils/jobPost'

const baseStatusLabelMap = Object.fromEntries(
        ADMIN_JOB_STATUS_OPTIONS.map(option => [option.value, option.label])
) as Record<string, string>

const statusLabelMap: Record<string, string> = {
        PUBLISHED_PENDING_REVIEW: 'Đã xuất bản - chờ duyệt',
        ...baseStatusLabelMap
}
const paymentModeLabelMap = Object.fromEntries(
        JOB_PAYMENT_MODES.map(option => [option.value, option.label])
) as Record<JobPaymentMode, string>
const experienceLabelMap = Object.fromEntries(
        JOB_EXPERIENCE_LEVELS.map(option => [option.value, option.label])
) as Record<JobExperienceLevel, string>
const locationLabelMap = Object.fromEntries(
        JOB_LOCATION_TYPES.map(option => [option.value, option.label])
) as Record<JobLocationType, string>
const visibilityLabelMap = Object.fromEntries(
        JOB_VISIBILITY_OPTIONS.map(option => [option.value, option.label])
) as Record<JobVisibility, string>
const durationLabelMap = Object.fromEntries(
        JOB_DURATION_COMMITMENTS.map(item => [item.value, item.label])
) as Record<JobDurationCommitment, string>
const languageProficiencyLabelMap = Object.fromEntries(
        PROFICIENCY_OPTIONS.map(option => [option.value, option.name])
) as Record<string, string>

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', { hour12: false })
}

const formatBudget = (job?: AdminJobPostDetail | null) => {
        if (!job || job.budgetAmount == null || !job.budgetCurrency) {
                return 'Chưa cập nhật'
        }

        try {
                return new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: job.budgetCurrency,
                        maximumFractionDigits: 0
                }).format(job.budgetAmount)
        } catch {
                return `${job.budgetAmount} ${job.budgetCurrency}`
        }
}

const formatDuration = (value?: JobDurationCommitment | null) => {
        if (!value) return '—'
        return durationLabelMap[value] ?? value
}

const toTitleCase = (value: string) =>
        value.replace(/_/g, ' ').replace(/(^|\s)\w/g, letter => letter.toUpperCase())

const formatStatusLabel = (status: string) => {
        if (!status) return '—'
        return statusLabelMap[status] ?? toTitleCase(status.toLowerCase())
}

const formatModerationScore = (score?: number | null) => {
        if (score == null || Number.isNaN(score)) return '—'
        const percentage = (score * 100).toFixed(score * 100 < 1 ? 2 : 1)
        return `${score.toFixed(3)} (${percentage}%)`
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value)

const isLanguageArray = (value: unknown): value is AdminJobPostLanguageRequirement[] =>
        Array.isArray(value) &&
        value.every(
                item =>
                        item &&
                        typeof item === 'object' &&
                        'languageCode' in item &&
                        typeof (item as AdminJobPostLanguageRequirement).languageCode === 'string'
        )

const isAttachmentArray = (value: unknown): value is AdminJobPostAttachment[] =>
        Array.isArray(value) &&
        value.every(item => item && typeof item === 'object' && 'id' in item && 'asset' in item)

type TabKey = 'overview' | 'content' | 'requirements' | 'attachments' | 'moderation' | 'activity'

type ModerationDetails = {
        flagged: boolean | null
        provider?: string
        categories: Array<{ key: string; isFlagged: boolean }>
        scores: Array<{ key: string; score: number }>
        languages: string[]
}

const stringifyJson = (value: unknown) => {
        if (value == null) return ''
        if (typeof value === 'string') return value

        try {
                return JSON.stringify(value, null, 2)
        } catch {
                return String(value)
        }
}

const moderationCategoryLabelMap: Record<string, string> = {
        insult: 'Insult / xúc phạm',
        hate: 'Hate speech',
        harassment: 'Harassment',
        sexual: 'Sexual content',
        violence: 'Violence',
        spam: 'Spam'
}

const formatModerationCategory = (value?: string | null) => {
        if (!value) return '—'
        const normalized = moderationCategoryLabelMap[value]
        if (normalized) return normalized
        return toTitleCase(value.toLowerCase())
}

const ACTIVITY_PAGE_SIZE = 20

const formatActivityActorName = (
        actor: AdminJobPostActivity['actor'],
        actorRole?: string | null
) => {
        if (actor) {
                const fullName = `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim()
                if (fullName.length > 0) {
                        return fullName
                }

                if (actor.email) {
                        return actor.email
                }

                if (actor.id) {
                        return `Người dùng #${actor.id}`
                }
        }

        if (actorRole) {
                return toTitleCase(actorRole.toLowerCase())
        }

        return 'Không xác định'
}

const formatActivityMetadata = (metadata: AdminJobPostActivity['metadata']) => {
        if (metadata == null) {
                return ''
        }

        if (typeof metadata === 'string') {
                return metadata
        }

        if (typeof metadata === 'number' || typeof metadata === 'boolean') {
                return String(metadata)
        }

        try {
                return JSON.stringify(metadata, null, 2)
        } catch {
                return String(metadata)
        }
}

type AdminJobPostDetailModalProps = {
        jobId: string | null
        onClose: () => void
        onUpdated?: () => void
}

export default function AdminJobPostDetailModal({ jobId, onClose, onUpdated }: AdminJobPostDetailModalProps) {
        const queryClient = useQueryClient()
        const [activeTab, setActiveTab] = useState<TabKey>('overview')
        const [statusValue, setStatusValue] = useState<JobStatus | ''>('')
        const [statusReason, setStatusReason] = useState('')
        const [statusNote, setStatusNote] = useState('')
        const [attachmentToRemove, setAttachmentToRemove] = useState<AdminJobPostAttachment | null>(null)
        const [removeReason, setRemoveReason] = useState('')
        const [removeNote, setRemoveNote] = useState('')

        const {
                data,
                isLoading,
                isFetching,
                error,
                refetch
        } = useQuery<AdminJobPostDetail>({
                queryKey: ['admin-job-post', jobId],
                queryFn: () => getAdminJobPostDetail(jobId as string),
                enabled: Boolean(jobId),
                staleTime: 0
        })

        const updateStatusMutation = useMutation({
                mutationFn: (payload: AdminUpdateJobPostStatusInput) =>
                        updateAdminJobPostStatus(jobId as string, payload),
                onSuccess: updated => {
                        toast.success('Đã cập nhật trạng thái job post')
                        queryClient.setQueryData(['admin-job-post', jobId], updated)
                        queryClient.invalidateQueries({ queryKey: ['admin-job-posts'] })
                        refetch()
                        onUpdated?.()
                },
                onError: () => {
                        toast.error('Cập nhật trạng thái job post thất bại')
                }
        })

        const removeAttachmentMutation = useMutation({
                mutationFn: ({
                        attachmentId,
                        payload
                }: {
                        attachmentId: string
                        payload: AdminRemoveJobPostAttachmentInput
                }) => removeAdminJobPostAttachment(jobId as string, attachmentId, payload),
                onSuccess: () => {
                        toast.success('Đã gỡ tệp đính kèm')
                        setAttachmentToRemove(null)
                        setRemoveReason('')
                        setRemoveNote('')
                        queryClient.invalidateQueries({ queryKey: ['admin-job-post', jobId] })
                        queryClient.invalidateQueries({ queryKey: ['admin-job-posts'] })
                        refetch()
                        onUpdated?.()
                },
                onError: () => {
                        toast.error('Gỡ tệp đính kèm thất bại')
                }
        })

        const {
                data: activityQueryData,
                isLoading: isActivityLoading,
                isError: isActivityError,
                error: activityError,
                fetchNextPage: fetchActivityNextPage,
                hasNextPage: hasActivityNextPage,
                isFetchingNextPage: isFetchingActivityNextPage,
                refetch: refetchActivity,
                isFetching: isActivityFetching
        } = useInfiniteQuery({
                queryKey: ['admin-job-post', jobId, 'activity'],
                queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
                        listAdminJobPostActivities(jobId as string, {
                                page: pageParam,
                                limit: ACTIVITY_PAGE_SIZE
                        }),
                initialPageParam: 1,
                getNextPageParam: lastPage => {
                        const { page, limit, total } = lastPage.meta
                        const safeLimit = limit > 0 ? limit : ACTIVITY_PAGE_SIZE

                        if (safeLimit <= 0) {
                                return undefined
                        }

                        const totalPages = Math.ceil(total / safeLimit)
                        const nextPage = page + 1

                        return nextPage <= totalPages ? nextPage : undefined
                },
                enabled: Boolean(jobId) && activeTab === 'activity',
                staleTime: 0
        })

        useEffect(() => {
                setActiveTab('overview')
        }, [jobId])

        useEffect(() => {
                if (jobId && data?.status) {
                        setStatusValue(data.status)
                } else {
                        setStatusValue('')
                }
        }, [jobId, data?.status])

        useEffect(() => {
                if (jobId) {
                        setStatusReason('')
                        setStatusNote('')
                        setAttachmentToRemove(null)
                        setRemoveReason('')
                        setRemoveNote('')
                }
        }, [jobId])

        const normalizedSkills = useMemo(() => normalizeSkills(data?.skills), [data?.skills])
        const languages = useMemo(() => (isLanguageArray(data?.languages) ? data?.languages : []), [data?.languages])
        const attachments = useMemo(() => {
                if (!data || !isAttachmentArray(data.attachments)) return []
                return [...data.attachments].sort((a, b) => a.position - b.position)
        }, [data])
        const clientAccountIsActive = data?.client?.profile?.user?.isActive
        const clientAccountRole = data?.client?.profile?.user?.role ?? null

        const activityLogs = useMemo(() => {
                if (!activityQueryData?.pages) return []
                return activityQueryData.pages.flatMap(page => page.data ?? [])
        }, [activityQueryData])
        const activityTotal = activityQueryData?.pages?.[0]?.meta?.total ?? 0
        const activityErrorMessage = activityError instanceof Error ? activityError.message : 'Không thể tải nhật ký hoạt động.'

        const screeningQuestions = useMemo(() => {
                if (!Array.isArray(data?.screeningQuestions)) return []

                return [...data.screeningQuestions]
                        .sort((a, b) => {
                                if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex

                                const aCreatedAt = (a as { createdAt?: string | Date }).createdAt
                                const bCreatedAt = (b as { createdAt?: string | Date }).createdAt
                                const aTime = aCreatedAt ? new Date(aCreatedAt).getTime() : 0
                                const bTime = bCreatedAt ? new Date(bCreatedAt).getTime() : 0

                                return aTime - bTime
                        })
                        .map(question => ({
                                id: question.id,
                                question: question.question,
                                isRequired: question.isRequired,
                                orderIndex: question.orderIndex
                        }))
        }, [data?.screeningQuestions])

        const moderationPayloadText = useMemo(
                () => stringifyJson(data?.moderationPayload ?? null),
                [data?.moderationPayload]
        )
        const customTermsText = useMemo(() => stringifyJson(data?.customTerms ?? null), [data?.customTerms])
        const hasCustomTerms = useMemo(() => customTermsText.trim().length > 0, [customTermsText])
        const hasModerationPayload = useMemo(
                () => moderationPayloadText.trim().length > 0,
                [moderationPayloadText]
        )
        const moderationDetails = useMemo<ModerationDetails>(() => {
                if (!isRecord(data?.moderationPayload)) {
                        return { flagged: null, provider: undefined, categories: [], scores: [], languages: [] }
                }

                const payload = data.moderationPayload as Record<string, unknown>
                const resultRaw = (payload as { result?: unknown }).result
                const responseRaw = (payload as { response?: unknown }).response

                const result = isRecord(resultRaw) ? resultRaw : {}
                const response = isRecord(responseRaw) ? responseRaw : {}

                const flaggedRaw = (result as { flagged?: unknown }).flagged
                const categoriesRaw = (result as { categories?: unknown }).categories
                const categoryScoresRaw = (result as { categoryScores?: unknown }).categoryScores
                const languagesRaw = (response as { languages?: unknown }).languages

                const flagged = typeof flaggedRaw === 'boolean' ? flaggedRaw : null
                const categories = isRecord(categoriesRaw)
                        ? Object.entries(categoriesRaw)
                                  .filter(([, value]) => typeof value === 'boolean')
                                  .map(([key, value]) => ({ key, isFlagged: Boolean(value) }))
                        : []
                const scores = isRecord(categoryScoresRaw)
                        ? Object.entries(categoryScoresRaw)
                                  .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
                                  .map(([key, value]) => ({ key, score: Number(value) }))
                        : []
                const languages = Array.isArray(languagesRaw)
                        ? languagesRaw.filter((item): item is string => typeof item === 'string')
                        : []
                const provider = typeof payload.provider === 'string' ? payload.provider : undefined

                return { flagged, provider, categories, scores, languages }
        }, [data?.moderationPayload])

        const tabItems: { id: TabKey; label: string }[] = useMemo(
                () => [
                        { id: 'overview', label: 'Tổng quan' },
                        { id: 'content', label: 'Nội dung' },
                        { id: 'requirements', label: 'Yêu cầu' },
                        {
                                id: 'attachments',
                                label: attachments.length > 0 ? `Tệp đính kèm (${attachments.length})` : 'Tệp đính kèm'
                        },
                        {
                                id: 'activity',
                                label: activityTotal > 0 ? `Hoạt động (${activityTotal})` : 'Hoạt động'
                        },
                        { id: 'moderation', label: 'Kiểm duyệt' }
                ],
                [activityTotal, attachments.length]
        )
        const statusOptions = useMemo(() => {
                const optionMap = new Map<JobStatus, { value: JobStatus; label: string }>()
                ADMIN_JOB_STATUS_OPTIONS.forEach(option => {
                        optionMap.set(option.value, { value: option.value, label: option.label })
                })

                if (data?.status && !optionMap.has(data.status)) {
                        optionMap.set(data.status, {
                                value: data.status,
                                label: formatStatusLabel(data.status)
                        })
                }

                return Array.from(optionMap.values())
        }, [data?.status])

        if (!jobId) {
                return null
        }

        const handleSubmitStatus = (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!jobId || !statusValue || statusValue === data?.status) {
                        return
                }

                const payload: AdminUpdateJobPostStatusInput = {
                        status: statusValue
                }

                if (statusReason.trim()) {
                        payload.reason = statusReason.trim()
                }

                if (statusNote.trim()) {
                        payload.note = statusNote.trim()
                }

                updateStatusMutation.mutate(payload)
        }

        const handleSelectAttachment = (attachment: AdminJobPostAttachment) => {
                setActiveTab('attachments')
                setAttachmentToRemove(attachment)
                setRemoveReason('')
                setRemoveNote('')
        }

        const handleRemoveAttachment = (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!jobId || !attachmentToRemove) return

                const confirmed = window.confirm('Bạn có chắc chắn muốn gỡ tệp đính kèm này? Hành động này không thể hoàn tác.')
                if (!confirmed) return

                const payload: AdminRemoveJobPostAttachmentInput = {}

                if (removeReason.trim()) {
                        payload.reason = removeReason.trim()
                }

                if (removeNote.trim()) {
                        payload.note = removeNote.trim()
                }

                removeAttachmentMutation.mutate({
                        attachmentId: attachmentToRemove.id,
                        payload
                })
        }

        return (
                <dialog className={`modal ${jobId ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-6xl space-y-6'>
                                <div className='flex flex-col gap-4 border-b border-base-200 pb-4 sm:flex-row sm:items-start sm:justify-between'>
                                        <div className='space-y-1'>
                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Eye className='size-4' /> Chi tiết job post
                                                </div>
                                                <h2 className='text-2xl font-semibold text-base-content'>{data?.title ?? 'Đang tải...'}</h2>
                                                <p className='text-xs text-base-content/60'>ID: {data?.id ?? jobId}</p>
                                        </div>
                                        <div className='flex flex-wrap items-center gap-2'>
                                                <span className='badge border border-primary/30 bg-primary/10 text-primary'>
                                                        {statusValue ? formatStatusLabel(statusValue) : '—'}
                                                </span>
                                                {data?.isDeleted && (
                                                        <span className='badge border border-error/40 bg-error/10 text-error'>Đã xóa</span>
                                                )}
                                                <button
                                                        type='button'
                                                        className='btn btn-sm gap-2'
                                                        onClick={() => {
                                                                refetch()
                                                                if (activeTab === 'activity') {
                                                                        refetchActivity()
                                                                }
                                                        }}
                                                        disabled={isFetching || (activeTab === 'activity' && isActivityFetching)}
                                                >
                                                        {isFetching ? <Loader2 className='size-4 animate-spin' /> : <RefreshCcw className='size-4' />}
                                                        Làm mới
                                                </button>
                                                <button type='button' className='btn btn-sm btn-ghost' onClick={onClose}>
                                                        <X className='size-4' />
                                                        Đóng
                                                </button>
                                        </div>
                                </div>

                                {isLoading ? (
                                        <div className='space-y-3'>
                                                <div className='skeleton h-6 w-2/3' />
                                                <div className='skeleton h-4 w-full' />
                                                <div className='skeleton h-4 w-5/6' />
                                        </div>
                                ) : error ? (
                                        <div className='alert alert-error'>
                                                <AlertCircle className='size-5' />
                                                <span>Không thể tải chi tiết job post.</span>
                                        </div>
                                ) : data ? (
                                        <div className='space-y-6'>
                                                {moderationDetails.flagged && (
                                                        <div className='alert alert-warning'>
                                                                <AlertCircle className='size-5' />
                                                                <div>
                                                                        <p className='font-semibold text-base-content'>Bài đăng đang bị gắn cờ kiểm duyệt</p>
                                                                        <p className='text-xs text-base-content/70'>
                                                                                {`Danh mục: ${formatModerationCategory(data.moderationCategory)}`}
                                                                        </p>
                                                                        {data.moderationSummary && (
                                                                                <p className='mt-1 text-sm text-base-content/80'>
                                                                                        {data.moderationSummary}
                                                                                </p>
                                                                        )}
                                                                </div>
                                                        </div>
                                                )}
                                                <div className='grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(280px,2fr)] xl:grid-cols-[minmax(0,5fr)_minmax(280px,2fr)] xl:gap-8'>
                                                        <div className='space-y-4'>
                                                                <div className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                        <div className='flex flex-wrap gap-2 rounded-xl bg-base-200/60 p-1'>
                                                                                {tabItems.map(tab => (
                                                                                        <button
                                                                                                key={tab.id}
                                                                                                type='button'
                                                                                                className={`btn btn-sm ${
                                                                                                        activeTab === tab.id
                                                                                                                ? 'btn-primary'
                                                                                                                : 'btn-ghost text-base-content/80'
                                                                                                }`}
                                                                                                onClick={() => setActiveTab(tab.id)}
                                                                                        >
                                                                                                {tab.label}
                                                                                        </button>
                                                                                ))}
                                                                        </div>
                                                                        <div className='mt-4 space-y-4'>
                                                                                {activeTab === 'overview' && (
                                                                                        <div className='space-y-4'>
                                                                                                <div className='grid gap-4 md:grid-cols-2'>
                                                                                                        <section className='rounded-2xl border border-base-200 bg-base-200/50 p-4'>
                                                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                        <FileText className='size-4' /> Thông tin tổng quan
                                                                                                                </div>
                                                                                                                <dl className='mt-4 grid grid-cols-[max-content,1fr] items-start gap-x-4 gap-y-3 text-sm text-base-content/80'>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Trạng thái</dt>
                                                                                                                        <dd className='font-medium text-base-content'>
                                                                                                                                {formatStatusLabel(data.status)}
                                                                                                                        </dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Hiển thị</dt>
                                                                                                                        <dd>{visibilityLabelMap[data.visibility] ?? data.visibility}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Chuyên môn</dt>
                                                                                                                        <dd>
                                                                                                                                <div className='font-medium text-base-content'>{data.specialty.name}</div>
                                                                                                                                <div className='text-xs text-base-content/60'>{data.specialty.category.name}</div>
                                                                                                                        </dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Hình thức</dt>
                                                                                                                        <dd>{paymentModeLabelMap[data.paymentMode] ?? data.paymentMode}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Ngân sách</dt>
                                                                                                                        <dd>{formatBudget(data)}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Kinh nghiệm</dt>
                                                                                                                        <dd>{experienceLabelMap[data.experienceLevel] ?? data.experienceLevel}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Hình thức làm việc</dt>
                                                                                                                        <dd>{locationLabelMap[data.locationType] ?? data.locationType}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Khu vực ưu tiên</dt>
                                                                                                                        <dd>
                                                                                                                                {Array.isArray(data.preferredLocations) && data.preferredLocations.length > 0 ? (
                                                                                                                                        <div className='flex flex-wrap gap-2'>
                                                                                                                                                {data.preferredLocations.map(location => (
                                                                                                                                                        <span key={String(location)} className='badge badge-outline text-xs'>
                                                                                                                                                                {String(location)}
                                                                                                                                                        </span>
                                                                                                                                                ))}
                                                                                                                                        </div>
                                                                                                                                ) : (
                                                                                                                                        '—'
                                                                                                                                )}
                                                                                                                        </dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Thời lượng</dt>
                                                                                                                        <dd>{formatDuration(data.duration)}</dd>
                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Phiên bản form</dt>
                                                                                                                        <dd>{data.formVersion}</dd>
                                                                                                                </dl>
                                                                                                        </section>
                                                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                        <UserRound className='size-4' /> Thông tin khách hàng
                                                                                                                </div>
                                                                                                                {data.client ? (
                                                                                                                        <dl className='mt-4 space-y-3 text-sm text-base-content/80'>
                                                                                                                                <div>
                                                                                                                                        <dt className='text-xs uppercase tracking-wide text-base-content/60'>Company</dt>
                                                                                                                                        <dd className='font-medium text-base-content'>
                                                                                                                                                {data.client?.companyName ?? '—'}
                                                                                                                                        </dd>
                                                                                                                                </div>
        <div>
                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Client ID</dt>
                <dd>{data.client?.userId ?? '—'}</dd>
        </div>
        <div>
                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Hồ sơ client</dt>
                <dd>{data.client?.id ?? '—'}</dd>
        </div>
        <div>
                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Trạng thái tài khoản</dt>
                <dd>
                        {clientAccountIsActive === true ? (
                                <span className='badge badge-success badge-outline text-xs'>Đang hoạt động</span>
                        ) : clientAccountIsActive === false ? (
                                <span className='badge badge-error badge-outline text-xs'>Đã khóa</span>
                        ) : (
                                'Không rõ'
                        )}
                </dd>
        </div>
        <div>
                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Vai trò</dt>
                <dd>{clientAccountRole ? toTitleCase(clientAccountRole.toLowerCase()) : '—'}</dd>
        </div>
        <div>
                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Liên hệ</dt>
                <dd>
                        {data.client?.profile?.firstName || data.client?.profile?.lastName
                                ? `${data.client?.profile?.firstName ?? ''} ${data.client?.profile?.lastName ?? ''}`.trim()
                                                                                                                                                        : '—'}
                                                                                                                                                {data.client?.profile?.user?.email && (
                                                                                                                                                        <span className='block text-xs text-base-content/60'>
                                                                                                                                                                {data.client?.profile?.user?.email}
                                                                                                                                                        </span>
                                                                                                                                                )}
                                                                                                                                        </dd>
                                                                                                                                </div>
                                                                                                                        </dl>
                                                                                                                ) : (
                                                                                                                        <p className='mt-4 text-sm text-base-content/60'>Không có thông tin khách hàng.</p>
                                                                                                                )}
                                                                                                        </section>
                                                                                                </div>
                                                                                                <div className='grid gap-4 md:grid-cols-2'>
                                                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                        <BadgeDollarSign className='size-4' /> Thống kê
                                                                                                                </div>
                                                                                                                <dl className='mt-4 grid gap-3 text-sm text-base-content/80 sm:grid-cols-2'>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Số proposal</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{data.proposalsCount ?? 0}</dd>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Lượt xem</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{data.viewsCount ?? 0}</dd>
                                                                                                                        </div>
                                                                                                                </dl>
                                                                                                        </section>
                                                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                        <Clock className='size-4' /> Mốc thời gian
                                                                                                                </div>
                                                                                                                <dl className='mt-4 grid gap-3 text-sm text-base-content/80 sm:grid-cols-2'>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Tạo lúc</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{formatDateTime(data.createdAt)}</dd>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Cập nhật</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{formatDateTime(data.updatedAt)}</dd>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Xuất bản</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{formatDateTime(data.publishedAt)}</dd>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Xóa lúc</dt>
                                                                                                                                <dd className='font-medium text-base-content'>{formatDateTime(data.deletedAt)}</dd>
                                                                                                                        </div>
                                                                                                                </dl>
                                                                                                        </section>
                                                                                                </div>
                                                                                        </div>
                                                                                )}
                                                                                {activeTab === 'content' && (
                                                                                        <div className='space-y-4'>
                                                                                                <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                <FileText className='size-4' /> Mô tả công việc
                                                                                                        </div>
                                                                                                        <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-base-content/80'>
                                                                                                                {data.description ?? 'Không có mô tả.'}
                                                                                                        </p>
                                                                                                </section>
                                                                                                {hasCustomTerms && (
                                                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                                <div className='text-sm font-semibold uppercase tracking-wide text-base-content/60'>Điều khoản tùy chỉnh</div>
                                                                                                                <pre className='mt-3 max-h-80 overflow-auto rounded-xl bg-base-200/60 p-3 text-xs leading-relaxed text-base-content/80'>
                                                                                                                        {customTermsText}
                                                                                                                </pre>
                                                                                                        </section>
                                                                                                )}
                                                                                        </div>
                                                                                )}
                                                                                {activeTab === 'requirements' && (
                                                                                        <div className='space-y-4'>
                                                                                                <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                <Globe className='size-4' /> Ngôn ngữ yêu cầu
                                                                                                        </div>
                                                                                                {languages.length > 0 ? (
                                                                                                                <ul className='mt-3 grid gap-3 text-sm text-base-content/80 sm:grid-cols-2'>
                                                                                                                        {languages.map(language => {
                                                                                                                                const normalizedCode = language.languageCode?.toLowerCase() ?? ''
                                                                                                                                const displayName = languageNameFromCode(normalizedCode)
                                                                                                                                const displayCode = normalizedCode ? normalizedCode.toUpperCase() : '—'
                                                                                                                                const proficiencyLabel = language.proficiency
                                                                                                                                        ? languageProficiencyLabelMap[language.proficiency] ??
                                                                                                                                          toTitleCase(language.proficiency.toLowerCase())
                                                                                                                                        : 'Không rõ'

                                                                                                                                return (
                                                                                                                                        <li
                                                                                                                                                key={`${language.languageCode}-${language.proficiency ?? 'unknown'}`}
                                                                                                                                                className='rounded-2xl border border-base-200 bg-base-200/50 p-3'
                                                                                                                                        >
                                                                                                                                                <div className='flex items-start justify-between gap-3'>
                                                                                                                                                        <div>
                                                                                                                                                                <div className='font-semibold text-base-content'>{displayName}</div>
                                                                                                                                                                <div className='text-xs uppercase tracking-wide text-base-content/60'>{displayCode}</div>
                                                                                                                                                        </div>
                                                                                                                                                        <span className='badge badge-outline text-[11px] uppercase tracking-wide text-base-content/70'>
                                                                                                                                                                {proficiencyLabel}
                                                                                                                                                        </span>
                                                                                                                                                </div>
                                                                                                                                        </li>
                                                                                                                                )
                                                                                                                        })}
                                                                                                                </ul>
                                                                                                        ) : (
                                                                                                                <p className='mt-3 text-sm text-base-content/60'>Không yêu cầu ngôn ngữ cụ thể.</p>
                                                                                                        )}
                                                                                                </section>
                                                                                                <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                <MapPin className='size-4' /> Skills yêu cầu
                                                                                                        </div>
                                                                                                        {normalizedSkills.required.length === 0 && normalizedSkills.preferred.length === 0 ? (
                                                                                                                <p className='mt-3 text-sm text-base-content/60'>Không có kỹ năng cụ thể.</p>
                                                                                                        ) : (
                                                                                                                <div className='mt-3 grid gap-3 md:grid-cols-2'>
                                                                                                                        {normalizedSkills.required.length > 0 && (
                                                                                                                                <div className='rounded-2xl border border-base-200 bg-base-200/50 p-3'>
                                                                                                                                        <h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Kỹ năng bắt buộc</h4>
                                                                                                                                        <ul className='mt-2 space-y-2'>
                                                                                                                                                {normalizedSkills.required.map(skill => (
                                                                                                                                                        <li
                                                                                                                                                                key={skill.label}
                                                                                                                                                                className='rounded-xl border border-base-200 bg-base-100 px-3 py-2 font-medium text-base-content'
                                                                                                                                                        >
                                                                                                                                                                {skill.label}
                                                                                                                                                        </li>
                                                                                                                                                ))}
                                                                                                                                        </ul>
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                                        {normalizedSkills.preferred.length > 0 && (
                                                                                                                                <div className='rounded-2xl border border-base-200 bg-base-200/50 p-3'>
                                                                                                                                        <h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Kỹ năng ưu tiên</h4>
                                                                                                                                        <ul className='mt-2 space-y-2'>
                                                                                                                                                {normalizedSkills.preferred.map(skill => (
                                                                                                                                                        <li
                                                                                                                                                                key={skill.label}
                                                                                                                                                                className='rounded-xl border border-base-200 bg-base-100 px-3 py-2 font-medium text-base-content'
                                                                                                                                                        >
                                                                                                                                                                {skill.label}
                                                                                                                                                        </li>
                                                                                                                                                ))}
                                                                                                                                        </ul>
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </section>
                                                                                                <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                <ShieldQuestion className='size-4' /> Screening questions
                                                                                                        </div>
                                                                                                        {screeningQuestions.length > 0 ? (
                                                                                                                <ol className='mt-3 space-y-2 text-sm text-base-content/80'>
                                                                                                                        {screeningQuestions.map(question => (
                                                                                                                                <li key={question.id} className='rounded-xl border border-base-200 bg-base-200/40 px-3 py-2'>
                                                                                                                                        <div className='flex items-center justify-between gap-2'>
                                                                                                                                                <span className='font-medium text-base-content'>Câu hỏi #{question.orderIndex + 1}</span>
                                                                                                                                                {question.isRequired ? (
                                                                                                                                                        <span className='badge badge-success badge-outline gap-1 text-xs'>
                                                                                                                                                                <CheckCircle2 className='size-3.5' /> Bắt buộc
                                                                                                                                                        </span>
                                                                                                                                                ) : (
                                                                                                                                                        <span className='badge badge-outline text-xs'>Tùy chọn</span>
                                                                                                                                                )}
                                                                                                                                        </div>
                                                                                                                                        <p className='mt-2 whitespace-pre-line text-sm text-base-content/80'>{question.question}</p>
                                                                                                                                </li>
                                                                                                                        ))}
                                                                                                                </ol>
                                                                                                        ) : (
                                                                                                                <p className='mt-3 text-sm text-base-content/60'>Không có screening question.</p>
                                                                                                        )}
                                                                                                </section>
                                                                                        </div>
                                                                                )}
                                                                                {activeTab === 'attachments' && (
                                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        <Paperclip className='size-4' /> Tệp đính kèm
                                                                                                </div>
                                                                                                {attachments.length > 0 ? (
                                                                                                        <ul className='mt-3 space-y-2 text-sm text-base-content/80'>
                                                                                                                {attachments.map(attachment => {
                                                                                                                        const isSelected = attachmentToRemove?.id === attachment.id

                                                                                                                        return (
                                                                                                                                <li
                                                                                                                                        key={attachment.id}
                                                                                                                                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                                                                                                                                                isSelected
                                                                                                                                                        ? 'border-error/40 bg-error/10'
                                                                                                                                                        : 'border-base-200 bg-base-200/40'
                                                                                                                                        }`}
                                                                                                                                >
                                                                                                                                        <div>
                                                                                                                                                <div className='font-medium text-base-content'>
                                                                                                                                                        {attachment.label ?? attachment.asset?.mimeType ?? 'Tệp'}
                                                                                                                                                </div>
                                                                                                                                                <div className='text-xs text-base-content/60'>ID: {attachment.id}</div>
                                                                                                                                                {attachment.caption && (
                                                                                                                                                        <div className='text-xs text-base-content/60'>{attachment.caption}</div>
                                                                                                                                                )}
                                                                                                                                        </div>
                                                                                                                                        <div className='flex flex-col items-end gap-2 sm:flex-row sm:items-center'>
                                                                                                                                                {attachment.asset?.url && (
                                                                                                                                                        <a
                                                                                                                                                                href={attachment.asset.url}
                                                                                                                                                                target='_blank'
                                                                                                                                                                rel='noreferrer'
                                                                                                                                                                className='btn btn-xs'
                                                                                                                                                        >
                                                                                                                                                                Xem tệp
                                                                                                                                                        </a>
                                                                                                                                                )}
                                                                                                                                                <button
                                                                                                                                                        type='button'
                                                                                                                                                        className='btn btn-ghost btn-xs gap-1 text-error'
                                                                                                                                                        onClick={() => handleSelectAttachment(attachment)}
                                                                                                                                                        disabled={removeAttachmentMutation.isPending && isSelected}
                                                                                                                                                >
                                                                                                                                                        <Trash2 className='size-3.5' />
                                                                                                                                                        Gỡ tệp
                                                                                                                                                </button>
                                                                                                                                        </div>
                                                                                                                                </li>
                                                                                                                        )
                                                                                                                })}
                                                                                                        </ul>
                                                                                                ) : (
                                                                                        <p className='mt-3 text-sm text-base-content/60'>Không có tệp đính kèm.</p>
                                                                                )}
                                                                        </section>
                                                                )}
                                                                {activeTab === 'activity' && (
                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                <Clock className='size-4' /> Nhật ký hoạt động
                                                                                        </div>
                                                                                        {activityTotal > 0 && (
                                                                                                <span className='badge badge-outline text-xs'>Tổng: {activityTotal}</span>
                                                                                        )}
                                                                                </div>
                                                                                {isActivityLoading ? (
                                                                                        <div className='mt-4 space-y-3'>
                                                                                                <div className='skeleton h-4 w-2/3' />
                                                                                                <div className='skeleton h-4 w-full' />
                                                                                                <div className='skeleton h-4 w-5/6' />
                                                                                        </div>
                                                                                ) : isActivityError ? (
                                                                                        <div className='alert alert-error mt-4 items-start gap-3'>
                                                                                                <AlertCircle className='size-5' />
                                                                                                <div className='space-y-1 text-sm'>
                                                                                                        <p className='font-semibold text-base-content'>Không thể tải nhật ký hoạt động.</p>
                                                                                                        {activityErrorMessage && (
                                                                                                                <p className='text-xs text-base-content/70'>{activityErrorMessage}</p>
                                                                                                        )}
                                                                                                </div>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-sm'
                                                                                                        onClick={() => refetchActivity()}
                                                                                                        disabled={isActivityFetching}
                                                                                                >
                                                                                                        {isActivityFetching ? <Loader2 className='size-4 animate-spin' /> : 'Thử lại'}
                                                                                                </button>
                                                                                        </div>
                                                                                ) : activityLogs.length > 0 ? (
                                                                                        <div className='mt-4 max-h-80 space-y-3 overflow-y-auto pr-1'>
                                                                                                {activityLogs.map(log => {
                                                                                                        const metadataText = formatActivityMetadata(log.metadata)

                                                                                                        return (
                                                                                                                <div key={log.id} className='space-y-2 rounded-xl border border-base-200 p-3 text-sm text-base-content/80'>
                                                                                                                        <div className='flex flex-wrap items-center gap-2 text-xs text-base-content/60'>
                                                                                                                                <span>{formatDateTime(log.createdAt)}</span>
                                                                                                                                <span className='badge badge-sm badge-ghost'>{log.action}</span>
                                                                                                                                {log.actorRole ? (
                                                                                                                                        <span className='badge badge-sm badge-outline'>
                                                                                                                                                {toTitleCase(log.actorRole.toLowerCase())}
                                                                                                                                        </span>
                                                                                                                                ) : null}
                                                                                                                        </div>
                                                                                                                        <div className='font-medium text-base-content'>
                                                                                                                                {formatActivityActorName(log.actor, log.actorRole)}
                                                                                                                        </div>
                                                                                                                        {metadataText ? (
                                                                                                                                <pre className='whitespace-pre-wrap break-words rounded-lg bg-base-200/60 p-3 text-xs text-base-content/80'>
                                                                                                                                        {metadataText}
                                                                                                                                </pre>
                                                                                                                        ) : null}
                                                                                                                </div>
                                                                                                        )
                                                                                                })}
                                                                                                {hasActivityNextPage && (
                                                                                                        <div className='flex justify-center'>
                                                                                                                <button
                                                                                                                        type='button'
                                                                                                                        className='btn btn-outline btn-sm'
                                                                                                                        onClick={() => fetchActivityNextPage()}
                                                                                                                        disabled={isFetchingActivityNextPage}
                                                                                                                >
                                                                                                                        {isFetchingActivityNextPage ? (
                                                                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                                                        ) : (
                                                                                                                                'Tải thêm'
                                                                                                                        )}
                                                                                                                </button>
                                                                                                        </div>
                                                                                                )}
                                                                                        </div>
                                                                                ) : (
                                                                                        <p className='mt-3 text-sm text-base-content/60'>Chưa có hoạt động nào được ghi nhận.</p>
                                                                                )}
                                                                        </section>
                                                                )}
                                                                {activeTab === 'moderation' && (
                                                                        <section className='rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                        <CheckCircle2 className='size-4' /> Thông tin kiểm duyệt
                                                                                </div>
                                                                                                <dl className='mt-3 grid gap-3 text-sm text-base-content/80 sm:grid-cols-2'>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Điểm kiểm duyệt</dt>
                                                                                                                <dd>{formatModerationScore(data.moderationScore)}</dd>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Danh mục kiểm duyệt</dt>
                                                                                                                <dd>{formatModerationCategory(data.moderationCategory)}</dd>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Đánh dấu vi phạm</dt>
                                                                                                                <dd>
                                                                                                                        {moderationDetails.flagged == null
                                                                                                                                ? 'Không xác định'
                                                                                                                                : moderationDetails.flagged
                                                                                                                                ? 'Có'
                                                                                                                                : 'Không'}
                                                                                                                </dd>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Nhà cung cấp</dt>
                                                                                                                <dd>{moderationDetails.provider ?? '—'}</dd>
                                                                                                        </div>
                                                                                                        <div className='sm:col-span-2'>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Kiểm duyệt lần cuối</dt>
                                                                                                                <dd>{formatDateTime(data.moderationCheckedAt)}</dd>
                                                                                                        </div>
                                                                                                </dl>
                                                                                                {moderationDetails.languages.length > 0 && (
                                                                                                        <div className='mt-4'>
                                                                                                                <div className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ngôn ngữ phân tích</div>
                                                                                                                <div className='mt-2 flex flex-wrap gap-2'>
                                                                                                                        {moderationDetails.languages.map(language => (
                                                                                                                                <span key={language} className='badge badge-outline text-xs uppercase'>
                                                                                                                                        {language}
                                                                                                                                </span>
                                                                                                                        ))}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                )}
                                                                                                {moderationDetails.categories.some(category => category.isFlagged) && (
                                                                                                        <div className='mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-base-content/80'>
                                                                                                                <div className='text-xs font-semibold uppercase tracking-wide text-warning'>Danh mục bị gắn cờ</div>
                                                                                                                <ul className='mt-2 space-y-2'>
                                                                                                                        {moderationDetails.categories
                                                                                                                                .filter(category => category.isFlagged)
                                                                                                                                .map(category => (
                                                                                                                                        <li key={category.key} className='flex items-center gap-2'>
                                                                                                                                                <AlertCircle className='size-4 text-warning' />
                                                                                                                                                <span>{formatModerationCategory(category.key)}</span>
                                                                                                                                        </li>
                                                                                                                                ))}
                                                                                                                </ul>
                                                                                                        </div>
                                                                                                )}
                                                                                                {moderationDetails.scores.length > 0 && (
                                                                                                        <div className='mt-4'>
                                                                                                                <div className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Điểm theo danh mục</div>
                                                                                                                <div className='mt-2 overflow-hidden rounded-xl border border-base-200'>
                                                                                                                        <table className='w-full text-left text-xs text-base-content/80'>
                                                                                                                                <thead className='bg-base-200/80 text-[11px] uppercase tracking-wide text-base-content/60'>
                                                                                                                                        <tr>
                                                                                                                                                <th className='px-3 py-2'>Danh mục</th>
                                                                                                                                                <th className='px-3 py-2 text-right'>Điểm</th>
                                                                                                                                        </tr>
                                                                                                                                </thead>
                                                                                                                                <tbody>
                                                                                                                                        {moderationDetails.scores.map(score => (
                                                                                                                                                <tr key={score.key} className='border-t border-base-200'>
                                                                                                                                                        <td className='px-3 py-2'>{formatModerationCategory(score.key)}</td>
                                                                                                                                                        <td className='px-3 py-2 text-right'>{formatModerationScore(score.score)}</td>
                                                                                                                                                </tr>
                                                                                                                                        ))}
                                                                                                                                </tbody>
                                                                                                                        </table>
                                                                                                                </div>
                                                                                                        </div>
                                                                                                )}
                                                                                                {data.moderationSummary && (
                                                                                                        <div className='mt-4 rounded-xl border border-base-200 bg-base-200/40 p-3 text-sm text-base-content/80'>
                                                                                                                <div className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Tóm tắt kiểm duyệt</div>
                                                                                                                <p className='mt-2 whitespace-pre-line leading-relaxed'>{data.moderationSummary}</p>
                                                                                                        </div>
                                                                                                )}
                                                                                                {hasModerationPayload && (
                                                                                                        <div className='mt-4'>
                                                                                                                <div className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Payload kiểm duyệt</div>
                                                                                                                <pre className='mt-2 max-h-80 overflow-auto rounded-xl bg-base-200/60 p-3 text-xs leading-relaxed text-base-content/80'>
                                                                                                                        {moderationPayloadText}
                                                                                                                </pre>
                                                                                                        </div>
                                                                                                )}
                                                                                        </section>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                        <aside className='space-y-4'>
                                                                <form onSubmit={handleSubmitStatus} className='space-y-4 rounded-2xl border border-base-200 bg-base-100 p-4'>
                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                <ShieldQuestion className='size-4' /> Cập nhật trạng thái
                                                                        </div>
                                                                        <div className='grid gap-3 sm:grid-cols-2'>
                                                                                <label className='flex flex-col gap-1 text-sm text-base-content/80'>
                                                                                        <span className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Trạng thái</span>
                                                                                        <select
                                                                                                className='select select-bordered select-sm'
                                                                                                value={statusValue}
                                                                                                onChange={event => setStatusValue(event.target.value as JobStatus | '')}
                                                                                        >
                                                                                                <option value='' disabled>
                                                                                                        Chọn trạng thái
                                                                                                </option>
                                                                                                {statusOptions.map(option => (
                                                                                                        <option key={option.value} value={option.value}>
                                                                                                                {option.label}
                                                                                                        </option>
                                                                                                ))}
                                                                                        </select>
                                                                                </label>
                                                                                <label className='flex flex-col gap-1 text-sm text-base-content/80'>
                                                                                        <span className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Lý do</span>
                                                                                        <textarea
                                                                                                className='textarea textarea-bordered textarea-sm min-h-[80px]'
                                                                                                value={statusReason}
                                                                                                onChange={event => setStatusReason(event.target.value)}
                                                                                                placeholder='Nhập lý do (không bắt buộc)'
                                                                                        />
                                                                                </label>
                                                                                <label className='flex flex-col gap-1 text-sm text-base-content/80 sm:col-span-2'>
                                                                                        <span className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ghi chú</span>
                                                                                        <textarea
                                                                                                className='textarea textarea-bordered textarea-sm min-h-[80px]'
                                                                                                value={statusNote}
                                                                                                onChange={event => setStatusNote(event.target.value)}
                                                                                                placeholder='Ghi chú nội bộ (không bắt buộc)'
                                                                                        />
                                                                                </label>
                                                                        </div>
                                                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                                <span className='text-xs text-base-content/60'>Thay đổi trạng thái sẽ được lưu lại trong nhật ký.</span>
                                                                                <button
                                                                                        type='submit'
                                                                                        className='btn btn-primary btn-sm'
                                                                                        disabled={
                                                                                                updateStatusMutation.isPending ||
                                                                                                !statusValue ||
                                                                                                statusValue === data.status
                                                                                        }
                                                                                >
                                                                                        {updateStatusMutation.isPending && (
                                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                        )}
                                                                                        Cập nhật trạng thái
                                                                                </button>
                                                                        </div>
                                                                </form>
                                                                {attachments.length > 0 && (
                                                                        <form
                                                                                onSubmit={handleRemoveAttachment}
                                                                                className='space-y-4 rounded-2xl border border-error/40 bg-error/5 p-4'
                                                                        >
                                                                                <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-error'>
                                                                                        <Trash2 className='size-4' /> Gỡ tệp đính kèm
                                                                                </div>
                                                                                {attachmentToRemove ? (
                                                                                        <>
                                                                                                <p className='text-xs text-error/80'>
                                                                                                        Tệp sẽ được gỡ khỏi job post. Hành động không thể hoàn tác.
                                                                                                </p>
                                                                                                <div className='rounded-xl border border-error/30 bg-white/70 p-3 text-xs text-error/90'>
                                                                                                        <div className='font-semibold text-error'>Tệp đang chọn</div>
                                                                                                        <div className='mt-1 break-words text-error/80'>
                                                                                                                ID: {attachmentToRemove.id}
                                                                                                        </div>
                                                                                                        {attachmentToRemove.label && (
                                                                                                                <div className='mt-1 break-words text-error/80'>
                                                                                                                        Nhãn: {attachmentToRemove.label}
                                                                                                                </div>
                                                                                                        )}
                                                                                                </div>
                                                                                                <label className='flex flex-col gap-1 text-sm text-error/90'>
                                                                                                        <span className='text-xs font-semibold uppercase tracking-wide'>Lý do gỡ</span>
                                                                                                        <textarea
                                                                                                                className='textarea textarea-bordered textarea-sm min-h-[80px] border-error/40 bg-white'
                                                                                                                value={removeReason}
                                                                                                                onChange={event => setRemoveReason(event.target.value)}
                                                                                                                placeholder='Ghi lại lý do gỡ tệp (không bắt buộc)'
                                                                                                        />
                                                                                                </label>
                                                                                                <label className='flex flex-col gap-1 text-sm text-error/90'>
                                                                                                        <span className='text-xs font-semibold uppercase tracking-wide'>Ghi chú nội bộ</span>
                                                                                                        <textarea
                                                                                                                className='textarea textarea-bordered textarea-sm min-h-[80px] border-error/40 bg-white'
                                                                                                                value={removeNote}
                                                                                                                onChange={event => setRemoveNote(event.target.value)}
                                                                                                                placeholder='Ghi chú bổ sung (không bắt buộc)'
                                                                                                        />
                                                                                                </label>
                                                                                                <div className='flex items-center gap-2'>
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-ghost btn-sm flex-1'
                                                                                                                onClick={() => {
                                                                                                                        setAttachmentToRemove(null)
                                                                                                                        setRemoveReason('')
                                                                                                                        setRemoveNote('')
                                                                                                                }}
                                                                                                                disabled={removeAttachmentMutation.isPending}
                                                                                                        >
                                                                                                                Hủy
                                                                                                        </button>
                                                                                                        <button
                                                                                                                type='submit'
                                                                                                                className='btn btn-error btn-sm flex-1'
                                                                                                                disabled={removeAttachmentMutation.isPending}
                                                                                                        >
                                                                                                                {removeAttachmentMutation.isPending && (
                                                                                                                        <Loader2 className='size-4 animate-spin' />
                                                                                                                )}
                                                                                                                Gỡ tệp
                                                                                                        </button>
                                                                                                </div>
                                                                                        </>
                                                                                ) : (
                                                                                        <p className='text-xs text-error/80'>Chọn một tệp ở tab "Tệp đính kèm" để gỡ.</p>
                                                                                )}
                                                                        </form>
                                                                )}
                                                        </aside>
                                                </div>
                                        </div>
                                ) : null}
                        </div>
                        <form method='dialog' className='modal-backdrop' onClick={onClose}>
                                <button type='submit'>close</button>
                        </form>
                </dialog>
        )
}
