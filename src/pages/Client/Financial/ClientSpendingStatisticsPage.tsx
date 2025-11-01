import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Calendar, ChartLine, CreditCard, Loader2, PiggyBank, RefreshCcw } from 'lucide-react'

import { getClientSpendingStatistics } from '~/apis/client/financial.api'
import type {
        ClientSpendingStatistics,
        Granularity,
        SpendingSummaryEntry,
        SpendingTimelineEntry
} from '~/types/financial'
import { loadChartJs, withAlpha } from '~/utils/chartjs'

const granularityOptions: Array<{ label: string; value: Granularity }> = [
        { label: 'Daily', value: 'day' },
        { label: 'Weekly', value: 'week' },
        { label: 'Monthly', value: 'month' }
]

const formatDateInputValue = (date: Date) => date.toISOString().slice(0, 10)

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

const buildDefaultDates = () => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 29)
        return { start, end }
}

const formatCurrency = (currency: string, amount: string) => {
        const numeric = Number(amount)
        if (!Number.isFinite(numeric)) return amount

        return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                maximumFractionDigits: 2
        }).format(numeric)
}

const parseAmount = (value: string) => {
        const numeric = Number(value)
        return Number.isFinite(numeric) ? numeric : 0
}

const normalizeCurrency = (value: string) => value.trim().toUpperCase()

const buildFilters = (filters: FiltersFormState) => ({
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

type SpendingTabKey = 'overview' | 'timeline' | 'refunds'

type TimelinePoint = {
        period: string
        gross: number
        net: number
        refund: number
        totalPayments: number
        refundedPayments: number
        withRefunds: number
}

const buildTimelinePoints = (timeline: SpendingTimelineEntry[]): TimelinePoint[] =>
        timeline.map(entry => ({
                period: entry.period,
                gross: parseAmount(entry.grossAmount),
                net: parseAmount(entry.netAmount),
                refund: parseAmount(entry.refundAmount),
                totalPayments: entry.paymentCount.total,
                refundedPayments: entry.paymentCount.refunded,
                withRefunds: entry.paymentCount.withRefunds
        }))

const spendingSeries = [
        { key: 'gross', label: 'Gross spend', color: '#2563eb' },
        { key: 'net', label: 'Net spend', color: '#22c55e' },
        { key: 'refund', label: 'Refunded', color: '#ef4444' }
] as const

type SpendingSeriesKey = (typeof spendingSeries)[number]['key']

const SpendingTimelineChart = ({
        currency,
        timeline
}: {
        currency: string
        timeline: SpendingTimelineEntry[]
}) => {
        const chartData = useMemo(() => buildTimelinePoints(timeline), [timeline])
        const canvasRef = useRef<HTMLCanvasElement | null>(null)
        const chartInstanceRef = useRef<any>(null)
        const [chartReady, setChartReady] = useState(() => typeof window !== 'undefined' && Boolean(window.Chart))
        const [chartError, setChartError] = useState<string | null>(null)

        const chartConfig = useMemo(() => {
                const labels = chartData.map(entry => entry.period)
                const formatter = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        maximumFractionDigits: 2
                })

                const datasets = spendingSeries.map(series => ({
                        label: series.label,
                        data: chartData.map(point => point[series.key as SpendingSeriesKey]),
                        borderColor: series.color,
                        backgroundColor: withAlpha(series.color, series.key === 'net' ? 0.18 : 0.1),
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: series.color,
                        fill: series.key === 'net',
                        borderWidth: 2,
                        tension: 0.35,
                        pointRadius: 3
                }))

                return {
                        type: 'line',
                        data: { labels, datasets },
                        options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                        legend: { position: 'bottom' },
                                        tooltip: {
                                                callbacks: {
                                                        label: (context: any) => {
                                                                const value = context.parsed.y
                                                                return `${context.dataset.label}: ${formatter.format(value)}`
                                                        },
                                                        afterBody: (items: any[]) => {
                                                                if (!items || items.length === 0) return ''
                                                                const index = items[0].dataIndex
                                                                const point = chartData[index]
                                                                return [
                                                                        `Payments: ${point.totalPayments.toLocaleString('en-US')}`,
                                                                        `Refunded: ${point.refundedPayments.toLocaleString('en-US')}`,
                                                                        `With refunds: ${point.withRefunds.toLocaleString('en-US')}`
                                                                ]
                                                        }
                                                }
                                        }
                                },
                                scales: {
                                        y: {
                                                ticks: {
                                                        callback: (value: number | string) => formatter.format(Number(value))
                                                }
                                        }
                                }
                        }
                }
        }, [chartData, currency])

        useEffect(() => {
                let mounted = true

                const setup = async () => {
                        try {
                                await loadChartJs()
                                if (!mounted) return
                                setChartReady(true)
                        } catch (error) {
                                if (!mounted) return
                                setChartError((error as Error).message)
                        }
                }

                if (!chartReady && !chartError) {
                        void setup()
                }

                return () => {
                        mounted = false
                }
        }, [chartReady, chartError])

        useEffect(() => {
                if (!chartReady || !canvasRef.current) {
                        return
                }

                const ctx = canvasRef.current.getContext('2d')
                if (!ctx) {
                        return
                }

                if (chartInstanceRef.current) {
                        chartInstanceRef.current.destroy()
                        chartInstanceRef.current = null
                }

                chartInstanceRef.current = new window.Chart(ctx, chartConfig)

                return () => {
                        if (chartInstanceRef.current) {
                                chartInstanceRef.current.destroy()
                                chartInstanceRef.current = null
                        }
                }
        }, [chartConfig, chartReady])

        if (chartError) {
                return (
                        <div className='flex items-center gap-2 rounded-2xl border border-error/40 bg-error/10 p-3 text-sm text-error'>
                                <AlertCircle className='size-4' />
                                <span>{chartError}</span>
                        </div>
                )
        }

        if (!chartReady) {
                return (
                        <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                <Loader2 className='size-5 animate-spin text-primary' />
                                <span>Preparing chart…</span>
                        </div>
                )
        }

        if (chartData.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No timeline entries available for {currency}.
                        </div>
                )
        }

        return (
                <div className='relative h-80 w-full'>
                        <canvas ref={canvasRef} className='h-full w-full' />
                </div>
        )
}

const EmptyState = () => (
        <div className='flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center text-base-content/70'>
                <CreditCard className='size-10 text-base-content/40' />
                <div>
                        <h3 className='text-lg font-semibold text-base-content'>No spending insights yet</h3>
                        <p className='mt-1 text-sm text-base-content/60'>Start funding milestones or purchasing services to see spending analytics populate here.</p>
                </div>
        </div>
)

const SpendingOverviewCards = ({
        entries,
        activeCurrency,
        onSelectCurrency
}: {
        entries: SpendingSummaryEntry[]
        activeCurrency: string | null
        onSelectCurrency: (currency: string) => void
}) => (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {entries.map(entry => {
                        const isActive = activeCurrency === entry.currency
                        return (
                                <button
                                        key={entry.currency}
                                        type='button'
                                        onClick={() => onSelectCurrency(entry.currency)}
                                        className={`group flex flex-col rounded-3xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                                isActive
                                                        ? 'border-primary/70 bg-primary/5 shadow-[0_12px_40px_rgba(79,70,229,0.12)]'
                                                        : 'border-base-200 bg-base-100 hover:border-primary/40 hover:bg-primary/5'
                                        }`}
                                >
                                        <div className='flex items-center justify-between text-xs uppercase tracking-[0.2em] text-base-content/60'>
                                                <span>{entry.currency}</span>
                                                <span>{entry.paymentCount.total.toLocaleString('en-US')} payments</span>
                                        </div>
                                        <div className='mt-3 space-y-2 text-sm text-base-content/70'>
                                                <div className='flex items-center justify-between'>
                                                        <span>Gross</span>
                                                        <span className='font-semibold text-base-content'>
                                                                {formatCurrency(entry.currency, entry.grossAmount)}
                                                        </span>
                                                </div>
                                                <div className='flex items-center justify-between'>
                                                        <span>Net</span>
                                                        <span className='font-semibold text-success'>
                                                                {formatCurrency(entry.currency, entry.netAmount)}
                                                        </span>
                                                </div>
                                                <div className='flex items-center justify-between'>
                                                        <span>Refunded</span>
                                                        <span className='font-semibold text-error'>
                                                                {formatCurrency(entry.currency, entry.refundAmount)}
                                                        </span>
                                                </div>
                                        </div>
                                        <div className='mt-4 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-wide text-base-content/60'>
                                                <div>
                                                        <p className='font-semibold text-base-content'>
                                                                {entry.paymentCount.succeeded.toLocaleString('en-US')}
                                                        </p>
                                                        <p>Succeeded</p>
                                                </div>
                                                <div>
                                                        <p className='font-semibold text-warning'>
                                                                {entry.paymentCount.refunded.toLocaleString('en-US')}
                                                        </p>
                                                        <p>Refunded</p>
                                                </div>
                                                <div>
                                                        <p className='font-semibold text-info'>
                                                                {entry.paymentCount.withRefunds.toLocaleString('en-US')}
                                                        </p>
                                                        <p>With refunds</p>
                                                </div>
                                        </div>
                                </button>
                        )
                })}
        </div>
)

const RefundsTable = ({ currency, timeline }: { currency: string; timeline: SpendingTimelineEntry[] }) => {
        if (timeline.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No refund events recorded for {currency}.
                        </div>
                )
        }

        return (
                <div className='overflow-x-auto rounded-3xl border border-base-200'>
                        <table className='table table-zebra w-full text-sm'>
                                <thead className='bg-base-200/60 text-xs uppercase tracking-wide text-base-content/60'>
                                        <tr>
                                                <th className='whitespace-nowrap px-4 py-3 text-left'>Period</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Gross</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Refunded</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Net</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Refund rate</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Refunded payments</th>
                                                <th className='whitespace-nowrap px-4 py-3 text-right'>Payments with refunds</th>
                                        </tr>
                                </thead>
                                <tbody>
                                        {timeline.map(entry => {
                                                const gross = parseAmount(entry.grossAmount)
                                                const refund = parseAmount(entry.refundAmount)
                                                const refundRate = gross > 0 ? refund / gross : 0
                                                return (
                                                        <tr key={`${currency}-${entry.period}`}>
                                                                <td className='whitespace-nowrap px-4 py-3 font-medium text-base-content'>
                                                                        {entry.period}
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right font-medium text-base-content'>
                                                                        {formatCurrency(currency, entry.grossAmount)}
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right font-medium text-error'>
                                                                        {formatCurrency(currency, entry.refundAmount)}
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right font-medium text-success'>
                                                                        {formatCurrency(currency, entry.netAmount)}
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right text-base-content/70'>
                                                                        {(refundRate * 100).toFixed(1)}%
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right text-base-content/80'>
                                                                        {entry.paymentCount.refunded.toLocaleString('en-US')}
                                                                </td>
                                                                <td className='whitespace-nowrap px-4 py-3 text-right text-base-content/80'>
                                                                        {entry.paymentCount.withRefunds.toLocaleString('en-US')}
                                                                </td>
                                                        </tr>
                                                )
                                        })}
                                </tbody>
                        </table>
                </div>
        )
}

export default function ClientSpendingStatisticsPage() {
        const { start, end } = useMemo(() => buildDefaultDates(), [])
        const [formState, setFormState] = useState<FiltersFormState>({
                from: formatDateInputValue(start),
                to: formatDateInputValue(end),
                granularity: 'day',
                currency: ''
        })
        const [filters, setFilters] = useState(() => buildFilters({
                from: formatDateInputValue(start),
                to: formatDateInputValue(end),
                granularity: 'day',
                currency: ''
        }))
        const [dateError, setDateError] = useState<string | null>(null)
        const [activeTab, setActiveTab] = useState<SpendingTabKey>('overview')
        const [activeCurrency, setActiveCurrency] = useState<string | null>(null)

        const queryKey = useMemo(() => ['client-spending-statistics', filters], [filters])

        const { data, isLoading, isFetching, error } = useQuery<ClientSpendingStatistics>({
                queryKey,
                queryFn: () => getClientSpendingStatistics(filters)
        })

        const summary = data?.summary ?? []
        const timelineByCurrency = data?.timelineByCurrency ?? {}

        const currencies = useMemo(() => {
                if (summary.length > 0) {
                        return summary.map(entry => entry.currency)
                }
                return Object.keys(timelineByCurrency)
        }, [summary, timelineByCurrency])

        useEffect(() => {
                if (currencies.length === 0) {
                        setActiveCurrency(null)
                        return
                }

                setActiveCurrency(prev => {
                        if (prev && currencies.includes(prev)) {
                                return prev
                        }
                        return currencies[0]
                })
        }, [currencies])

        const activeTimeline = activeCurrency ? timelineByCurrency[activeCurrency] ?? [] : []
        const activeSummary = summary.find(entry => entry.currency === activeCurrency)

        const aggregatedTimeline = useMemo(
                () =>
                        activeTimeline.reduce(
                                (acc, entry) => {
                                        acc.gross += parseAmount(entry.grossAmount)
                                        acc.net += parseAmount(entry.netAmount)
                                        acc.refund += parseAmount(entry.refundAmount)
                                        acc.totalPayments += entry.paymentCount.total
                                        acc.refunded += entry.paymentCount.refunded
                                        acc.withRefunds += entry.paymentCount.withRefunds
                                        return acc
                                },
                                {
                                        gross: 0,
                                        net: 0,
                                        refund: 0,
                                        totalPayments: 0,
                                        refunded: 0,
                                        withRefunds: 0
                                }
                        ),
                [activeTimeline]
        )

        const hasData = summary.length > 0 || Object.values(timelineByCurrency).some(entries => entries.length > 0)
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

                setFilters(buildFilters(formState))
        }

        return (
                <div className='relative left-1/2 w-screen max-w-[1440px] -translate-x-1/2 px-4 py-8 sm:px-6 lg:px-10'>
                        <div className='flex flex-col gap-2'>
                                <h1 className='text-3xl font-semibold text-base-content'>Spending analytics</h1>
                                <p className='text-base text-base-content/70'>Monitor project expenses, refunds, and run rates across currencies.</p>
                        </div>

                        <form onSubmit={applyFilters} className='mt-8 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-4'>
                                        <div className='flex items-center gap-3 text-base-content'>
                                                <Calendar className='size-5 text-primary' />
                                                <div>
                                                        <h2 className='text-lg font-semibold'>Filters</h2>
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Adjust the time range and grouping for your spending.</p>
                                                </div>
                                        </div>
                                        <button type='submit' className='btn btn-primary btn-sm gap-2'>
                                                <RefreshCcw className='size-4' /> Update view
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
                                                        onChange={event => handleInputChange('granularity', event.target.value as Granularity)}
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

                                {data ? (
                                        <p className='mt-4 text-xs uppercase tracking-wide text-base-content/50'>
                                                Showing data from {toDisplayDate(data.filters.from)} to {toDisplayDate(data.filters.to)} ·{' '}
                                                {data.filters.granularity.toUpperCase()} grouping{' '}
                                                {data.filters.currency ? `· ${data.filters.currency}` : ''}
                                        </p>
                                ) : null}
                        </form>

                        {errorMessage ? (
                                <div className='mt-6 flex items-start gap-3 rounded-3xl border border-error/30 bg-error/10 p-6 text-sm text-error'>
                                        <AlertCircle className='mt-0.5 size-5' />
                                        <div>
                                                <p className='font-semibold'>Unable to load spending statistics</p>
                                                <p>{errorMessage}</p>
                                        </div>
                                </div>
                        ) : null}

                        {isLoading ? (
                                <div className='mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center'>
                                        <Loader2 className='size-8 animate-spin text-primary' />
                                        <p className='text-sm text-base-content/70'>Fetching your spending analytics…</p>
                                </div>
                        ) : null}

                        {!isLoading && !hasData ? <EmptyState /> : null}

                        {hasData ? (
                                <section className='mt-10 space-y-6'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                                {[
                                                        {
                                                                key: 'overview' as const,
                                                                label: 'Overview',
                                                                description: 'Currency summary',
                                                                icon: <CreditCard className='size-4' />
                                                        },
                                                        {
                                                                key: 'timeline' as const,
                                                                label: 'Timeline',
                                                                description: 'Spend trends',
                                                                icon: <ChartLine className='size-4' />
                                                        },
                                                        {
                                                                key: 'refunds' as const,
                                                                label: 'Refunds',
                                                                description: 'Refund performance',
                                                                icon: <PiggyBank className='size-4' />
                                                        }
                                                ].map(tab => {
                                                        const isActive = activeTab === tab.key
                                                        return (
                                                                <button
                                                                        key={tab.key}
                                                                        type='button'
                                                                        onClick={() => setActiveTab(tab.key)}
                                                                        className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                                                                                isActive
                                                                                        ? 'border-primary/60 bg-primary/10 text-primary shadow-[0_12px_40px_rgba(79,70,229,0.12)]'
                                                                                        : 'border-base-200 bg-base-100 text-base-content/70 hover:border-primary/40 hover:text-primary'
                                                                        }`}
                                                                >
                                                                        <span className='text-base-content'>{tab.icon}</span>
                                                                        <span className='font-semibold'>{tab.label}</span>
                                                                        <span className='text-xs uppercase tracking-wide text-base-content/50'>
                                                                                {tab.description}
                                                                        </span>
                                                                </button>
                                                        )
                                                })}
                                        </div>

                                        <div className='space-y-6'>
                                                {activeTab === 'overview' ? (
                                                        <div className='space-y-6'>
                                                                <div className='flex items-center justify-between gap-3'>
                                                                        <div>
                                                                                <h2 className='text-xl font-semibold text-base-content'>Currency breakdown</h2>
                                                                                <p className='text-sm text-base-content/70'>Tap a currency to analyse its timeline and refund performance.</p>
                                                                        </div>
                                                                        <span className='badge badge-outline badge-sm'>
                                                                                {summary.length} {summary.length === 1 ? 'currency' : 'currencies'}
                                                                        </span>
                                                                </div>
                                                                <SpendingOverviewCards
                                                                        entries={summary}
                                                                        activeCurrency={activeCurrency}
                                                                        onSelectCurrency={currency => setActiveCurrency(currency)}
                                                                />
                                                        </div>
                                                ) : null}

                                                {activeTab === 'timeline' ? (
                                                        <div className='space-y-6'>
                                                                <div className='flex flex-wrap items-center justify-between gap-3'>
                                                                        <div className='flex items-center gap-3'>
                                                                                <ChartLine className='size-5 text-primary' />
                                                                                <div>
                                                                                        <h2 className='text-xl font-semibold text-base-content'>Spend timeline</h2>
                                                                                        <p className='text-sm text-base-content/70'>Track how your gross, net, and refunded amounts evolve.</p>
                                                                                </div>
                                                                        </div>
                                                                        {currencies.length > 1 ? (
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        {currencies.map(currency => (
                                                                                                <button
                                                                                                        key={currency}
                                                                                                        type='button'
                                                                                                        onClick={() => setActiveCurrency(currency)}
                                                                                                        className={`btn btn-sm ${
                                                                                                                activeCurrency === currency
                                                                                                                        ? 'btn-primary'
                                                                                                                        : 'btn-ghost text-base-content'
                                                                                                        }`}
                                                                                                >
                                                                                                        {currency}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        ) : null}
                                                                </div>

                                                                {activeCurrency ? (
                                                                        <div className='space-y-4'>
                                                                                {activeSummary ? (
                                                                                        <div className='grid gap-4 sm:grid-cols-3'>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Gross</p>
                                                                                                        <p className='mt-1 text-xl font-semibold text-base-content'>
                                                                                                                {formatCurrency(activeSummary.currency, activeSummary.grossAmount)}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Net</p>
                                                                                                        <p className='mt-1 text-xl font-semibold text-success'>
                                                                                                                {formatCurrency(activeSummary.currency, activeSummary.netAmount)}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Refunded</p>
                                                                                                        <p className='mt-1 text-xl font-semibold text-error'>
                                                                                                                {formatCurrency(activeSummary.currency, activeSummary.refundAmount)}
                                                                                                        </p>
                                                                                                </div>
                                                                                        </div>
                                                                                ) : null}

                                                                                <SpendingTimelineChart currency={activeCurrency} timeline={activeTimeline} />

                                                                                {activeTimeline.length > 0 ? (
                                                                                        <div className='grid gap-4 md:grid-cols-3'>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Total payments</p>
                                                                                                        <p className='mt-1 text-2xl font-semibold text-base-content'>
                                                                                                                {aggregatedTimeline.totalPayments.toLocaleString('en-US')}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Refunded payments</p>
                                                                                                        <p className='mt-1 text-2xl font-semibold text-error'>
                                                                                                                {aggregatedTimeline.refunded.toLocaleString('en-US')}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm'>
                                                                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>With refunds</p>
                                                                                                        <p className='mt-1 text-2xl font-semibold text-info'>
                                                                                                                {aggregatedTimeline.withRefunds.toLocaleString('en-US')}
                                                                                                        </p>
                                                                                                </div>
                                                                                        </div>
                                                                                ) : (
                                                                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                                                                                No timeline entries for {activeCurrency}.
                                                                                        </div>
                                                                                )}
                                                                        </div>
                                                                ) : (
                                                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                                                                Select a currency to see its spending timeline.
                                                                        </div>
                                                                )}
                                                        </div>
                                                ) : null}

                                                {activeTab === 'refunds' ? (
                                                        <div className='space-y-6'>
                                                                <div className='flex items-center justify-between gap-3'>
                                                                        <div>
                                                                                <h2 className='text-xl font-semibold text-base-content'>Refund performance</h2>
                                                                                <p className='text-sm text-base-content/70'>Analyse refund rates and payment impacts for each period.</p>
                                                                        </div>
                                                                        {currencies.length > 1 ? (
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        {currencies.map(currency => (
                                                                                                <button
                                                                                                        key={currency}
                                                                                                        type='button'
                                                                                                        onClick={() => setActiveCurrency(currency)}
                                                                                                        className={`btn btn-sm ${
                                                                                                                activeCurrency === currency
                                                                                                                        ? 'btn-primary'
                                                                                                                        : 'btn-ghost text-base-content'
                                                                                                        }`}
                                                                                                >
                                                                                                        {currency}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        ) : null}
                                                                </div>

                                                                {activeCurrency ? (
                                                                        <RefundsTable currency={activeCurrency} timeline={activeTimeline} />
                                                                ) : (
                                                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                                                                Select a currency to view refund analytics.
                                                                        </div>
                                                                )}
                                                        </div>
                                                ) : null}
                                        </div>

                                        {isFetching && !isLoading ? (
                                                <div className='flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/60'>
                                                        <Loader2 className='size-4 animate-spin text-primary' /> Refreshing data…
                                                </div>
                                        ) : null}
                                </section>
                        ) : null}
                </div>
        )
}
