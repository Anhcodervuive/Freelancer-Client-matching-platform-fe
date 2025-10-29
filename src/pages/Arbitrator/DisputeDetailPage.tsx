import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
        AlertCircle,
        CalendarDays,
        Clock,
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

type ArbitrationDecisionFormValues = z.infer<typeof ArbitrationDecisionFormSchema>

type TimelineEntry = ArbitrationTimelineEntry & { id: string }

const mapTimelineEntries = (entries: ArbitrationTimelineEntry[]): TimelineEntry[] =>
        entries.map((entry, index) => ({
                ...entry,
                id: `${entry.at}-${entry.action}-${index}`
        }))

const summarizeSections = (sections: Record<string, unknown>) =>
        Object.entries(sections).map(([key, value]) => ({
                key,
                value
        }))

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

        const currency =
                escrow?.currency ??
                milestone?.currency ??
                (typeof contract?.currency === 'string' ? (contract.currency as string) : undefined)

        const funded = escrow?.amountFunded ?? disputeDetail?.dispute?.proposedRelease ?? null
        const released = escrow?.amountReleased ?? null
        const refunded = escrow?.amountRefunded ?? null

        const disputableAmount = useMemo(() => {
                const fundedNumber = toNumber(funded)
                const releasedNumber = toNumber(released) ?? 0
                const refundedNumber = toNumber(refunded) ?? 0

                if (fundedNumber === null) {
                        return null
                }

                const disputable = fundedNumber - releasedNumber - refundedNumber
                return disputable >= 0 ? disputable : 0
        }, [funded, released, refunded])

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

        const arbitrationContext = data?.arbitrationContext ?? null
        const timelineEntries = useMemo(() => mapTimelineEntries(arbitrationContext?.timeline ?? []), [arbitrationContext?.timeline])
        const sectionSummaries = useMemo(
                () => summarizeSections(arbitrationContext?.sections ?? {}),
                [arbitrationContext?.sections]
        )
        const decisionAttachments = (disputeDetail?.decisionAttachments ?? []) as AdminDisputeDecisionAttachment[]
        const arbitrationDossiers = (disputeDetail?.arbitrationDossiers ?? []) as AdminDisputeDossier[]
        const contractClient = (contract?.client as Record<string, unknown> | undefined) ?? null
        const contractFreelancer = (contract?.freelancer as Record<string, unknown> | undefined) ?? null

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
                        actions={statusBadge}
                        meta={headerMeta}
                        breadcrumbs={breadcrumbs}
                >
                        <section className='grid gap-6 lg:grid-cols-3'>
                                <article className='lg:col-span-2 space-y-6'>
                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Thông tin tài chính</h2>
                                                <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
                                                        <div>
                                                                <dt className='text-sm text-base-content/60'>Tổng số tiền tranh chấp</dt>
                                                                <dd className='text-lg font-semibold'>{formatCurrency(funded, currency)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-sm text-base-content/60'>Đã giải ngân</dt>
                                                                <dd className='text-lg font-semibold'>{formatCurrency(released, currency)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-sm text-base-content/60'>Đã hoàn trả</dt>
                                                                <dd className='text-lg font-semibold'>{formatCurrency(refunded, currency)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-sm text-base-content/60'>Giá trị còn tranh chấp</dt>
                                                                <dd className='text-lg font-semibold'>
                                                                        {disputableAmount !== null
                                                                                ? formatCurrency(disputableAmount, currency)
                                                                                : '—'}
                                                                </dd>
                                                        </div>
                                                </dl>
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Dòng thời gian trọng tài</h2>
                                                {timelineEntries.length ? (
                                                        <ul className='mt-4 space-y-4'>
                                                                {timelineEntries.map(entry => (
                                                                        <li key={entry.id} className='rounded-xl border border-base-200 p-4'>
                                                                                <div className='flex flex-wrap items-center gap-2 text-sm text-base-content/70'>
                                                                                        <CalendarDays size={16} />
                                                                                        <span>{formatDateTime(entry.at)}</span>
                                                                                        {entry.actor ? (
                                                                                                <>
                                                                                                        <span>•</span>
                                                                                                        <span className='flex items-center gap-1'>
                                                                                                                <UserCircle2 size={16} />
                                                                                                                {entry.actor}
                                                                                                        </span>
                                                                                                </>
                                                                                        ) : null}
                                                                                </div>
                                                                                <p className='mt-2 text-base font-medium'>{entry.action}</p>
                                                                                {entry.details ? (
                                                                                        <pre className='mt-3 max-h-48 overflow-auto rounded-lg bg-base-200/60 p-3 text-xs leading-relaxed'>
                                                                                                {typeof entry.details === 'string'
                                                                                                        ? entry.details
                                                                                                        : JSON.stringify(entry.details, null, 2)}
                                                                                        </pre>
                                                                                ) : null}
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Chưa có dữ liệu dòng thời gian.</p>
                                                )}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Tổng quan hồ sơ</h2>
                                                {sectionSummaries.length ? (
                                                        <div className='mt-4 space-y-4'>
                                                                {sectionSummaries.map(section => (
                                                                        <details key={section.key} className='group rounded-xl border border-base-200'>
                                                                                <summary className='cursor-pointer px-4 py-3 text-sm font-medium group-open:bg-base-200/60'>
                                                                                        {section.key}
                                                                                </summary>
                                                                                <pre className='max-h-60 overflow-auto px-4 py-3 text-xs leading-relaxed'>
                                                                                        {JSON.stringify(section.value, null, 2)}
                                                                                </pre>
                                                                        </details>
                                                                ))}
                                                        </div>
                                                ) : (
                                                        <p className='mt-4 text-sm text-base-content/70'>Không có dữ liệu bổ sung.</p>
                                                )}
                                        </div>
                                </article>

                                <aside className='space-y-6'>
                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Các bên liên quan</h2>
                                                <dl className='mt-4 space-y-3 text-sm text-base-content/80'>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Khách hàng</dt>
                                                                <dd className='font-medium'>{formatUserName(contractClient)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Freelancer</dt>
                                                                <dd className='font-medium'>{formatUserName(contractFreelancer)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Trọng tài viên</dt>
                                                                <dd className='font-medium'>{formatUserName(baseDispute?.arbitrator)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Hợp đồng</dt>
                                                                <dd className='font-medium'>{contract?.title ?? '—'}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='text-xs uppercase text-base-content/60'>Milestone</dt>
                                                                <dd className='font-medium'>{milestone?.title ?? '—'}</dd>
                                                        </div>
                                                </dl>
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold'>Hồ sơ trọng tài gần đây</h2>
                                                {arbitrationDossiers.length ? (
                                                        <ul className='mt-4 space-y-3 text-sm text-base-content/70'>
                                                                {arbitrationDossiers.map(dossier => (
                                                                        <li key={dossier.id} className='rounded-lg border border-base-200 p-3'>
                                                                                <div className='flex items-center justify-between text-xs uppercase text-base-content/60'>
                                                                                        <span>Phiên bản</span>
                                                                                        <span>{dossier.version ?? '—'}</span>
                                                                                </div>
                                                                                <div className='mt-2 text-sm font-medium'>
                                                                                        {dossier.milestoneTitle ?? 'Không rõ'}
                                                                                </div>
                                                                                <div className='mt-1 text-xs text-base-content/60'>
                                                                                        Cập nhật: {formatDateTime(dossier.createdAt)}
                                                                                </div>
                                                                        </li>
                                                                ))}
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
