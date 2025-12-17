import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
	Scale, 
	DollarSign, 
	Clock, 
	CheckCircle, 
	XCircle, 
	AlertTriangle
} from 'lucide-react'
import { toast } from 'react-toastify'

import type { 
	MediationProposal, 
	CreateMediationProposalInput
} from '~/types/mediation-evidence'
import {
	MediationProposalStatus,
	MediationResponse
} from '~/types/mediation-evidence'
import DisputeExportPanel from '~/components/dispute-export/DisputeExportPanel'

// Utility functions for formatting
const formatCurrency = (amount: number, currency: string) => {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: currency || 'USD'
	}).format(amount)
}

const formatDateTime = (dateString: string) => {
	return new Date(dateString).toLocaleString('vi-VN')
}

const CreateProposalSchema = z.object({
	releaseAmount: z.number().min(0, 'Release amount must be >= 0'),
	refundAmount: z.number().min(0, 'Refund amount must be >= 0'),
	reasoning: z.string().min(5, 'Reasoning must be at least 5 characters').max(5000),
	responseDeadlineDays: z.number().int().min(1).max(30)
}).refine(
	(data) => data.releaseAmount + data.refundAmount > 0,
	{ message: 'Total amount must be greater than 0' }
)

type CreateProposalFormData = z.infer<typeof CreateProposalSchema>

interface AdminMediationPanelProps {
	disputeId: string
	disputeStatus: string
	escrowAmount: number
	currency: string
	proposals: MediationProposal[]
	onCreateProposal: (input: CreateMediationProposalInput) => Promise<void>
	onDeleteProposal: (proposalId: string) => Promise<void>
	isLoading?: boolean
	hasJoinedChat: boolean
}

export default function AdminMediationPanel({
	disputeId,
	disputeStatus,
	escrowAmount,
	currency,
	proposals,
	onCreateProposal,
	onDeleteProposal,
	isLoading = false,
	hasJoinedChat
}: AdminMediationPanelProps) {
	const [activeTab, setActiveTab] = useState<'proposals' | 'create'>('proposals')
	const [showCreateForm, setShowCreateForm] = useState(false)

	const {
		register,
		handleSubmit,
		watch,
		reset,
		formState: { errors, isValid }
	} = useForm<CreateProposalFormData>({
		resolver: zodResolver(CreateProposalSchema),
		defaultValues: {
			releaseAmount: 0,
			refundAmount: 0,
			reasoning: '',
			responseDeadlineDays: 7
		}
	})

	const releaseAmount = watch('releaseAmount', 0)
	const refundAmount = watch('refundAmount', 0)
	const totalAmount = releaseAmount + refundAmount
	const platformFee = Math.max(0, escrowAmount - totalAmount)
	const isValidSplit = totalAmount <= escrowAmount

	// Check if there's an active proposal or accepted proposal
	const activeProposal = proposals.find(p => p.status === MediationProposalStatus.PENDING)
	const acceptedProposal = proposals.find(p => p.status === MediationProposalStatus.ACCEPTED_BY_ALL)
	const isInternalMediationStage = disputeStatus === 'INTERNAL_MEDIATION'
	const canCreateProposal = hasJoinedChat && !activeProposal && !acceptedProposal && isInternalMediationStage

	useEffect(() => {
		if (proposals.length > 0) {
			setActiveTab('proposals')
		}
	}, [proposals.length])

	const handleCreateProposal = async (data: CreateProposalFormData) => {
		if (!isValidSplit) {
			toast.error('Tổng số tiền không được vượt quá số tiền escrow')
			return
		}

		try {
			await onCreateProposal(data)
			reset()
			setShowCreateForm(false)
			setActiveTab('proposals')
			toast.success('Đề xuất hòa giải đã được tạo thành công')
		} catch (error) {
			console.error('Create proposal error:', error)
		}
	}

	const handleDeleteProposal = async (proposalId: string) => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa đề xuất này?')) {
			return
		}

		try {
			await onDeleteProposal(proposalId)
			toast.success('Đề xuất đã được xóa thành công')
		} catch (error) {
			console.error('Delete proposal error:', error)
		}
	}

	if (!hasJoinedChat) {
		return (
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
				<div className="flex items-center gap-3">
					<AlertTriangle className="w-6 h-6 text-yellow-600" />
					<div>
						<h3 className="font-medium text-yellow-800">Cần tham gia chat</h3>
						<p className="text-sm text-yellow-700 mt-1">
							Bạn phải tham gia phòng chat tranh chấp trước khi tạo đề xuất hòa giải.
						</p>
					</div>
				</div>
			</div>
		)
	}

	if (!isInternalMediationStage) {
		return (
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
				<div className="flex items-center gap-3">
					<Scale className="w-6 h-6 text-blue-600" />
					<div>
						<h3 className="font-medium text-blue-800">Chưa tới giai đoạn hòa giải</h3>
						<p className="text-sm text-blue-700 mt-1">
							Dispute chưa chuyển sang giai đoạn hòa giải nội bộ. Admin chỉ có thể tạo đề xuất khi dispute ở trạng thái "INTERNAL_MEDIATION".
						</p>
						<p className="text-xs text-blue-600 mt-2">
							Trạng thái hiện tại: {disputeStatus || 'Không xác định'}
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200">
			<div className="px-6 py-4 border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Scale className="w-6 h-6 text-blue-600" />
						<div>
							<h2 className="text-xl font-semibold text-gray-900">Quản lý hòa giải</h2>
							<p className="text-sm text-gray-600">
								Escrow: {formatCurrency(escrowAmount, currency)}
							</p>
						</div>
					</div>
					{canCreateProposal ? (
						<button
							onClick={() => setShowCreateForm(true)}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
							disabled={isLoading}
						>
							Tạo đề xuất
						</button>
					) : isInternalMediationStage && hasJoinedChat ? (
						<div className="text-sm text-gray-500">
							{activeProposal ? 'Có đề xuất đang chờ phản hồi' : 
							 acceptedProposal ? 'Đã có đề xuất được chấp nhận' : 
							 'Không thể tạo đề xuất'}
						</div>
					) : null}
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="flex">
					<button
						onClick={() => setActiveTab('proposals')}
						className={`px-6 py-3 text-sm font-medium border-b-2 ${
							activeTab === 'proposals'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'
						}`}
					>
						Đề xuất ({proposals.length})
					</button>
				</nav>
			</div>

			<div className="p-6">
				{activeTab === 'proposals' && (
					<ProposalsList
						proposals={proposals}
						currency={currency}
						onDelete={handleDeleteProposal}
						isLoading={isLoading}
					/>
				)}
			</div>

			{/* Create Proposal Modal */}
			{showCreateForm && (
				<CreateProposalModal
					escrowAmount={escrowAmount}
					currency={currency}
					onSubmit={handleCreateProposal}
					onCancel={() => {
						setShowCreateForm(false)
						reset()
					}}
					register={register}
					handleSubmit={handleSubmit}
					watch={watch}
					errors={errors}
					isValid={isValid}
					isLoading={isLoading}
					releaseAmount={releaseAmount}
					refundAmount={refundAmount}
					totalAmount={totalAmount}
					platformFee={platformFee}
					isValidSplit={isValidSplit}
				/>
			)}

			{/* Dispute Export Panel */}
			<div className="mt-6 px-6 pb-6">
				<DisputeExportPanel 
					disputeId={disputeId}
					disputeStatus={disputeStatus}
				/>
			</div>
		</div>
	)
}
interface ProposalsListProps {
	proposals: MediationProposal[]
	currency: string
	onDelete: (proposalId: string) => Promise<void>
	isLoading: boolean
}

function ProposalsList({ proposals, currency, onDelete, isLoading }: ProposalsListProps) {
	if (proposals.length === 0) {
		return (
			<div className="text-center py-8">
				<Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đề xuất nào</h3>
				<p className="text-gray-600">Tạo đề xuất hòa giải để giúp giải quyết tranh chấp này.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{proposals.map((proposal) => (
				<ProposalCard
					key={proposal.id}
					proposal={proposal}
					currency={currency}
					onDelete={onDelete}
					isLoading={isLoading}
				/>
			))}
		</div>
	)
}

interface ProposalCardProps {
	proposal: MediationProposal
	currency: string
	onDelete: (proposalId: string) => Promise<void>
	isLoading: boolean
}

function ProposalCard({ proposal, currency, onDelete, isLoading }: ProposalCardProps) {
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
				return 'Được chấp nhận'
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
		<div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					{getStatusIcon(proposal.status)}
					<div>
						<h4 className="font-medium text-gray-900">{getStatusLabel(proposal.status)}</h4>
						<p className="text-sm text-gray-600">
							Created {formatDateTime(proposal.createdAt)}
						</p>
					</div>
				</div>
				{proposal.status === MediationProposalStatus.PENDING && (
					<button
						onClick={() => onDelete(proposal.id)}
						className="text-red-600 hover:text-red-800 text-sm"
						disabled={isLoading}
					>
						Xóa
					</button>
				)}
			</div>

			{/* Amount Breakdown */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div className="bg-white rounded-lg p-4 border">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign className="w-4 h-4 text-green-600" />
						<span className="text-sm font-medium text-gray-700">Trả Freelancer</span>
					</div>
					<p className="text-lg font-semibold text-green-600">
						{formatCurrency(proposal.releaseAmount, currency)}
					</p>
				</div>
				<div className="bg-white rounded-lg p-4 border">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign className="w-4 h-4 text-blue-600" />
						<span className="text-sm font-medium text-gray-700">Hoàn trả Client</span>
					</div>
					<p className="text-lg font-semibold text-blue-600">
						{formatCurrency(proposal.refundAmount, currency)}
					</p>
				</div>
				<div className="bg-white rounded-lg p-4 border">
					<div className="flex items-center gap-2 mb-2">
						<DollarSign className="w-4 h-4 text-gray-600" />
						<span className="text-sm font-medium text-gray-700">Phí nền tảng</span>
					</div>
					<p className="text-lg font-semibold text-gray-600">
						{formatCurrency((proposal.escrowAmount || 0) - proposal.releaseAmount - proposal.refundAmount, currency)}
					</p>
				</div>
			</div>

			{/* Reasoning */}
			<div className="mb-4">
				<h5 className="font-medium text-gray-900 mb-2">Lý do</h5>
				<p className="text-gray-700 bg-white p-3 rounded border break-words whitespace-pre-wrap">{proposal.reasoning}</p>
			</div>

			{/* Response Status */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div className="bg-white rounded-lg p-4 border">
					<div className="flex items-center gap-2 mb-2">
						{getResponseIcon(proposal.clientResponse)}
						<span className="text-sm font-medium text-gray-700">Phản hồi Client</span>
					</div>
					<p className="font-medium">{getResponseLabel(proposal.clientResponse)}</p>
					{proposal.clientRespondedAt && (
						<p className="text-xs text-gray-500 mt-1">
							{formatDateTime(proposal.clientRespondedAt)}
						</p>
					)}
					{proposal.clientResponseMessage && (
						<p className="text-sm text-gray-600 mt-2 italic break-words">
							"{proposal.clientResponseMessage}"
						</p>
					)}
				</div>
				<div className="bg-white rounded-lg p-4 border">
					<div className="flex items-center gap-2 mb-2">
						{getResponseIcon(proposal.freelancerResponse)}
						<span className="text-sm font-medium text-gray-700">Phản hồi Freelancer</span>
					</div>
					<p className="font-medium">{getResponseLabel(proposal.freelancerResponse)}</p>
					{proposal.freelancerRespondedAt && (
						<p className="text-xs text-gray-500 mt-1">
							{formatDateTime(proposal.freelancerRespondedAt)}
						</p>
					)}
					{proposal.freelancerResponseMessage && (
						<p className="text-sm text-gray-600 mt-2 italic break-words">
							"{proposal.freelancerResponseMessage}"
						</p>
					)}
				</div>
			</div>

			{/* Payment Status for Accepted Proposals */}
			{proposal.status === MediationProposalStatus.ACCEPTED_BY_ALL && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
							<span className="text-sm font-medium text-blue-800">Trạng thái thanh toán</span>
						</div>
						<span className="text-xs text-blue-600">Đang xử lý tự động</span>
					</div>
					<p className="text-xs text-blue-700 mt-2">
						Hệ thống đang chuyển tiền qua Stripe theo thỏa thuận đã được chấp nhận.
					</p>
				</div>
			)}

			{/* Deadline */}
			<div className="flex items-center gap-2 text-sm text-gray-600">
				<Clock className="w-4 h-4" />
				<span>Hạn phản hồi: {formatDateTime(proposal.responseDeadline)}</span>
			</div>
		</div>
	)
}
interface CreateProposalModalProps {
	escrowAmount: number
	currency: string
	onSubmit: (data: CreateProposalFormData) => Promise<void>
	onCancel: () => void
	register: any
	handleSubmit: any
	watch: any
	errors: any
	isValid: boolean
	isLoading: boolean
	releaseAmount: number
	refundAmount: number
	totalAmount: number
	platformFee: number
	isValidSplit: boolean
}

function CreateProposalModal({
	escrowAmount,
	currency,
	onSubmit,
	onCancel,
	register,
	handleSubmit,
	watch,
	errors,
	isValid,
	isLoading,
	releaseAmount,
	refundAmount,
	totalAmount,
	platformFee,
	isValidSplit
}: CreateProposalModalProps) {
	return (
		<div className="fixed inset-0 bg-gray-900 bg-opacity-20 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
				<div className="px-6 py-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900">Tạo đề xuất hòa giải</h3>
					<p className="text-sm text-gray-600 mt-1">
						Đề xuất giải pháp cho tranh chấp này
					</p>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
					{/* Amount Inputs */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Trả cho Freelancer
							</label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									{...register('releaseAmount', { valueAsNumber: true })}
									type="number"
									min="0"
									max={escrowAmount}
									step="0.01"
									className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="0.00"
								/>
							</div>
							{errors.releaseAmount && (
								<p className="text-red-500 text-sm mt-1">{errors.releaseAmount.message}</p>
							)}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Hoàn trả cho Client
							</label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									{...register('refundAmount', { valueAsNumber: true })}
									type="number"
									min="0"
									max={escrowAmount}
									step="0.01"
									className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="0.00"
								/>
							</div>
							{errors.refundAmount && (
								<p className="text-red-500 text-sm mt-1">{errors.refundAmount.message}</p>
							)}
						</div>
					</div>

					{/* Amount Summary */}
					<div className="bg-gray-50 rounded-lg p-4">
						<h4 className="font-medium text-gray-900 mb-3">Tóm tắt đề xuất</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span>Số tiền Escrow:</span>
								<span className="font-medium">{formatCurrency(escrowAmount, currency)}</span>
							</div>
							<div className="flex justify-between">
								<span>Trả cho Freelancer:</span>
								<span className="font-medium text-green-600">{formatCurrency(releaseAmount, currency)}</span>
							</div>
							<div className="flex justify-between">
								<span>Hoàn trả cho Client:</span>
								<span className="font-medium text-blue-600">{formatCurrency(refundAmount, currency)}</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span>Phí nền tảng:</span>
								<span className="font-medium">{formatCurrency(platformFee, currency)}</span>
							</div>
							<div className="flex justify-between font-semibold">
								<span>Tổng phân bổ:</span>
								<span className={totalAmount > escrowAmount ? 'text-red-600' : 'text-gray-900'}>
									{formatCurrency(totalAmount, currency)}
								</span>
							</div>
						</div>
						{!isValidSplit && (
							<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
								<p className="text-red-700 text-sm">
									Tổng số tiền không được vượt quá số tiền escrow {formatCurrency(escrowAmount, currency)}
								</p>
							</div>
						)}
					</div>

					{/* Reasoning */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Lý do *
						</label>
						<textarea
							{...register('reasoning')}
							rows={5}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Giải thích lý do đằng sau đề xuất này. Xem xét bằng chứng từ cả hai bên, tính chất của tranh chấp và sự công bằng cho cả hai bên..."
						/>
						{errors.reasoning && (
							<p className="text-red-500 text-sm mt-1">{errors.reasoning.message}</p>
						)}
					</div>

					{/* Response Deadline */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Hạn phản hồi (Ngày)
						</label>
						<select
							{...register('responseDeadlineDays', { valueAsNumber: true })}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value={3}>3 ngày</option>
							<option value={7}>7 ngày</option>
							<option value={14}>14 ngày</option>
							<option value={30}>30 ngày</option>
						</select>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={onCancel}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
							disabled={isLoading}
						>
							Hủy
						</button>
						<button
							type="submit"
							disabled={!isValid || !isValidSplit || isLoading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Đang tạo...' : 'Tạo đề xuất'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}