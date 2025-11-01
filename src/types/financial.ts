export type Granularity = 'day' | 'week' | 'month'

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

export type SpendingSummaryEntry = {
        currency: string
        totalAmount?: string
        completedAmount?: string
        pendingAmount?: string
        disputedAmount?: string
        refundedAmount?: string
        transferCount?: number
        [key: string]: string | number | undefined
}

export type SpendingTimelineEntry = {
        period: string
        amount: string
        currency?: string
        [key: string]: string | number | undefined
}

export type SpendingStatisticsResult = {
        summary?: SpendingSummaryEntry[]
        totals?: SpendingSummaryEntry[]
        timeline?: SpendingTimelineEntry[]
        breakdowns?: Record<string, unknown>
        [key: string]: unknown
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
        spending: SpendingStatisticsResult
}
