import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
        deleteAdminJobPost,
        getAdminJobPostDetail,
        updateAdminJobPostStatus
} from '~/apis/admin/job-post.api'
import {
        JOB_EXPERIENCE_LEVELS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        JOB_STATUS_OPTIONS,
        JOB_VISIBILITY_OPTIONS,
        type JobExperienceLevel,
        type JobLocationType,
        type JobPaymentMode,
        type JobStatus,
        type JobVisibility
} from '~/constants/job'
import type {
        AdminDeleteJobPostInput,
        AdminJobPostAttachment,
        AdminJobPostDetail,
        AdminJobPostLanguageRequirement,
        AdminUpdateJobPostStatusInput
} from '~/types/job-post'
import { normalizeSkills } from '~/utils/jobPost'

const statusLabelMap = Object.fromEntries(
        JOB_STATUS_OPTIONS.map(option => [option.value, option.label])
) as Record<JobStatus, string>
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

type TabKey = 'overview' | 'content' | 'requirements' | 'attachments' | 'moderation'

const stringifyJson = (value: unknown) => {
        if (value == null) return ''
        if (typeof value === 'string') return value

        try {
                return JSON.stringify(value, null, 2)
        } catch {
                return String(value)
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
        const [deleteReason, setDeleteReason] = useState('')
        const [deleteNote, setDeleteNote] = useState('')

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

        const deleteMutation = useMutation({
                mutationFn: (payload: AdminDeleteJobPostInput) =>
                        deleteAdminJobPost(jobId as string, payload),
                onSuccess: () => {
                        toast.success('Đã xóa job post')
                        queryClient.removeQueries({ queryKey: ['admin-job-post', jobId] })
                        queryClient.invalidateQueries({ queryKey: ['admin-job-posts'] })
                        onUpdated?.()
                        onClose()
                },
                onError: () => {
                        toast.error('Xóa job post thất bại')
                }
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
                        setDeleteReason('')
                        setDeleteNote('')
                }
        }, [jobId])

        const normalizedSkills = useMemo(() => normalizeSkills(data?.skills), [data?.skills])
        const languages = useMemo(() => (isLanguageArray(data?.languages) ? data?.languages : []), [data?.languages])
        const attachments = useMemo(() => {
                if (!data || !isAttachmentArray(data.attachments)) return []
                return [...data.attachments].sort((a, b) => a.position - b.position)
        }, [data])

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

        const tabItems: { id: TabKey; label: string }[] = useMemo(
                () => [
                        { id: 'overview', label: 'Tổng quan' },
                        { id: 'content', label: 'Nội dung' },
                        { id: 'requirements', label: 'Yêu cầu' },
                        {
                                id: 'attachments',
                                label: attachments.length > 0 ? `Tệp đính kèm (${attachments.length})` : 'Tệp đính kèm'
                        },
                        { id: 'moderation', label: 'Kiểm duyệt' }
                ],
                [attachments.length]
        )

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

        const handleDeleteJobPost = (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!jobId) return
                const confirmed = window.confirm('Bạn có chắc chắn muốn xóa job post này? Hành động này không thể hoàn tác.')
                if (!confirmed) return

                const payload: AdminDeleteJobPostInput = {}

                if (deleteReason.trim()) {
                        payload.reason = deleteReason.trim()
                }

                if (deleteNote.trim()) {
                        payload.note = deleteNote.trim()
                }

                deleteMutation.mutate(payload)
        }

        return (
                <dialog className={`modal ${jobId ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-5xl space-y-6'>
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
                                                        {statusValue ? statusLabelMap[statusValue] ?? statusValue : '—'}
                                                </span>
                                                {data?.isDeleted && (
                                                        <span className='badge border border-error/40 bg-error/10 text-error'>Đã xóa</span>
                                                )}
                                                <button
                                                        type='button'
                                                        className='btn btn-sm gap-2'
                                                        onClick={() => refetch()}
                                                        disabled={isFetching}
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
                                                <div className='grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
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
                                                                                                                                {statusLabelMap[data.status] ?? data.status}
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
                                                                                                                        <dd>{data.duration ?? '—'}</dd>
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
                                                                                                                <ul className='mt-3 space-y-2 text-sm text-base-content/80'>
                                                                                                                        {languages.map(language => (
                                                                                                                                <li
                                                                                                                                        key={language.languageCode}
                                                                                                                                        className='flex items-center justify-between gap-2 rounded-xl border border-base-200 bg-base-200/40 px-3 py-2'
                                                                                                                                >
                                                                                                                                        <span className='font-medium text-base-content'>{language.languageCode}</span>
                                                                                                                                        <span className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                                                                                                {language.proficiency ?? '—'}
                                                                                                                                        </span>
                                                                                                                                </li>
                                                                                                                        ))}
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
                                                                                                                <div className='mt-3 space-y-3'>
                                                                                                                        {normalizedSkills.required.length > 0 && (
                                                                                                                                <div>
                                                                                                                                        <h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Bắt buộc</h4>
                                                                                                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                                                                                                {normalizedSkills.required.map(skill => (
                                                                                                                                                        <span key={skill.label} className='badge badge-primary badge-outline'>
                                                                                                                                                                {skill.label}
                                                                                                                                                        </span>
                                                                                                                                                ))}
                                                                                                                                        </div>
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                                        {normalizedSkills.preferred.length > 0 && (
                                                                                                                                <div>
                                                                                                                                        <h4 className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ưu tiên</h4>
                                                                                                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                                                                                                {normalizedSkills.preferred.map(skill => (
                                                                                                                                                        <span key={skill.label} className='badge badge-outline'>
                                                                                                                                                                {skill.label}
                                                                                                                                                        </span>
                                                                                                                                                ))}
                                                                                                                                        </div>
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
                                                                                                                {attachments.map(attachment => (
                                                                                                                        <li
                                                                                                                                key={attachment.id}
                                                                                                                                className='flex items-center justify-between gap-3 rounded-xl border border-base-200 bg-base-200/40 px-3 py-2'
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
                                                                                                                        </li>
                                                                                                                ))}
                                                                                                        </ul>
                                                                                                ) : (
                                                                                                        <p className='mt-3 text-sm text-base-content/60'>Không có tệp đính kèm.</p>
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
                                                                                                                <dd>{data.moderationScore ?? '—'}</dd>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Danh mục kiểm duyệt</dt>
                                                                                                                <dd>{data.moderationCategory ?? '—'}</dd>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                                <dt className='text-xs uppercase tracking-wide text-base-content/60'>Kiểm duyệt lần cuối</dt>
                                                                                                                <dd>{formatDateTime(data.moderationCheckedAt)}</dd>
                                                                                                        </div>
                                                                                                </dl>
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
                                                                                                {JOB_STATUS_OPTIONS.map(option => (
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
                                                                <form onSubmit={handleDeleteJobPost} className='space-y-4 rounded-2xl border border-error/40 bg-error/5 p-4'>
                                                                        <div className='flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-error'>
                                                                                <Trash2 className='size-4' /> Xóa job post
                                                                        </div>
                                                                        <p className='text-xs text-error/80'>Hành động này sẽ vô hiệu hóa job post và không thể hoàn tác.</p>
                                                                        <label className='flex flex-col gap-1 text-sm text-error/90'>
                                                                                <span className='text-xs font-semibold uppercase tracking-wide'>Lý do xóa</span>
                                                                                <textarea
                                                                                        className='textarea textarea-bordered textarea-sm min-h-[80px] border-error/40 bg-white'
                                                                                        value={deleteReason}
                                                                                        onChange={event => setDeleteReason(event.target.value)}
                                                                                        placeholder='Ghi lại lý do xóa bài đăng'
                                                                                />
                                                                        </label>
                                                                        <label className='flex flex-col gap-1 text-sm text-error/90'>
                                                                                <span className='text-xs font-semibold uppercase tracking-wide'>Ghi chú nội bộ</span>
                                                                                <textarea
                                                                                        className='textarea textarea-bordered textarea-sm min-h-[80px] border-error/40 bg-white'
                                                                                        value={deleteNote}
                                                                                        onChange={event => setDeleteNote(event.target.value)}
                                                                                        placeholder='Ghi chú bổ sung (không bắt buộc)'
                                                                                />
                                                                        </label>
                                                                        <button
                                                                                type='submit'
                                                                                className='btn btn-error btn-sm w-full'
                                                                                disabled={deleteMutation.isPending}
                                                                        >
                                                                                {deleteMutation.isPending && <Loader2 className='size-4 animate-spin' />}
                                                                                Xóa job post
                                                                        </button>
                                                                </form>
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
