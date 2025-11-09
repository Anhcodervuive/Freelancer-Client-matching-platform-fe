import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
        AlertCircle,
        AlertTriangle,
        Calendar,
        Clock,
        Landmark,
        Loader2,
        RefreshCcw,
        ShieldCheck,
        Wallet,
        X,
        type LucideIcon
} from 'lucide-react'
import { isAxiosError } from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'react-toastify'
import { createFreelancerPayout, getFreelancerPayoutSnapshot } from '~/apis/freelancer/payout.api'
import type {
        BalanceEntry,
        CreateFreelancerPayoutInput,
        FreelancerPayoutStatus,
        PayoutHistoryEntry,
        PayoutSnapshot,
        PayoutSummaryEntry
} from '~/types/payout'

const historyLimitOptions = [10, 25, 50, 100, 200]

const MAX_TRANSFER_IDS = 50

const SECTION_CARD_CLASS =
        'rounded-2xl border border-base-200 bg-base-100/95 shadow-sm backdrop-blur-sm'

const ZERO_DECIMAL_CURRENCIES = new Set([
        'bif',
        'clp',
        'djf',
        'gnf',
        'jpy',
        'kmf',
        'krw',
        'mga',
        'pyg',
        'rwf',
        'ugx',
        'vnd',
        'vuv',
        'xaf',
        'xof',
        'xpf'
])

const getFractionDigitsForCurrency = (currency: string) =>
        ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 0 : 2

const formatCurrencyAmount = (amount: number, currency: string) => {
        const normalizedCurrency = currency.toUpperCase()
        const normalizedAmount = Number.isFinite(amount) ? amount : 0
        const fractionDigits = getFractionDigitsForCurrency(normalizedCurrency)

        try {
                return new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: normalizedCurrency,
                        currencyDisplay: 'code',
                        minimumFractionDigits: fractionDigits,
                        maximumFractionDigits: Math.max(fractionDigits, 2)
                }).format(normalizedAmount)
        } catch (error) {
                return `${normalizedAmount.toLocaleString('vi-VN', {
                        minimumFractionDigits: fractionDigits,
                        maximumFractionDigits: Math.max(fractionDigits, 2)
                })} ${normalizedCurrency}`
        }
}

const parseTransferIds = (input?: string) => {
        if (!input) return [] as string[]
        return input
                .split(/[\n,]+/)
                .map(entry => entry.trim())
                .filter(Boolean)
}

const pickRequirementMessages = (messages?: string[], fallback?: string[]) => {
        if (messages && messages.length > 0) {
                return messages
        }

        if (fallback && fallback.length > 0) {
                return fallback
        }

        return [] as string[]
}

const generateIdempotencyKey = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID().replace(/-/g, '')
        }

        return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

const resolveCreatePayoutErrorMessage = (error: unknown) => {
        if (isAxiosError(error)) {
                const message = error.response?.data?.message
                if (typeof message === 'string' && message.trim()) {
                        return message
                }
                if (error.message) {
                        return error.message
                }
        }

        if (error instanceof Error) {
                return error.message
        }

        return 'Không thể tạo yêu cầu rút tiền. Vui lòng thử lại sau.'
}

const createPayoutFormSchemaBase = z.object({
        amount: z
                .string()
                .trim()
                .min(1, 'Vui lòng nhập số tiền muốn rút')
                .refine(value => {
                        const numeric = Number(value)
                        return Number.isFinite(numeric) && numeric > 0
                }, 'Số tiền phải lớn hơn 0'),
        currency: z
                .string()
                .trim()
                .min(3, 'Mã tiền tệ phải có 3 ký tự')
                .max(3, 'Mã tiền tệ phải có 3 ký tự'),
        idempotencyKey: z
                .string()
                .trim()
                .optional()
                .refine(value => !value || value.length >= 8, {
                        message: 'Idempotency key phải có ít nhất 8 ký tự'
                })
                .refine(value => !value || value.length <= 255, {
                        message: 'Idempotency key quá dài'
                }),
        transferIdsRaw: z.string().optional()
})

type CreatePayoutFormValues = z.infer<typeof createPayoutFormSchemaBase>

type AvailableBalanceInfo = {
        numeric: number
        formatted: string
}

const buildCreatePayoutFormSchema = (
        availableBalances: Record<string, AvailableBalanceInfo>,
        currencyOptions: string[]
) =>
        createPayoutFormSchemaBase.superRefine((data, ctx) => {
                const transferIds = parseTransferIds(data.transferIdsRaw)

                if (transferIds.length > MAX_TRANSFER_IDS) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: `Không thể rút quá ${MAX_TRANSFER_IDS} khoản cùng lúc`,
                                path: ['transferIdsRaw']
                        })
                }

                const seen = new Set<string>()
                for (const id of transferIds) {
                        if (seen.has(id)) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Danh sách transfer chứa phần tử trùng nhau',
                                        path: ['transferIdsRaw']
                                })
                                break
                        }
                        seen.add(id)
                }

                const normalizedCurrency = data.currency?.trim().toUpperCase()

                if (normalizedCurrency) {
                        if (currencyOptions.length > 0 && !currencyOptions.includes(normalizedCurrency)) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Mã tiền tệ không nằm trong danh sách được phép rút.',
                                        path: ['currency']
                                })
                        }

                        const requestedAmount = Number(data.amount)
                        if (Number.isFinite(requestedAmount)) {
                                const balanceInfo = availableBalances[normalizedCurrency]
                                const availableAmount = balanceInfo?.numeric ?? 0
                                if (requestedAmount > availableAmount) {
                                        const formatted = balanceInfo?.formatted ??
                                                formatCurrencyAmount(availableAmount, normalizedCurrency)
                                        ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                message: `Số tiền vượt quá số dư khả dụng (${formatted}).`,
                                                path: ['amount']
                                        })
                                }
                        }
                }
        })

const statusStyles: Record<FreelancerPayoutStatus, { label: string; badge: string; description: string }> = {
        PENDING: {
                label: 'Pending',
                badge: 'border-amber-200 bg-amber-50 text-amber-600',
                description: 'Stripe has acknowledged the payout and is preparing it.'
        },
        IN_TRANSIT: {
                label: 'In transit',
                badge: 'border-sky-200 bg-sky-50 text-sky-600',
                description: 'Stripe has sent the payout to your bank and it is on the way.'
        },
        PAID: {
                label: 'Paid',
                badge: 'border-emerald-200 bg-emerald-50 text-emerald-600',
                description: 'The payout has settled and funds should be in your bank account.'
        },
        FAILED: {
                label: 'Failed',
                badge: 'border-rose-200 bg-rose-50 text-rose-600',
                description: 'Stripe could not complete this payout. Review the failure reason below.'
        },
        CANCELED: {
                label: 'Canceled',
                badge: 'border-slate-200 bg-slate-50 text-slate-600',
                description: 'The payout was canceled before Stripe could send it.'
        }
}

const toTitleCase = (value: string) => {
        if (!value) return ''
        return value
                .split(/[_\s]+/)
                .filter(Boolean)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ')
}

const buildFallbackStatus = (status: string) => ({
        label: toTitleCase(status) || status,
        badge: 'border-slate-200 bg-slate-50 text-slate-600',
        description: 'Stripe reported an unrecognized status for this payout.'
})

const formatCurrency = (currency: string, amount: string) => {
        const numeric = Number(amount)
        if (!Number.isFinite(numeric)) {
                return `${amount} ${currency}`
        }

        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                }).format(numeric)
        } catch {
                return `${numeric.toLocaleString('en-US')} ${currency}`
        }
}

const formatDateTime = (value: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
        }).format(date)
}

const formatSource = (source: string) => {
        if (!source) return '—'
        return toTitleCase(source)
}

const BalanceCard = ({
        title,
        description,
        icon: Icon,
        accent,
        entries
}: {
        title: string
        description: string
        icon: LucideIcon
        accent: string
        entries: BalanceEntry[]
}) => {
        const hasEntries = entries.length > 0

        return (
                <article className='flex h-full flex-col gap-5 rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                        <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                        <h3 className='text-lg font-semibold text-base-content'>{title}</h3>
                                        <p className='text-sm text-base-content/60'>{description}</p>
                                </div>
                                <div className={`rounded-lg p-2 ${accent}`}>
                                        <Icon className='size-6 text-white' />
                                </div>
                        </div>

                        <div className='space-y-3'>
                                {hasEntries ? (
                                        entries.map(entry => (
                                                <div
                                                        key={entry.currency}
                                                        className='rounded-xl border border-base-200 bg-base-200/30 px-4 py-3'
                                                >
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                {entry.currency}
                                                        </p>
                                                        <p className='mt-1 text-xl font-semibold text-base-content'>
                                                                {formatCurrency(entry.currency, entry.amount)}
                                                        </p>
                                                </div>
                                        ))
                                ) : (
                                        <p className='text-sm text-base-content/60'>Chưa có số dư cho mục này.</p>
                                )}
                        </div>
                </article>
        )
}

const SummaryTable = ({ summary }: { summary: PayoutSummaryEntry[] }) => {
        if (summary.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100/60 p-8 text-center text-sm text-base-content/70'>
                                No payout summary is available yet. When you receive payouts, you will see the totals by status and currency here.
                        </div>
                )
        }

        return (
                <div className='overflow-x-auto rounded-2xl border border-base-200 bg-base-100 shadow-sm'>
                        <table className='min-w-full divide-y divide-base-200 text-sm'>
                                <thead className='bg-base-200/80 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                        <tr>
                                                <th scope='col' className='px-4 py-3 text-left'>Currency</th>
                                                <th scope='col' className='px-4 py-3 text-left'>Total</th>
                                                <th scope='col' className='px-4 py-3 text-left'>Pending</th>
                                                <th scope='col' className='px-4 py-3 text-left'>In transit</th>
                                                <th scope='col' className='px-4 py-3 text-left'>Paid</th>
                                                <th scope='col' className='px-4 py-3 text-left'>Failed</th>
                                                <th scope='col' className='px-4 py-3 text-left'>Canceled</th>
                                        </tr>
                                </thead>
                                <tbody className='divide-y divide-base-200/70 bg-base-100'>
                                        {summary.map(entry => (
                                                <tr key={entry.currency} className='text-base-content/80'>
                                                        <td className='whitespace-nowrap px-4 py-3 text-sm font-semibold text-base-content'>
                                                                {entry.currency}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.totalAmount)}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.pendingAmount)}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.inTransitAmount)}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.paidAmount)}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.failedAmount)}
                                                        </td>
                                                        <td className='whitespace-nowrap px-4 py-3'>
                                                                {formatCurrency(entry.currency, entry.canceledAmount)}
                                                        </td>
                                                </tr>
                                        ))}
                                </tbody>
                        </table>
                </div>
        )
}

const HistoryList = ({ history }: { history: PayoutHistoryEntry[] }) => {
        if (history.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100/60 p-8 text-center text-sm text-base-content/70'>
                                No payouts have been recorded yet. As soon as Stripe processes a payout, it will appear here with full details.
                        </div>
                )
        }

        return (
                <div className='space-y-4'>
                        {history.map(entry => {
                                const status = statusStyles[entry.status] ?? buildFallbackStatus(entry.status)

                                return (
                                        <article
                                                key={entry.id}
                                                className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'
                                        >
                                                <div className='flex flex-wrap items-start justify-between gap-4'>
                                                        <div>
                                                                <p className='text-sm text-base-content/60'>Amount</p>
                                                                <p className='text-xl font-semibold text-base-content'>
                                                                        {formatCurrency(entry.currency, entry.amount)}
                                                                </p>
                                                        </div>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                <span
                                                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.badge}`}
                                                                >
                                                                        {status.label}
                                                                </span>
                                                                <span className='inline-flex items-center rounded-full border border-base-200 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70'>
                                                                        {formatSource(entry.source)}
                                                                </span>
                                                        </div>
                                                </div>

                                                <p className='mt-2 text-sm text-base-content/60'>{status.description}</p>

                                                {entry.description ? (
                                                        <p className='mt-3 text-sm font-medium text-base-content'>
                                                                {entry.description}
                                                        </p>
                                                ) : null}

                                                <dl className='mt-4 grid gap-4 text-xs text-base-content/60 sm:grid-cols-2 lg:grid-cols-3'>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Stripe payout ID</dt>
                                                                <dd className='mt-1 break-all text-sm text-base-content'>
                                                                        {entry.stripePayoutId || '—'}
                                                                </dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Balance transaction</dt>
                                                                <dd className='mt-1 break-all text-sm text-base-content'>
                                                                        {entry.stripeBalanceTransactionId || '—'}
                                                                </dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Requested at</dt>
                                                                <dd className='mt-1 text-sm text-base-content'>{formatDateTime(entry.requestedAt)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Stripe created</dt>
                                                                <dd className='mt-1 text-sm text-base-content'>{formatDateTime(entry.stripeCreatedAt)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Arrival date</dt>
                                                                <dd className='mt-1 text-sm text-base-content'>{formatDateTime(entry.arrivalDate)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Completed at</dt>
                                                                <dd className='mt-1 text-sm text-base-content'>{formatDateTime(entry.completedAt)}</dd>
                                                        </div>
                                                        <div>
                                                                <dt className='uppercase tracking-wide'>Last updated</dt>
                                                                <dd className='mt-1 text-sm text-base-content'>{formatDateTime(entry.updatedAt)}</dd>
                                                        </div>
                                                </dl>

                                                {entry.transferIds.length > 0 ? (
                                                        <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4'>
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Linked transfer IDs</p>
                                                                <div className='mt-2 flex flex-wrap gap-2'>
                                                                        {entry.transferIds.map(id => (
                                                                                <span
                                                                                        key={id}
                                                                                        className='inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary'
                                                                                >
                                                                                        {id}
                                                                                </span>
                                                                        ))}
                                                                </div>
                                                        </div>
                                                ) : null}

                                                {entry.failureMessage || entry.failureCode ? (
                                                        <div className='mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600'>
                                                                <AlertCircle className='mt-0.5 size-4 flex-shrink-0' />
                                                                <div>
                                                                        <p className='font-semibold'>Failure details</p>
                                                                        <p>{entry.failureMessage || 'No failure message provided by Stripe.'}</p>
                                                                        {entry.failureCode ? (
                                                                                <p className='mt-1 text-xs uppercase tracking-wide text-rose-500'>
                                                                                        Code: {entry.failureCode}
                                                                                </p>
                                                                        ) : null}
                                                                </div>
                                                        </div>
                                                ) : null}
                                        </article>
                                )
                        })}
                </div>
        )
}

const useCurrencyOptions = (snapshot?: PayoutSnapshot) => {
        return useMemo(() => {
                if (!snapshot) return [] as string[]
                const codes = new Set<string>()
                snapshot.balance.available.forEach(entry => codes.add(entry.currency.toUpperCase()))
                snapshot.balance.pending.forEach(entry => codes.add(entry.currency.toUpperCase()))
                snapshot.summary.forEach(entry => codes.add(entry.currency.toUpperCase()))
                snapshot.history.forEach(entry => codes.add(entry.currency.toUpperCase()))
                return Array.from(codes).sort((a, b) => a.localeCompare(b))
        }, [snapshot])
}

const useAvailableBalanceMap = (snapshot?: PayoutSnapshot) => {
        return useMemo(() => {
                if (!snapshot) return {} as Record<string, AvailableBalanceInfo>

                const map: Record<string, AvailableBalanceInfo> = {}

                const ensureEntry = (currency: string) => {
                        const upperCurrency = currency.toUpperCase()
                        if (!map[upperCurrency]) {
                                map[upperCurrency] = {
                                        numeric: 0,
                                        formatted: formatCurrencyAmount(0, upperCurrency)
                                }
                        }
                        return map[upperCurrency]
                }

                snapshot.balance.available.forEach(entry => {
                        const currency = entry.currency.toUpperCase()
                        const numeric = Number(entry.amount)
                        const safeNumeric = Number.isFinite(numeric) ? numeric : 0
                        map[currency] = {
                                numeric: safeNumeric,
                                formatted: formatCurrencyAmount(safeNumeric, currency)
                        }
                })

                snapshot.balance.pending.forEach(entry => {
                        ensureEntry(entry.currency)
                })

                snapshot.summary.forEach(entry => {
                        ensureEntry(entry.currency)
                })

                snapshot.history.forEach(entry => {
                        ensureEntry(entry.currency)
                })

                return map
        }, [snapshot])
}

const EmptyState = () => (
        <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100 p-10 text-center'>
                <ShieldCheck className='size-10 text-primary/50' />
                <div className='space-y-1'>
                        <h3 className='text-base font-semibold text-base-content'>Chưa có dữ liệu payouts</h3>
                        <p className='text-sm text-base-content/60'>Khi Stripe xử lý payouts, thông tin số dư, tóm tắt và lịch sử sẽ xuất hiện tại đây.</p>
                </div>
        </div>
)

const RequirementListCard = ({
        title,
        description,
        icon: Icon,
        accent,
        items
}: {
        title: string
        description: string
        icon: LucideIcon
        accent: string
        items: string[]
}) => {
        if (!items || items.length === 0) {
                return null
        }

        return (
                <div className='rounded-xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                        <div className='flex items-start gap-3'>
                                <div className={`rounded-lg p-2 text-white ${accent}`}>
                                        <Icon className='size-4' />
                                </div>
                                <div className='space-y-1'>
                                        <p className='text-sm font-semibold text-base-content'>{title}</p>
                                        <p className='text-xs text-base-content/60'>{description}</p>
                                </div>
                        </div>
                        <ul className='mt-3 list-disc space-y-1.5 pl-5 text-sm text-base-content/80'>
                                {items.map((item, index) => (
                                        <li key={`${item}-${index}`}>{item}</li>
                                ))}
                        </ul>
                </div>
        )
}

const RestrictionsOverview = ({
        restrictions,
        payoutsEnabled
}: {
        restrictions?: PayoutSnapshot['restrictions']
        payoutsEnabled: boolean
}) => {
        if (!restrictions) {
                return null
        }

        const disabledReasonMessage = restrictions.disabledReasonMessage
        const disabledAt = restrictions.disabledAt
        const disabledSince = disabledAt ? formatDateTime(disabledAt) : null
        const showDisabledSince = Boolean(disabledSince && disabledSince !== '—')

        const currentlyDueItems = pickRequirementMessages(
                restrictions.currentlyDueMessages,
                restrictions.currentlyDue
        )
        const pastDueItems = pickRequirementMessages(restrictions.pastDueMessages, restrictions.pastDue)
        const eventuallyDueItems = pickRequirementMessages(
                restrictions.eventuallyDueMessages,
                restrictions.eventuallyDue
        )

        const hasDisabledReason = Boolean(disabledReasonMessage)
        const hasBankIssue = Boolean(restrictions.externalAccountIssueMessage)
        const hasRequirementLists =
                currentlyDueItems.length > 0 || pastDueItems.length > 0 || eventuallyDueItems.length > 0

        if (!hasDisabledReason && !hasBankIssue && !hasRequirementLists) {
                return null
        }

        return (
                <section className={`${SECTION_CARD_CLASS} space-y-5 p-6`}>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                                <div className='space-y-1'>
                                        <h2 className='text-lg font-semibold text-base-content'>Cảnh báo từ Stripe</h2>
                                        <p className='text-sm text-base-content/60'>Giải quyết các hạng mục sau để tiếp tục rút tiền.</p>
                                </div>
                                {showDisabledSince ? (
                                        <span className='rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70'>
                                                Cập nhật: {disabledSince}
                                        </span>
                                ) : null}
                        </div>

                        <div className='space-y-3'>
                                {hasDisabledReason ? (
                                        <div
                                                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                                        payoutsEnabled
                                                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                                : 'border-rose-200 bg-rose-50 text-rose-700'
                                                }`}
                                        >
                                                <AlertTriangle className='mt-0.5 size-4 flex-shrink-0' />
                                                <div className='space-y-1'>
                                                        <p className='font-semibold'>
                                                                {payoutsEnabled ? 'Stripe cảnh báo về payouts' : 'Stripe đã khoá payouts'}
                                                        </p>
                                                        <p>{disabledReasonMessage}</p>
                                                </div>
                                        </div>
                                ) : null}

                                {hasBankIssue ? (
                                        <div className='flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
                                                <Landmark className='mt-0.5 size-4 flex-shrink-0' />
                                                <p>{restrictions.externalAccountIssueMessage}</p>
                                        </div>
                                ) : null}
                        </div>

                        {hasRequirementLists ? (
                                <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                                        <RequirementListCard
                                                title='Cần hoàn thành'
                                                description='Hoàn tất các bước sau để Stripe mở lại payouts.'
                                                icon={Clock}
                                                accent='bg-amber-500'
                                                items={currentlyDueItems}
                                        />
                                        <RequirementListCard
                                                title='Đã quá hạn'
                                                description='Stripe đang khoá payouts cho tới khi xử lý các hạng mục này.'
                                                icon={AlertCircle}
                                                accent='bg-rose-500'
                                                items={pastDueItems}
                                        />
                                        <RequirementListCard
                                                title='Nên chuẩn bị'
                                                description='Chuẩn bị trước để tránh gián đoạn payouts trong tương lai.'
                                                icon={Calendar}
                                                accent='bg-sky-500'
                                                items={eventuallyDueItems}
                                        />
                                </div>
                        ) : null}
                </section>
        )
}

const PageHeader = ({ snapshot }: { snapshot?: PayoutSnapshot }) => {
        const payoutsEnabled = snapshot?.payoutsEnabled ?? false
        const stripeAccountId = snapshot?.stripeAccountId ?? null
        const restrictions = snapshot?.restrictions
        const disabledReasonMessage = restrictions?.disabledReasonMessage ?? null
        const disabledAt = restrictions?.disabledAt ?? null
        const disabledSince = disabledAt ? formatDateTime(disabledAt) : null
        const showDisabledSince = Boolean(disabledSince && disabledSince !== '—')

        return (
                <section className={`${SECTION_CARD_CLASS} space-y-4 p-6`}>
                        <div className='flex flex-wrap items-start justify-between gap-4'>
                                <div className='space-y-2'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Stripe payouts</p>
                                        <h1 className='text-2xl font-semibold text-base-content'>Tổng quan trạng thái rút tiền</h1>
                                        <p className='text-sm text-base-content/60'>Theo dõi số dư, lịch sử và mức độ sẵn sàng của tài khoản Stripe Connect.</p>
                                </div>
                                <div className='flex flex-col items-end gap-2 text-right'>
                                        <span
                                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                                        payoutsEnabled
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : 'bg-amber-50 text-amber-600'
                                                }`}
                                        >
                                                <ShieldCheck className='size-4' />
                                                {payoutsEnabled ? 'Đã bật payouts' : 'Payouts đang bị khoá'}
                                        </span>
                                        <div className='text-xs text-base-content/60'>
                                                <span className='font-semibold text-base-content'>Stripe account:</span>{' '}
                                                {stripeAccountId || 'Chưa kết nối'}
                                        </div>
                                </div>
                        </div>

                        {(!payoutsEnabled || disabledReasonMessage) && (
                                <div className='flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
                                        <AlertCircle className='mt-0.5 size-4 flex-shrink-0' />
                                        <p>
                                                {disabledReasonMessage
                                                        ? disabledReasonMessage
                                                        : 'Stripe chưa bật payouts cho tài khoản này. Vui lòng hoàn tất các bước xác minh cần thiết.'}
                                        </p>
                                </div>
                        )}

                        {!stripeAccountId ? (
                                <div className='flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700'>
                                        <Calendar className='mt-0.5 size-4 flex-shrink-0' />
                                        <p>Kết nối tài khoản Stripe để tự động hiển thị số dư và lịch sử payouts.</p>
                                </div>
                        ) : null}
                </section>
        )
}

export default function FreelancerPayoutSnapshotPage() {
        const [currency, setCurrency] = useState('')
        const [historyLimit, setHistoryLimit] = useState(50)
        const [isCreatePayoutModalOpen, setCreatePayoutModalOpen] = useState(false)

        const {
                data: snapshot,
                isLoading,
                isError,
                error,
                isFetching,
                refetch
        } = useQuery({
                queryKey: ['freelancer-payout-snapshot', currency || 'ALL', historyLimit],
                queryFn: () =>
                        getFreelancerPayoutSnapshot({
                                currency: currency || undefined,
                                limit: historyLimit
                        })
        })

        const currencyOptions = useCurrencyOptions(snapshot)
        const availableBalanceMap = useAvailableBalanceMap(snapshot)

        const createPayoutSchema = useMemo(
                () => buildCreatePayoutFormSchema(availableBalanceMap, currencyOptions),
                [availableBalanceMap, currencyOptions]
        )
        const createPayoutResolver = useMemo(() => zodResolver(createPayoutSchema), [createPayoutSchema])

        const {
                register: registerCreatePayout,
                handleSubmit: handleSubmitCreatePayout,
                reset: resetCreatePayoutForm,
                setValue: setCreatePayoutValue,
                watch: watchCreatePayout,
                formState: { errors: createPayoutErrors, isSubmitting: isSubmittingCreatePayout }
        } = useForm<CreatePayoutFormValues>({
                resolver: createPayoutResolver,
                defaultValues: {
                        amount: '',
                        currency: '',
                        idempotencyKey: '',
                        transferIdsRaw: ''
                }
        })

        const transferIdsRaw = watchCreatePayout('transferIdsRaw')
        const selectedCurrency = watchCreatePayout('currency')

        const availableBalanceInfo = useMemo(() => {
                if (!selectedCurrency) return undefined
                const normalized = selectedCurrency.toUpperCase()
                const info = availableBalanceMap[normalized]
                const numeric = info?.numeric ?? 0
                return {
                        currency: normalized,
                        numeric,
                        formatted: info?.formatted ?? formatCurrencyAmount(numeric, normalized)
                }
        }, [availableBalanceMap, selectedCurrency])

        const canCreatePayout = Boolean(snapshot?.payoutsEnabled)
        const payoutDisabledMessage =
                snapshot?.restrictions?.disabledReasonMessage || 'Stripe chưa cho phép rút tiền cho tài khoản này.'
        const isCreateButtonDisabled = !snapshot || !snapshot.payoutsEnabled
        const createButtonTitle = isCreateButtonDisabled
                ? snapshot
                        ? payoutDisabledMessage
                        : 'Đang tải trạng thái payouts từ Stripe.'
                : undefined

        const amountInputStep = useMemo(() => {
                if (!availableBalanceInfo) return 0.01
                const fractionDigits = getFractionDigitsForCurrency(availableBalanceInfo.currency)
                return fractionDigits === 0 ? 1 : 0.01
        }, [availableBalanceInfo])

        const getDefaultCreatePayoutValues = useCallback(() => {
                const preferredCurrency =
                        currency && currencyOptions.includes(currency)
                                ? currency
                                : currencyOptions.find(option => {
                                          const info = availableBalanceMap[option]
                                          return (info?.numeric ?? 0) > 0
                                  }) ?? (currencyOptions.length === 1 ? currencyOptions[0] : '')

                return {
                        amount: '',
                        currency: preferredCurrency ?? '',
                        idempotencyKey: '',
                        transferIdsRaw: ''
                }
        }, [availableBalanceMap, currency, currencyOptions])

        const openCreatePayoutModal = useCallback(() => {
                if (!canCreatePayout) return
                resetCreatePayoutForm(getDefaultCreatePayoutValues())
                setCreatePayoutModalOpen(true)
        }, [canCreatePayout, getDefaultCreatePayoutValues, resetCreatePayoutForm])

        const parsedTransferIds = useMemo(() => parseTransferIds(transferIdsRaw), [transferIdsRaw])

        useEffect(() => {
                if (!currency) return
                if (currencyOptions.length === 0) return
                if (!currencyOptions.includes(currency)) {
                        setCurrency('')
                }
        }, [currency, currencyOptions])

        const createPayoutMutation = useMutation({
                mutationFn: (payload: CreateFreelancerPayoutInput) => createFreelancerPayout(payload),
                onSuccess: async () => {
                        toast.success('Đã gửi yêu cầu rút tiền thành công.')
                        resetCreatePayoutForm(getDefaultCreatePayoutValues())
                        setCreatePayoutModalOpen(false)
                        await refetch()
                },
                onError: error => {
                        toast.error(resolveCreatePayoutErrorMessage(error))
                }
        })

        const onSubmitCreatePayout = handleSubmitCreatePayout(async values => {
                const payload: CreateFreelancerPayoutInput = {
                        amount: values.amount.trim(),
                        currency: values.currency.trim().toUpperCase()
                }

                const normalizedIdempotencyKey = values.idempotencyKey?.trim()
                if (normalizedIdempotencyKey) {
                        payload.idempotencyKey = normalizedIdempotencyKey
                }

                const transferIds = parseTransferIds(values.transferIdsRaw)
                if (transferIds.length > 0) {
                        payload.transferIds = transferIds
                }

                await createPayoutMutation.mutateAsync(payload)
        })

        const isCreatingPayout = isSubmittingCreatePayout || createPayoutMutation.isPending
        const hasSelectedCurrency = Boolean(selectedCurrency && selectedCurrency.trim().length === 3)
        const isSubmitDisabled =
                !canCreatePayout ||
                isCreatingPayout ||
                !hasSelectedCurrency ||
                (availableBalanceInfo ? availableBalanceInfo.numeric <= 0 : false)
        const closeCreatePayoutModal = useCallback(() => {
                if (isCreatingPayout) return
                setCreatePayoutModalOpen(false)
                resetCreatePayoutForm(getDefaultCreatePayoutValues())
        }, [getDefaultCreatePayoutValues, isCreatingPayout, resetCreatePayoutForm])
        const handleCancelCreatePayoutModal = (event: SyntheticEvent<HTMLDialogElement>) => {
                event.preventDefault()
                closeCreatePayoutModal()
        }
        const transferIdsCount = parsedTransferIds.length
        const amountFieldId = 'freelancer-create-payout-amount'
        const currencyFieldId = 'freelancer-create-payout-currency'
        const idempotencyFieldId = 'freelancer-create-payout-idempotency'
        const transferFieldId = 'freelancer-create-payout-transfer-ids'

        const handleGenerateIdempotencyKey = () => {
                const key = generateIdempotencyKey()
                setCreatePayoutValue('idempotencyKey', key, {
                        shouldDirty: true,
                        shouldValidate: true
                })
        }

        const hasContent = snapshot
                ? snapshot.balance.available.length > 0 ||
                  snapshot.balance.pending.length > 0 ||
                  snapshot.summary.length > 0 ||
                  snapshot.history.length > 0
                : false

        return (
                <div className='space-y-10'>
                        <PageHeader snapshot={snapshot} />

                        {snapshot ? (
                                <RestrictionsOverview
                                        restrictions={snapshot.restrictions}
                                        payoutsEnabled={snapshot.payoutsEnabled ?? false}
                                />
                        ) : null}

                        <section className={`${SECTION_CARD_CLASS} flex flex-wrap items-start justify-between gap-4 p-6`}>
                                <div className='space-y-2'>
                                        <h2 className='text-lg font-semibold text-base-content'>Tạo yêu cầu rút tiền</h2>
                                        <p className='text-sm text-base-content/60'>Chọn số tiền, tiền tệ và (nếu cần) transfer ID để Stripe xử lý payout mới.</p>
                                </div>
                                <div className='flex flex-wrap items-center gap-3'>
                                        <span className='rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70'>
                                                Tối đa {MAX_TRANSFER_IDS} transfer ID
                                        </span>
                                        <button
                                                type='button'
                                                onClick={openCreatePayoutModal}
                                                disabled={isCreateButtonDisabled}
                                                title={createButtonTitle}
                                                className='btn btn-primary gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60'
                                        >
                                                <Wallet className='size-4' />
                                                Tạo yêu cầu rút tiền
                                        </button>
                                        {isCreateButtonDisabled && snapshot?.restrictions?.disabledReasonMessage ? (
                                                <p className='w-full text-xs text-amber-600/80'>
                                                        {snapshot.restrictions.disabledReasonMessage}
                                                </p>
                                        ) : null}
                                </div>
                        </section>

                        <section
                                className={`${SECTION_CARD_CLASS} flex flex-wrap items-center justify-between gap-4 px-5 py-4`}
                        >
                                <div>
                                        <h2 className='text-base font-semibold text-base-content'>Bộ lọc</h2>
                                        <p className='text-sm text-base-content/60'>Chọn tiền tệ và số lượng bản ghi lịch sử hiển thị.</p>
                                </div>
                                <div className='flex flex-wrap items-center gap-3'>
                                        <label className='flex flex-col text-xs font-medium uppercase tracking-wide text-base-content/60'>
                                                Currency
                                                <select
                                                        value={currency}
                                                        onChange={event => setCurrency(event.target.value)}
                                                        className='mt-1 w-44 rounded-xl border border-base-300 bg-white px-3 py-2 text-sm text-base-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                >
                                                        <option value=''>All currencies</option>
                                                        {currencyOptions.map(option => (
                                                                <option key={option} value={option}>
                                                                        {option}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <label className='flex flex-col text-xs font-medium uppercase tracking-wide text-base-content/60'>
                                                History limit
                                                <select
                                                        value={historyLimit}
                                                        onChange={event => setHistoryLimit(Number(event.target.value))}
                                                        className='mt-1 w-40 rounded-xl border border-base-300 bg-white px-3 py-2 text-sm text-base-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                >
                                                        {historyLimitOptions.map(option => (
                                                                <option key={option} value={option}>
                                                                        {option} payouts
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <button
                                                type='button'
                                                onClick={() => refetch()}
                                                disabled={isFetching}
                                                className='inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70'
                                        >
                                                <RefreshCcw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
                                                Refresh
                                        </button>
                                </div>
                        </section>

                        {isLoading ? (
                                <div className={`${SECTION_CARD_CLASS} flex items-center justify-center gap-3 p-6 text-sm text-base-content/60`}>
                                        <Loader2 className='size-5 animate-spin text-primary' /> Đang tải dữ liệu payouts…
                                </div>
                        ) : null}

                        {isError ? (
                                <div className='flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600'>
                                        <AlertCircle className='mt-0.5 size-4 flex-shrink-0' />
                                        <div className='space-y-1'>
                                                <p className='font-semibold'>Không thể tải dữ liệu payouts</p>
                                                <p>{(error as Error)?.message || 'Đã xảy ra lỗi trong quá trình truy vấn Stripe.'}</p>
                                        </div>
                                </div>
                        ) : null}

                          {!isLoading && snapshot ? (
                                  hasContent ? (
                                          <>
                                                  <section className='grid gap-4 md:grid-cols-2'>
                                                        <BalanceCard
                                                                title='Available balance'
                                                                description='Funds that Stripe has cleared and can be paid out to your bank account.'
                                                                icon={Wallet}
                                                                accent='bg-emerald-500/90 text-white'
                                                                entries={snapshot.balance.available}
                                                        />
                                                        <BalanceCard
                                                                title='Pending balance'
                                                                description='Funds still processing with Stripe before they become available for payout.'
                                                                icon={Clock}
                                                                accent='bg-amber-500/90 text-white'
                                                                entries={snapshot.balance.pending}
                                                        />
                                                </section>

                                                <section className='space-y-3'>
                                                        <div>
                                                                <h2 className='text-lg font-semibold text-base-content'>Tổng hợp payouts</h2>
                                                                <p className='text-sm text-base-content/60'>Tổng số tiền theo từng trạng thái và tiền tệ.</p>
                                                        </div>
                                                        <SummaryTable summary={snapshot.summary} />
                                                </section>

                                                <section className='space-y-3'>
                                                        <div>
                                                                <h2 className='text-lg font-semibold text-base-content'>Lịch sử payouts</h2>
                                                                <p className='text-sm text-base-content/60'>Chi tiết các sự kiện payouts gần nhất mà Stripe đã đồng bộ.</p>
                                                        </div>
                                                  <HistoryList history={snapshot.history} />
                                          </section>
                                  </>
                          ) : (
                                  <EmptyState />
                          )
                  ) : null}

                  <dialog
                          className={`modal ${isCreatePayoutModalOpen ? 'modal-open' : ''}`}
                          onCancel={handleCancelCreatePayoutModal}
                  >
                          <div className='modal-box flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-base-100 p-0 shadow-lg'>
                                  <div className='flex items-start gap-3 border-b border-base-200 bg-base-100 px-6 py-5'>
                                          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
                                                  <Wallet className='size-5' />
                                          </div>
                                          <div className='flex-1'>
                                                  <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/70'>Stripe payouts</p>
                                                  <h2 className='text-lg font-semibold text-base-content'>Tạo yêu cầu rút tiền</h2>
                                                  <p className='mt-1 text-sm text-base-content/60'>Điền thông tin bên dưới để gửi yêu cầu rút tiền mới qua Stripe.</p>
                                          </div>
                                          <button
                                                  type='button'
                                                  className='btn btn-ghost btn-sm rounded-full'
                                                  onClick={closeCreatePayoutModal}
                                                  disabled={isCreatingPayout}
                                                  aria-label='Đóng yêu cầu rút tiền'
                                          >
                                                  <X className='size-4' />
                                          </button>
                                  </div>

                                  <form onSubmit={onSubmitCreatePayout} className='flex flex-col'>
                                          <div className='space-y-6 px-6 py-6'>
                                                  <div className='grid gap-4 md:grid-cols-2'>
                                                          <label className='flex flex-col gap-2 text-sm font-medium text-base-content' htmlFor={amountFieldId}>
                                                                  <span className='text-xs uppercase tracking-wide text-base-content/60'>Số tiền muốn rút</span>
                                                                  <input
                                                                          id={amountFieldId}
                                                                          type='number'
                                                                          min='0'
                                                                          step={amountInputStep}
                                                                          inputMode='decimal'
                                                                          placeholder='Ví dụ: 250.00'
                                                                          className='w-full rounded-xl border border-base-300 bg-white px-3 py-2 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                          max={
                                                                                  availableBalanceInfo &&
                                                                                  availableBalanceInfo.numeric > 0
                                                                                          ? availableBalanceInfo.numeric
                                                                                          : undefined
                                                                          }
                                                                          {...registerCreatePayout('amount', {
                                                                                  setValueAs: value => (typeof value === 'string' ? value.trim() : value)
                                                                          })}
                                                                  />
                                                                  {createPayoutErrors.amount ? (
                                                                          <span className='text-xs font-medium text-rose-500'>
                                                                                  {createPayoutErrors.amount.message}
                                                                          </span>
                                                                  ) : null}
                                                                  <div className='space-y-1 text-xs text-base-content/60'>
                                                                          <p>Nhập số tiền bạn muốn Stripe chuyển về tài khoản ngân hàng.</p>
                                                                          {availableBalanceInfo ? (
                                                                                  <p
                                                                                          className={
                                                                                                  availableBalanceInfo.numeric > 0
                                                                                                          ? 'text-base-content/60'
                                                                                                          : 'font-medium text-rose-500'
                                                                                          }
                                                                                  >
                                                                                          {availableBalanceInfo.numeric > 0
                                                                                                  ? `Số dư khả dụng: ${availableBalanceInfo.formatted}`
                                                                                                  : `Số dư khả dụng cho ${availableBalanceInfo.currency} hiện đang là 0.`}
                                                                                  </p>
                                                                          ) : (
                                                                                  <p>Chọn mã tiền tệ để xem số dư khả dụng hiện tại.</p>
                                                                          )}
                                                                  </div>
                                                          </label>

                                                          <label className='flex flex-col gap-2 text-sm font-medium text-base-content' htmlFor={currencyFieldId}>
                                                                  <span className='text-xs uppercase tracking-wide text-base-content/60'>Tiền tệ</span>
                                                                  <input
                                                                          id={currencyFieldId}
                                                                          type='text'
                                                                          maxLength={3}
                                                                          placeholder='VD: USD'
                                                                          list='freelancer-payout-currency-options'
                                                                          className='w-full rounded-xl border border-base-300 bg-white px-3 py-2 text-base uppercase tracking-widest shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                          {...registerCreatePayout('currency', {
                                                                                  setValueAs: value =>
                                                                                          typeof value === 'string' ? value.trim().toUpperCase() : value
                                                                          })}
                                                                  />
                                                                  <datalist id='freelancer-payout-currency-options'>
                                                                          {currencyOptions.map(option => (
                                                                                  <option key={option} value={option} />
                                                                          ))}
                                                                  </datalist>
                                                                  {createPayoutErrors.currency ? (
                                                                          <span className='text-xs font-medium text-rose-500'>
                                                                                  {createPayoutErrors.currency.message}
                                                                          </span>
                                                                  ) : (
                                                                          <span className='text-xs text-base-content/60'>Mã tiền tệ ISO 4217 gồm 3 ký tự (ví dụ: USD, VND, EUR). Chỉ các mã xuất hiện trong danh sách gợi ý mới được phép rút.</span>
                                                                  )}
                                                          </label>
                                                  </div>

                                                  <div className='grid gap-4'>
                                                          <div className='space-y-2'>
                                                                  <div className='flex items-center justify-between gap-2'>
                                                                          <label htmlFor={idempotencyFieldId} className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                  Idempotency key (tùy chọn)
                                                                          </label>
                                                                          <button
                                                                                  type='button'
                                                                                  onClick={handleGenerateIdempotencyKey}
                                                                                  className='inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary/20'
                                                                          >
                                                                                  Tạo key
                                                                          </button>
                                                                  </div>
                                                                  <input
                                                                          id={idempotencyFieldId}
                                                                          type='text'
                                                                          placeholder='Tự nhập hoặc nhấn "Tạo key"'
                                                                          className='w-full rounded-xl border border-base-300 bg-white px-3 py-2 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                          {...registerCreatePayout('idempotencyKey', {
                                                                                  setValueAs: value => (typeof value === 'string' ? value.trim() : value)
                                                                          })}
                                                                  />
                                                                  {createPayoutErrors.idempotencyKey ? (
                                                                          <span className='text-xs font-medium text-rose-500'>
                                                                                  {createPayoutErrors.idempotencyKey.message}
                                                                          </span>
                                                                  ) : (
                                                                          <span className='text-xs text-base-content/60'>Khuyến nghị cung cấp để tránh gửi trùng yêu cầu tới Stripe.</span>
                                                                  )}
                                                          </div>

                                                          <div className='space-y-2'>
                                                                  <label htmlFor={transferFieldId} className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                          Danh sách transfer ID (tùy chọn)
                                                                  </label>
                                                                  <textarea
                                                                          id={transferFieldId}
                                                                          rows={3}
                                                                          placeholder='Mỗi dòng hoặc dấu phẩy phân tách một transfer ID'
                                                                          className='w-full rounded-xl border border-base-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                          {...registerCreatePayout('transferIdsRaw', {
                                                                                  setValueAs: value => (typeof value === 'string' ? value.trim() : value)
                                                                          })}
                                                                  />
                                                                  <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60'>
                                                                          <span>
                                                                                  Đã nhập {transferIdsCount} / {MAX_TRANSFER_IDS} transfer ID
                                                                          </span>
                                                                          <span>Bạn có thể nhập nhiều dòng hoặc phân tách bằng dấu phẩy.</span>
                                                                  </div>
                                                                  {createPayoutErrors.transferIdsRaw ? (
                                                                          <span className='text-xs font-medium text-rose-500'>
                                                                                  {createPayoutErrors.transferIdsRaw.message}
                                                                          </span>
                                                                  ) : null}
                                                          </div>
                                                  </div>

                                            <div className='rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary'>
                                                    Stripe sẽ xử lý yêu cầu ngay sau khi bạn gửi và cập nhật trạng thái trong phần lịch sử.
                                            </div>
                                        </div>

                                        <div className='modal-action mt-0 flex flex-col gap-3 border-t border-base-200 bg-base-100 px-6 py-4 sm:flex-row'>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost flex-1'
                                                          onClick={closeCreatePayoutModal}
                                                          disabled={isCreatingPayout}
                                                  >
                                                          Hủy
                                                  </button>
                                                  <button
                                                          type='submit'
                                                          className='btn btn-primary flex-1 gap-2'
                                                          disabled={isSubmitDisabled}
                                                          title={
                                                                  !canCreatePayout
                                                                          ? payoutDisabledMessage
                                                                          : !hasSelectedCurrency
                                                                                  ? 'Chọn mã tiền tệ hợp lệ trước khi gửi yêu cầu.'
                                                                                  : availableBalanceInfo && availableBalanceInfo.numeric <= 0
                                                                                          ? 'Số dư khả dụng bằng 0 nên không thể tạo payout lúc này.'
                                                                                          : undefined
                                                          }
                                                  >
                                                          {isCreatingPayout ? (
                                                                  <>
                                                                          <Loader2 className='size-4 animate-spin' />
                                                                          Đang gửi...
                                                                  </>
                                                          ) : (
                                                                  'Gửi yêu cầu'
                                                          )}
                                                  </button>
                                          </div>
                                  </form>
                          </div>
                          <form method='dialog' className='modal-backdrop'>
                                  <button onClick={closeCreatePayoutModal} disabled={isCreatingPayout}>
                                          close
                                  </button>
                          </form>
                  </dialog>
          </div>
  )
}
