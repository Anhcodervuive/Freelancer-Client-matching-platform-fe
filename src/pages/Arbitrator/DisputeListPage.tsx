import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Gavel, Loader2 } from 'lucide-react'

import { listArbitratorDisputes } from '~/apis/arbitrator/dispute.api'
import { routes } from '~/config/routes'
import type { ArbitratorDisputeListItem, DecimalLike, DisputeUserSummary } from '~/types/dispute'
import { DisputeStatus } from '~/types/dispute'
import ArbitratorDisputeLayout from './components/DisputeLayout'

const statusBadgeClassMap: Partial<Record<DisputeStatus, string>> = {
        [DisputeStatus.ARBITRATION]: 'badge-secondary',
        [DisputeStatus.ARBITRATION_READY]: 'badge-secondary',
        [DisputeStatus.AWAITING_ARBITRATION_FEES]: 'badge-warning',
        [DisputeStatus.NEGOTIATION]: 'badge-info',
        [DisputeStatus.INTERNAL_MEDIATION]: 'badge-info',
        [DisputeStatus.RESOLVED_RELEASE_ALL]: 'badge-success',
        [DisputeStatus.RESOLVED_REFUND_ALL]: 'badge-success',
        [DisputeStatus.RESOLVED_SPLIT]: 'badge-success',
        [DisputeStatus.CANCELED]: 'badge-neutral',
        [DisputeStatus.EXPIRED]: 'badge-neutral'
}

const humanizeStatus = (status?: DisputeStatus | null) =>
        status
                ? status
                                .split('_')
                                .map(part => part.charAt(0) + part.slice(1).toLowerCase())
                                .join(' ')
                : 'Không xác định'

const toNumber = (value: DecimalLike | null | undefined) => {
        if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null
        }

        if (typeof value === 'string') {
                const parsed = Number(value)
                return Number.isFinite(parsed) ? parsed : null
        }

        return null
}

const formatCurrencyValue = (value: DecimalLike | null | undefined, currency?: string | null) => {
        const amount = toNumber(value)
        if (amount === null) return '—'

        const normalizedCurrency = currency && currency.trim().length ? currency : 'USD'

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

const resolveUserName = (user?: DisputeUserSummary | null) => {
        if (!user) return '—'

        const record = user as Record<string, unknown>

        const direct = (() => {
                const directCandidate = record.displayName ?? record.name ?? record.fullName
                if (typeof directCandidate === 'string' && directCandidate.trim().length) {
                        return directCandidate.trim()
                }
                if (user.profile && typeof user.profile === 'object') {
                        const profileRecord = user.profile as Record<string, unknown>
                        const profileDisplay = profileRecord.displayName ?? profileRecord.name
                        if (typeof profileDisplay === 'string' && profileDisplay.trim().length) {
                                return profileDisplay.trim()
                        }
                }
                return undefined
        })()

        if (direct) {
                return direct
        }

        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
        if (fullName.length) {
                return fullName
        }

        return '—'
}

const getShortDisputeCode = (id: string) => {
        if (!id) return ''
        const suffix = id.slice(-6).toUpperCase()
        return `#${suffix}`
}

type DisputeCardProps = {
        item: ArbitratorDisputeListItem
}

const DisputeCard = ({ item }: DisputeCardProps) => {
        const status = item.status ?? item.dispute?.status ?? null
        const badgeClass = status ? statusBadgeClassMap[status] ?? 'badge-outline' : 'badge-outline'
        const contractTitle = item.contract?.title ?? null
        const fallbackTitle = contractTitle ?? `Tranh chấp ${getShortDisputeCode(item.id)}`
        const milestoneTitle = item.milestone?.title ?? fallbackTitle
        const disputableAmount = item.amounts?.disputable ?? item.amounts?.funded ?? null
        const currency = item.amounts?.currency ?? item.milestone?.currency ?? item.contract?.currency ?? null
        const lockedAt = item.lockedAt ?? item.dispute?.lockedAt ?? null
        const arbitrationDeadline = item.arbitrationDeadline ?? item.dispute?.arbitrationDeadline ?? null
        const assignedAt = item.arbitratorAssignedAt ?? item.dispute?.arbitratorAssignedAt ?? item.createdAt ?? null
        const client = item.client ?? item.parties?.client ?? null
        const freelancer = item.freelancer ?? item.parties?.freelancer ?? null

        return (
                <article className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                                <div className='space-y-2'>
                                        <div className='flex flex-wrap items-center gap-3 text-sm text-base-content/70'>
                                                <span className='font-mono text-xs uppercase tracking-wide text-base-content/60'>
                                                        {getShortDisputeCode(item.id)}
                                                </span>
                                                <span className={`badge badge-sm ${badgeClass}`}>{humanizeStatus(status)}</span>
                                                {assignedAt ? (
                                                        <span className='flex items-center gap-1 text-xs text-base-content/60'>
                                                                Phân công: {formatDateTime(assignedAt)}
                                                        </span>
                                                ) : null}
                                        </div>
                                        <h3 className='text-lg font-semibold text-base-content'>
                                                <Link
                                                        to={routes.arbitrator.disputes.detail(item.id)}
                                                        className='link link-hover text-base-content'
                                                >
                                                        {milestoneTitle}
                                                </Link>
                                        </h3>
                                        {contractTitle ? (
                                                <p className='text-sm text-base-content/70'>Hợp đồng: {contractTitle}</p>
                                        ) : null}
                                        <div className='mt-3 flex flex-wrap gap-4 text-sm text-base-content/80'>
                                                <div>
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Client</p>
                                                        <p className='font-medium'>{resolveUserName(client)}</p>
                                                </div>
                                                <div>
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Freelancer</p>
                                                        <p className='font-medium'>{resolveUserName(freelancer)}</p>
                                                </div>
                                        </div>
                                </div>
                                <div className='flex flex-col items-start gap-3 md:items-end'>
                                        <div className='text-left md:text-right'>
                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>Giá trị tranh chấp</p>
                                                <p className='text-xl font-semibold text-base-content'>
                                                        {formatCurrencyValue(disputableAmount, currency)}
                                                </p>
                                        </div>
                                        <Link
                                                to={routes.arbitrator.disputes.detail(item.id)}
                                                className='btn btn-primary btn-sm flex items-center gap-2'
                                        >
                                                Xem chi tiết
                                                <ArrowRight className='h-4 w-4' />
                                        </Link>
                                </div>
                        </div>
                        <dl className='mt-6 grid gap-4 text-sm text-base-content/70 sm:grid-cols-2 lg:grid-cols-4'>
                                <div>
                                        <dt className='font-medium text-base-content'>Khóa hồ sơ trọng tài</dt>
                                        <dd>{formatDateTime(lockedAt)}</dd>
                                </div>
                                <div>
                                        <dt className='font-medium text-base-content'>Hạn ra quyết định</dt>
                                        <dd>{formatDateTime(arbitrationDeadline)}</dd>
                                </div>
                                <div>
                                        <dt className='font-medium text-base-content'>Cập nhật gần nhất</dt>
                                        <dd>{formatDateTime(item.updatedAt ?? item.dispute?.updatedAt ?? null)}</dd>
                                </div>
                                <div>
                                        <dt className='font-medium text-base-content'>Ngày tạo</dt>
                                        <dd>{formatDateTime(item.createdAt ?? item.dispute?.createdAt ?? null)}</dd>
                                </div>
                        </dl>
                </article>
        )
}

const LoadingState = () => (
        <section className='rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                <div className='flex items-center gap-3 text-base-content/70'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        <span>Đang tải danh sách tranh chấp đã được phân công...</span>
                </div>
        </section>
)

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
        <section className='rounded-2xl border border-error/30 bg-error/5 p-6 text-error'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-center gap-3'>
                                <AlertCircle className='h-6 w-6' />
                                <div>
                                        <h2 className='text-lg font-semibold'>Không thể tải danh sách tranh chấp</h2>
                                        <p className='text-sm text-error/80'>Vui lòng kiểm tra kết nối và thử lại sau ít phút.</p>
                                </div>
                        </div>
                        <button type='button' className='btn btn-error btn-sm' onClick={onRetry}>
                                Thử lại
                        </button>
                </div>
        </section>
)

const EmptyState = () => (
        <section className='rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-center shadow-sm'>
                <h2 className='text-lg font-semibold text-base-content'>Chưa có tranh chấp nào được giao</h2>
                <p className='mt-2 text-base-content/70'>
                        Khi một tranh chấp được chuyển sang giai đoạn trọng tài và gán cho bạn, hồ sơ sẽ xuất hiện tại đây.
                        Bạn cũng sẽ nhận được email thông báo với đường dẫn trực tiếp tới hồ sơ.
                </p>
        </section>
)

export default function ArbitratorDisputeListPage() {
        const { data, isLoading, isError, refetch } = useQuery({
                queryKey: ['arbitrator', 'disputes', 'assigned'],
                queryFn: listArbitratorDisputes
        })

        const disputes = useMemo(() => data ?? [], [data])

        return (
                <ArbitratorDisputeLayout
                        icon={<Gavel className='h-6 w-6' />}
                        title='Danh sách tranh chấp'
                        description='Theo dõi những tranh chấp đã được giao để chuẩn bị và đưa ra quyết định kịp thời.'
                        breadcrumbs={[
                                { label: 'Trang chủ', to: routes.arbitrator.dashboard },
                                { label: 'Tranh chấp' }
                        ]}
                >
                        <div className='space-y-6'>
                                {isLoading ? <LoadingState /> : null}
                                {isError ? <ErrorState onRetry={refetch} /> : null}
                                {!isLoading && !isError && disputes.length === 0 ? <EmptyState /> : null}
                                {!isLoading && !isError && disputes.length > 0 ? (
                                        <div className='space-y-4'>
                                                {disputes.map(dispute => (
                                                        <DisputeCard key={dispute.id} item={dispute} />
                                                ))}
                                        </div>
                                ) : null}
                        </div>
                </ArbitratorDisputeLayout>
        )
}
