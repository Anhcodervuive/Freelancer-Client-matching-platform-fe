import type { SerializedProfile } from './profile'
import type { PlatformTermsBody, PlatformTermsSection } from './platform-terms'

export type ContractPlatformTermsSnapshot = {
        id?: string | null
        title?: string | null
        version?: string | null
        status?: string | null
        effectiveFrom?: string | null
        effectiveTo?: string | null
        body?: PlatformTermsBody
        sections?: PlatformTermsSection[]
        [key: string]: unknown
} | null

export type ContractAcceptanceLog = {
        id?: string
        type?: string | null
        action?: string | null
        event?: string | null
        kind?: string | null
        status?: string | null
        createdAt?: string | null
        actorId?: string | null
        actorRole?: string | null
        userId?: string | null
        userRole?: string | null
        metadata?: Record<string, unknown> | null
        data?: Record<string, unknown> | null
        [key: string]: unknown
}

export type ContractSignatureRecipient = {
        name?: string | null
        email?: string | null
        role?: string | null
        status?: string | null
        viewedAt?: string | null
        sentAt?: string | null
        deliveredAt?: string | null
        completedAt?: string | null
        [key: string]: unknown
}

export type ContractSignatureEnvelopeSummary = {
        status?: string | null
        subject?: string | null
        message?: string | null
        completedDocumentUri?: string | null
        [key: string]: unknown
} | null

export type TriggerContractSignatureEnvelopeInput = {
        forceResend?: boolean
        resendReason?: string
}

export type AcceptContractTermsInput = {
        termsVersion: string
        userAgent?: string
}

export type ContractTermsDetail = {
        contractId: string
        platformTermsId?: string | null
        platformTermsVersion?: string | null
        platformTermsSnapshot?: ContractPlatformTermsSnapshot
        termsAcceptedAt?: string | null
        termsAcceptedById?: string | null
        termsAcceptedIp?: string | null
        termsAcceptedUserAgent?: string | null
        termsAcceptedBy?: ContractParticipantSummary
        clientAcceptedAt?: string | null
        clientAcceptedById?: string | null
        clientAcceptedIp?: string | null
        clientAcceptedUserAgent?: string | null
        clientAcceptedBy?: ContractParticipantSummary
        acceptanceLogs?: ContractAcceptanceLog[] | null
        [key: string]: unknown
}

export type ContractRole = 'client' | 'freelancer'

export type ContractParticipantRole = 'CLIENT' | 'FREELANCER' | (string & {})

export enum ContractStatus {
	DRAFT,
	ACTIVE,
	PAUSED,
	COMPLETED,
	CANCELLED
}

export type ContractParticipantProfile = {
        firstName: string | null
        lastName: string | null
        country: string | null
        city: string | null
        avatar?: string | null
}

export type ContractParticipantSummary = {
        id?: string
        email?: string | null
        role?: ContractParticipantRole | null
        companyName?: string | null
        profile?: ContractParticipantProfile | null
        firstName?: string | null
        lastName?: string | null
        fullName?: string | null
        [key: string]: unknown
} | null

export type ContractClient = {
        userId: string
        profile?: ContractParticipantProfile | null
        companyName?: string | null
}

export type ContractFreelancer = {
        userId: string
        profile?: ContractParticipantProfile | null
        title?: string | null
}

export type ContractClosureReasonOption = {
        id: string
        label: string
        description?: string | null
}

export type ContractFeedbackParticipant = {
        id: string
        profile: SerializedProfile | null
}

export type ContractFeedback = {
        id?: string
        contractId?: string | null
        reviewerId?: string | null
        revieweeId?: string | null
        role?: ContractParticipantRole | null
        rating?: number | null
        comment?: string | null
        wouldHireAgain?: boolean | null
        createdAt?: string | null
        updatedAt?: string | null
        reviewer?: ContractFeedbackParticipant | null
        reviewee?: ContractFeedbackParticipant | null
        [key: string]: unknown
}

export enum ContractClosureType {
        COMPLETED = 'COMPLETED',
        CANCELLED = 'CANCELLED',
        AUTO_RELEASED = 'AUTO_RELEASED'
}

export type ContractJobCategory = {
	id: string
	name: string
}

export type ContractJobSpecialty = {
	id: string
	name: string
	category?: ContractJobCategory | null
}

export type ContractJobSkill = {
	id: string
	name: string
	[key: string]: unknown
}

export type ContractJobLanguage = {
	languageCode: string
	proficiency?: string | null
	[key: string]: unknown
}

export type ContractJobAttachment = {
        id?: string
        name?: string | null
        fileName?: string | null
        url?: string | null
	fileUrl?: string | null
	size?: number | null
	mimeType?: string | null
	[key: string]: unknown
}

export type ContractMilestoneResourceAsset = {
        id?: string
        kind?: string | null
        url?: string | null
        mimeType?: string | null
        bytes?: number | null
        size?: number | null
        status?: string | null
        [key: string]: unknown
}

export type ContractMilestoneResource = {
        id?: string
        milestoneId?: string | null
        assetId?: string | null
        name?: string | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        updatedAt?: string | null
        asset?: ContractMilestoneResourceAsset | null
        [key: string]: unknown
}

export type ContractMilestoneSubmissionAttachment = {
        id?: string
        submissionId?: string | null
        assetId?: string | null
        name?: string | null
        url?: string | null
        mimeType?: string | null
        size?: number | null
        createdAt?: string | null
        updatedAt?: string | null
        asset?: ContractMilestoneResourceAsset | null
        [key: string]: unknown
}

export type ContractJobPost = {
        id: string
        title: string
        description?: string | null
	specialty?: ContractJobSpecialty | null
	requiredSkills?: ContractJobSkill[]
	languages?: ContractJobLanguage[]
	attachments?: ContractJobAttachment[]
	budgetAmount?: number | null
	budgetCurrency?: string | null
	paymentMode?: string | null
	[key: string]: unknown
}

export type ContractProposal = {
        id: string
        status?: string | null
        submittedAt?: string | null
        bidAmount?: number | null
        bidCurrency?: string | null
        coverLetter?: string | null
        [key: string]: unknown
}

export type ContractOffer = {
        id: string
        status?: string | null
        createdAt?: string | null
        sentAt?: string | null
        startDate?: string | null
        endDate?: string | null
        totalAmount?: number | null
        currency?: string | null
        message?: string | null
	[key: string]: unknown
}

export type Contract = {
        id: string
        code?: string | null
        title?: string | null
        status?: ContractStatus
	type?: string | null
	paymentMode?: string | null
	hourlyRate?: number | null
	hourlyRateCurrency?: string | null
	weeklyLimitHours?: number | null
	fixedPrice?: number | null
	fixedPriceCurrency?: string | null
	totalPaidAmount?: number | null
        totalPaidCurrency?: string | null
        outstandingBalance?: number | null
        outstandingCurrency?: string | null
        startDate?: string | null
        endDate?: string | null
	submittedAt?: string | null
	acceptedAt?: string | null
	createdAt?: string | null
	updatedAt?: string | null
	client: ContractClient
	freelancer: ContractFreelancer
	jobPost?: ContractJobPost | null
        proposal?: ContractProposal | null
        offer?: ContractOffer | null
        closureReasonOptions?: ContractClosureReasonOption[] | null
        clientFeedback?: ContractFeedback | null
        freelancerFeedback?: ContractFeedback | null
        viewerFeedback?: ContractFeedback | null
        viewerCanSubmitFeedback?: boolean | null
        viewerSubmittedFeedbackAt?: string | null
        platformTermsVersion?: string | null
        platformTermsSnapshot?: ContractPlatformTermsSnapshot
        termsAcceptedAt?: string | null
        termsAcceptedById?: string | null
        termsAcceptedIp?: string | null
        termsAcceptedUserAgent?: string | null
        termsAcceptedBy?: ContractParticipantSummary
        clientAcceptedAt?: string | null
        clientAcceptedById?: string | null
        clientAcceptedIp?: string | null
        clientAcceptedUserAgent?: string | null
        clientAcceptedBy?: ContractParticipantSummary
        acceptanceLogs?: ContractAcceptanceLog[] | null
        signatureProvider?: string | null
        signatureEnvelopeId?: string | null
        signatureStatus?: string | null
        signatureRecipients?: ContractSignatureRecipient[] | null
        signatureEnvelopeSummary?: ContractSignatureEnvelopeSummary
        signatureDocumentsUri?: string | null
        signatureCertificateUri?: string | null
        signatureSentAt?: string | null
        signatureCompletedAt?: string | null
        signatureDeclinedAt?: string | null
        signatureVoidedAt?: string | null
        signatureLastError?: string | null
        [key: string]: unknown
}

export type ContractMilestoneEscrow = {
        id?: string
        status?: string | null
        currency?: string | null
        amountFunded?: number | null
        amountReleased?: number | null
        amountRefunded?: number | null
        createdAt?: string | null
        updatedAt?: string | null
        [key: string]: unknown
}

export type ContractMilestone = {
        id: string
        title: string
        description?: string | null
        amount?: number | null
        currency?: string | null
        startDate?: string | null
        endDate?: string | null
        dueDate?: string | null
        releasedAt?: string | null
        approvedAt?: string | null
        approvedSubmissionId?: string | null
        approvedSubmission?: ContractMilestoneSubmission | null
        submittedAt?: string | null
        status?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        resources?: ContractMilestoneResource[]
        submissions?: ContractMilestoneSubmission[]
        escrow?: ContractMilestoneEscrow | null
        attachments?: ContractMilestoneResource[]
        cancellationStatus?: string | null
        cancellationRequestedAt?: string | null
        cancellationReason?: string | null
        cancellationRespondedAt?: string | null
        cancellationResponseReason?: string | null
        [key: string]: unknown
}

export type ContractMilestoneSubmission = {
        id: string
        milestoneId?: string | null
        status?: string | null
        message?: string | null
        note?: string | null
        reason?: string | null
        reviewerNote?: string | null
        reviewNote?: string | null
        reviewRating?: number | null
        submittedAt?: string | null
        reviewedAt?: string | null
        approvedAt?: string | null
        declinedAt?: string | null
        submittedById?: string | null
        reviewerId?: string | null
        resources?: ContractMilestoneResource[]
        attachments?: ContractMilestoneSubmissionAttachment[]
        [key: string]: unknown
}

export type CreateContractMilestoneInput = {
        title: string
        amount: number
        currency: string
        startDate?: string | null
        endDate?: string | null
}

export type SubmitMilestoneWorkInput = {
        message: string
        note?: string
        files?: File[]
}

export type ApproveMilestoneSubmissionInput = {
        reviewNote?: string
        reviewRating: number
}

export type DeclineMilestoneSubmissionInput = {
        reviewNote: string
        reviewRating?: number
}

export type PayContractMilestoneInput = {
        paymentMethodId: string
        note?: string
        idempotencyKey?: string
}

export type PayContractMilestoneResponse = {
        status?: string
        paymentStatus?: string
        requiresAction?: boolean
        clientSecret?: string
        client_secret?: string
        idempotencyKey?: string
        idemKey?: string
        paymentIntentId?: string
        payment_intent_id?: string
        [key: string]: unknown
}

export type EndContractInput = {
        closureType: ContractClosureType
        closureReason?: string
        closureReasonOptionId?: string
}

export type SubmitContractFeedbackInput = {
        rating: number
        comment?: string
        wouldHireAgain?: boolean
}

export type UpdateContractFeedbackInput = Partial<SubmitContractFeedbackInput>

export type ContractFeedbackListResponse = {
        contractId: string
        feedbacks: ContractFeedback[]
}

export type CancelContractMilestoneInput = {
        reason?: string
}

export type RespondMilestoneCancellationInput = {
        action: 'accept' | 'decline'
        reason?: string
        idempotencyKey?: string
}

export type ContractListFilterInput = {
        page?: number
        limit?: number
        role?: ContractRole
        search?: string
}

export type PaginatedContractResponse = {
	data: Contract[]
	total: number
	page: number
	limit: number
}
