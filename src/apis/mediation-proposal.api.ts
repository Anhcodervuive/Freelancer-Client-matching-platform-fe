import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type {
	MediationProposal,
	CreateMediationProposalInput,
	RespondToMediationProposalInput
} from '~/types/mediation-evidence'

// Get mediation proposals for a dispute
export const getMediationProposalsByDispute = async (disputeId: string): Promise<{ data: MediationProposal[] }> => {
	const response = await authorizeAxiosInstance.get(`/mediation-proposal/dispute/${disputeId}`)
	return response.data
}

// Get a specific mediation proposal
export const getMediationProposal = async (proposalId: string): Promise<{ data: MediationProposal }> => {
	const response = await authorizeAxiosInstance.get(`/mediation-proposal/${proposalId}`)
	return response.data
}

// Create a mediation proposal (admin only)
export const createMediationProposal = async (
	disputeId: string, 
	data: CreateMediationProposalInput
): Promise<{ data: MediationProposal }> => {
	const response = await authorizeAxiosInstance.post(`/mediation-proposal/dispute/${disputeId}`, data)
	return response.data
}

// Respond to a mediation proposal
export const respondToMediationProposal = async (
	proposalId: string,
	data: RespondToMediationProposalInput
): Promise<{ data: MediationProposal }> => {
	const response = await authorizeAxiosInstance.put(`/mediation-proposal/${proposalId}/respond`, data)
	return response.data
}

// Delete a mediation proposal (admin only)
export const deleteMediationProposal = async (proposalId: string): Promise<{ success: boolean }> => {
	const response = await authorizeAxiosInstance.delete(`/mediation-proposal/${proposalId}`)
	return response.data
}