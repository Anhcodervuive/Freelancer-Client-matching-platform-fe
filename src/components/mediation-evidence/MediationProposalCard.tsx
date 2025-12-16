import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
	CheckCircle, 
	XCircle, 
	Clock, 
	DollarSign, 
	AlertTriangle,
	Scale
} from 'lucide-react'
import { toast } from 'react-toastify'

import type { 
	MediationProposal, 
	RespondToMediationProposalInput
} from '~/types/mediation-evidence'
import {
	MediationResponse,
	MediationProposalStatus
} from '~/types/mediation-evidence'
import { formatCurrency, formatDateTime } from '~/utils/format'

const ResponseSchema = z.object({
	response: z.enum(['ACCEPTED', 'REJECTED']),
	message: z.string().max(2000).optional()
})

type ResponseFormData = z.infer<typeof ResponseSchema>

interface MediationProposalCardProps {
	proposal: MediationProposal
	userRole: 'CLIENT' | 'FREELANCER'
	onRespond: (_input: RespondToMediationProposalInput) => Promise<void>
	isLoading?: boolean
}

export default function MediationProposalCard({
	proposal,
	userRole,
	onRespond,
	isLoading = false
}: MediationProposalCardProps) {
	const [showResponseForm, setShowResponseForm] = useState(false)
	const [selectedResponse, setSelectedResponse] = useState<'ACCEPTED' | 'REJECTED' | null>(null)

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors }
	} = useForm<ResponseFormData>({
		resolver: zodResolver(ResponseSchema)
	})

	const userResponse = userRole === 'CLIENT' ? proposal.clientResponse : proposal.freelancerResponse
	const otherResponse = userRole === 'CLIENT' ? proposal.freelancerResponse : proposal.clientResponse
	const userRespondedAt = userRole === 'CLIENT' ? proposal.clientRespondedAt : proposal.freelancerRespondedAt
	const otherRespondedAt = userRole === 'CLIENT' ? proposal.freelancerRespondedAt : proposal.clientRespondedAt
	const userResponseMessage = userRole === 'CLIENT' ? proposal.clientResponseMessage : proposal.freelancerResponseMessage
	const otherResponseMessage = userRole === 'CLIENT' ? proposal.freelancerResponseMessage : proposal.clientResponseMessage
	const otherRole = userRole === 'CLIENT' ? 'Freelancer' : 'Client'

	const canRespond = proposal.status === MediationProposalStatus.PENDING && 
					   userResponse === MediationResponse.PENDING

	const isExpired = new Date() > new Date(proposal.responseDeadline)

	const handleResponseSubmit = async (data: ResponseFormData) => {
		try {
			await onRespond({
				response: data.response as MediationResponse,
				message: data.message
			})
			setShowResponseForm(false)
			setSelectedResponse(null)
			reset()
			toast.success('Phản hồi đã được gửi thành công')
		} catch (error) {
			console.error('Response error:', error)
		}
	}

	const startResponse = (response: 'ACCEPTED' | 'REJECTED') => {
		setSelectedResponse(response)
		setShowResponseForm(true)
	}

	const getStatusIcon = (status: MediationProposalStatus) => {
		switch (status) {
			case MediationProposalStatus.PENDING:
				return <Clock className="w-5 h-5 text-yellow-500" />
			case MediationProposalStatus.ACCEPTED_BY_ALL:
				return <CheckCircle className="w-5 h-5 text-green-500" />
			case MediationProposalStatus.REJECTED:
				return <XCircle className="w-5 h-5 text-red-500" />
			case MediationProposalStatus.EXPIRED:
				return <XCircle className="w-5 h-5 text-gray-500" />
		}
	}

	const getStatusLabel = (status: MediationProposalStatus) => {
		switch (status) {
			case MediationProposalStatus.PENDING:
				return 'Chờ phản hồi'
			case MediationProposalStatus.ACCEPTED_BY_ALL:
				return 'Đã đồng ý'
			case MediationProposalStatus.REJECTED:
				return 'Bị từ chối'
			case MediationProposalStatus.EXPIRED:
				return 'Đã hết hạn'
		}
	}

	const getResponseIcon = (response: MediationResponse) => {
		switch (response) {
			case MediationResponse.PENDING:
				return <Clock className="w-4 h-4 text-yellow-500" />
			case MediationResponse.ACCEPTED:
				return <CheckCircle className="w-4 h-4 text-green-500" />
			case MediationResponse.REJECTED:
				return <XCircle className="w-4 h-4 text-red-500" />
		}
	}

	const getResponseLabel = (response: MediationResponse) => {
		switch (response) {
			case MediationResponse.PENDING:
				return 'Chờ phản hồi'
			case MediationResponse.ACCEPTED:
				return 'Chấp nhận'
			case MediationResponse.REJECTED:
				return 'Từ chối'
		}
	}

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Scale className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Đề xuất hòa giải</h3>
							<p className="text-sm text-gray-600">
								Đề xuất bởi Admin • {formatDateTime(proposal.createdAt)}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border">
						{getStatusIcon(proposal.status)}
						<span className="text-sm font-medium">{getStatusLabel(proposal.status)}</span>
					</div>
				</div>
			</div>

			<div className="p-6 space-y-6">
				{/* Proposal Amounts */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="bg-green-50 rounded-xl p-4 border border-green-200">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-green-600" />
							<span className="text-sm font-medium text-green-800">Freelancer nhận</span>
						</div>
						<p className="text-lg font-bold text-green-600 break-words">
							{formatCurrency(proposal.releaseAmount, proposal.currency)}
						</p>
					</div>
					<div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-blue-600" />
							<span className="text-sm font-medium text-blue-800">Hoàn trả Client</span>
						</div>
						<p className="text-lg font-bold text-blue-600 break-words">
							{formatCurrency(proposal.refundAmount, proposal.currency)}
						</p>
					</div>
					<div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-gray-600" />
							<span className="text-sm font-medium text-gray-700">Phí nền tảng</span>
						</div>
						<p className="text-lg font-bold text-gray-600 break-words">
							{formatCurrency(
								(proposal.escrowAmount || 0) - proposal.releaseAmount - proposal.refundAmount, 
								proposal.currency
							)}
						</p>
					</div>
				</div>

				{/* Reasoning */}
				<div>
					<h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
						<div className="w-1 h-5 bg-blue-500 rounded-full"></div>
						Lý do của Admin
					</h4>
					<div className="bg-gray-50 rounded-xl p-4 border">
						<p className="text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
							{proposal.reasoning}
						</p>
					</div>
				</div>

				{/* Response Status */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-white rounded-xl p-4 border-2 border-gray-100">
						<div className="flex items-center gap-2 mb-3">
							{getResponseIcon(userResponse)}
							<span className="text-sm font-medium text-gray-700">Phản hồi của bạn</span>
						</div>
						<p className="font-semibold text-gray-900">{getResponseLabel(userResponse)}</p>
						{userRespondedAt && (
							<p className="text-xs text-gray-500 mt-1">
								{formatDateTime(userRespondedAt)}
							</p>
						)}
						{userResponseMessage && (
							<div className="mt-3 p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600 italic break-words">
									"{userResponseMessage}"
								</p>
							</div>
						)}
					</div>
					<div className="bg-white rounded-xl p-4 border-2 border-gray-100">
						<div className="flex items-center gap-2 mb-3">
							{getResponseIcon(otherResponse)}
							<span className="text-sm font-medium text-gray-700">Phản hồi {otherRole}</span>
						</div>
						<p className="font-semibold text-gray-900">{getResponseLabel(otherResponse)}</p>
						{otherRespondedAt && (
							<p className="text-xs text-gray-500 mt-1">
								{formatDateTime(otherRespondedAt)}
							</p>
						)}
						{otherResponseMessage && (
							<div className="mt-3 p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600 italic break-words">
									"{otherResponseMessage}"
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Deadline Warning */}
				{canRespond && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
							<div>
								<p className="font-medium text-yellow-800">Cần phản hồi</p>
								<p className="text-sm text-yellow-700 mt-1">
									Vui lòng phản hồi trước {formatDateTime(proposal.responseDeadline)}
									{isExpired && ' (Đã hết hạn)'}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Success Message */}
				{proposal.status === MediationProposalStatus.ACCEPTED_BY_ALL && (
					<div className="bg-green-50 border border-green-200 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<p className="font-medium text-green-800">Đã đạt được thỏa thuận!</p>
								<p className="text-sm text-green-700 mt-1">
									Cả hai bên đã chấp nhận đề xuất. Thanh toán đang được xử lý tự động.
								</p>
								<div className="mt-3 flex items-center gap-2 text-xs text-green-600">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
									<span>Đang chuyển tiền qua Stripe...</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Response Actions */}
				{canRespond && !isExpired && !showResponseForm && (
					<div className="flex flex-col sm:flex-row justify-center gap-3">
						<button
							onClick={() => startResponse('ACCEPTED')}
							className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 font-medium transition-colors"
							disabled={isLoading}
						>
							<CheckCircle className="w-4 h-4" />
							Chấp nhận đề xuất
						</button>
						<button
							onClick={() => startResponse('REJECTED')}
							className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 font-medium transition-colors"
							disabled={isLoading}
						>
							<XCircle className="w-4 h-4" />
							Từ chối đề xuất
						</button>
					</div>
				)}

				{/* Response Form */}
				{showResponseForm && selectedResponse && (
					<div className="bg-gray-50 rounded-xl p-6 border">
						<h4 className="font-medium text-gray-900 mb-4">
							{selectedResponse === 'ACCEPTED' ? 'Xác nhận chấp nhận' : 'Lý do từ chối'}
						</h4>
						
						<form onSubmit={handleSubmit(handleResponseSubmit)} className="space-y-4">
							<input type="hidden" {...register('response')} value={selectedResponse} />
							
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{selectedResponse === 'ACCEPTED' ? 'Tin nhắn (Tùy chọn)' : 'Lý do từ chối'}
								</label>
								<textarea
									{...register('message')}
									rows={4}
									className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder={
										selectedResponse === 'ACCEPTED' 
											? 'Thêm bình luận về việc chấp nhận...'
											: 'Vui lòng giải thích lý do từ chối đề xuất này...'
									}
								/>
								{errors.message && (
									<p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
								)}
							</div>

							<div className="flex flex-col sm:flex-row justify-end gap-3">
								<button
									type="button"
									onClick={() => {
										setShowResponseForm(false)
										setSelectedResponse(null)
										reset()
									}}
									className="px-6 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 font-medium transition-colors"
									disabled={isLoading}
								>
									Hủy
								</button>
								<button
									type="submit"
									className={`px-6 py-2 text-white rounded-xl font-medium transition-colors ${
										selectedResponse === 'ACCEPTED' 
											? 'bg-green-600 hover:bg-green-700' 
											: 'bg-red-600 hover:bg-red-700'
									}`}
									disabled={isLoading}
								>
									{isLoading ? 'Đang gửi...' : `Xác nhận ${selectedResponse === 'ACCEPTED' ? 'chấp nhận' : 'từ chối'}`}
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		</div>
	)
}