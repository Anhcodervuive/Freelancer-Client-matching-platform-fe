import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { 
	FileText, 
	Plus, 
	AlertTriangle, 
	CheckCircle, 
	Clock,
	Scale,
	X,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Upload,
	Camera,
	File,
	Download
} from 'lucide-react'

import type { 
	CreateMediationEvidenceSubmissionInput,
	RespondToMediationProposalInput
} from '~/types/mediation-evidence'
import { 
	listMediationEvidenceSubmissions,
	createMediationEvidenceSubmission
} from '~/apis/mediation-evidence.api'
import authorizeAxiosInstance from '~/utils/authorizeAxios'
import MediationEvidenceForm from './MediationEvidenceForm'
import MediationProposalCard from './MediationProposalCard'
import AdminMediationPanel from './AdminMediationPanel'

interface MediationEvidenceSectionProps {
	disputeId: string
	userRole: 'CLIENT' | 'FREELANCER' | 'ADMIN'
	userId: string
	escrowAmount: number
	currency: string
}

export default function MediationEvidenceSection({
	disputeId,
	userRole,
	userId,
	escrowAmount,
	currency
}: MediationEvidenceSectionProps) {
	const [showEvidenceForm, setShowEvidenceForm] = useState(false)
	const [activeTab, setActiveTab] = useState<'evidence' | 'proposals'>('evidence')
	const queryClient = useQueryClient()

	// Fetch evidence submissions
	const { 
		data: evidenceData, 
		isLoading: isEvidenceLoading,
		error: evidenceError
	} = useQuery({
		queryKey: ['mediation-evidence', disputeId],
		queryFn: () => listMediationEvidenceSubmissions({ disputeId }),
		retry: 1
	})

	// Fetch mediation proposals
	const { 
		data: proposalsData, 
		isLoading: isProposalsLoading,
		error: proposalsError 
	} = useQuery({
		queryKey: ['mediation-proposals', disputeId],
		queryFn: async () => {
			const response = await authorizeAxiosInstance.get(`/mediation-proposal/dispute/${disputeId}`)
			return response.data
		},
		retry: 1,
		enabled: true // Load proposals for all users
	})

	// Submit evidence mutation
	const submitEvidenceMutation = useMutation({
		mutationFn: (data: CreateMediationEvidenceSubmissionInput) => 
			createMediationEvidenceSubmission(disputeId, data),
		onSuccess: () => {
			toast.success('Bằng chứng đã được nộp thành công!')
			queryClient.invalidateQueries({ queryKey: ['mediation-evidence', disputeId] })
			setShowEvidenceForm(false)
		},
		onError: (error: any) => {
			console.error('Submit evidence error:', error)
			
			// Check if it's a database/migration error
			if (error?.response?.status === 500) {
				toast.error('Lỗi hệ thống: Có thể database migration chưa được chạy. Vui lòng liên hệ admin.')
			} else if (error?.response?.status === 422) {
				toast.error('Dữ liệu không hợp lệ: ' + (error?.response?.data?.message || 'Vui lòng kiểm tra lại thông tin'))
			} else {
				toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi nộp bằng chứng')
			}
		}
	})

	// Respond to proposal mutation
	const respondProposalMutation = useMutation({
		mutationFn: async ({ proposalId, input }: { proposalId: string, input: RespondToMediationProposalInput }) => {
			const response = await authorizeAxiosInstance.put(`/mediation-proposal/${proposalId}/respond`, input)
			return response.data
		},
		onSuccess: () => {
			toast.success('Phản hồi đã được gửi thành công!')
			queryClient.invalidateQueries({ queryKey: ['mediation-proposals', disputeId] })
		},
		onError: (error: any) => {
			toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi')
		}
	})

	// Create proposal mutation (for admin)
	const createProposalMutation = useMutation({
		mutationFn: async (input: any) => {
			const response = await authorizeAxiosInstance.post(`/mediation-proposal/dispute/${disputeId}`, input)
			return response.data
		},
		onSuccess: () => {
			toast.success('Đề xuất hòa giải đã được tạo thành công!')
			queryClient.invalidateQueries({ queryKey: ['mediation-proposals', disputeId] })
		},
		onError: (error: any) => {
			toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo đề xuất')
		}
	})

	// Delete proposal mutation (for admin)
	const deleteProposalMutation = useMutation({
		mutationFn: async (proposalId: string) => {
			const response = await authorizeAxiosInstance.delete(`/mediation-proposal/${proposalId}`)
			return response.data
		},
		onSuccess: () => {
			toast.success('Đề xuất đã được xóa thành công!')
			queryClient.invalidateQueries({ queryKey: ['mediation-proposals', disputeId] })
		},
		onError: (error: any) => {
			toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa đề xuất')
		}
	})

	const handleSubmitEvidence = async (data: CreateMediationEvidenceSubmissionInput) => {
		console.log('Submitting evidence data:', data)
		await submitEvidenceMutation.mutateAsync(data)
	}

	const handleRespondToProposal = async (proposalId: string, input: RespondToMediationProposalInput) => {
		await respondProposalMutation.mutateAsync({ proposalId, input })
	}

	// Prevent body scroll when modal is open
	useEffect(() => {
		if (showEvidenceForm) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}

		// Cleanup on unmount
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [showEvidenceForm])

	const evidenceSubmissions = evidenceData?.data || []
	const proposals = proposalsData?.data || []
	const userSubmissions = evidenceSubmissions.filter((sub: any) => sub.submittedBy.id === userId)
	const hasSubmittedEvidence = userSubmissions.length > 0

	// Show error message if evidence API fails (likely due to missing migration)
	if (evidenceError && !isEvidenceLoading) {
		return (
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
				<div className="flex items-start space-x-3">
					<AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 className="font-medium text-yellow-800">Hệ thống hòa giải chưa sẵn sàng</h3>
						<p className="text-sm text-yellow-700 mt-1">
							Cần chạy database migration để kích hoạt tính năng nộp bằng chứng hòa giải.
						</p>
						<p className="text-xs text-yellow-600 mt-2 font-mono">
							Lỗi: {evidenceError?.message || 'API không khả dụng'}
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-start space-x-3">
					<Scale className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 className="font-medium text-blue-800">Giai đoạn hòa giải nội bộ</h3>
						<p className="text-sm text-blue-700 mt-1">
							Admin sẽ xem xét bằng chứng từ cả hai bên và đưa ra đề xuất hòa giải.
						</p>
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="border-b border-gray-200">
				<nav className="-mb-px flex space-x-8">
					<button
						onClick={() => setActiveTab('evidence')}
						className={`py-2 px-1 border-b-2 font-medium text-sm ${
							activeTab === 'evidence'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}`}
					>
						<div className="flex items-center space-x-2">
							<FileText className="w-4 h-4" />
							<span>Bằng chứng</span>
							{evidenceSubmissions.length > 0 && (
								<span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
									{evidenceSubmissions.length}
								</span>
							)}
						</div>
					</button>
					<button
						onClick={() => setActiveTab('proposals')}
						className={`py-2 px-1 border-b-2 font-medium text-sm ${
							activeTab === 'proposals'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}`}
					>
						<div className="flex items-center space-x-2">
							<Scale className="w-4 h-4" />
							<span>Đề xuất hòa giải</span>
							{proposals.length > 0 && (
								<span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
									{proposals.length}
								</span>
							)}
						</div>
					</button>
				</nav>
			</div>

			{/* Evidence Tab */}
			{activeTab === 'evidence' && (
				<div className="space-y-6">
					{/* Evidence Submission for Client/Freelancer */}
					{(userRole === 'CLIENT' || userRole === 'FREELANCER') && (
						<div className="bg-white border border-gray-200 rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-lg font-medium text-gray-900">Nộp bằng chứng</h3>
									<p className="text-sm text-gray-600 mt-1">
										Cung cấp tài liệu, hình ảnh và thông tin liên quan đến tranh chấp
									</p>
								</div>
								{!hasSubmittedEvidence && (
									<button
										onClick={() => setShowEvidenceForm(true)}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
									>
										<Plus className="w-4 h-4 mr-2" />
										Nộp bằng chứng
									</button>
								)}
							</div>

							{hasSubmittedEvidence ? (
								<div className="bg-green-50 border border-green-200 rounded-lg p-4">
									<div className="flex items-center space-x-3">
										<CheckCircle className="w-5 h-5 text-green-600" />
										<div>
											<p className="text-sm font-medium text-green-800">
												Bạn đã nộp bằng chứng thành công
											</p>
											<p className="text-xs text-green-600 mt-1">
												Admin sẽ xem xét và đưa ra đề xuất hòa giải
											</p>
										</div>
									</div>
								</div>
							) : (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<div className="flex items-center space-x-3">
										<Clock className="w-5 h-5 text-yellow-600" />
										<div>
											<p className="text-sm font-medium text-yellow-800">
												Chưa nộp bằng chứng
											</p>
											<p className="text-xs text-yellow-600 mt-1">
												Hãy nộp bằng chứng để hỗ trợ quá trình hòa giải
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Evidence List */}
					{isEvidenceLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					) : evidenceSubmissions.length > 0 ? (
						<div className="space-y-4">
							<h4 className="font-medium text-gray-900">Bằng chứng đã nộp</h4>
							{evidenceSubmissions.map((submission: any) => (
								<EvidenceSubmissionCard 
									key={submission.id} 
									submission={submission}
									userRole={userRole}
									currentUserId={userId}
								/>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">
							<FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p>Chưa có bằng chứng nào được nộp</p>
						</div>
					)}

					{/* Evidence Form Modal */}
					{showEvidenceForm && createPortal(
						<div 
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
							onClick={() => setShowEvidenceForm(false)}
						>
							<div 
								className="w-full max-w-2xl rounded-3xl border border-base-200 bg-base-100 shadow-xl"
								onClick={(e) => e.stopPropagation()}
							>
								{/* Modal Header */}
								<div className="flex items-start justify-between gap-4 border-b border-base-200 px-6 py-4">
									<div>
										<h2 className="text-xl font-semibold text-base-content">
											Nộp bằng chứng hòa giải
										</h2>
										<p className="text-sm text-base-content/70 mt-1">
											Cung cấp tài liệu và thông tin để hỗ trợ quá trình hòa giải
										</p>
									</div>
									<button
										onClick={() => setShowEvidenceForm(false)}
										className="text-base-content/50 hover:text-base-content transition-colors p-1 rounded-md hover:bg-base-200 flex-shrink-0"
									>
										<X className="w-6 h-6" />
									</button>
								</div>
								
								{/* Modal Content */}
								<div className="overflow-y-auto max-h-[calc(90vh-80px)]">
									<MediationEvidenceForm
										disputeId={disputeId}
										onSubmit={handleSubmitEvidence}
										onCancel={() => setShowEvidenceForm(false)}
										isLoading={submitEvidenceMutation.isPending}
										isModal={true}
									/>
								</div>
							</div>
						</div>,
						document.body
					)}
				</div>
			)}

			{/* Proposals Tab */}
			{activeTab === 'proposals' && (
				<div className="space-y-6">
					{userRole === 'ADMIN' ? (
						<AdminMediationPanel
							escrowAmount={escrowAmount}
							currency={currency}
							proposals={proposals}
							onCreateProposal={createProposalMutation.mutateAsync}
							onDeleteProposal={deleteProposalMutation.mutateAsync}
							isLoading={createProposalMutation.isPending || deleteProposalMutation.isPending}
							hasJoinedChat={true} // Assume admin has joined chat if they can see this page
						/>
					) : (
						<>
							{/* Client/Freelancer Proposals View */}
							{isProposalsLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								</div>
							) : proposals.length > 0 ? (
								<div className="space-y-4">
									<h4 className="font-medium text-gray-900">Đề xuất hòa giải</h4>
									{proposals.map((proposal: any) => (
										<MediationProposalCard
											key={proposal.id}
											proposal={proposal}
											userRole={userRole as 'CLIENT' | 'FREELANCER'}
											onRespond={(input) => handleRespondToProposal(proposal.id, input)}
											isLoading={respondProposalMutation.isPending}
										/>
									))}
								</div>
							) : (
								<div className="text-center py-8 text-gray-500">
									<Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
									<p>Chưa có đề xuất hòa giải nào</p>
									<p className="text-sm mt-2">Admin sẽ tạo đề xuất sau khi xem xét bằng chứng</p>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	)
}

// Evidence Submission Card Component
interface EvidenceSubmissionCardProps {
	submission: any
	userRole: 'CLIENT' | 'FREELANCER' | 'ADMIN'
	currentUserId: string
}

function EvidenceSubmissionCard({ submission, userRole, currentUserId }: EvidenceSubmissionCardProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const isOwnSubmission = submission.submittedBy.id === currentUserId

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
			case 'ACCEPTED': return 'bg-green-100 text-green-800'
			case 'REJECTED': return 'bg-red-100 text-red-800'
			case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}

	const getStatusText = (status: string) => {
		switch (status) {
			case 'DRAFT': return 'Bản nháp'
			case 'SUBMITTED': return 'Đã nộp'
			case 'UNDER_REVIEW': return 'Đang xem xét'
			case 'ACCEPTED': return 'Được chấp nhận'
			case 'REJECTED': return 'Bị từ chối'
			default: return status
		}
	}

	const getSourceTypeIcon = (sourceType: string) => {
		switch (sourceType) {
			case 'EXTERNAL_URL': return <ExternalLink className="w-4 h-4 text-blue-500" />
			case 'DOCUMENT_UPLOAD': return <Upload className="w-4 h-4 text-green-500" />
			case 'SCREENSHOT': return <Camera className="w-4 h-4 text-purple-500" />
			case 'MILESTONE_ATTACHMENT': return <File className="w-4 h-4 text-orange-500" />
			case 'CHAT_ATTACHMENT': return <File className="w-4 h-4 text-gray-500" />
			case 'CONTRACT_DOCUMENT': return <FileText className="w-4 h-4 text-red-500" />
			default: return <FileText className="w-4 h-4 text-gray-400" />
		}
	}

	const getSourceTypeText = (sourceType: string) => {
		switch (sourceType) {
			case 'EXTERNAL_URL': return 'Liên kết ngoài'
			case 'DOCUMENT_UPLOAD': return 'Tài liệu upload'
			case 'SCREENSHOT': return 'Ảnh chụp màn hình'
			case 'MILESTONE_ATTACHMENT': return 'Đính kèm milestone'
			case 'CHAT_ATTACHMENT': return 'Đính kèm chat'
			case 'CONTRACT_DOCUMENT': return 'Tài liệu hợp đồng'
			default: return sourceType
		}
	}

	return (
		<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b border-gray-100">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center space-x-3 mb-2">
							<div className="flex items-center space-x-2">
								<span className="text-sm font-medium text-gray-900">
									{submission.submittedBy.firstName} {submission.submittedBy.lastName}
								</span>
								<span className="text-xs text-gray-500">
									({submission.submittedBy.role === 'CLIENT' ? 'Khách hàng' : 'Freelancer'})
								</span>
								{isOwnSubmission && (
									<span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
										Của bạn
									</span>
								)}
							</div>
							<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
								{getStatusText(submission.status)}
							</span>
						</div>
						
						{submission.title && (
							<h5 className="font-medium text-gray-900 mb-1">{submission.title}</h5>
						)}
						
						<div className="flex items-center justify-between">
							<div className="text-xs text-gray-500">
								Nộp lúc: {new Date(submission.createdAt).toLocaleString('vi-VN')}
								{submission.submittedAt && (
									<span className="ml-2">
										• Gửi lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
									</span>
								)}
							</div>
							<button
								onClick={() => setIsExpanded(!isExpanded)}
								className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
							>
								<span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
								{isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Expanded Content */}
			{isExpanded && (
				<div className="p-4 bg-gray-50">
					{/* Description */}
					{submission.description && (
						<div className="mb-4">
							<h6 className="text-sm font-medium text-gray-700 mb-1">Mô tả:</h6>
							<p className="text-sm text-gray-600">{submission.description}</p>
						</div>
					)}

					{/* Evidence Items */}
					{submission.items.length > 0 && (
						<div className="mb-4">
							<h6 className="text-sm font-medium text-gray-700 mb-2">
								Bằng chứng đính kèm ({submission.items.length}):
							</h6>
							<div className="space-y-3">
								{submission.items.map((item: any, index: number) => (
									<div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
										<div className="flex items-start space-x-3">
											{getSourceTypeIcon(item.sourceType)}
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<h6 className="text-sm font-medium text-gray-900 truncate">
														{item.label || item.fileName || `Bằng chứng ${index + 1}`}
													</h6>
													<span className="text-xs text-gray-500 ml-2">
														{getSourceTypeText(item.sourceType)}
													</span>
												</div>
												
												{item.description && (
													<p className="text-xs text-gray-600 mb-2">{item.description}</p>
												)}
												
												<div className="flex items-center space-x-4 text-xs text-gray-500">
													{item.fileName && (
														<span>📄 {item.fileName}</span>
													)}
													{item.fileSize && (
														<span>📊 {(item.fileSize / 1024).toFixed(1)} KB</span>
													)}
													{item.url && (
														<a 
															href={item.url} 
															target="_blank" 
															rel="noopener noreferrer"
															className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
														>
															<ExternalLink className="w-3 h-3" />
															<span>Xem liên kết</span>
														</a>
													)}
													{item.fileName && item.assetId && (
														<button
															onClick={() => {
																// TODO: Implement file download
																toast.info('Chức năng tải file sẽ được triển khai khi có real file upload')
															}}
															className="text-green-600 hover:text-green-800 flex items-center space-x-1"
														>
															<Download className="w-3 h-3" />
															<span>Tải xuống</span>
														</button>
													)}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Review Information */}
					{submission.reviewedAt && (
						<div className="border-t border-gray-200 pt-3">
							<h6 className="text-sm font-medium text-gray-700 mb-2">Kết quả xem xét:</h6>
							<div className="text-xs text-gray-600">
								<p>Xem xét lúc: {new Date(submission.reviewedAt).toLocaleString('vi-VN')}</p>
								{submission.reviewNotes && (
									<p className="mt-1">Ghi chú: {submission.reviewNotes}</p>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}