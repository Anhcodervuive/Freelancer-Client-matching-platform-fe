import authorizeAxiosInstance from '~/utils/authorizeAxios'

export interface DisputeDocumentPackage {
  dispute: {
    id: string
    status: string
    createdAt: string
    decidedAt: string | null
    reason: string
    description: string | null
  }
  contract: {
    id: string
    title: string
    description: string | null
    totalAmount: number
    startedAt: string
    endedAt: string | null
    status: string
  }
  jobPost: {
    id: string
    title: string
    description: string
    budgetAmount: number | null
    budgetType: string
    createdAt: string
    requirements: string | null
    attachments: any[]
  }
  milestones: Array<{
    id: string
    title: string
    description: string | null
    amount: number
    startAt: string
    endAt: string
    status: string
    submissions: Array<{
      id: string
      description: string | null
      submittedAt: string
      attachments: any[]
      feedback: {
        rating: number | null
        comment: string | null
        createdAt: string
      } | null
    }>
  }>
  chatHistory: Array<{
    id: string
    content: string
    senderId: string
    senderRole: string
    senderName: string
    createdAt: string
    attachments: any[]
  }>
  negotiations: {
    directNegotiation: Array<{
      id: string
      proposerId: string
      proposerRole: string
      proposerName: string
      type: string
      amount: number | null
      description: string | null
      status: string
      createdAt: string
      respondedAt: string | null
      responseReason: string | null
    }>
    mediationProposals: Array<{
      id: string
      adminId: string
      adminName: string
      type: string
      clientAmount: number | null
      freelancerAmount: number | null
      reasoning: string
      status: string
      createdAt: string
      clientResponse: {
        status: string
        respondedAt: string | null
        reason: string | null
      } | null
      freelancerResponse: {
        status: string
        respondedAt: string | null
        reason: string | null
      } | null
    }>
  }
  evidenceSubmissions: Array<{
    id: string
    submitterId: string
    submitterRole: string
    submitterName: string
    title: string
    description: string | null
    submittedAt: string
    items: Array<{
      id: string
      type: string
      title: string
      description: string | null
      fileUrl: string | null
      linkUrl: string | null
      createdAt: string
    }>
  }>
  participants: {
    client: {
      id: string
      name: string
      email: string
    }
    freelancer: {
      id: string
      name: string
      email: string
    }
    admin: {
      id: string
      name: string
      email: string
    } | null
  }
}

export interface ExportEligibilityResponse {
  disputeId: string
  isEligible: boolean
  message: string
}

export interface CloseMediationInput {
  reason: string
}

/**
 * Check if dispute is eligible for document export
 */
export const checkExportEligibility = async (disputeId: string): Promise<ExportEligibilityResponse> => {
  const response = await authorizeAxiosInstance.get(`/dispute-document-export/${disputeId}/eligibility`)
  return response.data.data
}

/**
 * Get complete dispute document package for export
 */
export const getDisputeDocumentPackage = async (disputeId: string): Promise<DisputeDocumentPackage> => {
  const response = await authorizeAxiosInstance.get(`/dispute-document-export/${disputeId}/package`)
  return response.data.data
}

/**
 * Close mediation for external resolution
 */
export const closeMediationForExternalResolution = async (
  disputeId: string, 
  input: CloseMediationInput
): Promise<any> => {
  const response = await authorizeAxiosInstance.post(`/dispute-document-export/${disputeId}/close`, input)
  return response.data.data
}

// Export all API functions
const disputeDocumentExportApi = {
  checkExportEligibility,
  getDisputeDocumentPackage,
  closeMediationForExternalResolution
}

export default disputeDocumentExportApi