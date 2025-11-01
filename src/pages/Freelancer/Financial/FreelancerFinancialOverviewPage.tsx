import { useEffect, useMemo, useRef, useState } from 'react'
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
import type {
        ClientSpendingStatistics,
        EarningsSummaryEntry,
        EarningsTimelineEntry,
        Granularity,
        SpendingTimelineEntry
} from '~/types/financial'
import { loadChartJs, withAlpha } from '~/utils/chartjs'

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

type TimelineAmountKey =
        | 'pendingAmount'
        | 'availableAmount'
        | 'failedAmount'
        | 'reversedAmount'
        | 'totalAmount'

const timelineSeries: Array<{
        key: TimelineAmountKey
        label: string
        color: string
}> = [
        { key: 'pendingAmount', label: 'Pending', color: '#f59e0b' },
        { key: 'availableAmount', label: 'Available', color: '#22c55e' },
        { key: 'failedAmount', label: 'Failed', color: '#ef4444' },
        { key: 'reversedAmount', label: 'Reversed', color: '#2563eb' },
        { key: 'totalAmount', label: 'Total', color: '#a855f7' }
]

type TimelineChartPoint = {
        period: string
        transferCount: number
} & Record<TimelineAmountKey, number>

const parseAmountToNumber = (amount: string) => {
        const numeric = Number(amount)
        return Number.isFinite(numeric) ? numeric : 0
}

const buildTimelinePoints = (timeline: EarningsTimelineEntry[]): TimelineChartPoint[] => {
        return timeline.map(entry => ({
                period: entry.period,
                transferCount: entry.transferCount.total,
                pendingAmount: parseAmountToNumber(entry.pendingAmount),
                availableAmount: parseAmountToNumber(entry.availableAmount),
                failedAmount: parseAmountToNumber(entry.failedAmount),
                reversedAmount: parseAmountToNumber(entry.reversedAmount),
                totalAmount: parseAmountToNumber(entry.totalAmount)
        }))
}

type SpendingTimelinePoint = {
        period: string
        gross: number
        refund: number
        net: number
        totalPayments: number
        refundedPayments: number
        withRefunds: number
}

const buildSpendingTimelinePoints = (timeline: SpendingTimelineEntry[]): SpendingTimelinePoint[] =>
        timeline.map(entry => ({
                period: entry.period,
                gross: parseAmountToNumber(entry.grossAmount),
                refund: parseAmountToNumber(entry.refundAmount),
                net: parseAmountToNumber(entry.netAmount),
                totalPayments: entry.paymentCount.total,
                refundedPayments: entry.paymentCount.refunded,
                withRefunds: entry.paymentCount.withRefunds
        }))

const TimelineChart = ({ currency, timeline }: { currency: string; timeline: EarningsTimelineEntry[] }) => {
        const chartData = useMemo(() => buildTimelinePoints(timeline), [timeline])

        const canvasRef = useRef<HTMLCanvasElement | null>(null)
        const chartInstanceRef = useRef<any>(null)
        const [chartReady, setChartReady] = useState(() => typeof window !== 'undefined' && Boolean(window.Chart))
        const [chartError, setChartError] = useState<string | null>(null)

        const chartConfig = useMemo(() => {
                const labels = chartData.map(point => point.period)
                const formatter = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        maximumFractionDigits: 2
                })

                const datasets = timelineSeries.map(series => ({
                        label: series.label,
                        data: chartData.map(point => point[series.key]),
                        borderColor: series.color,
                        backgroundColor: withAlpha(series.color, series.key === 'totalAmount' ? 0.2 : 0.12),
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: series.color,
                        pointHoverBackgroundColor: series.color,
                        pointHoverBorderColor: '#ffffff',
                        borderWidth: series.key === 'totalAmount' ? 2.4 : 1.6,
                        tension: 0.35,
                        fill: series.key === 'totalAmount' ? 'origin' : false,
                        order: series.key === 'totalAmount' ? 0 : 1,
                        spanGaps: true
                }))

                return {
                        type: 'line',
                        data: {
                                labels,
                                datasets
                        },
                        options: {
                                maintainAspectRatio: false,
                                responsive: true,
                                interaction: {
                                        mode: 'index',
                                        intersect: false
                                },
                                animation: {
                                        duration: 350
                                },
                                scales: {
                                        x: {
                                                grid: {
                                                        display: false
                                                },
                                                ticks: {
                                                        color: '#6b7280',
                                                        maxRotation: 0,
                                                        minRotation: 0,
                                                        autoSkip: true,
                                                        font: {
                                                                size: 11
                                                        }
                                                }
                                        },
                                        y: {
                                                beginAtZero: true,
                                                grid: {
                                                        color: 'rgba(148, 163, 184, 0.18)'
                                                },
                                                ticks: {
                                                        color: '#6b7280',
                                                        callback: (value: unknown) => {
                                                                const numeric = typeof value === 'number' ? value : Number(value)
                                                                if (!Number.isFinite(numeric)) {
                                                                        return value
                                                                }
                                                                return formatter.format(numeric)
                                                        }
                                                }
                                        }
                                },
                                plugins: {
                                        legend: {
                                                position: 'bottom',
                                                labels: {
                                                        usePointStyle: true,
                                                        pointStyle: 'circle',
                                                        boxWidth: 8,
                                                        padding: 16
                                                }
                                        },
                                        tooltip: {
                                                callbacks: {
                                                        label: (context: any) => {
                                                                const value = context?.parsed?.y ?? 0
                                                                const label = context?.dataset?.label ?? ''
                                                                return `${label}: ${formatter.format(value)}`
                                                        },
                                                        afterBody: (items: any[]) => {
                                                                if (!items?.length) return ''
                                                                const dataIndex = items[0]?.dataIndex ?? 0
                                                                const transfers = chartData[dataIndex]?.transferCount ?? 0
                                                                return `Transfers: ${formatCount(transfers)}`
                                                        }
                                                }
                                        }
                                }
                        }
                }
        }, [chartData, currency])

        useEffect(() => {
                if (chartData.length === 0) {
                        chartInstanceRef.current?.destroy?.()
                        chartInstanceRef.current = null
                        setChartReady(false)
                        setChartError(null)
                        return
                }

                let isMounted = true

                loadChartJs()
                        .then(() => {
                                if (!isMounted) return
                                const context = canvasRef.current?.getContext('2d')
                                if (!context) {
                                        setChartError('Unable to initialise the chart context.')
                                        return
                                }

                                const ChartConstructor = window.Chart
                                if (!ChartConstructor) {
                                        setChartError('Chart.js failed to initialise.')
                                        return
                                }

                                if (!chartInstanceRef.current) {
                                        chartInstanceRef.current = new ChartConstructor(context, chartConfig)
                                } else {
                                        chartInstanceRef.current.data = chartConfig.data
                                        chartInstanceRef.current.options = chartConfig.options
                                        chartInstanceRef.current.update()
                                }

                                if (isMounted) {
                                        setChartReady(true)
                                        setChartError(null)
                                }
                        })
                        .catch(error => {
                                if (!isMounted) return
                                setChartError(error instanceof Error ? error.message : 'Failed to load chart library.')
                        })

                return () => {
                        isMounted = false
                }
        }, [chartConfig, chartData.length])

        const aggregated = useMemo(
                () =>
                        chartData.reduce(
                                (acc, point) => {
                                        for (const series of timelineSeries) {
                                                acc.amounts[series.key] += point[series.key]
                                        }
                                        acc.transfers += point.transferCount
                                        return acc
                                },
                                {
                                        amounts: {
                                                pendingAmount: 0,
                                                availableAmount: 0,
                                                failedAmount: 0,
                                                reversedAmount: 0,
                                                totalAmount: 0
                                        } as Record<TimelineAmountKey, number>,
                                        transfers: 0
                                }
                        ),
                [chartData]
        )

        useEffect(() => {
                return () => {
                        chartInstanceRef.current?.destroy?.()
                        chartInstanceRef.current = null
                }
        }, [])

        if (chartData.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No timeline data available for {currency} in this range.
                        </div>
                )
        }

        return (
                <div className='flex flex-col gap-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                                <div className='flex items-center gap-3'>
                                        <TrendingUp className='size-5 text-primary' />
                                        <div>
                                                <h3 className='text-lg font-semibold text-base-content'>{currency} timeline</h3>
                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                        Visualising transfers across {chartData.length}{' '}
                                                        {chartData.length === 1 ? 'period' : 'periods'}
                                                </p>
                                        </div>
                                </div>
                                <span className='badge badge-outline badge-sm'>
                                        {chartData.length} {chartData.length === 1 ? 'period' : 'periods'}
                                </span>
                        </div>

                        <div className='space-y-4'>
                                <div className='relative h-72 w-full'>
                                        <canvas ref={canvasRef} className='h-full w-full' />
                                        {!chartReady && !chartError ? (
                                                <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-base-100/80 text-sm text-base-content/70 backdrop-blur-sm'>
                                                        <Loader2 className='size-4 animate-spin text-primary' /> Loading chart…
                                                </div>
                                        ) : null}
                                </div>

                                {chartError ? (
                                        <div className='rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error'>
                                                {chartError}
                                        </div>
                                ) : null}

                                <div className='grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
                                        {timelineSeries.map(series => (
                                                <div
                                                        key={series.key}
                                                        className='flex items-center justify-between gap-3 rounded-2xl bg-base-200/60 px-3 py-2 text-xs'
                                                >
                                                        <div className='flex items-center gap-2 text-base-content'>
                                                                <span
                                                                        className='inline-block size-2 rounded-full'
                                                                        style={{ backgroundColor: series.color }}
                                                                />
                                                                <span className='font-medium'>{series.label}</span>
                                                        </div>
                                                        <span className='font-semibold text-base-content'>
                                                                {formatCurrency(currency, aggregated.amounts[series.key].toString())}
                                                        </span>
                                                </div>
                                        ))}
                                </div>

                                <div className='flex items-center gap-2 rounded-2xl bg-base-200/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-base-content/70'>
                                        <ArrowRightLeft className='size-4 text-primary' />
                                        {formatCount(aggregated.transfers)} total transfers represented in this chart
                                </div>
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

const spendingSeries = [
        { key: 'gross', label: 'Gross spend', color: '#2563eb' },
        { key: 'net', label: 'Net spend', color: '#22c55e' },
        { key: 'refund', label: 'Refunded', color: '#ef4444' }
] as const

const SpendingTimelineChart = ({
        currency,
        timeline
}: {
        currency: string
        timeline: SpendingTimelineEntry[]
}) => {
        const chartData = useMemo(() => buildSpendingTimelinePoints(timeline), [timeline])
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
                        data: chartData.map(point => point[series.key]),
                        borderColor: series.color,
                        backgroundColor: withAlpha(series.color, series.key === 'net' ? 0.18 : 0.12),
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: series.color,
                        fill: series.key === 'net',
                        tension: 0.34,
                        borderWidth: 2,
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
                                                        callback: (value: number | string) =>
                                                                formatter.format(Number(value))
                                                }
                                        }
                                }
                        }
                }
        }, [chartData, currency])

        useEffect(() => {
                let mounted = true

                const setupChart = async () => {
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
                        void setupChart()
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
                                <span>Loading spending chart…</span>
                        </div>
                )
        }

        if (chartData.length === 0) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No spending data available for {currency} in this range.
                        </div>
                )
        }

        return (
                <div className='relative h-80 w-full'>
                        <canvas ref={canvasRef} className='h-full w-full' />
                </div>
        )
}

const SpendingSection = ({ spending }: { spending: ClientSpendingStatistics | null | undefined }) => {
        const hasSummary = Boolean(spending && Array.isArray(spending.summary) && spending.summary.length > 0)
        const currencies = useMemo(() => {
                if (hasSummary && spending) {
                        return spending.summary.map(entry => entry.currency)
                }
                return Object.keys(spending?.timelineByCurrency ?? {})
        }, [hasSummary, spending])

        const [activeCurrency, setActiveCurrency] = useState(() => currencies[0] ?? '')

        useEffect(() => {
                if (currencies.length === 0) {
                        setActiveCurrency('')
                        return
                }

                setActiveCurrency(prev => {
                        if (prev && currencies.includes(prev)) {
                                return prev
                        }
                        return currencies[0]
                })
        }, [currencies])

        const activeSummary = useMemo(() => {
                if (!spending || !activeCurrency) {
                        return undefined
                }
                return spending.summary.find(entry => entry.currency === activeCurrency)
        }, [spending, activeCurrency])

        const activeTimeline = useMemo(() => {
                if (!spending || !activeCurrency) {
                        return [] as SpendingTimelineEntry[]
                }
                return spending.timelineByCurrency?.[activeCurrency] ?? []
        }, [spending, activeCurrency])

        const aggregatedTimeline = useMemo(
                () =>
                        activeTimeline.reduce(
                                (acc, entry) => {
                                        acc.gross += parseAmountToNumber(entry.grossAmount)
                                        acc.net += parseAmountToNumber(entry.netAmount)
                                        acc.refund += parseAmountToNumber(entry.refundAmount)
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

        if (!spending || (!hasSummary && currencies.length === 0)) {
                return (
                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/70'>
                                No spending activity recorded in the selected window.
                        </div>
                )
        }

        return (
                <div className='flex flex-col gap-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                        {hasSummary ? (
                                <div className='space-y-4'>
                                        <div className='flex items-center justify-between gap-3'>
                                                <div>
                                                        <h3 className='text-lg font-semibold text-base-content'>Spending summary</h3>
                                                        <p className='text-xs uppercase tracking-wide text-base-content/60'>Gross vs net spending by currency</p>
                                                </div>
                                                <span className='badge badge-outline badge-sm'>
                                                        {spending.summary.length} {spending.summary.length === 1 ? 'currency' : 'currencies'}
                                                </span>
                                        </div>

                                        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                                                {spending.summary.map(entry => {
                                                        const isActive = entry.currency === activeCurrency
                                                        return (
                                                                <button
                                                                        key={entry.currency}
                                                                        type='button'
                                                                        onClick={() => setActiveCurrency(entry.currency)}
                                                                        className={`group flex flex-col rounded-3xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                                                                isActive
                                                                                        ? 'border-primary/70 bg-primary/5 shadow-[0_12px_40px_rgba(79,70,229,0.1)]'
                                                                                        : 'border-base-200 bg-base-100 hover:border-primary/40 hover:bg-primary/5'
                                                                        }`}
                                                                >
                                                                        <div className='flex items-center justify-between gap-3'>
                                                                                <span className='text-sm font-semibold uppercase tracking-[0.2em] text-base-content/60'>
                                                                                        {entry.currency}
                                                                                </span>
                                                                                <span className='text-xs font-medium text-base-content/60'>
                                                                                        {entry.paymentCount.total.toLocaleString('en-US')} payments
                                                                                </span>
                                                                        </div>
                                                                        <div className='mt-3 flex flex-col gap-2'>
                                                                                <div className='flex items-center justify-between text-sm text-base-content/70'>
                                                                                        <span>Gross</span>
                                                                                        <span className='font-semibold text-base-content'>
                                                                                                {formatCurrency(entry.currency, entry.grossAmount)}
                                                                                        </span>
                                                                                </div>
                                                                                <div className='flex items-center justify-between text-sm text-base-content/70'>
                                                                                        <span>Net</span>
                                                                                        <span className='font-semibold text-success'>
                                                                                                {formatCurrency(entry.currency, entry.netAmount)}
                                                                                        </span>
                                                                                </div>
                                                                                <div className='flex items-center justify-between text-sm text-base-content/70'>
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
                                </div>
                        ) : null}

                        {activeCurrency ? (
                                <div className='space-y-4'>
                                        <div className='flex flex-wrap items-center justify-between gap-3'>
                                                <div className='flex items-center gap-3'>
                                                        <PiggyBank className='size-5 text-primary' />
                                                        <div>
                                                                <h3 className='text-lg font-semibold text-base-content'>{activeCurrency} timeline</h3>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                        Visualising spend across {activeTimeline.length}{' '}
                                                                        {activeTimeline.length === 1 ? 'period' : 'periods'}
                                                                </p>
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

                                        {activeSummary ? (
                                                <div className='grid gap-3 rounded-3xl bg-base-200/60 p-5 text-sm sm:grid-cols-3'>
                                                        <div className='space-y-1'>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>Gross</p>
                                                                <p className='text-base font-semibold text-base-content'>
                                                                        {formatCurrency(activeSummary.currency, activeSummary.grossAmount)}
                                                                </p>
                                                        </div>
                                                        <div className='space-y-1'>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>Net</p>
                                                                <p className='text-base font-semibold text-success'>
                                                                        {formatCurrency(activeSummary.currency, activeSummary.netAmount)}
                                                                </p>
                                                        </div>
                                                        <div className='space-y-1'>
                                                                <p className='text-xs uppercase tracking-wide text-base-content/60'>Refunded</p>
                                                                <p className='text-base font-semibold text-error'>
                                                                        {formatCurrency(activeSummary.currency, activeSummary.refundAmount)}
                                                                </p>
                                                        </div>
                                                </div>
                                        ) : null}

                                        <SpendingTimelineChart currency={activeCurrency} timeline={activeTimeline} />

                                        {activeTimeline.length > 0 ? (
                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 text-sm text-base-content/70'>
                                                        <div className='flex flex-wrap items-center gap-4'>
                                                                <span className='font-semibold text-base-content'>
                                                                        {aggregatedTimeline.totalPayments.toLocaleString('en-US')} payments
                                                                </span>
                                                                <span className='text-error'>
                                                                        {aggregatedTimeline.refunded.toLocaleString('en-US')} refunded
                                                                </span>
                                                                <span className='text-info'>
                                                                        {aggregatedTimeline.withRefunds.toLocaleString('en-US')} with refunds
                                                                </span>
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
                                        Select a currency to review its spending activity.
                                </div>
                        )}
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

type OverviewTabKey = 'summary' | 'timeline' | 'spending'

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
        const [activeSection, setActiveSection] = useState<OverviewTabKey>('summary')
        const [activeTimelineCurrency, setActiveTimelineCurrency] = useState<string | null>(null)

        const queryKey = useMemo(() => ['freelancer-financial-overview', filters], [filters])

        const { data, isLoading, isFetching, error } = useQuery({
                queryKey,
                queryFn: () => getFreelancerFinancialOverview(filters)
        })

        const overview = data ?? null
        const earningsSummary = overview?.earnings.summary ?? []
        const timelineByCurrency = overview?.earnings.timelineByCurrency ?? {}
        const timelineCurrencies = Object.keys(timelineByCurrency)
        const spendingData = overview?.spending ?? null

        const hasSummaryData = earningsSummary.length > 0
        const hasTimelineData = timelineCurrencies.length > 0
        const hasSpendingData = Boolean(
                spendingData &&
                ((Array.isArray(spendingData.summary) && spendingData.summary.length > 0) ||
                        Object.values(spendingData.timelineByCurrency ?? {}).some(entries => entries.length > 0))
        )
        const hasAnyData = hasSummaryData || hasTimelineData || hasSpendingData

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

        const tabConfigs = useMemo(
                () => [
                        {
                                key: 'summary' as const,
                                label: 'Earnings',
                                description: 'Balances & payout pipeline',
                                icon: <Wallet className='size-4' />,
                                disabled: !hasSummaryData
                        },
                        {
                                key: 'timeline' as const,
                                label: 'Timeline',
                                description: 'Transfer trends over time',
                                icon: <TrendingUp className='size-4' />,
                                disabled: !hasTimelineData
                        },
                        {
                                key: 'spending' as const,
                                label: 'Spending',
                                description: 'Outgoing payment analytics',
                                icon: <ArrowRightLeft className='size-4' />,
                                disabled: !hasSpendingData
                        }
                ],
                [hasSummaryData, hasTimelineData, hasSpendingData]
        )

        useEffect(() => {
                const activeConfig = tabConfigs.find(tab => tab.key === activeSection)
                if (activeConfig?.disabled) {
                        const fallback = tabConfigs.find(tab => !tab.disabled)
                        if (fallback && fallback.key !== activeSection) {
                                setActiveSection(fallback.key)
                        }
                }
        }, [activeSection, tabConfigs])

        useEffect(() => {
                if (!hasTimelineData) {
                        setActiveTimelineCurrency(null)
                        return
                }

                setActiveTimelineCurrency(prev => {
                        if (prev && timelineCurrencies.includes(prev)) {
                                return prev
                        }
                        return timelineCurrencies[0]
                })
        }, [hasTimelineData, timelineCurrencies])

        return (
                <div className='relative left-1/2 w-screen max-w-[1440px] -translate-x-1/2 px-4 py-8 sm:px-6 lg:px-10'>
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

                        {!isLoading && !hasAnyData ? <EmptyState /> : null}

                        {hasAnyData ? (
                                <section className='mt-10 space-y-6'>
                                        <div className='space-y-3 rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm sm:p-6'>
                                                <div className='text-xs uppercase tracking-wide text-base-content/50'>Financial insights</div>
                                                <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                                                        <div className='flex flex-wrap gap-3'>
                                                                {tabConfigs.map(tab => {
                                                                        const isActive = tab.key === activeSection
                                                                        return (
                                                                                <button
                                                                                        key={tab.key}
                                                                                        type='button'
                                                                                        className={`flex min-w-[10rem] flex-1 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/60 sm:flex-auto lg:min-w-[12rem] ${
                                                                                                isActive
                                                                                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                                                                                        : 'border-base-200 text-base-content'
                                                                                        } ${tab.disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary/30 hover:bg-primary/5'}`}
                                                                                        onClick={() => (tab.disabled ? null : setActiveSection(tab.key))}
                                                                                        disabled={tab.disabled}
                                                                                >
                                                                                        <div className={`rounded-xl p-2 ${isActive ? 'bg-primary/20 text-primary' : 'bg-base-200/60 text-base-content/70'}`}>
                                                                                                {tab.icon}
                                                                                        </div>
                                                                                        <div className='flex flex-col gap-1'>
                                                                                                <span className='text-sm font-semibold'>{tab.label}</span>
                                                                                                <span className='text-xs text-base-content/60'>{tab.description}</span>
                                                                                        </div>
                                                                                </button>
                                                                        )
                                                                })}
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='space-y-10'>
                                                {activeSection === 'summary' ? (
                                                        hasSummaryData ? (
                                                                <div className='space-y-6'>
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
                                                                </div>
                                                        ) : (
                                                                <EmptyState />
                                                        )
                                                ) : null}

                                                {activeSection === 'timeline' ? (
                                                        hasTimelineData ? (
                                                                <div className='space-y-6'>
                                                                        <SectionTitle
                                                                                title='Earnings timeline'
                                                                                description='Monitor how transfers evolve over time in each currency.'
                                                                        />
                                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                                {timelineCurrencies.map(currency => {
                                                                                        const isCurrencyActive = activeTimelineCurrency === currency
                                                                                        return (
                                                                                                <button
                                                                                                        key={currency}
                                                                                                        type='button'
                                                                                                        className={`btn btn-sm ${
                                                                                                                isCurrencyActive
                                                                                                                        ? 'btn-primary'
                                                                                                                        : 'btn-outline'
                                                                                                        }`}
                                                                                                        onClick={() => setActiveTimelineCurrency(currency)}
                                                                                                >
                                                                                                        {currency}
                                                                                                </button>
                                                                                        )
                                                                                })}
                                                                        </div>
                                                                        {activeTimelineCurrency ? (
                                                                                <TimelineChart
                                                                                        currency={activeTimelineCurrency}
                                                                                        timeline={timelineByCurrency[activeTimelineCurrency] ?? []}
                                                                                />
                                                                        ) : null}
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-6 text-sm text-base-content/70'>
                                                                        Timeline data will appear once transfers are recorded in the selected period.
                                                                </div>
                                                        )
                                                ) : null}

                                                {activeSection === 'spending' ? (
                                                        hasSpendingData ? (
                                                                <div className='space-y-6'>
                                                                        <SectionTitle
                                                                                title='Spending statistics'
                                                                                description='Understand how outgoing payments trend alongside your earnings.'
                                                                        />
                                                                        <SpendingSection spending={spendingData} />
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-6 text-sm text-base-content/70'>
                                                                        No spending activity recorded in the selected window.
                                                                </div>
                                                        )
                                                ) : null}
                                        </div>
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
