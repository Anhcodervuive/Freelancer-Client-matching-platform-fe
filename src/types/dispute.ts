import type { Contract, ContractMilestone } from '~/types/contract'
import type { Role } from '~/types/user'

export enum DisputeStatus {
OPEN = 'OPEN',
NEGOTIATION = 'NEGOTIATION',
INTERNAL_MEDIATION = 'INTERNAL_MEDIATION',
AWAITING_ARBITRATION_FEES = 'AWAITING_ARBITRATION_FEES',
ARBITRATION_READY = 'ARBITRATION_READY',
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

export enum ArbitrationEvidenceSourceType {
        MILESTONE_ATTACHMENT = 'MILESTONE_ATTACHMENT',
        CHAT_ATTACHMENT = 'CHAT_ATTACHMENT',
        ASSET = 'ASSET',
        EXTERNAL_URL = 'EXTERNAL_URL'
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

export type DisputePayment = {
        id: string
        disputeId?: string | null
        payerId?: string | null
        payer?: DisputeUserSummary | null
        amount?: DecimalLike | null
        currency?: string | null
        status?: string | null
        paymentMethodRefId?: string | null
        paymentMethodType?: string | null
        paymentMethodBrand?: string | null
        reference?: string | null
        description?: string | null
        metadata?: Record<string, unknown> | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type Dispute = {
        id: string
        escrowId: string
        openedById: string
        status: DisputeStatus
        latestProposalId?: string | null
        lockedAt?: string | null
        lockedById?: string | null
        proposedRelease: DecimalLike | null
        proposedRefund: DecimalLike | null
        arbFeePerParty?: DecimalLike | null
        clientArbFeePaid?: boolean
        freelancerArbFeePaid?: boolean
        clientEvidenceSubmitted?: boolean | null
        clientEvidenceSubmited?: boolean | null
        freelancerEvidenceSubmitted?: boolean | null
        freelancerEvidenceSubmited?: boolean | null
        hasSubmittedEvidence?: boolean | null
        responseDeadline?: string | null
        arbitrationDeadline?: string | null
        currentDossierVersion?: number | null
        arbitratorId?: string | null
        arbitratorAssignedAt?: string | null
        arbitrator?: DisputeUserSummary | null
        decidedRelease?: DecimalLike | null
        decidedRefund?: DecimalLike | null
        decidedById?: string | null
        note?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        openedBy?: DisputeUserSummary | null
        lockedBy?: DisputeUserSummary | null
        latestProposal?: DisputeNegotiation | null
        negotiations?: DisputeNegotiation[] | null
        arbitrationFeePayments?: DisputePayment[] | null
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

export type DisputeEvidencePerson = {
        id: string
        firstName?: string | null
        lastName?: string | null
        displayName?: string | null
        name?: string | null
}

export type DisputeEvidenceSubmission = {
        id: string
        milestoneId?: string | null
        freelancerId?: string | null
        createdAt?: string | null
        message?: string | null
        freelancer?: DisputeEvidencePerson | null
}

export type DisputeEvidenceAsset = {
        id: string
        kind?: string | null
        url?: string | null
        mimeType?: string | null
        bytes?: number | null
        status?: string | null
}

export type DisputeEvidenceMilestoneAttachment = {
        id: string
        submissionId?: string | null
        assetId?: string | null
        name?: string | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        submission?: DisputeEvidenceSubmission | null
        asset?: DisputeEvidenceAsset | null
}

export type DisputeEvidenceChatMessage = {
        id: string
        threadId?: string | null
        senderId?: string | null
        sentAt?: string | null
        body?: string | null
        sender?: DisputeEvidencePerson | null
}

export type DisputeEvidenceChatAttachment = {
        id: string
        messageId?: string | null
        assetId?: string | null
        name?: string | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        asset?: DisputeEvidenceAsset | null
        message?: DisputeEvidenceChatMessage | null
}

export type DisputeFinalEvidenceSubmissionItem = {
        id: string
        submissionId?: string | null
        label?: string | null
        description?: string | null
        sourceType?: ArbitrationEvidenceSourceType | string | null
        sourceId?: string | null
        url?: string | null
        assetId?: string | null
        asset?: DisputeEvidenceAsset | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type DisputeFinalEvidenceSubmission = {
        id: string
        disputeId?: string | null
        milestoneId?: string | null
        freelancerId?: string | null
        submittedById?: string | null
        submittedBy?: DisputeEvidencePerson | null
        submittedAt?: string | null
        updatedAt?: string | null
        statement?: string | null
        noAdditionalEvidence?: boolean | null
        items?: DisputeFinalEvidenceSubmissionItem[] | null
        [key: string]: unknown
}

export type DisputeFinalEvidenceSources = {
        contractId: string | null
        milestoneId: string | null
        disputeId: string | null
        milestoneAttachments: DisputeEvidenceMilestoneAttachment[]
        chatAttachments: DisputeEvidenceChatAttachment[]
}

export type SubmitFinalEvidenceItemInput = {
        label?: string
        description?: string
        sourceType: ArbitrationEvidenceSourceType
        sourceId?: string
        url?: string
        assetId?: string
}

export type SubmitFinalEvidenceInput = {
        statement?: string
        noAdditionalEvidence?: boolean
        items?: SubmitFinalEvidenceItemInput[]
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

export type AdminDisputeParties = {
        client?: DisputeUserSummary | null
        freelancer?: DisputeUserSummary | null
        [key: string]: unknown
} | null

export type AdminDisputeAmounts = {
        currency?: string | null
        funded?: DecimalLike | null
        released?: DecimalLike | null
        refunded?: DecimalLike | null
        disputable?: DecimalLike | null
        proposedRelease?: DecimalLike | null
        proposedRefund?: DecimalLike | null
        [key: string]: unknown
} | null

export type AdminDisputeMetrics = {
        needsAdmin?: boolean | null
        hasAdminJoined?: boolean | null
        isResponseOverdue?: boolean | null
        negotiationCount?: number | null
        lastProposalCreatedAt?: string | null
        lastProposalRespondedAt?: string | null
        lastAdminJoinedAt?: string | null
        [key: string]: unknown
} | null

export type AdminDisputeEscrowContract = {
        id: string
        title?: string | null
        clientId?: string | null
        freelancerId?: string | null
        client?: Record<string, unknown> | null
        freelancer?: Record<string, unknown> | null
        [key: string]: unknown
} | null

export type AdminDisputeEscrowMilestone = {
        id: string
        title?: string | null
        status?: string | null
        amount?: DecimalLike | null
        currency?: string | null
        startAt?: string | null
        endAt?: string | null
        contractId?: string | null
        contract?: AdminDisputeEscrowContract
        [key: string]: unknown
} | null

export type AdminDisputeEscrow = {
        id: string
        status?: string | null
        currency?: string | null
        amountFunded?: DecimalLike | null
        amountReleased?: DecimalLike | null
        amountRefunded?: DecimalLike | null
        milestone?: AdminDisputeEscrowMilestone
        [key: string]: unknown
} | null

export type AdminDisputeDecisionAttachment = {
        id: string
        name?: string | null
        description?: string | null
        assetId?: string | null
        asset?: DisputeEvidenceAsset | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type AdminDisputeChatAccessLog = {
        id: string
        threadId?: string | null
        disputeId?: string | null
        adminId?: string | null
        action?: string | null
        reason?: string | null
        metadata?: Record<string, unknown> | null
        createdAt?: string | null
        admin?: DisputeUserSummary | null
        [key: string]: unknown
}

export type AdminDisputeCounts = {
        negotiations?: number | null
        [key: string]: unknown
} | null

export type AdminDisputeDetail = {
        id: string
        dispute?: Dispute | null
        escrow?: AdminDisputeEscrow
        chatAccessLogs?: AdminDisputeChatAccessLog[] | null
        negotiations?: DisputeNegotiation[] | null
        counts?: AdminDisputeCounts
        evidenceSubmissions?: DisputeFinalEvidenceSubmission[] | null
        decisionAttachments?: AdminDisputeDecisionAttachment[] | null
        arbitrationDossiers?: AdminDisputeDossier[] | null
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
        parties?: AdminDisputeParties
        amounts?: AdminDisputeAmounts
        metrics?: AdminDisputeMetrics
        needsAdmin?: boolean | null
        joined?: boolean | null
        admin?: DisputeUserSummary | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type AdminDisputeDossier = {
        id: string
        version?: number | null
        notes?: string | null
        createdAt?: string | null
        finalizedAt?: string | null
        createdBy?: DisputeUserSummary | null
        downloadUrl?: string | null
        fileUrl?: string | null
        milestoneId?: string | null
        milestoneTitle?: string | null
        [key: string]: unknown
}

export type AdminDisputeArbitrator = {
        id: string
        displayName?: string | null
        email?: string | null
        avatar?: string | null
        [key: string]: unknown
}

export type AdminJoinDisputeInput = {
        reason?: string
}

export type AdminAssignArbitratorInput = {
        arbitratorId: string
}

export type ConfirmArbitrationFeeInput = {
        paymentMethodRefId: string
        idempotencyKey?: string
}

export type AdminRequestArbitrationFeesInput = {
        deadlineDays?: number
}

export type AdminLockDisputeInput = {
        note?: string
}

export type AdminGenerateArbitrationDossierInput = {
        notes?: string
        finalize?: boolean
}

export type ArbitrationTimelineEntry = {
        at: string
        actor?: string | null
        action: string
        details?: unknown | null
}

export type ArbitrationContextMeta = {
        disputeId: string
        status: DisputeStatus
        lockedAt: string
        arbitrationDeadline?: string | null
        currentDossierVersion?: number | null
}

export type ArbitrationContext = {
        meta: ArbitrationContextMeta
        timeline: ArbitrationTimelineEntry[]
        sections: Record<string, unknown>
}

export type ArbitrationContextResponse = {
        dispute: AdminDisputeDetail
        arbitrationContext: ArbitrationContext
}

export type ArbitrationDecisionAwardType = 'RELEASE_ALL' | 'REFUND_ALL' | 'SPLIT'

export type ArbitrationDecisionAttachmentInput = {
        assetId: string
        name?: string | null
        description?: string | null
}

export type RecordArbitrationDecisionInput = {
        awardType: ArbitrationDecisionAwardType
        releaseAmount: number
        refundAmount: number
        summary: string
        reasoning?: string | null
        attachments?: ArbitrationDecisionAttachmentInput[]
}
