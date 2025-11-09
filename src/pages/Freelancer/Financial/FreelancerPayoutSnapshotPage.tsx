import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
        AlertCircle,
        Calendar,
        Clock,
        Loader2,
        RefreshCcw,
        ShieldCheck,
        Wallet,
        type LucideIcon
} from 'lucide-react'
import { getFreelancerPayoutSnapshot } from '~/apis/freelancer/payout.api'
import type {
        BalanceEntry,
        FreelancerPayoutStatus,
        PayoutHistoryEntry,
        PayoutSnapshot,
        PayoutSummaryEntry
} from '~/types/payout'

const historyLimitOptions = [10, 25, 50, 100, 200]

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
                <article className='flex h-full flex-col justify-between rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-primary/5 backdrop-blur'>
                        <div className='flex items-center justify-between gap-4'>
                                <div>
                                        <h3 className='text-lg font-semibold text-base-content'>{title}</h3>
                                        <p className='text-sm text-base-content/70'>{description}</p>
                                </div>
                                <div className={`rounded-2xl p-3 shadow-inner ${accent}`}>
                                        <Icon className='size-8 text-white drop-shadow' />
                                </div>
                        </div>

                        <div className='mt-6 space-y-4'>
                                {hasEntries ? (
                                        entries.map(entry => (
                                                <div
                                                        key={entry.currency}
                                                        className='rounded-2xl border border-base-200 bg-base-100/70 px-4 py-3 shadow-sm'
                                                >
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                {entry.currency}
                                                        </p>
                                                        <p className='mt-1 text-2xl font-semibold text-base-content'>
                                                                {formatCurrency(entry.currency, entry.amount)}
                                                        </p>
                                                </div>
                                        ))
                                ) : (
                                        <p className='text-sm text-base-content/60'>No balance reported in this bucket.</p>
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
                <div className='overflow-x-auto rounded-3xl border border-white/60 bg-white/70 shadow-lg shadow-primary/5'>
                        <table className='min-w-full divide-y divide-base-200 text-sm'>
                                <thead className='bg-base-200/60 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
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
                                <tbody className='divide-y divide-base-200/80 bg-white/80'>
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
                                                className='rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur'
                                        >
                                                <div className='flex flex-wrap items-start justify-between gap-4'>
                                                        <div>
                                                                <p className='text-sm text-base-content/60'>Amount</p>
                                                                <p className='text-2xl font-semibold text-base-content'>
                                                                        {formatCurrency(entry.currency, entry.amount)}
                                                                </p>
                                                        </div>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                <span
                                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.badge}`}
                                                                >
                                                                        {status.label}
                                                                </span>
                                                                <span className='inline-flex items-center rounded-full border border-base-200 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70'>
                                                                        {formatSource(entry.source)}
                                                                </span>
                                                        </div>
                                                </div>

                                                <p className='mt-3 text-sm text-base-content/70'>{status.description}</p>

                                                {entry.description ? (
                                                        <p className='mt-3 text-sm font-medium text-base-content'>
                                                                {entry.description}
                                                        </p>
                                                ) : null}

                                                <dl className='mt-4 grid gap-4 text-xs text-base-content/70 sm:grid-cols-2 lg:grid-cols-3'>
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
                                                        <div className='mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4'>
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
                                                        <div className='mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600'>
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
                snapshot.balance.available.forEach(entry => codes.add(entry.currency))
                snapshot.balance.pending.forEach(entry => codes.add(entry.currency))
                snapshot.summary.forEach(entry => codes.add(entry.currency))
                snapshot.history.forEach(entry => codes.add(entry.currency))
                return Array.from(codes).sort((a, b) => a.localeCompare(b))
        }, [snapshot])
}

const EmptyState = () => (
        <div className='flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center'>
                <ShieldCheck className='size-12 text-primary/50' />
                <div className='space-y-2'>
                        <h3 className='text-lg font-semibold text-base-content'>No payout data yet</h3>
                        <p className='text-sm text-base-content/70'>
                                Once you start receiving payouts through Stripe, you will see balances, summary totals, and a timeline of events here.
                        </p>
                </div>
        </div>
)

const PageHeader = ({ snapshot }: { snapshot?: PayoutSnapshot }) => {
        const payoutsEnabled = snapshot?.payoutsEnabled ?? false
        const stripeAccountId = snapshot?.stripeAccountId ?? null

        return (
                <section className='space-y-6 rounded-[40px] border border-white/60 bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-8 shadow-xl shadow-primary/10 backdrop-blur'>
                        <div className='flex flex-wrap items-start justify-between gap-6'>
                                <div className='max-w-2xl space-y-3'>
                                        <div className='inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm'>
                                                Stripe payouts overview
                                        </div>
                                        <h1 className='text-3xl font-semibold text-base-content'>Track your Stripe payout readiness</h1>
                                        <p className='text-base text-base-content/70'>
                                                Review balances, monitor payout statuses, and confirm that your Stripe Connect account is ready to receive funds.
                                        </p>
                                </div>
                                <div className='flex flex-col items-end gap-3 text-right'>
                                        <span
                                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                                                        payoutsEnabled
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                                                : 'border-amber-200 bg-amber-50 text-amber-600'
                                                }`}
                                        >
                                                <ShieldCheck className='size-4' />
                                                {payoutsEnabled ? 'Payouts enabled' : 'Payouts disabled'}
                                        </span>
                                        <div className='rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-base-content/70 shadow-sm'>
                                                <p className='uppercase tracking-wide text-base-content/60'>Stripe account ID</p>
                                                <p className='mt-1 font-semibold text-base-content'>
                                                        {stripeAccountId || 'Not connected'}
                                                </p>
                                        </div>
                                </div>
                        </div>

                        {!payoutsEnabled ? (
                                <div className='flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700'>
                                        <AlertCircle className='mt-0.5 size-4 flex-shrink-0' />
                                        <p>
                                                Stripe has not yet enabled payouts for this account. Complete the verification steps in the onboarding flow or resolve any outstanding requirements.
                                        </p>
                                </div>
                        ) : null}

                        {!stripeAccountId ? (
                                <div className='flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-700'>
                                        <Calendar className='mt-0.5 size-4 flex-shrink-0' />
                                        <p>
                                                Connect your Stripe account to begin receiving payouts. Once connected, balances and payout history will populate automatically.
                                        </p>
                                </div>
                        ) : null}
                </section>
        )
}

export default function FreelancerPayoutSnapshotPage() {
        const [currency, setCurrency] = useState('')
        const [historyLimit, setHistoryLimit] = useState(50)

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

        useEffect(() => {
                if (!currency) return
                if (currencyOptions.length === 0) return
                if (!currencyOptions.includes(currency)) {
                        setCurrency('')
                }
        }, [currency, currencyOptions])

        const hasContent = snapshot
                ? snapshot.balance.available.length > 0 ||
                  snapshot.balance.pending.length > 0 ||
                  snapshot.summary.length > 0 ||
                  snapshot.history.length > 0
                : false

        return (
                <div className='space-y-10'>
                        <PageHeader snapshot={snapshot} />

                        <section className='flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-primary/5 backdrop-blur'>
                                <div>
                                        <h2 className='text-lg font-semibold text-base-content'>Filters</h2>
                                        <p className='text-sm text-base-content/70'>Focus on a specific currency or adjust the payout history length.</p>
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
                                <div className='flex items-center justify-center rounded-3xl border border-white/60 bg-white/70 p-12 shadow-lg shadow-primary/5'>
                                        <div className='flex items-center gap-3 text-base text-base-content/70'>
                                                <Loader2 className='size-5 animate-spin text-primary' /> Loading payout snapshot…
                                        </div>
                                </div>
                        ) : null}

                        {isError ? (
                                <div className='flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600'>
                                        <AlertCircle className='mt-0.5 size-5 flex-shrink-0' />
                                        <div>
                                                <p className='font-semibold'>Unable to load payouts</p>
                                                <p>{(error as Error)?.message || 'An unexpected error occurred while fetching payout data.'}</p>
                                        </div>
                                </div>
                        ) : null}

                        {!isLoading && snapshot ? (
                                hasContent ? (
                                        <>
                                                <section className='grid gap-6 md:grid-cols-2'>
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

                                                <section className='space-y-4'>
                                                        <div className='flex items-center justify-between'>
                                                                <div>
                                                                        <h2 className='text-xl font-semibold text-base-content'>Payout summary</h2>
                                                                        <p className='text-sm text-base-content/70'>
                                                                                Totals per currency across every payout status.
                                                                        </p>
                                                                </div>
                                                        </div>
                                                        <SummaryTable summary={snapshot.summary} />
                                                </section>

                                                <section className='space-y-4'>
                                                        <div className='flex items-center justify-between'>
                                                                <div>
                                                                        <h2 className='text-xl font-semibold text-base-content'>Payout history</h2>
                                                                        <p className='text-sm text-base-content/70'>
                                                                                Detailed events for the most recent payouts synced from Stripe.
                                                                        </p>
                                                                </div>
                                                        </div>
                                                        <HistoryList history={snapshot.history} />
                                                </section>
                                        </>
                                ) : (
                                        <EmptyState />
                                )
                        ) : null}
                </div>
        )
}
