import type { Contract, ContractMilestone } from '~/types/contract'
import type { Role } from '~/types/user'

export enum DisputeStatus {
        OPEN = 'OPEN',
        NEGOTIATION = 'NEGOTIATION',
        AWAITING_ARBITRATION_FEES = 'AWAITING_ARBITRATION_FEES',
        ARBITRATION = 'ARBITRATION',
        RESOLVED_RELEASE_ALL = 'RESOLVED_RELEASE_ALL',
        RESOLVED_REFUND_ALL = 'RESOLVED_REFUND_ALL',
        RESOLVED_SPLIT = 'RESOLVED_SPLIT',
        CANCELED = 'CANCELED',
        EXPIRED = 'EXPIRED'
}

export enum DisputeNegotiationStatus {
        PENDING = 'PENDING',
        ACCEPTED = 'ACCEPTED',
        REJECTED = 'REJECTED',
        WITHDRAWN = 'WITHDRAWN',
        EXPIRED = 'EXPIRED'
}

export type DecimalLike = number | string

export type DisputeParticipantProfile = {
        firstName?: string | null
        lastName?: string | null
        avatar?: string | null
        country?: string | null
        city?: string | null
        [key: string]: unknown
}

export type DisputeUserSummary = {
        id: string
        firstName?: string | null
        lastName?: string | null
        avatar?: string | null
        role?: Role | null
        profile?: DisputeParticipantProfile | null
        [key: string]: unknown
}

export type DisputeNegotiation = {
        id: string
        disputeId: string
        proposerId: string
        counterpartyId: string
        status: DisputeNegotiationStatus
        releaseAmount: DecimalLike | null
        refundAmount: DecimalLike | null
        message?: string | null
        respondedById?: string | null
        respondedAt?: string | null
        responseMessage?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        proposer?: DisputeUserSummary | null
        counterparty?: DisputeUserSummary | null
        respondedBy?: DisputeUserSummary | null
        [key: string]: unknown
}

export type Dispute = {
        id: string
        escrowId: string
        openedById: string
        status: DisputeStatus
        latestProposalId?: string | null
        proposedRelease: DecimalLike | null
        proposedRefund: DecimalLike | null
        arbFeePerParty?: DecimalLike | null
        clientArbFeePaid?: boolean
        freelancerArbFeePaid?: boolean
        responseDeadline?: string | null
        arbitrationDeadline?: string | null
        decidedRelease?: DecimalLike | null
        decidedRefund?: DecimalLike | null
        decidedById?: string | null
        note?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        openedBy?: DisputeUserSummary | null
        latestProposal?: DisputeNegotiation | null
        negotiations?: DisputeNegotiation[] | null
        [key: string]: unknown
}

export type OpenDisputeInput = {
        proposedRelease: number
        proposedRefund: number
        note?: string
        message?: string
}

export type CreateDisputeNegotiationInput = {
        releaseAmount: number
        refundAmount: number
        message?: string
}

export type UpdateDisputeNegotiationInput = {
        releaseAmount?: number
        refundAmount?: number
        message?: string
        status?: DisputeNegotiationStatus
        responseMessage?: string
}

export type RespondDisputeNegotiationInput = {
        action: 'accept' | 'reject'
        message?: string
}

export type DisputeContractSummary = Partial<Contract> & {
        id: string
        clientId?: string | null
        freelancerId?: string | null
        [key: string]: unknown
}

export type DisputeMilestoneSummary = Partial<ContractMilestone> & {
        id: string
        contractId?: string | null
        startAt?: string | null
        endAt?: string | null
        [key: string]: unknown
}

export type MilestoneDisputeSummary = {
        contract?: DisputeContractSummary | null
        milestone?: DisputeMilestoneSummary | null
        dispute?: Dispute | null
        negotiations?: DisputeNegotiation[] | null
        disputableAmount?: DecimalLike | null
        disputableCents?: DecimalLike | null
        [key: string]: unknown
}

export type AdminDisputeListFilters = {
        page?: number
        limit?: number
        status?: DisputeStatus[]
        needsAdmin?: boolean
        contractId?: string
        clientId?: string
        freelancerId?: string
        search?: string
        createdFrom?: string
        createdTo?: string
}

export type AdminDisputeListItem = {
        id: string
        status?: DisputeStatus | null
        dispute?: Dispute | null
        contract?: DisputeContractSummary | null
        milestone?: DisputeMilestoneSummary | null
        client?: DisputeUserSummary | null
        freelancer?: DisputeUserSummary | null
        needsAdmin?: boolean | null
        joined?: boolean | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type AdminJoinDisputeInput = {
        reason?: string
}
