export type FreelancerPayoutStatus =
        | 'PENDING'
        | 'IN_TRANSIT'
        | 'PAID'
        | 'FAILED'
        | 'CANCELED'

export type BalanceEntry = {
        currency: string
        amount: string
}

export type PayoutSummaryEntry = {
        currency: string
        totalAmount: string
        pendingAmount: string
        inTransitAmount: string
        paidAmount: string
        failedAmount: string
        canceledAmount: string
}

export type PayoutHistoryEntry = {
        id: string
        amount: string
        currency: string
        status: FreelancerPayoutStatus
        source: string
        stripePayoutId: string | null
        stripeBalanceTransactionId: string | null
        description: string | null
        failureCode: string | null
        failureMessage: string | null
        metadata: unknown
        stripeCreatedAt: string | null
        arrivalDate: string | null
        requestedAt: string | null
        completedAt: string | null
        createdAt: string
        updatedAt: string
        transferIds: string[]
}

export type PayoutSnapshot = {
        payoutsEnabled: boolean
        stripeAccountId: string | null
        balance: {
                available: BalanceEntry[]
                pending: BalanceEntry[]
        }
        summary: PayoutSummaryEntry[]
        history: PayoutHistoryEntry[]
}
