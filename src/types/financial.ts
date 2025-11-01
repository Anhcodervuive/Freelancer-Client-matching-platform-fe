export const GRANULARITIES = ['day', 'month'] as const

export type Granularity = (typeof GRANULARITIES)[number]

const GRANULARITY_ALIASES: Record<string, Granularity> = {
        day: 'day',
        daily: 'day',
        d: 'day',
        month: 'month',
        monthly: 'month',
        m: 'month'
}

export const normalizeGranularity = (value?: string | null): Granularity => {
        if (!value) {
                return 'day'
        }

        const lowered = value.toLowerCase()
        return GRANULARITY_ALIASES[lowered] ?? 'day'
}

export type SpendingStatisticsQueryInput = {
        from?: string
        to?: string
        granularity?: Granularity
        currency?: string
}

export type TransferCountSummary = {
        total: number
        pending: number
        succeeded: number
        failed: number
        reversed: number
}

export type EarningsSummaryEntry = {
        currency: string
        escrowHoldingAmount: string
        pendingPayoutAmount: string
        availablePayoutAmount: string
        failedPayoutAmount: string
        reversedPayoutAmount: string
        transferCount: TransferCountSummary
}

export type EarningsTimelineEntry = {
        period: string
        pendingAmount: string
        availableAmount: string
        failedAmount: string
        reversedAmount: string
        totalAmount: string
        transferCount: TransferCountSummary
}

export type SpendingPaymentSummary = {
        total: number
        succeeded: number
        refunded: number
        withRefunds: number
}

export type SpendingPaymentTimeline = {
        total: number
        refunded: number
        withRefunds: number
}

export type SpendingSummaryEntry = {
        currency: string
        grossAmount: string
        refundAmount: string
        netAmount: string
        paymentCount: SpendingPaymentSummary
}

export type SpendingTimelineEntry = {
        period: string
        grossAmount: string
        refundAmount: string
        netAmount: string
        paymentCount: SpendingPaymentTimeline
}

export type ClientSpendingStatistics = {
        filters: {
                from: string
                to: string
                granularity: Granularity
                currency?: string
        }
        summary: SpendingSummaryEntry[]
        timelineByCurrency: Record<string, SpendingTimelineEntry[]>
}

export type FreelancerFinancialOverview = {
        filters: {
                from: string
                to: string
                granularity: Granularity
                currency?: string
        }
        earnings: {
                summary: EarningsSummaryEntry[]
                timelineByCurrency: Record<string, EarningsTimelineEntry[]>
        }
        spending: ClientSpendingStatistics
}
