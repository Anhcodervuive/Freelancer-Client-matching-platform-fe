import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
        AlertCircle,
        CalendarDays,
        ChevronDown,
        ChevronUp,
        Clock,
        FileDown,
        FileText,
        Gavel,
        Loader2,
        Lock,
        ShieldCheck,
        UserCircle2
} from 'lucide-react'

import { routes } from '~/config/routes'
import { getArbitratorDisputeContext, recordArbitrationDecision } from '~/apis/arbitrator/dispute.api'
import type {
        AdminDisputeDetail,
        AdminDisputeDecisionAttachment,
        AdminDisputeDossier,
        ArbitrationContextEvidenceSubmission,
        ArbitrationContextFinancials,
        ArbitrationContextMilestone,
        ArbitrationContextMilestoneSubmission,
        ArbitrationContextParty,
        ArbitrationContextResponse,
        ArbitrationDecisionAwardType,
        ArbitrationTimelineEntry,
        DecimalLike
} from '~/types/dispute'
import { DisputeStatus } from '~/types/dispute'
import ArbitratorDisputeLayout from './components/DisputeLayout'

const ArbitrationDecisionFormSchema = z
        .object({
                awardType: z.enum(['RELEASE_ALL', 'REFUND_ALL', 'SPLIT']),
                releaseAmount: z.coerce.number().min(0),
                refundAmount: z.coerce.number().min(0),
                summary: z.string().trim().min(1).max(2000),
                reasoning: z.string().trim().max(10000).optional()
        })
        .superRefine((data, ctx) => {
                const releaseCents = Math.round(data.releaseAmount * 100)
                const refundCents = Math.round(data.refundAmount * 100)
                const normalizedRelease = releaseCents / 100
                const normalizedRefund = refundCents / 100

                if (Math.abs(normalizedRelease - data.releaseAmount) > 0.000001) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Số tiền trả freelancer chỉ hỗ trợ tối đa 2 chữ số thập phân',
                                path: ['releaseAmount']
                        })
                }

                if (Math.abs(normalizedRefund - data.refundAmount) > 0.000001) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Số tiền hoàn cho client chỉ hỗ trợ tối đa 2 chữ số thập phân',
                                path: ['refundAmount']
                        })
                }

                if (data.awardType === 'RELEASE_ALL' && refundCents > 0) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Phán quyết trả hết cho freelancer nên số tiền hoàn cho client phải bằng 0',
                                path: ['refundAmount']
                        })
                }

                if (data.awardType === 'REFUND_ALL' && releaseCents > 0) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Phán quyết hoàn hết cho client nên số tiền trả cho freelancer phải bằng 0',
                                path: ['releaseAmount']
                        })
                }

                if (data.awardType === 'SPLIT' && releaseCents + refundCents === 0) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Phán quyết chia số tiền tranh chấp phải phân bổ cho ít nhất một bên',
                                path: ['releaseAmount']
                        })
                }
        })

const toNumber = (value: DecimalLike | null | undefined): number | null => {
        if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null
        }

        if (typeof value === 'string') {
                const parsed = Number(value)
                return Number.isFinite(parsed) ? parsed : null
        }

        return null
}

const formatCurrency = (value: DecimalLike | null | undefined, currency?: string | null) => {
        const amount = toNumber(value)
        if (amount === null) return '—'

        const normalizedCurrency = currency && currency.trim() ? currency : 'USD'

        try {
                return new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: normalizedCurrency,
                        maximumFractionDigits: 2
                }).format(amount)
        } catch {
                return `${amount.toLocaleString()} ${normalizedCurrency}`.trim()
        }
}

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return date.toLocaleString()
}

const formatUserName = (user?: unknown) => {
        if (!user || typeof user !== 'object' || Array.isArray(user)) return '—'
        const record = user as Record<string, unknown>
        const direct =
                typeof record.displayName === 'string' && record.displayName.trim().length
                        ? record.displayName.trim()
                        : typeof record.name === 'string' && record.name.trim().length
                        ? record.name.trim()
                        : null

        if (direct) return direct

        const firstName = typeof record.firstName === 'string' ? record.firstName : undefined
        const lastName = typeof record.lastName === 'string' ? record.lastName : undefined

        const full = [firstName, lastName].filter(Boolean).join(' ').trim()
        if (full.length) return full

        if (record.profile && typeof record.profile === 'object') {
                const profileRecord = record.profile as Record<string, unknown>
                const profileName =
                        typeof profileRecord.displayName === 'string' && profileRecord.displayName.trim().length
                                ? profileRecord.displayName.trim()
                                : [profileRecord.firstName, profileRecord.lastName]
                                          .filter(item => typeof item === 'string' && item.trim().length)
                                          .map(item => (item as string).trim())
                                          .join(' ')

                if (profileName.length) return profileName
        }

        const id = typeof record.id === 'string' ? record.id : null
        return id ? `Người dùng #${id.slice(0, 8)}` : '—'
}

const formatShortId = (value?: string | null) => {
        if (!value || typeof value !== 'string') return 'Không xác định'
        return `#${value.slice(0, 8)}`
}

const formatPartyRole = (role?: string | null) => {
        if (!role) return 'Không rõ vai trò'
        switch (role) {
                case 'CLIENT':
                        return 'Khách hàng'
                case 'FREELANCER':
                        return 'Freelancer'
                case 'ADMIN':
                        return 'Quản trị viên'
                case 'ARBITRATOR':
                        return 'Trọng tài viên'
                case 'ARBITRATION_OFFICER':
                        return 'Điều phối trọng tài'
                default:
                        return role
        }
}

const getFeeBadgeClass = (feePaid?: boolean | null) => {
        if (feePaid === true) {
                return 'border-success/40 bg-success/10 text-success'
        }

        if (feePaid === false) {
                return 'border-warning/40 bg-warning/10 text-warning'
        }

        return 'border-base-300 bg-base-200/60 text-base-content/70'
}

const formatFeeStatus = (feePaid?: boolean | null) => {
        if (feePaid === true) return 'Đã nộp phí'
        if (feePaid === false) return 'Chưa nộp phí'
        return 'Không áp dụng'
}

const formatMilestoneStatus = (status?: string | null) => {
        if (!status) return 'Không rõ trạng thái'
        switch (status) {
                case 'OPEN':
                        return 'Đang mở'
                case 'SUBMITTED':
                        return 'Đã gửi bài'
                case 'IN_REVIEW':
                        return 'Đang đánh giá'
                case 'COMPLETED':
                        return 'Hoàn thành'
                case 'RELEASED':
                        return 'Đã giải ngân'
                case 'CANCELED':
                        return 'Đã hủy'
                default:
                        return status
        }
}

const formatSubmissionStatus = (status?: string | null) => {
        if (!status) return 'Không rõ trạng thái'
        switch (status) {
                case 'PENDING':
                        return 'Chờ duyệt'
                case 'APPROVED':
                        return 'Đã chấp nhận'
                case 'REJECTED':
                        return 'Đã từ chối'
                case 'REVISION_REQUIRED':
                        return 'Yêu cầu chỉnh sửa'
                default:
                        return status
        }
}

const formatFileSize = (bytes?: number | null) => {
        if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return null
        if (bytes === 0) return '0 B'
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
        const value = bytes / 1024 ** index
        const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(1)
        return `${formatted.replace(/\.0$/, '')} ${units[index]}`
}

const formatEvidenceSource = (source?: string | null) => {
        if (!source) return 'Nguồn không xác định'
        switch (source) {
                case 'MILESTONE_ATTACHMENT':
                        return 'Tệp đính kèm milestone'
                case 'CHAT_ATTACHMENT':
                        return 'Tệp đính kèm hội thoại'
                case 'ASSET':
                        return 'Tài nguyên hệ thống'
                case 'EXTERNAL_URL':
                        return 'Đường dẫn bên ngoài'
                default:
                        return source
        }
}

const formatTimelineAction = (action: string) =>
        action
                .split('_')
                .filter(Boolean)
                .map(part => part.charAt(0) + part.slice(1).toLowerCase())
                .join(' ')

type ArbitrationDecisionFormValues = z.infer<typeof ArbitrationDecisionFormSchema>

type TimelineEntry = ArbitrationTimelineEntry & { id: string }

const mapTimelineEntries = (entries: ArbitrationTimelineEntry[]): TimelineEntry[] =>
        entries.map((entry, index) => ({
                ...entry,
                id: `${entry.at}-${entry.action}-${index}`
        }))

const TIMELINE_PREVIEW_COUNT = 6

export default function ArbitratorDisputeDetailPage() {
        const { disputeId } = useParams<{ disputeId: string }>()
        const queryClient = useQueryClient()

        const {
                data,
                isLoading,
                isError,
                error,
                refetch
        } = useQuery<ArbitrationContextResponse>({
                queryKey: ['arbitrator-dispute-context', disputeId],
                queryFn: () => getArbitratorDisputeContext(disputeId!),
                enabled: Boolean(disputeId)
        })

        const form = useForm<ArbitrationDecisionFormValues>({
                resolver: zodResolver(ArbitrationDecisionFormSchema),
                defaultValues: {
                        awardType: 'RELEASE_ALL',
                        releaseAmount: 0,
                        refundAmount: 0,
                        summary: '',
                        reasoning: ''
                }
        })

        const { register, handleSubmit, watch, formState, setValue, reset } = form

        const awardType = watch('awardType')

        const disputeDetail: AdminDisputeDetail | undefined = data?.dispute
        const baseDispute = disputeDetail?.dispute ?? null
        const escrow = disputeDetail?.escrow ?? null
        const milestone = escrow?.milestone ?? null
        const contract = milestone?.contract ?? null

        const arbitrationContext = data?.arbitrationContext ?? null
        const parties = (arbitrationContext?.parties ?? []) as ArbitrationContextParty[]
        const financials: ArbitrationContextFinancials | null = arbitrationContext?.financials ?? null
        const milestoneContext: ArbitrationContextMilestone | null = arbitrationContext?.milestone ?? null
        const milestoneSubmissions = (arbitrationContext?.milestoneSubmissions ?? []) as ArbitrationContextMilestoneSubmission[]
        const evidenceSubmissions = (arbitrationContext?.evidence ?? []) as ArbitrationContextEvidenceSubmission[]

        const disputeParties = useMemo(() => {
                if (!disputeDetail || typeof disputeDetail !== 'object') return null
                const raw = (disputeDetail as { parties?: unknown }).parties
                if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
                return raw as Record<string, unknown>
        }, [disputeDetail])

        const detailAmounts =
                disputeDetail && typeof disputeDetail === 'object'
                        ? (disputeDetail as {
                                  amounts?: {
                                          funded?: DecimalLike | null
                                          released?: DecimalLike | null
                                          refunded?: DecimalLike | null
                                          disputed?: DecimalLike | null
                                  }
                          }).amounts
                        : undefined

        const contextCurrency = financials?.currency ?? null
        const currency =
                contextCurrency ??
                escrow?.currency ??
                milestone?.currency ??
                (typeof contract?.currency === 'string' ? (contract.currency as string) : undefined)

        const funded = financials?.escrowAmount ?? escrow?.amountFunded ?? detailAmounts?.funded ?? null
        const released = financials?.released ?? escrow?.amountReleased ?? detailAmounts?.released ?? null
        const refunded = financials?.refunded ?? escrow?.amountRefunded ?? detailAmounts?.refunded ?? null

        const contextDisputed = toNumber(financials?.disputed ?? detailAmounts?.disputed)
        const contractTitle =
                (typeof milestoneContext?.contractTitle === 'string' && milestoneContext.contractTitle.trim().length
                        ? milestoneContext.contractTitle.trim()
                        : null) ?? contract?.title ?? null

        const requestedClient = financials?.requested?.client ?? null
        const requestedFreelancer = financials?.requested?.freelancer ?? null
        const decidedClient = financials?.decided?.client ?? null
        const decidedFreelancer = financials?.decided?.freelancer ?? null
        const hasRequestedBreakdown = requestedClient !== null || requestedFreelancer !== null
        const hasDecidedBreakdown = decidedClient !== null || decidedFreelancer !== null

        const disputableAmount = useMemo(() => {
                if (contextDisputed !== null) {
                        return contextDisputed
                }

                const fundedNumber = toNumber(funded)
                const releasedNumber = toNumber(released) ?? 0
                const refundedNumber = toNumber(refunded) ?? 0

                if (fundedNumber === null) {
                        return null
                }

                const disputable = fundedNumber - releasedNumber - refundedNumber
                return disputable >= 0 ? disputable : 0
        }, [contextDisputed, funded, released, refunded])

        const financialSummaryItems = [
                {
                        label: 'Tổng số tiền tranh chấp',
                        value: formatCurrency(funded, currency)
                },
                {
                        label: 'Đã giải ngân',
                        value: formatCurrency(released, currency)
                },
                {
                        label: 'Đã hoàn trả',
                        value: formatCurrency(refunded, currency)
                },
                {
                        label: 'Giá trị còn tranh chấp',
                        value:
                                disputableAmount !== null
                                        ? formatCurrency(disputableAmount, currency)
                                        : '—'
                }
        ]

        useEffect(() => {
                if (disputableAmount === null) return

                if (awardType === 'RELEASE_ALL') {
                        setValue('releaseAmount', disputableAmount, { shouldValidate: true })
                        setValue('refundAmount', 0, { shouldValidate: true })
                }

                if (awardType === 'REFUND_ALL') {
                        setValue('releaseAmount', 0, { shouldValidate: true })
                        setValue('refundAmount', disputableAmount, { shouldValidate: true })
                }
        }, [awardType, disputableAmount, setValue])

        const decisionMutation = useMutation({
                mutationFn: (values: ArbitrationDecisionFormValues) => {
                        if (!disputeId) {
                                throw new Error('MISSING_DISPUTE_ID')
                        }

                        return recordArbitrationDecision(disputeId, {
                                awardType: values.awardType as ArbitrationDecisionAwardType,
                                releaseAmount: values.releaseAmount,
                                refundAmount: values.refundAmount,
                                summary: values.summary,
                                reasoning: values.reasoning
                        })
                },
                onSuccess: async () => {
                        toast.success('Đã ghi nhận phán quyết trọng tài.')
                        if (disputeId) {
                                await queryClient.invalidateQueries({
                                        queryKey: ['arbitrator-dispute-context', disputeId]
                                })
                        }
                },
                onError: (mutationError: unknown) => {
                        const message =
                                mutationError instanceof Error
                                        ? mutationError.message
                                        : 'Không thể ghi nhận phán quyết. Vui lòng thử lại.'
                        toast.error(message)
                }
        })

        const onSubmit = (values: ArbitrationDecisionFormValues) => {
                decisionMutation.mutate(values)
        }

        const timelineEntries = useMemo(
                () => mapTimelineEntries(arbitrationContext?.timeline ?? []),
                [arbitrationContext?.timeline]
        )
        const [showFullTimeline, setShowFullTimeline] = useState(false)
        const timelineToRender = useMemo(
                () =>
                        showFullTimeline
                                ? timelineEntries
                                : timelineEntries.slice(0, TIMELINE_PREVIEW_COUNT),
                [showFullTimeline, timelineEntries]
        )
        const canToggleTimeline = timelineEntries.length > TIMELINE_PREVIEW_COUNT
        const hiddenTimelineCount = Math.max(timelineEntries.length - timelineToRender.length, 0)

        useEffect(() => {
                setShowFullTimeline(false)
        }, [disputeId, timelineEntries.length])
        const decisionAttachments = (disputeDetail?.decisionAttachments ?? []) as AdminDisputeDecisionAttachment[]
        const arbitrationDossiers = (disputeDetail?.arbitrationDossiers ?? []) as AdminDisputeDossier[]
        const sortedDossiers = [...arbitrationDossiers].sort(
                (first, second) => (second.version ?? 0) - (first.version ?? 0)
        )
        const latestDossier = sortedDossiers[0]
        const dossierExportUrl =
                latestDossier && disputeId
                        ? `/api/arbitrator/disputes/${disputeId}/dossiers/${latestDossier.id}/pdf`
                        : null
        const contractClient = (contract?.client as Record<string, unknown> | undefined) ?? null
        const contractFreelancer = (contract?.freelancer as Record<string, unknown> | undefined) ?? null

        const resolveActorName = (actorId?: string | null) => {
                if (!actorId) return null

                const partyMatch = parties.find(party => party.userId === actorId)
                if (partyMatch) {
                        const label = partyMatch.displayName?.trim()
                        if (label) return label
                        return `Người dùng ${formatShortId(actorId)}`
                }

                const potentialRecords: unknown[] = []

                if (disputeParties) {
                        const clientRecord = (disputeParties['client'] as unknown) ?? null
                        const freelancerRecord = (disputeParties['freelancer'] as unknown) ?? null
                        if (clientRecord && typeof clientRecord === 'object') {
                                potentialRecords.push(clientRecord)
                        }
                        if (freelancerRecord && typeof freelancerRecord === 'object') {
                                potentialRecords.push(freelancerRecord)
                        }
                }

                if (contractClient) potentialRecords.push(contractClient)
                if (contractFreelancer) potentialRecords.push(contractFreelancer)
                if (baseDispute?.lockedBy && typeof baseDispute.lockedBy === 'object') {
                        potentialRecords.push(baseDispute.lockedBy as Record<string, unknown>)
                }
                if (baseDispute?.arbitrator && typeof baseDispute.arbitrator === 'object') {
                        potentialRecords.push(baseDispute.arbitrator as Record<string, unknown>)
                }

                for (const record of potentialRecords) {
                        if (!record || typeof record !== 'object') continue
                        const id = (record as { id?: unknown }).id
                        if (typeof id === 'string' && id === actorId) {
                                const label = formatUserName(record)
                                if (label && label !== '—') {
                                        return label
                                }
                        }
                }

                return `Người dùng ${formatShortId(actorId)}`
        }

        if (!disputeId) {
                return (
                        <div className='flex h-full items-center justify-center rounded-2xl border border-base-200 bg-base-100 p-12 text-center shadow-sm'>
                                <div>
                                        <AlertCircle className='mx-auto size-10 text-warning' />
                                        <p className='mt-3 text-base font-medium'>Thiếu mã tranh chấp trong đường dẫn.</p>
                                        <p className='mt-2 text-sm text-base-content/70'>Vui lòng quay lại danh sách tranh chấp để chọn hồ sơ.</p>
                                </div>
                        </div>
                )
        }

        if (isLoading) {
                return (
                        <div className='flex h-full items-center justify-center rounded-2xl border border-base-200 bg-base-100 p-12 shadow-sm'>
                                <Loader2 className='size-8 animate-spin text-primary' />
                        </div>
                )
        }

        if (isError || !data || !arbitrationContext) {
                const message =
                        error instanceof Error
                                ? error.message
                                : 'Không thể tải dữ liệu tranh chấp. Vui lòng thử lại.'
                return (
                        <div className='space-y-4'>
                                <div className='rounded-2xl border border-error/40 bg-error/10 p-6 text-error shadow-sm'>
                                        <div className='flex items-start gap-3'>
                                                <AlertCircle className='mt-1 size-5' />
                                                <div>
                                                        <h2 className='text-base font-semibold'>Không tải được dữ liệu</h2>
                                                        <p className='mt-1 text-sm'>{message}</p>
                                                </div>
                                        </div>
                                </div>
                                <button type='button' className='btn btn-primary' onClick={() => refetch()}>
                                        Thử lại
                                </button>
                        </div>
                )
        }

        const statusLabel = baseDispute?.status ?? 'Không xác định'
        const breadcrumbs = [
                { label: 'Trang chủ', to: routes.arbitrator.dashboard },
                { label: 'Tranh chấp', to: routes.arbitrator.disputes.list },
                { label: disputeId }
        ]
        const statusBadge = (
                <span className='inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-base-content/80'>
                        <Gavel size={14} />
                        <span>Trạng thái: {statusLabel}</span>
                </span>
        )
        const handleExportDossier = () => {
                if (!dossierExportUrl) {
                        toast.info('Chưa có hồ sơ trọng tài để xuất PDF.')
                        return
                }

                window.open(dossierExportUrl, '_blank', 'noopener,noreferrer')
        }
        const exportAction = (
                <button
                        type='button'
                        className='btn btn-outline btn-sm gap-2'
                        onClick={handleExportDossier}
                        disabled={!dossierExportUrl}
                >
                        <FileDown size={16} /> Xuất hồ sơ PDF
                </button>
        )
        const headerActions = (
                <>
                        {exportAction}
                        {statusBadge}
                </>
        )
        const headerMeta = (
                <>
                        <div className='flex items-center gap-2'>
                                <Lock size={16} />
                                <span>
                                        Khóa hồ sơ: <strong>{formatDateTime(arbitrationContext.meta.lockedAt)}</strong>
                                </span>
                        </div>
                        <div className='flex items-center gap-2'>
                                <Clock size={16} />
                                <span>
                                        Hạn ra phán quyết:{' '}
                                        <strong>{formatDateTime(arbitrationContext.meta.arbitrationDeadline)}</strong>
                                </span>
                        </div>
                        {arbitrationContext.meta.currentDossierVersion !== undefined ? (
                                <div className='flex items-center gap-2'>
                                        <FileText size={16} />
                                        <span>
                                                Hồ sơ mới nhất: <strong>v{arbitrationContext.meta.currentDossierVersion}</strong>
                                        </span>
                                </div>
                        ) : null}
                </>
        )

        return (
                <ArbitratorDisputeLayout
                        icon={<Gavel className='h-6 w-6' />}
                        title='Hồ sơ tranh chấp'
                        description={
                                <span>
                                        Mã tranh chấp: <strong>{disputeId}</strong>
                                </span>
                        }
                        actions={headerActions}
                        meta={headerMeta}
                        breadcrumbs={breadcrumbs}
                >
                        <section className='grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start'>
                                <article className='space-y-6 xl:pr-2'>
                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <div className='flex flex-wrap items-start justify-between gap-4'>
                                                        <div>
                                                                <h2 className='text-lg font-semibold'>Thông tin tài chính</h2>
                                                                <p className='mt-1 text-sm text-base-content/70'>Tổng quan giá trị tranh chấp và phân bổ theo hồ sơ trọng tài.</p>
                                                        </div>
                                                        {currency ? (
                                                                <span className='inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-base-content/70'>
                                                                        <span>Đơn vị</span>
                                                                        <strong>{currency}</strong>
                                                                </span>
                                                        ) : null}
                                                </div>
                                                <div className='mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                                                        {financialSummaryItems.map(item => (
                                                                <div
                                                                        key={item.label}
                                                                        className='rounded-xl border border-base-200 bg-base-200/60 p-4 shadow-sm'
                                                                >
                                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                {item.label}
                                                                        </p>
                                                                        <p className='mt-2 text-xl font-semibold text-base-content'>
                                                                                {item.value}
                                                                        </p>
                                                                </div>
                                                        ))}
                                                </div>
                                                {hasRequestedBreakdown || hasDecidedBreakdown ? (
                                                        <div className='mt-6 grid gap-4 border-t border-dashed border-base-200 pt-6 sm:grid-cols-2'>
                                                                {hasRequestedBreakdown ? (
                                                                        <div className='rounded-xl border border-base-200 bg-base-100/60 p-4'>
                                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Yêu cầu từ các bên</p>
                                                                                <p className='mt-2 text-sm font-medium text-base-content'>
                                                                                        Client:{' '}
                                                                                        <span className='font-semibold'>
                                                                                                {formatCurrency(requestedClient, currency)}
                                                                                        </span>
                                                                                </p>
                                                                                <p className='mt-1 text-sm font-medium text-base-content'>
                                                                                        Freelancer:{' '}
                                                                                        <span className='font-semibold'>
                                                                                                {formatCurrency(requestedFreelancer, currency)}
                                                                                        </span>
                                                                                </p>
                                                                        </div>
                                                                ) : null}
                                                                {hasDecidedBreakdown ? (
                                                                        <div className='rounded-xl border border-base-200 bg-base-100/60 p-4'>
                                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Phân bổ đã quyết định</p>
                                                                                <p className='mt-2 text-sm font-medium text-base-content'>
                                                                                        Client:{' '}
                                                                                        <span className='font-semibold'>
                                                                                                {formatCurrency(decidedClient, currency)}
                                                                                        </span>
                                                                                </p>
                                                                                <p className='mt-1 text-sm font-medium text-base-content'>
                                                                                        Freelancer:{' '}
                                                                                        <span className='font-semibold'>
                                                                                                {formatCurrency(decidedFreelancer, currency)}
                                                                                        </span>
                                                                                </p>
                                                                        </div>
                                                                ) : null}
                                                        </div>
                                                ) : null}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Dòng thời gian trọng tài</h2>
                                                {timelineEntries.length ? (
                                                        <>
                                                                <ul className='mt-4 space-y-5'>
                                                                        {timelineToRender.map(entry => {
                                                                                const actorLabel = resolveActorName(entry.actor)
                                                                                return (
                                                                                        <li key={entry.id} className='relative border-l-2 border-base-200 pl-6'>
                                                                                                <span className='absolute -left-[5px] top-2 inline-flex size-3 items-center justify-center rounded-full bg-primary ring-4 ring-primary/20'></span>
                                                                                                <div className='flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-base-content/60'>
                                                                                                        <CalendarDays size={16} />
                                                                                                        <span>{formatDateTime(entry.at)}</span>
                                                                                                        {actorLabel ? (
                                                                                                                <span className='flex items-center gap-1 text-[11px] text-base-content/70'>
                                                                                                                        <UserCircle2 size={14} />
                                                                                                                        <span className='font-semibold normal-case text-base-content'>{actorLabel}</span>
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                                <div className='mt-2 rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                                                                                        <p className='text-base font-semibold text-base-content'>
                                                                                                                {formatTimelineAction(entry.action)}
                                                                                                        </p>
                                                                                                        {entry.details ? (
                                                                                                                typeof entry.details === 'string' ? (
                                                                                                                        <p className='mt-2 text-sm text-base-content/70'>{entry.details}</p>
                                                                                                                ) : (
                                                                                                                        <pre className='mt-3 max-h-48 overflow-auto rounded-lg bg-base-200/60 p-3 text-xs leading-relaxed'>
                                                                                                                                {JSON.stringify(entry.details, null, 2)}
                                                                                                                        </pre>
                                                                                                                )
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </li>
                                                                                )
                                                                        })}
                                                                </ul>
                                                                {canToggleTimeline ? (
                                                                        <button
                                                                                type='button'
                                                                                className='btn btn-ghost btn-sm mt-2 gap-2'
                                                                                onClick={() => setShowFullTimeline(previous => !previous)}
                                                                        >
                                                                                {showFullTimeline ? (
                                                                                        <>
                                                                                                <ChevronUp size={16} /> Thu gọn dòng thời gian
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                <ChevronDown size={16} /> Xem thêm {hiddenTimelineCount} hoạt động
                                                                                        </>
                                                                                )}
                                                                        </button>
                                                                ) : null}
                                                        </>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa có dữ liệu dòng thời gian.</p>
                                                )}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <div className='flex flex-wrap items-start justify-between gap-4'>
                                                        <div>
                                                                <h2 className='text-lg font-semibold'>Milestone tranh chấp</h2>
                                                                <p className='mt-1 text-sm text-base-content/70'>Thông tin mốc thanh toán và các lần bàn giao liên quan tới hồ sơ này.</p>
                                                        </div>
                                                        {(milestoneContext?.status ?? milestone?.status) ? (
                                                                <span className='inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-base-content/70'>
                                                                        {formatMilestoneStatus(milestoneContext?.status ?? milestone?.status)}
                                                                </span>
                                                        ) : null}
                                                </div>
                                                <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Tiêu đề milestone</dt>
                                                                <dd className='mt-1 text-sm font-medium text-base-content'>
                                                                        {milestoneContext?.title ?? milestone?.title ?? '—'}
                                                                </dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Thuộc hợp đồng</dt>
                                                                <dd className='mt-1 text-sm font-medium text-base-content'>
                                                                        {contractTitle ?? '—'}
                                                                </dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Giá trị mốc</dt>
                                                                <dd className='mt-1 text-sm font-medium text-base-content'>
                                                                        {formatCurrency(
                                                                                milestoneContext?.amount ?? milestone?.amount ?? null,
                                                                                milestoneContext?.currency ?? currency
                                                                        )}
                                                                </dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Thời gian</dt>
                                                                <dd className='mt-1 text-sm font-medium text-base-content'>
                                                                        Bắt đầu: {formatDateTime(milestoneContext?.startAt ?? milestone?.startAt ?? null)}
                                                                        <br />
                                                                        Kết thúc: {formatDateTime(milestoneContext?.endAt ?? milestone?.endAt ?? null)}
                                                                </dd>
                                                        </div>
                                                </dl>
                                                {milestoneSubmissions.length ? (
                                                        <div className='mt-6'>
                                                                <h3 className='text-sm font-semibold uppercase tracking-wide text-base-content/60'>Các lần bàn giao</h3>
                                                                <ul className='mt-3 space-y-4'>
                                                                        {milestoneSubmissions.map(submission => {
                                                                                const attachments = submission.attachments ?? []
                                                                                const submissionLabel =
                                                                                        submission.message && submission.message.trim().length
                                                                                                ? submission.message.trim()
                                                                                                : 'Bàn giao không có tiêu đề'
                                                                                const freelancerLabel =
                                                                                        submission.freelancer?.trim().length
                                                                                                ? submission.freelancer?.trim()
                                                                                                : submission.freelancerId
                                                                                                ? `Freelancer ${formatShortId(submission.freelancerId)}`
                                                                                                : 'Không rõ người gửi'

                                                                                return (
                                                                                        <li key={submission.id} className='rounded-xl border border-base-200 p-4'>
                                                                                                <div className='flex flex-wrap items-start justify-between gap-3'>
                                                                                                        <div>
                                                                                                                <p className='text-sm font-semibold text-base-content'>{submissionLabel}</p>
                                                                                                                <p className='mt-1 text-xs text-base-content/60'>
                                                                                                                        {freelancerLabel} • {formatDateTime(submission.createdAt)}
                                                                                                                </p>
                                                                                                                {submission.reviewedBy ? (
                                                                                                                        <p className='mt-1 text-xs text-base-content/60'>
                                                                                                                                Đánh giá bởi {submission.reviewedBy}
                                                                                                                                {submission.reviewedAt ? ` • ${formatDateTime(submission.reviewedAt)}` : ''}
                                                                                                                        </p>
                                                                                                                ) : null}
                                                                                                        </div>
                                                                                                        {submission.status ? (
                                                                                                                <span className='inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-base-content/70'>
                                                                                                                        {formatSubmissionStatus(submission.status)}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                                {typeof submission.reviewRating === 'number' ? (
                                                                                                        <p className='mt-2 text-xs text-base-content/60'>Điểm đánh giá: {submission.reviewRating}/5</p>
                                                                                                ) : null}
                                                                                                {submission.reviewNote ? (
                                                                                                        <p className='mt-2 text-sm text-base-content/70'>Nhận xét: {submission.reviewNote}</p>
                                                                                                ) : null}
                                                                                                {attachments.length ? (
                                                                                                        <ul className='mt-3 space-y-2'>
                                                                                                                {attachments.map(attachment => {
                                                                                                                        const href = attachment.url ?? null
                                                                                                                        const sizeLabel =
                                                                                                                                typeof attachment.size === 'number'
                                                                                                                                        ? formatFileSize(attachment.size)
                                                                                                                                        : null

                                                                                                                        return (
                                                                                                                                <li key={attachment.id} className='rounded-lg border border-base-200 bg-base-200/60 p-3 text-xs text-base-content/70'>
                                                                                                                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                                                                                                <span className='font-medium text-base-content'>{attachment.name ?? 'Tệp đính kèm'}</span>
                                                                                                                                                {sizeLabel ? <span className='text-[10px] uppercase tracking-wide text-base-content/60'>{sizeLabel}</span> : null}
                                                                                                                                        </div>
                                                                                                                                        {href ? (
                                                                                                                                                <a
                                                                                                                                                        href={href}
                                                                                                                                                        target='_blank'
                                                                                                                                                        rel='noreferrer'
                                                                                                                                                        className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
                                                                                                                                                >
                                                                                                                                                        <FileText size={14} /> Xem tệp
                                                                                                                                                </a>
                                                                                                                                        ) : null}
                                                                                                                                </li>
                                                                                                                        )
                                                                                                                })}
                                                                                                        </ul>
                                                                                                ) : null}
                                                                                        </li>
                                                                                )
                                                                        })}
                                                                </ul>
                                                        </div>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa ghi nhận bàn giao nào.</p>
                                                )}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Chứng cứ được nộp</h2>
                                                {evidenceSubmissions.length ? (
                                                        <div className='mt-4 space-y-4'>
                                                                {evidenceSubmissions.map(submission => {
                                                                        const attachments = submission.items ?? []
                                                                        const submitterName =
                                                                                submission.submittedBy?.displayName?.trim()
                                                                                        ? submission.submittedBy?.displayName?.trim()
                                                                                        : submission.submittedBy?.name?.trim()
                                                                                        ? submission.submittedBy?.name?.trim()
                                                                                        : `Người dùng ${formatShortId(submission.submittedById)}`
                                                                        const badgeLabel = submission.noAdditionalEvidence
                                                                                ? 'Không gửi tài liệu bổ sung'
                                                                                : attachments.length
                                                                                ? `Tài liệu: ${attachments.length}`
                                                                                : null

                                                                        return (
                                                                                <div key={submission.id} className='rounded-xl border border-base-200 p-4'>
                                                                                        <div className='flex flex-wrap items-start justify-between gap-3'>
                                                                                                <div>
                                                                                                        <p className='text-sm font-semibold text-base-content'>{submitterName}</p>
                                                                                                        <p className='mt-1 text-xs text-base-content/60'>Nộp lúc {formatDateTime(submission.submittedAt)}</p>
                                                                                                </div>
                                                                                                {badgeLabel ? (
                                                                                                        <span className='inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-base-content/70'>
                                                                                                                {badgeLabel}
                                                                                                        </span>
                                                                                                ) : null}
                                                                                        </div>
                                                                                        {submission.statement ? (
                                                                                                <p className='mt-2 text-sm text-base-content/70'>{submission.statement}</p>
                                                                                        ) : null}
                                                                                        {attachments.length ? (
                                                                                                <ul className='mt-3 space-y-3'>
                                                                                                        {attachments.map((item, index) => {
                                                                                                                const href = item.url ?? item.asset?.url ?? null
                                                                                                                const assetBytes = item.asset?.bytes
                                                                                                                const sizeLabel =
                                                                                                                        typeof assetBytes === 'number'
                                                                                                                                ? formatFileSize(assetBytes)
                                                                                                                                : null
                                                                                                                const referenceType =
                                                                                                                        item.reference && typeof item.reference === 'object'
                                                                                                                                ? (item.reference as { type?: unknown }).type
                                                                                                                                : undefined
                                                                                                                const evidenceLabel =
                                                                                                                        item.label?.trim().length
                                                                                                                                ? item.label?.trim()
                                                                                                                                : item.asset?.id?.trim().length
                                                                                                                                ? item.asset?.id
                                                                                                                                : `Tài liệu #${index + 1}`

                                                                                                                return (
                                                                                                                        <li key={item.id} className='rounded-lg border border-base-200 bg-base-200/60 p-3 text-xs text-base-content/70'>
                                                                                                                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                                                                                        <span className='font-medium text-base-content'>{evidenceLabel}</span>
                                                                                                                                        <span className='rounded-full bg-base-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-base-content/60'>
                                                                                                                                                {formatEvidenceSource(item.sourceType)}
                                                                                                                                        </span>
                                                                                                                                </div>
                                                                                                                                {item.description ? (
                                                                                                                                        <p className='mt-1 text-xs text-base-content/70'>{item.description}</p>
                                                                                                                                ) : null}
                                                                                                                                {referenceType ? (
                                                                                                                                        <p className='mt-1 text-[10px] text-base-content/60'>Tham chiếu: {String(referenceType)}</p>
                                                                                                                                ) : null}
                                                                                                                                {href ? (
                                                                                                                                        <a
                                                                                                                                                href={href}
                                                                                                                                                target='_blank'
                                                                                                                                                rel='noreferrer'
                                                                                                                                                className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
                                                                                                                                        >
                                                                                                                                                <FileText size={14} /> Xem tài liệu
                                                                                                                                        </a>
                                                                                                                                ) : null}
                                                                                                                                {sizeLabel ? (
                                                                                                                                        <p className='mt-1 text-[10px] text-base-content/60'>Dung lượng: {sizeLabel}</p>
                                                                                                                                ) : null}
                                                                                                                        </li>
                                                                                                                )
                                                                                                        })}
                                                                                                </ul>
                                                                                        ) : null}
                                                                                </div>
                                                                        )
                                                                })}
                                                        </div>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa có chứng cứ nào được nộp.</p>
                                                )}
                                        </div>
                                </article>

                                <aside className='space-y-6 xl:pl-2'>
                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Các bên tham gia</h2>
                                                {parties.length ? (
                                                        <ul className='mt-4 space-y-3 text-sm text-base-content/80'>
                                                                {parties.map(party => {
                                                                        const displayName = party.displayName?.trim().length
                                                                                ? party.displayName.trim()
                                                                                : `Người dùng ${formatShortId(party.userId)}`

                                                                        return (
                                                                                <li key={party.userId} className='rounded-xl border border-base-200 p-3'>
                                                                                        <div className='flex items-start justify-between gap-3'>
                                                                                                <div>
                                                                                                        <p className='text-sm font-semibold text-base-content'>{displayName}</p>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>{formatPartyRole(party.role)}</p>
                                                                                                </div>
                                                                                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${getFeeBadgeClass(party.feePaid)}`}>
                                                                                                        {formatFeeStatus(party.feePaid)}
                                                                                                </span>
                                                                                        </div>
                                                                                </li>
                                                                        )
                                                                })}
                                                        </ul>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Không có dữ liệu thành phần.</p>
                                                )}
                                                <div className='mt-5 rounded-xl bg-base-200/60 p-4 text-xs text-base-content/70'>
                                                        <p>
                                                                <span className='font-semibold text-base-content'>Hợp đồng:</span> {contractTitle ?? '—'}
                                                        </p>
                                                        <p className='mt-1'>
                                                                <span className='font-semibold text-base-content'>Milestone:</span> {milestoneContext?.title ?? milestone?.title ?? '—'}
                                                        </p>
                                                </div>
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Hồ sơ trọng tài gần đây</h2>
                                                {sortedDossiers.length ? (
                                                        <ul className='mt-4 space-y-3 text-sm text-base-content/70'>
                                                                {sortedDossiers.map(dossier => {
                                                                        const status = (dossier as { status?: string | null }).status
                                                                        const generatedAt = (dossier as { generatedAt?: string | null }).generatedAt
                                                                        const hash = (dossier as { hash?: string | null }).hash
                                                                        const dossierUrl = disputeId
                                                                                ? `/api/arbitrator/disputes/${disputeId}/dossiers/${dossier.id}/pdf`
                                                                                : null

                                                                        return (
                                                                                <li key={dossier.id} className='rounded-lg border border-base-200 p-3'>
                                                                                        <div className='flex items-center justify-between text-xs uppercase text-base-content/60'>
                                                                                                <span>Phiên bản v{dossier.version ?? '—'}</span>
                                                                                                {status ? (
                                                                                                        <span className='rounded-full bg-base-200/60 px-2 py-0.5 text-[10px] font-semibold text-base-content/70'>
                                                                                                                {status}
                                                                                                        </span>
                                                                                                ) : null}
                                                                                        </div>
                                                                                        <div className='mt-2 text-sm font-semibold text-base-content'>
                                                                                                {dossier.milestoneTitle ?? contractTitle ?? 'Hồ sơ tranh chấp'}
                                                                                        </div>
                                                                                        <div className='mt-1 text-xs text-base-content/60'>
                                                                                                Tạo lúc: {formatDateTime(generatedAt ?? dossier.createdAt)}
                                                                                        </div>
                                                                                        {hash ? (
                                                                                                <p className='mt-1 truncate text-[10px] text-base-content/50'>Hash: {hash}</p>
                                                                                        ) : null}
                                                                                        <div className='mt-3 flex items-center justify-end'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-ghost btn-xs gap-2'
                                                                                                        onClick={() => {
                                                                                                                if (!dossierUrl) {
                                                                                                                        toast.info('Không tìm thấy đường dẫn xuất PDF cho hồ sơ này.')
                                                                                                                        return
                                                                                                                }

                                                                                                                window.open(dossierUrl, '_blank', 'noopener,noreferrer')
                                                                                                        }}
                                                                                                        disabled={!dossierUrl}
                                                                                                >
                                                                                                        <FileDown size={14} /> Tải PDF
                                                                                                </button>
                                                                                        </div>
                                                                                </li>
                                                                        )
                                                                })}
                                                        </ul>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa có hồ sơ trọng tài được tạo.</p>
                                                )}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Tài liệu đã đính kèm phán quyết</h2>
                                                {decisionAttachments.length ? (
                                                        <ul className='mt-4 space-y-3 text-sm text-base-content/70'>
                                                                {decisionAttachments.map(attachment => (
                                                                        <li key={attachment.id} className='rounded-lg border border-base-200 p-3'>
                                                                                <p className='font-medium'>{attachment.name ?? 'Tài liệu'}</p>
                                                                                <p className='text-xs text-base-content/60'>
                                                                                        Cập nhật: {formatDateTime(attachment.updatedAt ?? attachment.createdAt)}
                                                                                </p>
                                                                                {attachment.url ? (
                                                                                        <a
                                                                                                href={attachment.url}
                                                                                                target='_blank'
                                                                                                rel='noreferrer'
                                                                                                className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
                                                                                        >
                                                                                                <FileText size={14} />
                                                                                                Tải xuống
                                                                                        </a>
                                                                                ) : null}
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa có tài liệu nào được đính kèm.</p>
                                                )}
                                        </div>
                                </aside>
                        </section>

                        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
                                        <div className='flex items-center justify-between'>
                                                <div>
                                                        <h2 className='text-lg font-semibold'>Ghi nhận phán quyết trọng tài</h2>
                                                        <p className='mt-1 text-sm text-base-content/70'>Vui lòng nhập kết quả cuối cùng để hệ thống cập nhật tranh chấp.</p>
                                                </div>
                                                {baseDispute?.status && [DisputeStatus.RESOLVED_REFUND_ALL, DisputeStatus.RESOLVED_RELEASE_ALL, DisputeStatus.RESOLVED_SPLIT].includes(baseDispute.status) ? (
                                                        <span className='inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success'>
                                                                <ShieldCheck size={16} /> Đã có phán quyết
                                                        </span>
                                                ) : null}
                                        </div>

                                        <div className='grid gap-4 md:grid-cols-3'>
                                                <label className='form-control w-full'>
                                                        <span className='label-text font-medium'>Kiểu phán quyết</span>
                                                        <select
                                                                className='select select-bordered mt-2'
                                                                {...register('awardType')}
                                                                disabled={decisionMutation.isPending}
                                                        >
                                                                <option value='RELEASE_ALL'>Trả toàn bộ cho freelancer</option>
                                                                <option value='REFUND_ALL'>Hoàn toàn bộ cho client</option>
                                                                <option value='SPLIT'>Chia theo tỷ lệ</option>
                                                        </select>
                                                </label>
                                                <label className='form-control w-full'>
                                                        <span className='label-text font-medium'>Số tiền trả freelancer</span>
                                                        <input
                                                                type='number'
                                                                step='0.01'
                                                                min={0}
                                                                className='input input-bordered mt-2'
                                                                {...register('releaseAmount', { valueAsNumber: true })}
                                                                disabled={decisionMutation.isPending || awardType === 'REFUND_ALL'}
                                                        />
                                                        {formState.errors.releaseAmount ? (
                                                                <span className='mt-1 text-xs text-error'>
                                                                        {formState.errors.releaseAmount.message}
                                                                </span>
                                                        ) : null}
                                                </label>
                                                <label className='form-control w-full'>
                                                        <span className='label-text font-medium'>Số tiền hoàn cho client</span>
                                                        <input
                                                                type='number'
                                                                step='0.01'
                                                                min={0}
                                                                className='input input-bordered mt-2'
                                                                {...register('refundAmount', { valueAsNumber: true })}
                                                                disabled={decisionMutation.isPending || awardType === 'RELEASE_ALL'}
                                                        />
                                                        {formState.errors.refundAmount ? (
                                                                <span className='mt-1 text-xs text-error'>
                                                                        {formState.errors.refundAmount.message}
                                                                </span>
                                                        ) : null}
                                                </label>
                                        </div>

                                        <label className='form-control'>
                                                <span className='label-text font-medium'>Tóm tắt phán quyết</span>
                                                <textarea
                                                        rows={3}
                                                        className='textarea textarea-bordered mt-2'
                                                        placeholder='Tóm tắt ngắn gọn lý do và kết quả phán quyết...'
                                                        {...register('summary')}
                                                        disabled={decisionMutation.isPending}
                                                />
                                                {formState.errors.summary ? (
                                                        <span className='mt-1 text-xs text-error'>
                                                                {formState.errors.summary.message}
                                                        </span>
                                                ) : null}
                                        </label>

                                        <label className='form-control'>
                                                <span className='label-text font-medium'>Lý do chi tiết (không bắt buộc)</span>
                                                <textarea
                                                        rows={6}
                                                        className='textarea textarea-bordered mt-2'
                                                        placeholder='Mô tả chi tiết cách bạn đánh giá bằng chứng và kết luận cuối cùng.'
                                                        {...register('reasoning')}
                                                        disabled={decisionMutation.isPending}
                                                />
                                                {formState.errors.reasoning ? (
                                                        <span className='mt-1 text-xs text-error'>
                                                                {formState.errors.reasoning.message}
                                                        </span>
                                                ) : null}
                                        </label>

                                        <div className='flex items-center gap-3'>
                                                <button type='submit' className='btn btn-primary' disabled={decisionMutation.isPending}>
                                                        {decisionMutation.isPending ? (
                                                                <>
                                                                        <Loader2 className='size-4 animate-spin' />
                                                                        <span>Đang lưu...</span>
                                                                </>
                                                        ) : (
                                                                'Ghi nhận phán quyết'
                                                        )}
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost'
                                                        onClick={() => reset()}
                                                        disabled={decisionMutation.isPending}
                                                >
                                                        Đặt lại
                                                </button>
                                        </div>
                                </form>
                        </section>
                </ArbitratorDisputeLayout>
        )
}
