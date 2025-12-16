import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
	MediationEvidenceSubmission,
	MediationEvidenceSubmissionListResponse,
	CreateMediationEvidenceSubmissionInput,
	UpdateMediationEvidenceSubmissionInput,
	ReviewMediationEvidenceInput,
	AddMediationEvidenceCommentInput,
	MediationEvidenceQuery,
	MediationEvidenceComment,
	MediationProposal,
	CreateMediationProposalInput,
	RespondToMediationProposalInput
} from '~/types/mediation-evidence'

const baseUrl = '/mediation-evidence'

// Evidence submission APIs
export const createMediationEvidenceSubmission = async (
	disputeId: string,
	input: CreateMediationEvidenceSubmissionInput
): Promise<MediationEvidenceSubmission> => {
	console.log('API call - disputeId:', disputeId, 'input:', input)
	const response = await authorizeAxiosInstance.post(`${baseUrl}/disputes/${disputeId}/evidence`, input)
	console.log('API response:', response.data)
	return response.data.data
}

export const updateMediationEvidenceSubmission = async (
	submissionId: string,
	input: UpdateMediationEvidenceSubmissionInput
): Promise<MediationEvidenceSubmission> => {
	const response = await authorizeAxiosInstance.put(`${baseUrl}/evidence/${submissionId}`, input)
	return response.data.data
}

export const submitMediationEvidence = async (submissionId: string): Promise<MediationEvidenceSubmission> => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/evidence/${submissionId}/submit`)
	return response.data.data
}

export const getMediationEvidenceSubmission = async (submissionId: string): Promise<MediationEvidenceSubmission> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/evidence/${submissionId}`)
	return response.data.data
}

export const listMediationEvidenceSubmissions = async (
	query: MediationEvidenceQuery
): Promise<MediationEvidenceSubmissionListResponse> => {
	const params = new URLSearchParams()

	if (query.status) params.append('status', query.status)
	if (query.submittedById) params.append('submittedById', query.submittedById)
	if (query.page) params.append('page', query.page.toString())
	if (query.limit) params.append('limit', query.limit.toString())

	const response = await authorizeAxiosInstance.get(
		`${baseUrl}/disputes/${query.disputeId}/evidence?${params.toString()}`
	)
	return response.data
}

export const deleteMediationEvidenceSubmission = async (submissionId: string): Promise<{ success: boolean }> => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/evidence/${submissionId}`)
	return response.data
}

// Admin review APIs
export const reviewMediationEvidence = async (
	submissionId: string,
	input: ReviewMediationEvidenceInput
): Promise<MediationEvidenceSubmission> => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/evidence/${submissionId}/review`, input)
	return response.data.data
}

// Comment APIs
export const addMediationEvidenceComment = async (
	submissionId: string,
	input: AddMediationEvidenceCommentInput
): Promise<MediationEvidenceComment> => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/evidence/${submissionId}/comments`, input)
	return response.data.data
}

// Mediation proposal APIs
export const createMediationProposal = async (
	disputeId: string,
	input: CreateMediationProposalInput
): Promise<MediationProposal> => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/disputes/${disputeId}/proposals`, input)
	return response.data.data
}

export const listMediationProposals = async (disputeId: string): Promise<MediationProposal[]> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/disputes/${disputeId}/proposals`)
	return response.data.data
}

export const getMediationProposal = async (proposalId: string): Promise<MediationProposal> => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/proposals/${proposalId}`)
	return response.data.data
}

export const respondToMediationProposal = async (
	proposalId: string,
	input: RespondToMediationProposalInput
): Promise<MediationProposal> => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/proposals/${proposalId}/respond`, input)
	return response.data.data
}

export const deleteMediationProposal = async (proposalId: string): Promise<{ success: boolean }> => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/proposals/${proposalId}`)
	return response.data
}
