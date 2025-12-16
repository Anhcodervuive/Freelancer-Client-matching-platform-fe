export enum MediationEvidenceSourceType {
	MILESTONE_ATTACHMENT = 'MILESTONE_ATTACHMENT',
	CHAT_ATTACHMENT = 'CHAT_ATTACHMENT',
	ASSET = 'ASSET',
	EXTERNAL_URL = 'EXTERNAL_URL',
	DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
	SCREENSHOT = 'SCREENSHOT',
	CONTRACT_DOCUMENT = 'CONTRACT_DOCUMENT'
}

export enum MediationEvidenceStatus {
	DRAFT = 'DRAFT',
	SUBMITTED = 'SUBMITTED',
	UNDER_REVIEW = 'UNDER_REVIEW',
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED'
}

export enum MediationResponse {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	REJECTED = 'REJECTED'
}

export enum MediationProposalStatus {
	PENDING = 'PENDING',
	ACCEPTED_BY_ALL = 'ACCEPTED_BY_ALL',
	REJECTED = 'REJECTED',
	EXPIRED = 'EXPIRED'
}

export interface MediationEvidenceAsset {
	id: string
	url: string | null
	mimeType: string | null
	bytes: number | null
	width: number | null
	height: number | null
}

export interface MediationEvidenceItem {
	id: string
	label: string | null
	description: string | null
	sourceType: MediationEvidenceSourceType
	sourceId: string | null
	url: string | null
	fileName: string | null
	fileSize: number | null
	mimeType: string | null
	displayOrder: number
	createdAt: string
	asset: MediationEvidenceAsset | null
}

export interface MediationEvidenceUser {
	id: string
	email: string | null
	role: string | null
	firstName: string | null
	lastName: string | null
}

export interface MediationEvidenceComment {
	id: string
	content: string
	authorRole: string
	createdAt: string
	author: MediationEvidenceUser
	item: {
		id: string
		label: string | null
	} | null
}

export interface MediationEvidenceSubmission {
	id: string
	disputeId: string
	status: MediationEvidenceStatus
	title: string | null
	description: string | null
	submissionDeadline: string | null
	submittedAt: string | null
	reviewedAt: string | null
	reviewNotes: string | null
	createdAt: string
	updatedAt: string
	submittedBy: MediationEvidenceUser
	reviewedBy: MediationEvidenceUser | null
	items: MediationEvidenceItem[]
	comments: MediationEvidenceComment[]
}

export interface MediationEvidenceSubmissionListResponse {
	data: MediationEvidenceSubmission[]
	meta: {
		page: number
		limit: number
		total: number
	}
}

// Input types
export interface MediationEvidenceItemInput {
	label?: string
	description?: string
	sourceType: MediationEvidenceSourceType
	sourceId?: string
	assetId?: string
	url?: string
	fileName?: string
	fileSize?: number
	mimeType?: string
	displayOrder?: number
}

export interface CreateMediationEvidenceSubmissionInput {
	title?: string
	description?: string
	items: MediationEvidenceItemInput[]
}

export interface UpdateMediationEvidenceSubmissionInput {
	title?: string
	description?: string
	items?: MediationEvidenceItemInput[]
}

export interface ReviewMediationEvidenceInput {
	status: 'ACCEPTED' | 'REJECTED'
	reviewNotes?: string
}

export interface AddMediationEvidenceCommentInput {
	itemId?: string
	content: string
}

export interface MediationEvidenceQuery {
	disputeId: string
	status?: MediationEvidenceStatus
	submittedById?: string
	page?: number
	limit?: number
}

// Mediation Proposal types
export interface MediationProposal {
	id: string
	disputeId: string
	status: MediationProposalStatus
	releaseAmount: number
	refundAmount: number
	reasoning: string | null
	responseDeadline: string
	clientResponse: MediationResponse
	freelancerResponse: MediationResponse
	clientRespondedAt: string | null
	freelancerRespondedAt: string | null
	clientResponseMessage: string | null
	freelancerResponseMessage: string | null
	createdAt: string
	updatedAt: string
	proposedBy: MediationEvidenceUser
	escrowAmount: number
	currency: string
}

export interface CreateMediationProposalInput {
	releaseAmount: number
	refundAmount: number
	reasoning: string
	responseDeadlineDays?: number
}

export interface RespondToMediationProposalInput {
	response: MediationResponse
	message?: string
}