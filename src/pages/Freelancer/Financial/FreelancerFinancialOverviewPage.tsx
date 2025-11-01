import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
        AlertCircle,
        ArrowRightLeft,
        Calendar,
        Loader2,
        PiggyBank,
        TrendingUp,
        Wallet
} from 'lucide-react'
import { getFreelancerFinancialOverview } from '~/apis/freelancer/financial.api'
import type { EarningsSummaryEntry, EarningsTimelineEntry, Granularity } from '~/types/financial'

const granularityOptions: Array<{ label: string; value: Granularity }> = [
        { label: 'Daily', value: 'day' },
        { label: 'Weekly', value: 'week' },
        { label: 'Monthly', value: 'month' }
]

const formatDateInputValue = (date: Date) => {
        return date.toISOString().slice(0, 10)
}

const toDisplayDate = (value?: string) => {
        if (!value) return ''
        try {
                return formatDateInputValue(new Date(value))
        } catch {
                return ''
        }
}

const parseFormDate = (value: string | undefined) => {
        if (!value) return undefined
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toISOString()
}

const formatCurrency = (currency: string, amount: string) => {
        const numeric = Number(amount)
        if (!Number.isFinite(numeric)) {
                return amount
        }

        return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                maximumFractionDigits: 2
        }).format(numeric)
}

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value)

const buildDefaultDates = () => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 29)
        return { start, end }
}

const EmptyState = () => (
        <div className='flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center'>
                <PiggyBank className='size-10 text-base-content/60' />
                <div>
                        <h3 className='text-lg font-semibold text-base-content'>No financial activity found</h3>
                        <p className='max-w-md text-sm text-base-content/70'>
                                Adjust the filters above or check back later once you have earnings or spending data in the selected period.
                        </p>
                </div>
        </div>
)

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
        <div className='flex flex-col gap-1'>
                <h2 className='text-xl font-semibold text-base-content'>{title}</h2>
                {description ? <p className='text-sm text-base-content/70'>{description}</p> : null}
        </div>
)

const TimelineTable = ({
        currency,
        timeline
}: {
        currency: string
        timeline: EarningsTimelineEntry[]
}) => {
        if (timeline.length === 0) return null

        return (
                <div className='rounded-3xl border border-base-200 bg-base-100 shadow-sm'>
                        <div className='flex flex-wrap items-center justify-between gap-2 border-b border-base-200 p-4'>
                                <div className='flex items-center gap-3'>
                                        <TrendingUp className='size-5 text-primary' />
                                        <div>
                                                <h3 className='text-lg font-semibold text-base-content'>{currency} timeline</h3>
                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                        Period-by-period transfer movement
                                                </p>
                                        </div>
                                </div>
                                <span className='badge badge-outline badge-sm'>
                                        {timeline.length} {timeline.length === 1 ? 'period' : 'periods'}
                                </span>
                        </div>
                        <div className='overflow-x-auto'>
                                <table className='table table-zebra w-full text-sm'>
                                        <thead className='text-xs uppercase tracking-wide text-base-content/60'>
                                                <tr>
                                                        <th className='bg-base-100'>Period</th>
                                                        <th className='bg-base-100 text-right'>Pending</th>
                                                        <th className='bg-base-100 text-right'>Available</th>
                                                        <th className='bg-base-100 text-right'>Failed</th>
                                                        <th className='bg-base-100 text-right'>Reversed</th>
                                                        <th className='bg-base-100 text-right'>Total</th>
                                                        <th className='bg-base-100 text-right'>Transfers</th>
                                                </tr>
                                        </thead>
                                        <tbody>
                                                {timeline.map(entry => (
                                                        <tr key={`${currency}-${entry.period}`}>
                                                                <td className='font-medium'>{entry.period}</td>
                                                                <td className='text-right'>{formatCurrency(currency, entry.pendingAmount)}</td>
                                                                <td className='text-right'>{formatCurrency(currency, entry.availableAmount)}</td>
                                                                <td className='text-right'>{formatCurrency(currency, entry.failedAmount)}</td>
                                                                <td className='text-right'>{formatCurrency(currency, entry.reversedAmount)}</td>
                                                                <td className='text-right font-semibold text-base-content'>
                                                                        {formatCurrency(currency, entry.totalAmount)}
                                                                </td>
                                                                <td className='text-right text-base-content/80'>
                                                                        {formatCount(entry.transferCount.total)}
                                                                </td>
                                                        </tr>
                                                ))}
                                        </tbody>
                                </table>
                        </div>
                </div>
        )
}

const TransferBreakdownList = ({ currency, entry }: { currency: string; entry: EarningsSummaryEntry }) => (
        <dl className='mt-4 grid gap-3 text-sm'>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Escrow holding</dt>
                        <dd className='font-medium text-base-content'>
                                {formatCurrency(currency, entry.escrowHoldingAmount)}
                        </dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Pending payout</dt>
                        <dd className='font-medium text-warning'>
                                {formatCurrency(currency, entry.pendingPayoutAmount)}
                        </dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Available payout</dt>
                        <dd className='font-semibold text-success'>
                                {formatCurrency(currency, entry.availablePayoutAmount)}
                        </dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Failed payout</dt>
                        <dd className='font-medium text-error'>
                                {formatCurrency(currency, entry.failedPayoutAmount)}
                        </dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Reversed payout</dt>
                        <dd className='font-medium text-info'>
                                {formatCurrency(currency, entry.reversedPayoutAmount)}
                        </dd>
                </div>
        </dl>
)

const TransferCountList = ({ entry }: { entry: EarningsSummaryEntry }) => (
        <dl className='mt-4 grid gap-3 rounded-2xl bg-base-200/60 p-4 text-sm'>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Total transfers</dt>
                        <dd className='font-semibold text-base-content'>{formatCount(entry.transferCount.total)}</dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Pending</dt>
                        <dd className='font-medium text-warning'>{formatCount(entry.transferCount.pending)}</dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Succeeded</dt>
                        <dd className='font-medium text-success'>{formatCount(entry.transferCount.succeeded)}</dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Failed</dt>
                        <dd className='font-medium text-error'>{formatCount(entry.transferCount.failed)}</dd>
                </div>
                <div className='flex items-center justify-between'>
                        <dt className='text-base-content/70'>Reversed</dt>
                        <dd className='font-medium text-info'>{formatCount(entry.transferCount.reversed)}</dd>
                </div>
        </dl>
)

const SpendingSection = ({ spending }: { spending: Record<string, unknown> }) => {
        if (!spending || Object.keys(spending).length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No spending activity recorded in the selected window.
                        </div>
                )
        }

        const summaryCandidates = [spending.summary, spending.totals].find(Array.isArray) as
                | Array<Record<string, unknown>>
                | undefined

        return (
                <div className='flex flex-col gap-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                        {summaryCandidates ? (
                                <div>
                                        <h3 className='text-lg font-semibold text-base-content'>Spending summary</h3>
                                        <div className='mt-4 overflow-x-auto'>
                                                <table className='table table-sm w-full text-sm'>
                                                        <thead className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                <tr>
                                                                        {Object.keys(summaryCandidates[0] ?? {}).map(key => (
                                                                                <th key={key} className='bg-base-100 whitespace-nowrap'>
                                                                                        {key}
                                                                                </th>
                                                                        ))}
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {summaryCandidates.map((row, index) => (
                                                                        <tr key={`spending-summary-${index}`}>
                                                                                {Object.entries(row).map(([key, value]) => (
                                                                                        <td key={key} className='whitespace-nowrap'>
                                                                                                {typeof value === 'number' ? value.toLocaleString('en-US') : String(value ?? '')}
                                                                                        </td>
                                                                                ))}
                                                                        </tr>
                                                                ))}
                                                        </tbody>
                                                </table>
                                        </div>
                                </div>
                        ) : null}

                        {Array.isArray(spending.timeline) && spending.timeline.length > 0 ? (
                                <div className='flex flex-col gap-4'>
                                        <h3 className='text-lg font-semibold text-base-content'>Spending timeline</h3>
                                        <div className='overflow-x-auto'>
                                                <table className='table table-sm w-full text-sm'>
                                                        <thead className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                <tr>
                                                                        {Object.keys(spending.timeline[0] as Record<string, unknown>).map(key => (
                                                                                <th key={key} className='bg-base-100 whitespace-nowrap'>
                                                                                        {key}
                                                                                </th>
                                                                        ))}
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {(spending.timeline as Array<Record<string, unknown>>).map((row, index) => (
                                                                        <tr key={`spending-timeline-${index}`}>
                                                                                {Object.entries(row).map(([key, value]) => (
                                                                                        <td key={key} className='whitespace-nowrap'>
                                                                                                {typeof value === 'number' ? value.toLocaleString('en-US') : String(value ?? '')}
                                                                                        </td>
                                                                                ))}
                                                                        </tr>
                                                                ))}
                                                        </tbody>
                                                </table>
                                        </div>
                                </div>
                        ) : null}

                        <div>
                                <h3 className='text-lg font-semibold text-base-content'>Raw data</h3>
                                <pre className='mt-3 max-h-80 overflow-auto rounded-2xl bg-base-200/60 p-4 text-xs text-base-content/80'>
                                        {JSON.stringify(spending, null, 2)}
                                </pre>
                        </div>
                </div>
        )
}

const normalizeCurrency = (value: string) => value.trim().toUpperCase()

const buildQueryFilters = (filters: FiltersFormState) => ({
        from: parseFormDate(filters.from),
        to: parseFormDate(filters.to),
        granularity: filters.granularity,
        currency: filters.currency ? normalizeCurrency(filters.currency) : undefined
})

type FiltersFormState = {
        from: string
        to: string
        granularity: Granularity
        currency: string
}

export default function FreelancerFinancialOverviewPage() {
        const { start, end } = useMemo(() => buildDefaultDates(), [])
        const [formState, setFormState] = useState<FiltersFormState>({
                from: formatDateInputValue(start),
                to: formatDateInputValue(end),
                granularity: 'day',
                currency: ''
        })
        const [filters, setFilters] = useState(() => buildQueryFilters({
                from: formatDateInputValue(start),
                to: formatDateInputValue(end),
                granularity: 'day',
                currency: ''
        }))
        const [dateError, setDateError] = useState<string | null>(null)

        const queryKey = useMemo(() => ['freelancer-financial-overview', filters], [filters])

        const { data, isLoading, isFetching, error } = useQuery({
                queryKey,
                queryFn: () => getFreelancerFinancialOverview(filters)
        })

        const overview = data ?? null
        const earningsSummary = overview?.earnings.summary ?? []
        const timelineByCurrency = overview?.earnings.timelineByCurrency ?? {}
        const timelineCurrencies = Object.keys(timelineByCurrency)
        const spendingData = overview?.spending ?? {}

        const errorMessage = error ? (typeof error === 'string' ? error : (error as Error).message) : null

        const handleInputChange = (key: keyof FiltersFormState, value: string) => {
                setFormState(prev => ({ ...prev, [key]: value }))
        }

        const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                setDateError(null)

                const fromDate = formState.from ? new Date(formState.from) : null
                const toDate = formState.to ? new Date(formState.to) : null

                if (fromDate && toDate && fromDate > toDate) {
                        setDateError('Start date must be before or equal to the end date.')
                        return
                }

                setFilters(buildQueryFilters(formState))
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-2'>
                                <h1 className='text-3xl font-semibold text-base-content'>Financial overview</h1>
                                <p className='text-base text-base-content/70'>
                                        Track escrow balances, payout progress, and spending trends across currencies.
                                </p>
                        </div>

                        <form onSubmit={applyFilters} className='mt-8 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-4'>
                                        <div className='flex items-center gap-3 text-base-content'>
                                                <Calendar className='size-5 text-primary' />
                                                <div>
                                                        <h2 className='text-lg font-semibold'>Filters</h2>
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                Choose a date range and grouping to analyse your payouts
                                                        </p>
                                                </div>
                                        </div>
                                        <button type='submit' className='btn btn-primary btn-sm gap-2'>
                                                <ArrowRightLeft className='size-4' /> Apply filters
                                        </button>
                                </div>

                                <div className='mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                                        <label className='flex flex-col gap-2 text-sm text-base-content'>
                                                <span className='font-semibold text-base-content/70'>From</span>
                                                <input
                                                        type='date'
                                                        className='input input-bordered'
                                                        value={formState.from}
                                                        max={formState.to || undefined}
                                                        onChange={event => handleInputChange('from', event.target.value)}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-2 text-sm text-base-content'>
                                                <span className='font-semibold text-base-content/70'>To</span>
                                                <input
                                                        type='date'
                                                        className='input input-bordered'
                                                        value={formState.to}
                                                        min={formState.from || undefined}
                                                        onChange={event => handleInputChange('to', event.target.value)}
                                                />
                                        </label>
                                        <label className='flex flex-col gap-2 text-sm text-base-content'>
                                                <span className='font-semibold text-base-content/70'>Granularity</span>
                                                <select
                                                        className='select select-bordered'
                                                        value={formState.granularity}
                                                        onChange={event =>
                                                                handleInputChange('granularity', event.target.value as Granularity)
                                                        }
                                                >
                                                        {granularityOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <label className='flex flex-col gap-2 text-sm text-base-content'>
                                                <span className='font-semibold text-base-content/70'>Currency (optional)</span>
                                                <input
                                                        type='text'
                                                        className='input input-bordered uppercase'
                                                        placeholder='USD'
                                                        maxLength={3}
                                                        value={formState.currency}
                                                        onChange={event => handleInputChange('currency', event.target.value)}
                                                />
                                        </label>
                                </div>
                                {dateError ? (
                                        <div className='mt-4 flex items-center gap-2 rounded-2xl border border-error/40 bg-error/10 p-3 text-sm text-error'>
                                                <AlertCircle className='size-4' />
                                                <span>{dateError}</span>
                                        </div>
                                ) : null}
                                {overview ? (
                                        <p className='mt-4 text-xs uppercase tracking-wide text-base-content/50'>
                                                Showing data from {toDisplayDate(overview.filters.from)} to {toDisplayDate(overview.filters.to)} ·{' '}
                                                {overview.filters.granularity.toUpperCase()} grouping{' '}
                                                {overview.filters.currency ? `· ${overview.filters.currency}` : ''}
                                        </p>
                                ) : null}
                        </form>

                        {errorMessage ? (
                                <div className='mt-6 flex items-start gap-3 rounded-3xl border border-error/30 bg-error/10 p-6 text-sm text-error'>
                                        <AlertCircle className='mt-0.5 size-5' />
                                        <div>
                                                <p className='font-semibold'>Unable to load financial overview</p>
                                                <p>{errorMessage}</p>
                                        </div>
                                </div>
                        ) : null}

                        {isLoading ? (
                                <div className='mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center'>
                                        <Loader2 className='size-8 animate-spin text-primary' />
                                        <p className='text-sm text-base-content/70'>Fetching your financial data…</p>
                                </div>
                        ) : null}

                        {!isLoading && earningsSummary.length === 0 ? <EmptyState /> : null}

                        {earningsSummary.length > 0 ? (
                                <section className='mt-10 space-y-6'>
                                        <SectionTitle
                                                title='Earnings summary'
                                                description='Balances and payout pipeline grouped by currency.'
                                        />
                                        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                                                {earningsSummary.map(entry => (
                                                        <article
                                                                key={entry.currency}
                                                                className='flex h-full flex-col gap-4 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'
                                                        >
                                                                <div className='flex items-center justify-between gap-2'>
                                                                        <div>
                                                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>Currency</p>
                                                                                <h3 className='text-2xl font-semibold text-base-content'>{entry.currency}</h3>
                                                                        </div>
                                                                        <div className='rounded-2xl bg-primary/10 p-3 text-primary'>
                                                                                <Wallet className='size-6' />
                                                                        </div>
                                                                </div>
                                                                <TransferBreakdownList currency={entry.currency} entry={entry} />
                                                                <TransferCountList entry={entry} />
                                                        </article>
                                                ))}
                                        </div>
                                </section>
                        ) : null}

                        {timelineCurrencies.length > 0 ? (
                                <section className='mt-12 space-y-6'>
                                        <SectionTitle
                                                title='Earnings timeline'
                                                description='Monitor how transfers evolve over time in each currency.'
                                        />
                                        <div className='space-y-6'>
                                                {timelineCurrencies.map(currency => (
                                                        <TimelineTable
                                                                key={currency}
                                                                currency={currency}
                                                                timeline={timelineByCurrency[currency] ?? []}
                                                        />
                                                ))}
                                        </div>
                                </section>
                        ) : null}

                        {overview ? (
                                <section className='mt-12 space-y-6'>
                                        <SectionTitle
                                                title='Spending statistics'
                                                description='Understand how outgoing payments trend alongside your earnings.'
                                        />
                                        <SpendingSection spending={spendingData as Record<string, unknown>} />
                                </section>
                        ) : null}

                        {isFetching && !isLoading ? (
                                <div className='mt-6 flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/60'>
                                        <Loader2 className='size-4 animate-spin text-primary' /> Refreshing data…
                                </div>
                        ) : null}
                </div>
        )
}
