import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { isAxiosError } from 'axios'
import {
        AlertTriangle,
        Ban,
        ArrowLeft,
        CalendarClock,
        CheckCircle2,
        CreditCard,
        Download,
        Eye,
        Flag,
        FolderOpen,
        ChevronDown,
        History,
        LayoutDashboard,
        Loader2,
        MessageCircle,
        Paperclip,
        UploadCloud,
        XCircle,
        ShieldCheck,
        Trash2,
        Wallet2,
        Users,
        Star,
        ThumbsUp,
        ThumbsDown
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'react-toastify'

import {
        createContractMilestone,
        cancelContractMilestone,
        deleteContractMilestone,
        deleteContractMilestoneResource,
        getContractDetail,
        listContractMilestones,
        uploadContractMilestoneAttachments,
        submitMilestoneWork,
        approveMilestoneSubmission,
        declineMilestoneSubmission,
        payMilestone,
        respondMilestoneCancellation,
        endContract,
        submitContractFeedback
} from '~/apis/contract.api'
import { getAllPaymentMethod } from '~/apis/payment-method.api'
import { getContractStatusDescription, getContractStatusMeta } from '~/constants/contract'
import { routes } from '~/config/routes'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { type ContractClosureReasonOption, type ContractFeedback } from '~/types/contract'
import type {
        Contract,
        ContractMilestone,
        ContractMilestoneSubmission,
        ContractMilestoneResource,
        CreateContractMilestoneInput,
        PayContractMilestoneInput,
        PayContractMilestoneResponse
} from '~/types/contract'
import type { PaymentMethod } from '~/types/payment-method'
import { Role } from '~/types/user'
import { formatCurrency, formatDateTime, formatFileSize, formatFileType } from '~/utils/format'
import { normalizeAttachments, type NormalizedAttachment } from '~/utils/jobPost'
import { extractPaymentErrorMessage, extractPaymentMeta } from '~/utils/payment'
import { getStripe } from '~/utils/stripe'
import {
	extractLanguageLabels,
	extractSkillNames,
	getBudgetDisplay,
	getCurrency,
	getParticipantLocation,
	getParticipantName
} from './utils'
import type {
        ApproveMilestoneSubmissionFormValues,
        CancelMilestoneFormValues,
        DeclineMilestoneSubmissionFormValues,
        RespondMilestoneCancellationFormValues,
        EndContractFormValues,
        SubmitContractFeedbackFormValues
} from './schemas'
import CreateMilestoneDialog from './components/CreateMilestoneDialog'
import SubmitMilestoneWorkDialog from './components/SubmitMilestoneWorkDialog'
import ReviewMilestoneSubmissionDialog from './components/ReviewMilestoneSubmissionDialog'
import FundMilestoneDialog from './components/FundMilestoneDialog'
import CancelMilestoneDialog from './components/CancelMilestoneDialog'
import RespondMilestoneCancellationDialog from './components/RespondMilestoneCancellationDialog'
import ConfirmDelete from '~/components/ConfirmDelete'
import EndContractDialog from './components/EndContractDialog'
import SubmitContractFeedbackDialog from './components/SubmitContractFeedbackDialog'

const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'milestones', label: 'Milestones', icon: Flag },
        { id: 'files', label: 'Tệp đính kèm', icon: FolderOpen },
        { id: 'payments', label: 'Thanh toán', icon: CreditCard },
        { id: 'history', label: 'Lịch sử', icon: History }
] as const

type ViewerRole = 'client' | 'freelancer' | 'all'

const MILESTONES_PER_PAGE = 4

const extractErrorMessage = (value: unknown): string | null => {
        if (!value) {
                return null
        }

        if (typeof value === 'string') {
                const trimmed = value.trim()
                return trimmed.length > 0 ? trimmed : null
        }

        if (Array.isArray(value)) {
                for (const item of value) {
                        const message = extractErrorMessage(item)
                        if (message) {
                                return message
                        }
                }

                return null
        }

        if (typeof value !== 'object') {
                return null
        }

        const record = value as Record<string, unknown>
        const candidates: unknown[] = []

        if ('message' in record) candidates.push(record.message)
        if ('error' in record) candidates.push(record.error)
        if ('detail' in record) candidates.push(record.detail)
        if ('errors' in record) candidates.push(record.errors)
        if ('title' in record) candidates.push(record.title)

        for (const candidate of candidates) {
                const message = extractErrorMessage(candidate)
                if (message) {
                        return message
                }
        }

        return null
}

const milestoneStatusMeta: Record<string, { label: string; badge: string; text: string }> = {
	PENDING: { label: 'Chờ bắt đầu', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
	IN_PROGRESS: { label: 'Đang thực hiện', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	SUBMITTED: { label: 'Đã gửi duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	APPROVED: { label: 'Đã duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	RELEASED: { label: 'Đã thanh toán', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	COMPLETED: { label: 'Hoàn thành', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	CANCELLED: { label: 'Đã hủy', badge: 'bg-rose-50 border-rose-200', text: 'text-rose-700' }
}

const getMilestoneStatusMeta = (status?: string | null) => {
	if (!status) {
		return { label: 'Không xác định', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
	}
	const normalized = status.toUpperCase()
	return (
		milestoneStatusMeta[normalized] || {
			label: status
				.toLowerCase()
				.split(/[_\s]+/)
				.map(part => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' '),
			badge: 'bg-slate-100 border-slate-200',
			text: 'text-slate-600'
		}
	)
}

const submissionStatusMeta: Record<string, { label: string; badge: string; text: string }> = {
	SUBMITTED: { label: 'Chờ duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	PENDING: { label: 'Chờ duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	SUBMITED: { label: 'Chờ duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	AWAITING_REVIEW: { label: 'Chờ duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	AWAITING_APPROVAL: { label: 'Chờ duyệt', badge: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
	APPROVED: { label: 'Đã duyệt', badge: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
	DECLINED: { label: 'Yêu cầu chỉnh sửa', badge: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
	REVISED: { label: 'Đã cập nhật', badge: 'bg-secondary/10 border-secondary/40', text: 'text-secondary' }
}

const getSubmissionStatusMeta = (status?: string | null) => {
	if (!status) {
		return { label: 'Không xác định', badge: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
	}
	const normalized = status.toUpperCase()
	return (
		submissionStatusMeta[normalized] || {
			label: status
				.toLowerCase()
				.split(/[_\s]+/)
				.map(part => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' '),
			badge: 'bg-slate-100 border-slate-200',
			text: 'text-slate-600'
		}
	)
}

const pendingReviewStatuses = new Set(['SUBMITTED', 'PENDING', 'SUBMITED', 'AWAITING_REVIEW', 'AWAITING_APPROVAL'])

const collectAttachmentInputs = (...sources: unknown[]): unknown[] =>
        sources.flatMap(source => {
                if (Array.isArray(source)) return source
                if (source === null || source === undefined) return []
                return [source]
        })

const isSubmissionAwaitingReview = (status?: string | null) => {
        if (!status) return false
        return pendingReviewStatuses.has(status.toUpperCase())
}

type EscrowStatusMeta = {
	status: string
	label: string
	icon: LucideIcon
	iconClass: string
	textClass: string
	chip?: string
	caption?: string
	captionClass?: string
	spinner?: boolean
}

const toSentenceCase = (value: string) =>
	value
		.toLowerCase()
		.split(/[_\s]+/)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')

const buildEscrowStatusMeta = (
	status: string,
	milestone: ContractMilestone,
	viewerRole: ViewerRole
): EscrowStatusMeta => {
	const normalizedStatus = status || 'UNFUNDED'
	const escrowCurrency = milestone.escrow?.currency ?? milestone.currency
	const milestoneBudget = formatCurrency(milestone.amount, milestone.currency)
	const fundedAmount = formatCurrency(milestone.escrow?.amountFunded, escrowCurrency)
	const releasedAmount = formatCurrency(milestone.escrow?.amountReleased ?? milestone.amount, escrowCurrency)
	const refundedAmount = formatCurrency(milestone.escrow?.amountRefunded, escrowCurrency)

	if (normalizedStatus === 'FUNDED') {
		const updatedAtText =
			formatDateTime(milestone.escrow?.updatedAt ?? milestone.escrow?.createdAt, {
				dateStyle: 'medium'
			}) ?? undefined
		const captionParts = [] as string[]
		if (fundedAmount) {
			captionParts.push(`${fundedAmount} đang được giữ an toàn trong tài khoản đảm bảo.`)
		} else {
			captionParts.push('Tài khoản đảm bảo đã được nạp tiền.')
		}
		if (updatedAtText) {
			captionParts.push(`Cập nhật ngày ${updatedAtText}.`)
		}
		return {
			status: normalizedStatus,
			label: 'Đã giải ngân',
			icon: ShieldCheck,
			iconClass: 'text-emerald-500',
			textClass: 'text-emerald-700',
			chip: fundedAmount ?? undefined,
			caption: captionParts.join(' '),
			captionClass: 'text-emerald-600'
		}
	}

	if (normalizedStatus === 'PENDING') {
		const caption = 'Khoản tiền đang được xử lý. Vui lòng kiểm tra lại sau ít phút.'
		return {
			status: normalizedStatus,
			label: 'Đang xử lý giải ngân',
			icon: Loader2,
			iconClass: 'text-sky-500',
			textClass: 'text-sky-700',
			chip: fundedAmount ?? milestoneBudget ?? undefined,
			caption,
			captionClass: 'text-sky-600',
			spinner: true
		}
	}

	if (normalizedStatus === 'RELEASED') {
		const releaseDateText =
			formatDateTime(milestone.releasedAt ?? milestone.escrow?.updatedAt ?? milestone.approvedAt, {
				dateStyle: 'medium'
			}) ?? undefined
		const captionParts = [] as string[]
		if (releaseDateText) {
			captionParts.push(`Thanh toán ngày ${releaseDateText}.`)
		}
		if (releasedAmount) {
			captionParts.push(`${releasedAmount} đã được chuyển tới freelancer.`)
		}
		return {
			status: normalizedStatus,
			label: 'Đã thanh toán',
			icon: CheckCircle2,
			iconClass: 'text-emerald-500',
			textClass: 'text-emerald-700',
			chip: releasedAmount ?? undefined,
			caption: captionParts.join(' '),
			captionClass: 'text-emerald-600'
		}
	}

	if (normalizedStatus === 'REFUNDED') {
		const caption =
			viewerRole === 'client'
				? 'Khoản tiền đã được hoàn về phương thức thanh toán của bạn.'
				: 'Milestone đã được hoàn tiền. Hãy trao đổi thêm với client để biết chi tiết tiếp theo.'
		return {
			status: normalizedStatus,
			label: 'Đã hoàn tiền',
			icon: Wallet2,
			iconClass: 'text-slate-500',
			textClass: 'text-slate-700',
			chip: refundedAmount ?? undefined,
			caption,
			captionClass: 'text-slate-500'
		}
	}

	if (normalizedStatus === 'UNFUNDED') {
		const caption =
			viewerRole === 'client'
				? 'Giải ngân milestone để chuyển tiền vào tài khoản đảm bảo trước khi freelancer tiếp tục.'
				: 'Client chưa giải ngân milestone này. Bạn có thể trao đổi thêm trước khi bàn giao để tránh rủi ro thanh toán.'
		return {
			status: normalizedStatus,
			label: 'Chưa giải ngân',
			icon: Wallet2,
			iconClass: 'text-amber-500',
			textClass: 'text-amber-700',
			chip: milestoneBudget ?? undefined,
			caption,
			captionClass: viewerRole === 'client' ? 'text-slate-500' : 'text-amber-600'
		}
	}

	return {
		status: normalizedStatus,
		label: toSentenceCase(normalizedStatus),
		icon: Wallet2,
		iconClass: 'text-slate-500',
		textClass: 'text-slate-700',
		chip: fundedAmount ?? milestoneBudget ?? undefined,
		caption: viewerRole === 'client' ? 'Trạng thái giải ngân sẽ được cập nhật khi có thay đổi.' : undefined,
		captionClass: 'text-slate-500'
	}
}

type TabId = (typeof tabs)[number]['id']

const buildTimeline = (contract?: Contract | null) => {
	if (!contract) return [] as Array<{ id: string; date?: string | null; label: string; description?: string }>

	const events: Array<{ id: string; date?: string | null; label: string; description?: string }> = []

	if (contract.createdAt) events.push({ id: 'created', date: contract.createdAt, label: 'Hợp đồng được tạo' })
	if (contract.proposal?.submittedAt)
		events.push({ id: 'proposal', date: contract.proposal.submittedAt, label: 'Freelancer gửi proposal' })
	if (contract.offer?.createdAt) events.push({ id: 'offer', date: contract.offer.createdAt, label: 'Client gửi offer' })
	if (contract.acceptedAt)
		events.push({ id: 'accepted', date: contract.acceptedAt, label: 'Hai bên chấp nhận điều khoản' })
	if (contract.startDate || contract.offer?.startDate)
		events.push({ id: 'start', date: contract.startDate || contract.offer?.startDate, label: 'Bắt đầu thực hiện' })
	if (contract.endDate || contract.offer?.endDate)
		events.push({ id: 'end', date: contract.endDate || contract.offer?.endDate, label: 'Kết thúc hợp đồng' })
	if (contract.updatedAt) events.push({ id: 'updated', date: contract.updatedAt, label: 'Cập nhật gần nhất' })

	return events.filter(event => Boolean(event.date))
}

const buildAttachmentList = (contract?: Contract | null): NormalizedAttachment[] =>
	normalizeAttachments(contract?.jobPost?.attachments)

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'heic', 'heif'])

const isImageAttachment = (attachment: NormalizedAttachment) => {
	const mime = attachment.mimeType?.toLowerCase()
	if (mime?.startsWith('image/')) return true
	const extension = attachment.extension?.toLowerCase()
	return extension ? imageExtensions.has(extension) : false
}

const ContractWorkroomPage = () => {
        const { contractId } = useParams<{ contractId: string }>()
        const navigate = useNavigate()
        const currentUser = useSelector(selectCurrentUser)
        const [searchParams, setSearchParams] = useSearchParams()
        const queryTab = searchParams.get('tab')
        const resolvedTab: TabId = useMemo(() => {
                if (!queryTab) return 'overview'
                return (tabs.find(tab => tab.id === queryTab)?.id ?? 'overview') as TabId
        }, [queryTab])
        const [activeTab, setActiveTab] = useState<TabId>(resolvedTab)
        const [milestonePage, setMilestonePage] = useState(1)
	const [isCreateMilestoneOpen, setCreateMilestoneOpen] = useState(false)
        const [milestoneToDelete, setMilestoneToDelete] = useState<ContractMilestone | null>(null)
        const [resourceToDelete, setResourceToDelete] = useState<{
                milestone: ContractMilestone
                resourceId: string
                resourceLabel?: string
        } | null>(null)
        const [expandedMilestoneAttachments, setExpandedMilestoneAttachments] = useState<Record<string, boolean>>({})
        const [milestoneToSubmit, setMilestoneToSubmit] = useState<ContractMilestone | null>(null)
        const [milestoneReviewState, setMilestoneReviewState] = useState<{
                milestone: ContractMilestone
                submission: ContractMilestoneSubmission
                mode: 'approve' | 'decline'
        } | null>(null)
        const [milestoneToFund, setMilestoneToFund] = useState<ContractMilestone | null>(null)
        const [milestoneToCancel, setMilestoneToCancel] = useState<ContractMilestone | null>(null)
        const [cancellationResponseState, setCancellationResponseState] = useState<{
                milestone: ContractMilestone
                action: 'accept' | 'decline'
        } | null>(null)
        const [isEndContractDialogOpen, setEndContractDialogOpen] = useState(false)
        const [isSubmitFeedbackOpen, setSubmitFeedbackOpen] = useState(false)
        const pendingPaymentMetaRef = useRef<Record<string, { idempotencyKey?: string; clientSecret?: string }>>({})

	const viewerRole: ViewerRole =
		currentUser?.role === Role.CLIENT ? 'client' : currentUser?.role === Role.FREELANCER ? 'freelancer' : 'all'

        const queryClient = useQueryClient()

        useEffect(() => {
                if (activeTab === resolvedTab) return
                setActiveTab(resolvedTab)
        }, [resolvedTab, activeTab])

        const handleTabChange = (tabId: TabId) => {
                setActiveTab(tabId)
                setSearchParams(previous => {
                        const params = new URLSearchParams(previous)
                        if (tabId === 'overview') {
                                params.delete('tab')
                        } else {
                                params.set('tab', tabId)
                        }
                        return params
                }, { replace: true })
        }

	const contractQuery = useQuery({
		queryKey: ['contract', contractId],
		queryFn: () => {
			if (!contractId) throw new Error('Missing contract id')
			return getContractDetail(contractId)
		},
		enabled: Boolean(contractId)
	})

	const milestoneQuery = useQuery({
		queryKey: ['contract-milestones', contractId],
		queryFn: () => {
			if (!contractId) throw new Error('Missing contract ID')
			return listContractMilestones(contractId as string)
		},
		enabled: Boolean(contractId) && activeTab === 'milestones'
	})

	const pendingReviewMilestones = useMemo(() => {
		if (viewerRole !== 'client')
			return [] as Array<{
				milestone: ContractMilestone
				submission: ContractMilestoneSubmission
			}>

		const milestones = milestoneQuery.data ?? []

		return milestones
			.map(milestone => {
				const pendingSubmission = (milestone.submissions ?? [])
					.filter((submission): submission is ContractMilestoneSubmission => Boolean(submission))
					.find(submission => isSubmissionAwaitingReview(submission.status))

				if (!pendingSubmission) return null

				return { milestone, submission: pendingSubmission }
			})
			.filter((item): item is { milestone: ContractMilestone; submission: ContractMilestoneSubmission } =>
				Boolean(item)
			)
	}, [viewerRole, milestoneQuery.data])

	useEffect(() => {
		const totalMilestones = milestoneQuery.data?.length ?? 0

		if (!totalMilestones) {
			if (milestonePage !== 1) {
				setMilestonePage(1)
			}
			return
		}

		const totalPages = Math.max(1, Math.ceil(totalMilestones / MILESTONES_PER_PAGE))

		if (milestonePage > totalPages) {
			setMilestonePage(totalPages)
		}
	}, [milestonePage, milestoneQuery.data])

	const paymentMethodsQuery = useQuery({
		queryKey: ['payment-methods'],
		queryFn: () => getAllPaymentMethod() as Promise<PaymentMethod[]>,
		enabled: viewerRole === 'client'
	})

	const createMilestoneMutation = useMutation<
		{ milestone: ContractMilestone; attachmentError: unknown },
		unknown,
		{ values: CreateContractMilestoneInput; attachments: File[] }
	>({
		mutationFn: async ({ values, attachments }) => {
			if (!contractId) throw new Error('Missing contract ID')

			const milestone = await createContractMilestone(contractId, values)

			let attachmentError: unknown

			if (attachments.length) {
				try {
					await uploadContractMilestoneAttachments(contractId, milestone.id, attachments)
				} catch (error) {
					attachmentError = error
				}
			}

			return { milestone, attachmentError }
		},
		onSuccess: ({ attachmentError }) => {
			if (attachmentError) {
				toast.warning('Milestone được tạo nhưng tải tệp đính kèm không thành công. Vui lòng thử lại trong tab Files.')
				console.error('Upload milestone attachments failed', attachmentError)
			} else {
				toast.success('Đã tạo milestone mới')
			}

			setCreateMilestoneOpen(false)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
			queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
		},
		onError: () => {
			toast.error('Không thể tạo milestone. Vui lòng thử lại.')
		}
	})

        const deleteMilestoneMutation = useMutation<void, unknown, { milestoneId: string; milestoneTitle: string }>({
                mutationFn: async ({ milestoneId }) => {
                        if (!contractId) throw new Error('Missing contract ID')
                        await deleteContractMilestone(contractId, milestoneId)
                },
                onSuccess: (_data, variables) => {
                        toast.success(`Đã xóa milestone "${variables.milestoneTitle}"`)
                        queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
                        queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
                },
                onError: () => {
                        toast.error('Không thể xóa milestone. Vui lòng thử lại.')
                }
        })

        const cancelMilestoneMutation = useMutation<
                void,
                unknown,
                { milestoneId: string; milestoneTitle: string; reason?: string }
        >({
                mutationFn: async ({ milestoneId, reason }) => {
                        if (!contractId) throw new Error('Missing contract ID')
                        await cancelContractMilestone(contractId, milestoneId, { reason })
                },
                onSuccess: (_data, variables) => {
                        toast.success(`Đã hủy milestone "${variables.milestoneTitle}"`)
                        setMilestoneToCancel(null)
                        queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
                        queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
                },
                onError: error => {
                        const message =
                                extractPaymentErrorMessage(error) || 'Không thể hủy milestone. Vui lòng thử lại.'
                        toast.error(message)
                }
        })

        const respondMilestoneCancellationMutation = useMutation<
                void,
                unknown,
                { milestoneId: string; action: 'accept' | 'decline'; reason?: string; idempotencyKey?: string }
        >({
                mutationFn: async ({ milestoneId, action, reason, idempotencyKey }) => {
                        if (!contractId) throw new Error('Missing contract ID')
                        await respondMilestoneCancellation(contractId, milestoneId, {
                                action,
                                reason,
                                idempotencyKey
                        })
                },
                onSuccess: (_data, variables) => {
                        toast.success(
                                variables.action === 'accept'
                                        ? 'Đã chấp nhận yêu cầu hủy milestone'
                                        : 'Đã từ chối yêu cầu hủy milestone'
                        )
                        setCancellationResponseState(null)
                        queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
                        queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
                },
                onError: error => {
                        const message =
                                extractPaymentErrorMessage(error) ||
                                'Không thể phản hồi yêu cầu hủy milestone. Vui lòng thử lại.'
                        toast.error(message)
                }
        })

        const endContractMutation = useMutation<void, unknown, EndContractFormValues>({
                mutationFn: async values => {
                        if (!contractId) throw new Error('Missing contract ID')

                        const payload = {
                                closureType: values.closureType,
                                ...(values.closureReasonOptionId
                                        ? { closureReasonOptionId: values.closureReasonOptionId }
                                        : {}),
                                ...(values.closureReason?.trim()
                                        ? { closureReason: values.closureReason.trim() }
                                        : {})
                        }

                        await endContract(contractId, payload)
                },
                onSuccess: () => {
                        toast.success('Đã gửi yêu cầu kết thúc hợp đồng')
                        setEndContractDialogOpen(false)
                        queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
                        queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
                },
                onError: error => {
                        const fallback = 'Không thể kết thúc hợp đồng. Vui lòng thử lại.'

                        if (isAxiosError(error)) {
                                const message = extractErrorMessage(error.response?.data) ?? fallback
                                toast.error(message)
                                return
                        }

                        toast.error(fallback)
                }
        })

        const submitContractFeedbackMutation = useMutation<
                void,
                unknown,
                SubmitContractFeedbackFormValues
        >({
                mutationFn: async values => {
                        if (!contractId) throw new Error('Missing contract ID')

                        const payload = {
                                rating: values.rating,
                                ...(values.comment?.trim() ? { comment: values.comment.trim() } : {}),
                                ...(typeof values.wouldHireAgain === 'boolean'
                                        ? { wouldHireAgain: values.wouldHireAgain }
                                        : {})
                        }

                        await submitContractFeedback(contractId, payload)
                },
                onSuccess: () => {
                        toast.success('Đã gửi đánh giá hợp đồng')
                        setSubmitFeedbackOpen(false)
                        queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
                },
                onError: () => {
                        toast.error('Không thể gửi đánh giá hợp đồng. Vui lòng thử lại.')
                }
        })

        const deleteMilestoneResourceMutation = useMutation<
                void,
                unknown,
                { milestoneId: string; resourceId: string; resourceName?: string }
        >({
		mutationFn: async ({ milestoneId, resourceId }) => {
			if (!contractId) throw new Error('Missing contract ID')
			await deleteContractMilestoneResource(contractId, milestoneId, resourceId)
		},
		onSuccess: (_data, variables) => {
			const message = variables.resourceName ? `Đã xóa tệp "${variables.resourceName}"` : 'Đã xóa tệp đính kèm'
			toast.success(message)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
		},
		onError: () => {
			toast.error('Không thể xóa tệp đính kèm. Vui lòng thử lại.')
		}
	})

	const uploadMilestoneAttachmentsMutation = useMutation<void, unknown, { milestoneId: string; files: File[] }>({
		mutationFn: async ({ milestoneId, files }) => {
			if (!contractId) throw new Error('Missing contract ID')
			if (!files.length) return

			await uploadContractMilestoneAttachments(contractId, milestoneId, files)
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })

			if (variables.files.length > 1) {
				toast.success('Đã tải lên các tệp đính kèm mới')
			} else {
				toast.success('Đã tải lên tệp đính kèm mới')
			}
		},
		onError: () => {
			toast.error('Không thể tải tệp đính kèm. Vui lòng thử lại.')
		}
	})

	const submitMilestoneWorkMutation = useMutation<
		void,
		unknown,
		{ milestoneId: string; message: string; note?: string; files: File[] }
	>({
		mutationFn: async ({ milestoneId, message, note, files }) => {
			if (!contractId) throw new Error('Missing contract ID')
			await submitMilestoneWork(contractId, milestoneId, {
				message,
				note,
				files
			})
		},
		onSuccess: () => {
			toast.success('Đã gửi bàn giao milestone tới khách hàng')
			setMilestoneToSubmit(null)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
			queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
		},
		onError: () => {
			toast.error('Không thể gửi bàn giao milestone. Vui lòng thử lại.')
		}
	})

	const approveMilestoneSubmissionMutation = useMutation<
		void,
		unknown,
		{
			milestoneId: string
			submissionId: string
			reviewNote?: string
			reviewRating: number
		}
	>({
		mutationFn: async ({ milestoneId, submissionId, reviewNote, reviewRating }) => {
			if (!contractId) throw new Error('Missing contract ID')
			await approveMilestoneSubmission(contractId, milestoneId, submissionId, {
				reviewNote,
				reviewRating
			})
		},
		onSuccess: () => {
			toast.success('Đã chấp nhận bàn giao milestone')
			setMilestoneReviewState(null)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
			queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
		},
		onError: () => {
			toast.error('Không thể chấp nhận bàn giao. Vui lòng thử lại.')
		}
	})

	const declineMilestoneSubmissionMutation = useMutation<
		void,
		unknown,
		{
			milestoneId: string
			submissionId: string
			reviewNote: string
			reviewRating?: number
		}
	>({
		mutationFn: async ({ milestoneId, submissionId, reviewNote, reviewRating }) => {
			if (!contractId) throw new Error('Missing contract ID')
			await declineMilestoneSubmission(contractId, milestoneId, submissionId, {
				reviewNote,
				reviewRating
			})
		},
		onSuccess: () => {
			toast.success('Đã gửi yêu cầu chỉnh sửa milestone')
			setMilestoneReviewState(null)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
			queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
		},
		onError: () => {
			toast.error('Không thể gửi yêu cầu chỉnh sửa. Vui lòng thử lại.')
		}
	})

	const payMilestoneMutation = useMutation<
		void,
		unknown,
		{ milestoneId: string; paymentMethodId: string; note?: string; idempotencyKey?: string }
	>({
		mutationFn: async ({ milestoneId, paymentMethodId, note, idempotencyKey }) => {
			if (!contractId) throw new Error('Missing contract ID')

			const performPayment = async (idempotencyKey?: string) => {
				const payload: PayContractMilestoneInput = {
					paymentMethodId
				}

				if (typeof note === 'string' && note.trim().length > 0) {
					payload.note = note
				}

				if (idempotencyKey) {
					payload.idempotencyKey = idempotencyKey
				}

                                try {
                                        const response = await payMilestone(contractId, milestoneId, payload)
                                        return {
                                                response,
                                                meta: extractPaymentMeta(response)
                                        }
                                } catch (error) {
                                        if (!isAxiosError(error)) {
                                                throw error
                                        }

                                        const rawPayload = error.response?.data ?? null
                                        const meta = extractPaymentMeta(rawPayload as PayContractMilestoneResponse)

                                        if (meta.requiresAction || meta.clientSecret || meta.idempotencyKey || meta.paymentIntentId) {
                                                return {
                                                        response: rawPayload as PayContractMilestoneResponse,
                                                        meta
                                                }
                                        }

                                        throw new Error(
                                                extractPaymentErrorMessage(error) ||
                                                        'Không thể giải ngân milestone. Vui lòng thử lại.'
                                        )
                                }
                        }

			const { meta: initialMeta } = await performPayment(idempotencyKey)

			if (!initialMeta.requiresAction) {
				return
			}

			if (!initialMeta.clientSecret) {
				throw new Error('Thiếu client secret để xác thực 3-D Secure.')
			}

			const stripe = await getStripe()
			const confirmation = await stripe.confirmCardPayment(initialMeta.clientSecret, {
				payment_method: paymentMethodId
			})

			if (confirmation.error) {
				const code = confirmation.error.code
				const baseMessage =
					confirmation.error.message ||
					(code === 'payment_intent_authentication_failure'
						? 'Xác thực 3-D Secure thất bại. Vui lòng thử lại.'
						: undefined)

				if (confirmation.error.type === 'canceled' || code === 'payment_intent_authentication_failure') {
					throw new Error(baseMessage || 'Xác thực 3-D Secure đã bị hủy. Vui lòng thử lại nếu bạn vẫn muốn thanh toán.')
				}

				throw new Error(baseMessage || 'Xác thực 3-D Secure thất bại. Vui lòng thử lại.')
			}

			const normalizedIdempotencyKey =
				initialMeta.idempotencyKey || initialMeta.paymentIntentId || confirmation.paymentIntent?.id || undefined

			if (!normalizedIdempotencyKey) {
				throw new Error('Không tìm thấy idempotency key để hoàn tất thanh toán.')
			}

			const { meta: finalMeta } = await performPayment(normalizedIdempotencyKey)

			if (finalMeta.requiresAction) {
				throw new Error('Thanh toán vẫn cần xác thực bổ sung. Vui lòng kiểm tra lại trạng thái 3-D Secure.')
			}
		},
		onSuccess: () => {
			toast.success('Đã giải ngân milestone thành công')
			setMilestoneToFund(null)
			queryClient.invalidateQueries({ queryKey: ['contract-milestones', contractId] })
			queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
		},
		onError: error => {
			const message =
                            extractPaymentErrorMessage(error) ||
				(error instanceof Error ? error.message : undefined) ||
				(typeof error === 'string' ? error : undefined) ||
				'Không thể giải ngân milestone. Vui lòng thử lại.'

			toast.error(message)
		}
	})

	const pendingIdempotencyKey = milestoneToFund?.id
		? pendingPaymentMetaRef.current[milestoneToFund.id]?.idempotencyKey
		: undefined

	const contract = contractQuery.data as Contract | undefined
	const statusMeta = getContractStatusMeta(contract?.status as string | undefined)
	const statusDescription = getContractStatusDescription(contract?.status as string | undefined)
	const clientName = getParticipantName(contract?.client?.profile, contract?.client?.companyName)
	const freelancerName = getParticipantName(contract?.freelancer?.profile, undefined)
	const clientLocation = getParticipantLocation(contract?.client?.profile)
	const freelancerLocation = getParticipantLocation(contract?.freelancer?.profile)
	const jobSkills = extractSkillNames(contract ?? ({} as Contract)).slice(0, 10)
	const jobLanguages = extractLanguageLabels(contract ?? ({} as Contract))
	const budgetSummary = contract ? getBudgetDisplay(contract) : undefined
	const currency = contract ? getCurrency(contract) : undefined
	const totalPaid = formatCurrency(contract?.totalPaidAmount ?? undefined, currency)
	const outstanding = formatCurrency(contract?.outstandingBalance ?? undefined, currency)
	const hourlyRate = formatCurrency(contract?.hourlyRate ?? undefined, contract?.hourlyRateCurrency ?? currency)
	const fixedPrice = formatCurrency(contract?.fixedPrice ?? undefined, contract?.fixedPriceCurrency ?? currency)
        const timelineEvents = useMemo(() => buildTimeline(contract), [contract])
        const attachments = useMemo(() => buildAttachmentList(contract), [contract])
        const closureReasonOptions = useMemo(
                () =>
                        Array.isArray(contract?.closureReasonOptions)
                                ? contract.closureReasonOptions.filter(
                                          (option): option is ContractClosureReasonOption =>
                                                  Boolean(option && option.id && option.label)
                                  )
                                : [],
                [contract?.closureReasonOptions]
        )
        const viewerFeedback = (contract?.viewerFeedback ?? null) as ContractFeedback | null
        const partnerFeedback =
                viewerRole === 'client'
                        ? ((contract?.freelancerFeedback ?? null) as ContractFeedback | null)
                        : viewerRole === 'freelancer'
                        ? ((contract?.clientFeedback ?? null) as ContractFeedback | null)
                        : null
        const viewerSubmittedFeedbackAt =
                contract?.viewerSubmittedFeedbackAt ?? viewerFeedback?.createdAt ?? null
        const normalizedContractStatus = contract?.status?.toUpperCase() ?? ''
        const isContractFinalized = ['COMPLETED', 'CANCELLED'].includes(normalizedContractStatus)
        const shouldShowEndContractAction =
                viewerRole !== 'all' &&
                !isContractFinalized &&
                ['ACTIVE', 'IN_PROGRESS', 'PAUSED'].includes(normalizedContractStatus)
        const viewerCanSubmitFeedback = Boolean(
                contract?.viewerCanSubmitFeedback ??
                        (!viewerFeedback && ['COMPLETED', 'ENDED', 'CLOSED', 'CANCELLED'].includes(normalizedContractStatus))
        )
        const shouldShowFeedbackAction = viewerRole !== 'all' && viewerCanSubmitFeedback
        const partnerDisplayName =
                viewerRole === 'client'
                        ? freelancerName ?? 'Freelancer'
                        : viewerRole === 'freelancer'
                        ? clientName ?? 'Khách hàng'
                        : undefined

        const requestDeleteMilestone = (milestone: ContractMilestone) => {
                if (deleteMilestoneMutation.isPending || isContractFinalized) return

                setMilestoneToDelete(milestone)
        }

        const requestCancelMilestone = (milestone: ContractMilestone) => {
                if (cancelMilestoneMutation.isPending || isContractFinalized) return

                setMilestoneToCancel(milestone)
        }

        const requestRespondCancellation = (milestone: ContractMilestone, action: 'accept' | 'decline') => {
                if (respondMilestoneCancellationMutation.isPending || isContractFinalized) return

                setCancellationResponseState({ milestone, action })
        }

        const confirmDeleteMilestone = async () => {
                if (!milestoneToDelete || isContractFinalized) return

                await deleteMilestoneMutation.mutateAsync({
                        milestoneId: milestoneToDelete.id,
                        milestoneTitle: milestoneToDelete.title
                })
        }

        const confirmCancelMilestone = async (values: CancelMilestoneFormValues) => {
                if (!milestoneToCancel || isContractFinalized) return

                await cancelMilestoneMutation.mutateAsync({
                        milestoneId: milestoneToCancel.id,
                        milestoneTitle: milestoneToCancel.title,
                        reason: values.reason
                })
        }

        const confirmRespondCancellation = async (values: RespondMilestoneCancellationFormValues) => {
                if (!cancellationResponseState || isContractFinalized) return

                await respondMilestoneCancellationMutation.mutateAsync({
                        milestoneId: cancellationResponseState.milestone.id,
                        action: cancellationResponseState.action,
                        reason: values.reason,
                        idempotencyKey: values.idempotencyKey
                })
        }

        const requestDeleteMilestoneResource = (milestone: ContractMilestone, resourceId: string, resourceLabel: string) => {
                if (deleteMilestoneResourceMutation.isPending || isContractFinalized) return

                const sanitizedLabel = resourceLabel?.trim()

                setResourceToDelete({
			milestone,
			resourceId,
			resourceLabel: sanitizedLabel || undefined
		})
	}

        const confirmDeleteMilestoneResource = async () => {
                if (!resourceToDelete || isContractFinalized) return

                await deleteMilestoneResourceMutation.mutateAsync({
                        milestoneId: resourceToDelete.milestone.id,
                        resourceId: resourceToDelete.resourceId,
			resourceName: resourceToDelete.resourceLabel
		})
	}

	const toggleMilestoneAttachments = (milestoneId: string) => {
		setExpandedMilestoneAttachments(prev => ({
			...prev,
			[milestoneId]: !prev[milestoneId]
		}))
	}

        const handleMilestoneAttachmentUpload = (milestoneId: string, files: FileList | File[]) => {
                if (!files || uploadMilestoneAttachmentsMutation.isPending || isContractFinalized) return

                const normalizedFiles = Array.from(files).filter((file): file is File => file instanceof File)

                if (!normalizedFiles.length) return

		uploadMilestoneAttachmentsMutation.mutate({
			milestoneId,
			files: normalizedFiles
		})
	}

        const handleMilestoneAttachmentFileChange = (milestoneId: string, event: ChangeEvent<HTMLInputElement>) => {
                handleMilestoneAttachmentUpload(milestoneId, event.target.files ?? [])
                event.target.value = ''
        }

        const handleMilestoneAttachmentDrop = (milestoneId: string, event: DragEvent<HTMLLabelElement>) => {
                event.preventDefault()
                if (uploadMilestoneAttachmentsMutation.isPending || isContractFinalized) return

                handleMilestoneAttachmentUpload(milestoneId, event.dataTransfer.files ?? [])
        }

	const handleMilestoneAttachmentDragOver = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'copy'
	}

	const jobPostLink = contract?.jobPost?.id
		? currentUser?.role === Role.CLIENT
			? routes.me.client.jobs.detail(contract.jobPost.id)
			: routes.freelancer.jobs.detail(contract.jobPost.id)
		: undefined

	const heroBadge =
		viewerRole === 'client' ? 'Workroom khách hàng' : viewerRole === 'freelancer' ? 'Workroom freelancer' : 'Workroom'
	const heroSubtitle =
		viewerRole === 'client'
			? freelancerName
				? `Làm việc với ${freelancerName}`
				: 'Theo dõi hợp đồng với freelancer của bạn'
			: viewerRole === 'freelancer'
			? clientName
				? `Cộng tác cùng ${clientName}`
				: 'Theo dõi hợp đồng với khách hàng của bạn'
			: `${clientName ?? 'Khách hàng'} · ${freelancerName ?? 'Freelancer'}`

        const renderFeedbackRating = (rating?: number | null) => {
                if (typeof rating !== 'number' || Number.isNaN(rating)) {
                        return <span className='text-xs text-slate-400'>Chưa có đánh giá</span>
                }

                const clamped = Math.max(1, Math.min(5, Math.round(rating)))

                return (
                        <div className='flex items-center gap-1 text-amber-500'>
                                {[1, 2, 3, 4, 5].map(value => (
                                        <Star
                                                key={value}
                                                className={`size-4 ${value <= clamped ? '' : 'stroke-[1.5]'}`}
                                                fill={value <= clamped ? 'currentColor' : 'none'}
                                        />
                                ))}
                                <span className='text-sm font-semibold text-amber-600'>{clamped}/5</span>
                        </div>
                )
        }

        const renderOverview = () => (
                <div className='space-y-8'>
			<div className='grid gap-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] md:grid-cols-3 md:p-8'>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Trạng thái</p>
					<div className='space-y-2'>
						<span
							className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold shadow-sm shadow-white/40 ${statusMeta.badge} ${statusMeta.text}`}>
							<span className='size-2 rounded-full bg-current'></span>
							{statusMeta.label}
						</span>
						<p className='flex items-start gap-2 text-sm font-medium text-slate-600'>
							<ShieldCheck className='mt-0.5 size-4 text-primary' />
							<span className='text-left'>{statusDescription}</span>
						</p>
					</div>
					<p className='text-sm text-slate-500'>Cập nhật lần cuối {formatDateTime(contract?.updatedAt) ?? '—'}</p>
				</div>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Tài chính</p>
					<ul className='space-y-2 text-sm text-slate-600'>
						{budgetSummary && <li>{budgetSummary}</li>}
						{hourlyRate && (
							<li>
								Đơn giá theo giờ: <span className='font-semibold text-slate-800'>{hourlyRate}</span>
							</li>
						)}
						{fixedPrice && (
							<li>
								Giá trị hợp đồng: <span className='font-semibold text-slate-800'>{fixedPrice}</span>
							</li>
						)}
						{totalPaid && (
							<li>
								Đã thanh toán: <span className='font-semibold text-slate-800'>{totalPaid}</span>
							</li>
						)}
						{outstanding && (
							<li>
								Còn lại: <span className='font-semibold text-slate-800'>{outstanding}</span>
							</li>
						)}
					</ul>
				</div>
				<div className='space-y-3'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Mốc thời gian</p>
					<ul className='space-y-2 text-sm text-slate-600'>
						<li>
							Bắt đầu:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.startDate || contract?.offer?.startDate, { dateStyle: 'medium' }) ?? '—'}
							</span>
						</li>
						<li>
							Kết thúc:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.endDate || contract?.offer?.endDate, { dateStyle: 'medium' }) ?? '—'}
							</span>
						</li>
						<li>
							Tạo hợp đồng:{' '}
							<span className='font-semibold text-slate-800'>
								{formatDateTime(contract?.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
							</span>
						</li>
					</ul>
				</div>
			</div>

                        <div className={`grid gap-6 ${viewerRole === 'all' ? 'md:grid-cols-2' : ''}`}>
				{viewerRole !== 'client' && (
					<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
						<h3 className='text-sm font-semibold text-slate-800'>
							{viewerRole === 'freelancer' ? 'Khách hàng của bạn' : 'Thông tin khách hàng'}
						</h3>
						<div className='mt-4 flex items-start gap-3'>
							<Users className='mt-1 size-5 text-primary' />
							<div className='space-y-1 text-sm text-slate-600'>
								<p className='text-base font-semibold text-slate-900'>{clientName ?? 'Khách hàng'}</p>
								<p>{clientLocation ?? 'Chưa cập nhật vị trí'}</p>
								{contract?.client?.companyName && (
									<p>
										Công ty: <span className='font-medium text-slate-800'>{contract.client.companyName}</span>
									</p>
								)}
							</div>
						</div>
					</div>
				)}
				{viewerRole !== 'freelancer' && (
					<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
						<h3 className='text-sm font-semibold text-slate-800'>
							{viewerRole === 'client' ? 'Freelancer của bạn' : 'Thông tin freelancer'}
						</h3>
						<div className='mt-4 flex items-start gap-3'>
							<Users className='mt-1 size-5 text-secondary' />
							<div className='space-y-1 text-sm text-slate-600'>
								<p className='text-base font-semibold text-slate-900'>{freelancerName ?? 'Freelancer'}</p>
								<p>{freelancerLocation ?? 'Chưa cập nhật vị trí'}</p>
								{contract?.freelancer?.title && (
									<p>
										Chuyên môn: <span className='font-medium text-slate-800'>{contract.freelancer.title}</span>
									</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
					<div className='space-y-3'>
						<h3 className='text-sm font-semibold text-slate-800'>Chi tiết công việc</h3>
						<p className='text-base font-semibold text-slate-900'>
							{contract?.jobPost?.title ?? contract?.title ?? 'Chưa cập nhật tiêu đề'}
						</p>
						<p className='text-sm text-slate-600'>
							{contract?.jobPost?.specialty?.category?.name && (
								<span className='font-medium text-slate-800'>{contract.jobPost.specialty.category.name}</span>
							)}
							{contract?.jobPost?.specialty?.name && (
								<>
									{' '}
									· <span className='text-slate-600'>{contract.jobPost.specialty.name}</span>
								</>
							)}
						</p>
						{budgetSummary && <p className='text-sm text-slate-500'>Loại hợp đồng: {budgetSummary}</p>}
						{jobPostLink && (
							<Link
								to={jobPostLink}
								className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'>
								Xem job post gốc
							</Link>
						)}
					</div>
					<div className='space-y-3 text-sm text-slate-600 md:w-1/2'>
						{jobSkills.length > 0 && (
							<div className='space-y-2'>
								<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Kỹ năng yêu cầu</p>
								<div className='flex flex-wrap gap-2'>
									{jobSkills.map(skill => (
										<span
											key={skill}
											className='rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm'>
											{skill}
										</span>
									))}
								</div>
							</div>
						)}
						{jobLanguages.length > 0 && (
							<div className='space-y-2'>
								<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Ngôn ngữ</p>
								<p>{jobLanguages.join(', ')}</p>
							</div>
						)}
					</div>
				</div>
                                {attachments.length > 0 && (
                                        <div className='mt-6 space-y-3'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Tệp đính kèm</p>
						<div className='grid gap-4 md:grid-cols-2'>
							{attachments.slice(0, 4).map(attachment => {
								const isImage = isImageAttachment(attachment)
								const sizeLabel = formatFileSize(attachment.size)
								const typeLabel = formatFileType({
									mimeType: attachment.mimeType,
									extension: attachment.extension
								})
								const metadata = [sizeLabel, typeLabel].filter((value): value is string => Boolean(value))

								const content = isImage ? (
									<div className='group relative flex h-48 w-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm transition hover:shadow-lg'>
										{attachment.url ? (
											<img
												src={attachment.url}
												alt={attachment.label}
												className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]'
												loading='lazy'
											/>
										) : (
											<div className='flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500'>
												Không có xem trước
											</div>
										)}
										<div className='pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-4 text-white'>
											<p className='truncate text-sm font-medium'>{attachment.label}</p>
											{metadata.length > 0 && <p className='mt-1 text-xs text-white/80'>{metadata.join(' • ')}</p>}
										</div>
									</div>
								) : (
									<div className='flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md'>
										<div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
											{attachment.extension ?? 'FILE'}
										</div>
										<div className='min-w-0 flex-1'>
											<p className='truncate text-sm font-medium text-slate-900'>{attachment.label}</p>
											{metadata.length > 0 && <p className='mt-1 text-xs text-slate-500'>{metadata.join(' • ')}</p>}
										</div>
									</div>
								)

								if (attachment.url) {
									return (
										<a
											key={attachment.id}
											href={attachment.url}
											target='_blank'
											rel='noreferrer'
											className='block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white'>
											{content}
										</a>
									)
								}

								return (
									<div key={attachment.id} className='block opacity-80'>
										{content}
									</div>
								)
							})}
						</div>
                                        </div>
                                )}
                        </div>

                        <div className='space-y-5 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                        <div className='space-y-1'>
                                                <h3 className='text-sm font-semibold text-slate-800'>Đánh giá &amp; phản hồi</h3>
                                                <p className='text-sm text-slate-600'>Theo dõi đánh giá từ bạn và đối tác sau khi hợp đồng hoàn thành.</p>
                                        </div>
                                        {shouldShowFeedbackAction && (
                                                <button
                                                        type='button'
                                                        className='btn btn-primary btn-sm gap-2 self-start sm:self-auto'
                                                        onClick={() => setSubmitFeedbackOpen(true)}
                                                        disabled={submitContractFeedbackMutation.isPending}
                                                >
                                                        {submitContractFeedbackMutation.isPending ? (
                                                                <>
                                                                        <Loader2 className='size-4 animate-spin' />
                                                                        Đang mở...
                                                                </>
                                                        ) : (
                                                                <>
                                                                        <Star className='size-4' /> Đánh giá hợp đồng
                                                                </>
                                                        )}
                                                </button>
                                        )}
                                </div>
                                <div className='grid gap-4 md:grid-cols-2'>
                                        <div className='space-y-3 rounded-2xl border border-slate-200/70 bg-white/85 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Đánh giá của bạn</p>
                                                {viewerFeedback ? (
                                                        <div className='space-y-3 text-sm text-slate-600'>
                                                                {renderFeedbackRating(viewerFeedback.rating)}
                                                                {viewerFeedback.comment ? (
                                                                        <div className='flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2'>
                                                                                <MessageCircle className='mt-0.5 size-4 text-primary' />
                                                                                <p className='text-left'>{viewerFeedback.comment}</p>
                                                                        </div>
                                                                ) : (
                                                                        <p className='text-xs text-slate-400'>Không có nhận xét chi tiết.</p>
                                                                )}
                                                                {typeof viewerFeedback.wouldHireAgain === 'boolean' ? (
                                                                        <p className='flex items-center gap-2 text-xs font-medium'>
                                                                                {viewerFeedback.wouldHireAgain ? (
                                                                                        <>
                                                                                                <ThumbsUp className='size-4 text-emerald-500' /> Sẵn sàng hợp tác tiếp
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                <ThumbsDown className='size-4 text-rose-500' /> Không dự định hợp tác tiếp
                                                                                        </>
                                                                                )}
                                                                        </p>
                                                                ) : null}
                                                                {viewerSubmittedFeedbackAt ? (
                                                                        <p className='text-xs text-slate-400'>Gửi {formatDateTime(viewerSubmittedFeedbackAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                                ) : null}
                                                        </div>
                                                ) : (
                                                        <div className='space-y-2 text-sm text-slate-500'>
                                                                {shouldShowFeedbackAction ? (
                                                                        <p>Bạn chưa gửi đánh giá cho hợp đồng này. Nhấn “Đánh giá hợp đồng” để chia sẻ trải nghiệm.</p>
                                                                ) : viewerSubmittedFeedbackAt ? (
                                                                        <p>Bạn đã gửi đánh giá vào {formatDateTime(viewerSubmittedFeedbackAt, { dateStyle: 'medium', timeStyle: 'short' })}.</p>
                                                                ) : (
                                                                        <p>Chưa có đánh giá nào từ bạn.</p>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                        <div className='space-y-3 rounded-2xl border border-slate-200/70 bg-white/85 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Đánh giá từ đối tác</p>
                                                {partnerFeedback ? (
                                                        <div className='space-y-3 text-sm text-slate-600'>
                                                                {renderFeedbackRating(partnerFeedback.rating)}
                                                                {partnerFeedback.comment ? (
                                                                        <div className='flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2'>
                                                                                <MessageCircle className='mt-0.5 size-4 text-secondary' />
                                                                                <p className='text-left'>{partnerFeedback.comment}</p>
                                                                        </div>
                                                                ) : (
                                                                        <p className='text-xs text-slate-400'>Đối tác không để lại nhận xét.</p>
                                                                )}
                                                                {typeof partnerFeedback.wouldHireAgain === 'boolean' ? (
                                                                        <p className='flex items-center gap-2 text-xs font-medium'>
                                                                                {partnerFeedback.wouldHireAgain ? (
                                                                                        <>
                                                                                                <ThumbsUp className='size-4 text-emerald-500' /> Muốn tiếp tục hợp tác
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                <ThumbsDown className='size-4 text-rose-500' /> Không có ý định hợp tác tiếp
                                                                                        </>
                                                                                )}
                                                                        </p>
                                                                ) : null}
                                                                {partnerFeedback.createdAt ? (
                                                                        <p className='text-xs text-slate-400'>Gửi {formatDateTime(partnerFeedback.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                                ) : null}
                                                        </div>
                                                ) : (
                                                        <p className='text-sm text-slate-500'>
                                                                {partnerDisplayName ? `${partnerDisplayName} chưa gửi đánh giá.` : 'Đối tác chưa gửi đánh giá.'}
                                                        </p>
                                                )}
                                        </div>
                                </div>
                        </div>
                </div>
        )

	const renderMilestones = () => {
		if (milestoneQuery.isLoading) {
			return (
				<div className='flex justify-center py-12 text-slate-500'>
					<Loader2 className='size-6 animate-spin' />
				</div>
			)
		}

		const milestones = milestoneQuery.data ?? []
		const isSubmittingWork = submitMilestoneWorkMutation.isPending
		const isReviewingSubmission =
			approveMilestoneSubmissionMutation.isPending || declineMilestoneSubmissionMutation.isPending
		const isFundingMilestone = payMilestoneMutation.isPending
		const totalMilestones = milestones.length
		const totalPages = Math.max(1, Math.ceil(totalMilestones / MILESTONES_PER_PAGE))
		const currentPage = Math.min(milestonePage, totalPages)
		const pageStart = (currentPage - 1) * MILESTONES_PER_PAGE
		const pageEnd = Math.min(pageStart + MILESTONES_PER_PAGE, totalMilestones)
		const visibleMilestones = milestones.slice(pageStart, pageEnd)
		const displayStart = totalMilestones ? pageStart + 1 : 0
		const displayEnd = pageEnd
		if (!milestones.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<Flag className='mx-auto mb-3 size-8 text-primary' />
					<p className='text-base font-semibold text-slate-700'>Chưa có milestone nào</p>
					<p className='mt-2 text-sm text-slate-500'>Tạo milestones để chia nhỏ công việc và giải ngân theo tiến độ.</p>
                                        {viewerRole === 'client' && !isContractFinalized && (
                                                <button
                                                        type='button'
                                                        onClick={() => setCreateMilestoneOpen(true)}
                                                        className='mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'
                                                        disabled={createMilestoneMutation.isPending || isContractFinalized}>
                                                        <Flag className='size-4' /> Tạo milestone
                                                </button>
                                        )}
				</div>
			)
		}

		return (
			<div className='space-y-6'>
				{viewerRole === 'client' && pendingReviewMilestones.length > 0 && (
					<div className='space-y-4 rounded-[24px] border border-sky-200/80 bg-sky-50/80 p-5 shadow-inner shadow-white/60'>
						<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500'>
									Bàn giao đang chờ duyệt
								</p>
								<h3 className='text-base font-semibold text-slate-900'>
									{pendingReviewMilestones.length === 1
										? 'Có 1 bàn giao cần bạn xử lý'
										: `Có ${pendingReviewMilestones.length} bàn giao cần bạn xử lý`}
								</h3>
								<p className='text-xs text-slate-500'>
									Xem nhanh các bàn giao mới nhất bên dưới hoặc duyệt ngay tại từng milestone.
								</p>
							</div>
						</div>
						<ul className='space-y-3'>
							{pendingReviewMilestones.slice(0, 3).map(({ milestone, submission }) => {
								const submittedAtText = submission.submittedAt
									? formatDateTime(submission.submittedAt, {
											dateStyle: 'medium',
											timeStyle: 'short'
									  })
									: undefined
								const isCurrentReviewTarget =
									milestoneReviewState?.milestone.id === milestone.id && isReviewingSubmission
								const reviewingMode = milestoneReviewState?.mode

								return (
									<li
										key={`${milestone.id}-${submission.id}`}
										className='space-y-3 rounded-2xl border border-sky-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm'>
										<div className='flex flex-wrap items-start justify-between gap-3'>
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-semibold text-slate-800'>{milestone.title}</p>
												{submittedAtText ? <p className='text-xs text-slate-400'>Gửi {submittedAtText}</p> : null}
												{submission.message ? (
													<p
														className='mt-1 text-xs text-slate-500'
														style={{
															display: '-webkit-box',
															WebkitBoxOrient: 'vertical',
															WebkitLineClamp: 2,
															overflow: 'hidden'
														}}>
														{submission.message}
													</p>
												) : null}
											</div>
											<span className='inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700'>
												Đang chờ duyệt
											</span>
										</div>
										<div className='flex flex-wrap items-center justify-end gap-2'>
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-success btn-xs gap-2'
                                                                                                onClick={() => {
                                                                                                        if (isContractFinalized) return
                                                                                                        setMilestoneReviewState({
                                                                                                                milestone,
                                                                                                                submission,
                                                                                                                mode: 'approve'
                                                                                                        })
                                                                                                }}
                                                                                                disabled={isReviewingSubmission || isContractFinalized}>
												{isCurrentReviewTarget && reviewingMode === 'approve' ? (
													<>
														<Loader2 className='size-3.5 animate-spin' />
														Đang xử lý...
													</>
												) : (
													<>
														<CheckCircle2 className='size-3.5' />
														Chấp nhận
													</>
												)}
											</button>
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-warning btn-xs gap-2'
                                                                                                onClick={() => {
                                                                                                        if (isContractFinalized) return
                                                                                                        setMilestoneReviewState({
                                                                                                                milestone,
                                                                                                                submission,
                                                                                                                mode: 'decline'
                                                                                                        })
                                                                                                }}
                                                                                                disabled={isReviewingSubmission || isContractFinalized}>
												{isCurrentReviewTarget && reviewingMode === 'decline' ? (
													<>
														<Loader2 className='size-3.5 animate-spin' />
														Đang xử lý...
													</>
												) : (
													<>
														<XCircle className='size-3.5' />
														Yêu cầu chỉnh sửa
													</>
												)}
											</button>
										</div>
									</li>
								)
							})}
						</ul>
						{pendingReviewMilestones.length > 3 ? (
							<p className='text-xs text-slate-500'>
								Các bàn giao còn lại được hiển thị trong danh sách milestone bên dưới.
							</p>
						) : null}
					</div>
				)}
				<div className='flex flex-col items-stretch justify-between gap-3 rounded-[24px] border border-white/70 bg-white/90 p-4 text-sm shadow-sm shadow-white/40 md:flex-row md:items-center'>
					<div className='text-left text-slate-600'>
						<p className='font-semibold text-slate-800'>Quản lý milestones</p>
						<p className='text-xs text-slate-500'>
							{totalMilestones
								? `Hiển thị ${displayStart}-${displayEnd} trên tổng ${totalMilestones} milestone${
										totalMilestones > 1 ? 's' : ''
								  }.`
								: 'Không có milestone nào trong hợp đồng này.'}
						</p>
					</div>
					<div className='flex flex-wrap items-center gap-2'>
						{totalPages > 1 && (
							<span className='text-xs text-slate-500'>
								Trang {currentPage}/{totalPages}
							</span>
						)}
                                                {viewerRole === 'client' && !isContractFinalized && (
                                                        <button
                                                                type='button'
                                                                onClick={() => setCreateMilestoneOpen(true)}
                                                                className='inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'
                                                                disabled={createMilestoneMutation.isPending || isContractFinalized}>
                                                                {createMilestoneMutation.isPending ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
										Đang tạo...
									</>
								) : (
									<>
										<Flag className='size-4' /> Tạo milestone
									</>
								)}
							</button>
						)}
					</div>
				</div>
				<div className='space-y-4'>
					{visibleMilestones.map(milestone => {
                                                const meta = getMilestoneStatusMeta(milestone.status)
                                                const amount = formatCurrency(milestone.amount ?? undefined, milestone.currency ?? currency)
                                                const isDeleting =
                                                        deleteMilestoneMutation.isPending && deleteMilestoneMutation.variables?.milestoneId === milestone.id
                                                const isCancelling =
                                                        cancelMilestoneMutation.isPending && cancelMilestoneMutation.variables?.milestoneId === milestone.id
                                                const resourceMap = new Map<string, ContractMilestoneResource>()
						milestone.resources
							?.filter((resource): resource is ContractMilestoneResource => Boolean(resource))
							.forEach(resource => {
								if (resource.id) {
									resourceMap.set(resource.id, resource)
								}
							})
                                                const milestoneAttachments = normalizeAttachments(
                                                        collectAttachmentInputs(
                                                                milestone.resources,
                                                                milestone.attachments
                                                        )
                                                )
						const isAttachmentsExpanded = expandedMilestoneAttachments[milestone.id] ?? false
						const normalizedMilestoneStatus = (milestone.status ?? '').toUpperCase()
						const submissions = (milestone.submissions ?? [])
							.filter((submission): submission is ContractMilestoneSubmission => Boolean(submission))
							.slice()
							.sort((a, b) => {
								const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
								const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
								return bTime - aTime
							})
						const pendingSubmission = submissions.find(submission => isSubmissionAwaitingReview(submission.status))
						const hasEscrowReleased = typeof milestone.escrow?.amountReleased === 'number' && milestone.escrow.amountReleased > 0
						const isMilestoneReleased = normalizedMilestoneStatus === 'RELEASED' ||
											normalizedMilestoneStatus === 'COMPLETED' ||
											normalizedMilestoneStatus === 'APPROVED' ||
											normalizedMilestoneStatus === 'PAID' ||
											Boolean(milestone.releasedAt || milestone.approvedAt || hasEscrowReleased)
                                                const isMilestoneCancelled = normalizedMilestoneStatus === 'CANCELLED'
                                                const normalizedEscrowStatus =
                                                        (milestone.escrow?.status ?? (isMilestoneReleased ? 'RELEASED' : null))?.toUpperCase() ?? 'UNFUNDED'
                                                const escrowMeta = buildEscrowStatusMeta(normalizedEscrowStatus, milestone, viewerRole)
                                                const EscrowIcon = escrowMeta.icon
                                                const isEscrowDisputed = normalizedEscrowStatus === 'DISPUTED'
                                                const hasActiveDispute = isEscrowDisputed
                                                const canVisitDisputeCenter = hasActiveDispute || (!isMilestoneReleased && !isMilestoneCancelled)
                                                const cancellationStatus = (milestone.cancellationStatus ?? '').toUpperCase()
                                                const isCancellationPending = cancellationStatus === 'PENDING'
                                                const isCancellationAccepted = cancellationStatus === 'ACCEPTED'
                                                const isCancellationDeclined = cancellationStatus === 'DECLINED'
                                                const cancellationReason = milestone.cancellationReason?.trim()
                                                const cancellationResponseReason = milestone.cancellationResponseReason?.trim()
                                                const cancellationRequestedAtText = milestone.cancellationRequestedAt
                                                        ? formatDateTime(milestone.cancellationRequestedAt, {
                                                                        dateStyle: 'medium',
                                                                        timeStyle: 'short'
                                                                })
                                                        : undefined
                                                const cancellationRespondedAtText = milestone.cancellationRespondedAt
                                                        ? formatDateTime(milestone.cancellationRespondedAt, {
                                                                        dateStyle: 'medium',
                                                                        timeStyle: 'short'
                                                                })
                                                        : undefined
                                                const hasCancellationRequest = Boolean(
                                                        cancellationReason ||
                                                                cancellationRequestedAtText ||
                                                                isCancellationPending ||
                                                                isCancellationAccepted ||
                                                                isCancellationDeclined
                                                )
                                                const isRespondingCancellation =
                                                        respondMilestoneCancellationMutation.isPending &&
                                                        respondMilestoneCancellationMutation.variables?.milestoneId === milestone.id
                                                const respondingCancellationAction =
                                                        respondMilestoneCancellationMutation.variables?.action
                                                const canSubmitWork =
                                                        viewerRole === 'freelancer' &&
                                                        !isContractFinalized &&
                                                        !isMilestoneReleased &&
                                                        normalizedMilestoneStatus !== 'CANCELLED' &&
                                                        !pendingSubmission &&
                                                        !isCancellationPending
                                                const cancellationBanner = (() => {
                                                        if (!hasCancellationRequest) {
                                                                return null
                                                        }

                                                        if (isCancellationPending) {
                                                                return {
                                                                        classes: 'border-amber-200 bg-amber-50/70',
                                                                        iconClass: 'text-amber-600',
                                                                        Icon: AlertTriangle,
                                                                        title:
                                                                                viewerRole === 'freelancer'
                                                                                        ? 'Client muốn hủy milestone này'
                                                                                        : 'Đang chờ freelancer phản hồi yêu cầu hủy',
                                                                        description:
                                                                                viewerRole === 'freelancer'
                                                                                        ? 'Vui lòng phản hồi để xác nhận hoặc từ chối yêu cầu. Chúng tôi sẽ thông báo cho client ngay khi bạn phản hồi.'
                                                                                        : 'Bạn đã gửi yêu cầu hủy milestone và đang chờ phản hồi từ freelancer.',
                                                                        tone: 'pending' as const
                                                                }
                                                        }

                                                        if (isCancellationAccepted) {
                                                                return {
                                                                        classes: 'border-emerald-200 bg-emerald-50/80',
                                                                        iconClass: 'text-emerald-600',
                                                                        Icon: CheckCircle2,
                                                                        title:
                                                                                viewerRole === 'freelancer'
                                                                                        ? 'Bạn đã chấp nhận yêu cầu hủy milestone'
                                                                                        : 'Freelancer đã chấp nhận yêu cầu hủy milestone',
                                                                        description:
                                                                                'Milestone sẽ được cập nhật trạng thái hủy và xử lý theo chính sách của nền tảng.',
                                                                        tone: 'accepted' as const
                                                                }
                                                        }

                                                        if (isCancellationDeclined) {
                                                                return {
                                                                        classes: 'border-rose-200 bg-rose-50/80',
                                                                        iconClass: 'text-rose-600',
                                                                        Icon: XCircle,
                                                                        title:
                                                                                viewerRole === 'freelancer'
                                                                                        ? 'Bạn đã từ chối yêu cầu hủy milestone'
                                                                                        : 'Freelancer đã từ chối yêu cầu hủy milestone',
                                                                        description:
                                                                                viewerRole === 'freelancer'
                                                                                        ? 'Hãy trao đổi thêm với client nếu cần thống nhất phương án khác.'
                                                                                        : 'Bạn có thể thương lượng lại với freelancer hoặc gửi yêu cầu mới nếu cần.',
                                                                        tone: 'declined' as const
                                                                }
                                                        }

                                                        return null
                                                })()
                                                const pendingSubmissionAttachments = pendingSubmission
                                                        ? normalizeAttachments(
                                                                  collectAttachmentInputs(
                                                                          pendingSubmission.resources,
                                                                          pendingSubmission.attachments
                                                                  )
                                                          )
                                                        : []
						const pendingSubmittedAtText = pendingSubmission?.submittedAt
							? formatDateTime(pendingSubmission.submittedAt, {
									dateStyle: 'medium',
									timeStyle: 'short'
							  })
							: undefined
                                                const canFundMilestone =
                                                        viewerRole === 'client' &&
                                                        !isContractFinalized &&
                                                        !isMilestoneReleased &&
                                                        !isMilestoneCancelled &&
                                                        (milestone.amount ?? 0) > 0 &&
                                                        !['FUNDED', 'RELEASED', 'PENDING'].includes(normalizedEscrowStatus) &&
                                                        !isCancellationPending
                                                const isFundedMilestone = ['FUNDED', 'PENDING'].includes(normalizedEscrowStatus)
                                                const canCancelMilestone =
                                                        viewerRole === 'client' &&
                                                        !isContractFinalized &&
                                                        !isMilestoneReleased &&
                                                        !isMilestoneCancelled &&
                                                        isFundedMilestone &&
                                                        !isCancellationPending
                                                const canDeleteMilestone =
                                                        viewerRole === 'client' &&
                                                        !isContractFinalized &&
                                                        !isMilestoneReleased &&
                                                        !isMilestoneCancelled &&
                                                        !isFundedMilestone &&
                                                        !isCancellationPending
						const shouldWarnUnfunded = viewerRole === 'freelancer' && escrowMeta.status === 'UNFUNDED'
						const showMilestoneActions = canSubmitWork
						const hasPendingSubmission = Boolean(pendingSubmission)
						const isReviewingCurrentMilestone =
							isReviewingSubmission && milestoneReviewState?.milestone.id === milestone.id

						return (
							<div
								key={milestone.id}
								className='flex h-full flex-col justify-between rounded-[26px] border border-slate-200/80 bg-white/95 p-5 shadow-sm transition-shadow hover:shadow-md'>
								<div className='space-y-3'>
									<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
										<div>
											<h3 className='text-base font-semibold text-slate-900'>{milestone.title}</h3>
											<p
												className='mt-1 text-sm leading-relaxed text-slate-500'
												style={{
													display: '-webkit-box',
													WebkitBoxOrient: 'vertical',
													WebkitLineClamp: 3,
													overflow: 'hidden'
												}}>
												{milestone.description ?? 'Không có mô tả chi tiết.'}
											</p>
										</div>
                                                                                <div className='flex flex-wrap items-center justify-end gap-2'>
                                                                                        <span
                                                                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge} ${meta.text}`}>
                                                                                                <span className='size-2 rounded-full bg-current'></span>
                                                                                                {meta.label}
                                                                                        </span>
                                                                                        {contractId && canVisitDisputeCenter ? (
                                                                                                <Link
                                                                                                        to={routes.contracts.dispute(contractId!, milestone.id)}
                                                                                                        className='btn btn-outline btn-xs text-primary'
                                                                                                >
                                                                                                        Trung tâm dispute
                                                                                                </Link>
                                                                                        ) : null}
                                                                                        {contractId && !canVisitDisputeCenter && !isEscrowDisputed ? (
                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500'>
                                                                                                        {isMilestoneCancelled ? 'Milestone đã hủy' : 'Đã giải ngân'}
                                                                                                </span>
                                                                                        ) : null}
                                                                                        {hasPendingSubmission && (
                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700'>
                                                                                                        Đang chờ duyệt
                                                                                                </span>
                                                                                        )}
											{canFundMilestone && (
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-primary btn-xs gap-2 shadow-sm'
                                                                                                        onClick={() => {
                                                                                                                if (isContractFinalized) return
                                                                                                                setMilestoneToFund(milestone)
                                                                                                        }}
                                                                                                        disabled={isFundingMilestone || isContractFinalized}>
													{isFundingMilestone && milestoneToFund?.id === milestone.id ? (
														<>
															<Loader2 className='size-3.5 animate-spin' />
															Đang xử lý...
														</>
													) : (
														<>
															<CreditCard className='size-3.5' />
															Giải ngân milestone
														</>
													)}
												</button>
											)}
                                                                                        {canCancelMilestone && (
                                                                                                <button
                                                                                                       type='button'
                                                                                                       className='btn btn-ghost btn-xs gap-1 text-error'
                                                                                                       onClick={() => requestCancelMilestone(milestone)}
                                                                                                        disabled={cancelMilestoneMutation.isPending || isContractFinalized}
                                                                                                        aria-label={`Hủy milestone ${milestone.title}`}>
                                                                                                        {isCancelling ? (
                                                                                                                <>
                                                                                                                        <Loader2 className='size-4 animate-spin' />
                                                                                                                        Đang hủy...
                                                                                                                </>
                                                                                                        ) : (
                                                                                                                <>
                                                                                                                        <Ban className='size-4' />
                                                                                                                        Hủy milestone
                                                                                                                </>
                                                                                                        )}
                                                                                                </button>
                                                                                        )}
                                                                                        {canDeleteMilestone && (
                                                                                                <button
                                                                                                       type='button'
                                                                                                       className='btn btn-ghost btn-xs text-error'
                                                                                                       onClick={() => requestDeleteMilestone(milestone)}
                                                                                                        disabled={deleteMilestoneMutation.isPending || isContractFinalized}
                                                                                                        aria-label={`Xóa milestone ${milestone.title}`}>
                                                                                                        {isDeleting ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
                                                                                                </button>
                                                                                        )}
										</div>
									</div>
									<ul className='space-y-2 text-sm text-slate-600'>
										<li>
											<CalendarClock className='mr-2 inline size-4 text-primary' /> Hạn hoàn thành:{' '}
											<span className='font-semibold text-slate-800'>
												{formatDateTime(milestone.dueDate, { dateStyle: 'medium' }) ?? '—'}
											</span>
										</li>
										<li>
											<CreditCard className='mr-2 inline size-4 text-secondary' /> Giá trị:{' '}
											<span className='font-semibold text-slate-800'>{amount ?? '—'}</span>
										</li>
										{milestone.approvedAt && (
											<li>
												<CheckCircle2 className='mr-2 inline size-4 text-emerald-500' /> Duyệt ngày:{' '}
												<span className='font-semibold text-slate-800'>
													{formatDateTime(milestone.approvedAt, { dateStyle: 'medium' })}
												</span>
											</li>
										)}
										<li>
											<div
												className='flex flex-wrap items-center gap-2 text-sm text-slate-600'
												title={escrowMeta.caption ?? undefined}>
												<span className='font-medium text-slate-600'>Trạng thái giải ngân:</span>
												<span className={`inline-flex items-center gap-1 font-semibold ${escrowMeta.textClass}`}>
													<EscrowIcon
														className={`size-4 ${escrowMeta.iconClass} ${escrowMeta.spinner ? 'animate-spin' : ''}`}
													/>
													{escrowMeta.label}
												</span>
												{escrowMeta.chip && (
													<span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600'>
														{escrowMeta.chip}
													</span>
												)}
											</div>
										</li>
									</ul>
                                                                        {shouldWarnUnfunded && (
                                                                                <div className='mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-700'>
                                                                                        <AlertTriangle className='mt-0.5 size-4 flex-shrink-0 text-amber-500' />
                                                                                        <span>
                                                                                                Milestone chưa được giải ngân. Nên xác nhận với khách hàng trước khi tiếp tục bàn giao.
                                                                                        </span>
                                                                                </div>
                                                                        )}
                                                                        {cancellationBanner && (
                                                                                <div
                                                                                        className={`mt-3 space-y-3 rounded-2xl border px-4 py-4 text-sm shadow-sm ${
                                                                                                cancellationBanner.classes
                                                                                        }`}
                                                                                >
                                                                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                                                                                <div className='flex flex-1 items-start gap-3'>
                                                                                                        <span
                                                                                                                className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 ${
                                                                                                                        cancellationBanner.iconClass
                                                                                                                }`}
                                                                                                        >
                                                                                                                <cancellationBanner.Icon className='size-4' />
                                                                                                        </span>
                                                                                                        <div className='min-w-0 flex-1 space-y-1'>
                                                                                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-base-content/60'>
                                                                                                                        Yêu cầu hủy milestone
                                                                                                                </p>
                                                                                                                <p className='text-sm font-semibold text-base-content'>{cancellationBanner.title}</p>
                                                                                                                <p className='text-xs text-base-content/60'>{cancellationBanner.description}</p>
                                                                                                                {cancellationRequestedAtText && (
                                                                                                                        <p className='text-xs text-base-content/50'>Gửi yêu cầu lúc {cancellationRequestedAtText}</p>
                                                                                                                )}
                                                                                                                {cancellationRespondedAtText && cancellationBanner.tone !== 'pending' && (
                                                                                                                        <p className='text-xs text-base-content/50'>Phản hồi lúc {cancellationRespondedAtText}</p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                </div>
                                                                                                {isCancellationPending && viewerRole === 'freelancer' && !isContractFinalized && (
                                                                                                        <div className='flex flex-shrink-0 flex-wrap items-center justify-end gap-2'>
                                                                                                                <button
                                                                                                                       type='button'
                                                                                                                        className='btn btn-outline btn-sm border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                                                                                                                        onClick={() => requestRespondCancellation(milestone, 'decline')}
                                                                                                                disabled={isRespondingCancellation || isContractFinalized}
                                                                                                                >
                                                                                                                        {isRespondingCancellation && respondingCancellationAction === 'decline' ? (
                                                                                                                                <>
                                                                                                                                        <Loader2 className='size-4 animate-spin' />
                                                                                                                                        Đang gửi...
                                                                                                                                </>
                                                                                                                        ) : (
                                                                                                                                'Từ chối yêu cầu'
                                                                                                                        )}
                                                                                                                </button>
                                                                                                                <button
                                                                                                                       type='button'
                                                                                                                        className='btn btn-success btn-sm gap-2'
                                                                                                                        onClick={() => requestRespondCancellation(milestone, 'accept')}
                                                                                                                disabled={isRespondingCancellation || isContractFinalized}
                                                                                                                >
                                                                                                                        {isRespondingCancellation && respondingCancellationAction === 'accept' ? (
                                                                                                                                <>
                                                                                                                                        <Loader2 className='size-4 animate-spin' />
                                                                                                                                        Đang gửi...
                                                                                                                                </>
                                                                                                                        ) : (
                                                                                                                                <>
                                                                                                                                        <CheckCircle2 className='size-4' />
                                                                                                                                        Chấp nhận hủy
                                                                                                                                </>
                                                                                                                        )}
                                                                                                                </button>
                                                                                                        </div>
                                                                                                )}
                                                                                        </div>
                                                                                        {cancellationReason && (
                                                                                                <div className='rounded-2xl bg-white/80 px-4 py-3 text-sm text-base-content/80'>
                                                                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50'>
                                                                                                                Lý do từ client
                                                                                                        </p>
                                                                                                        <p className='mt-1 whitespace-pre-line text-sm'>{cancellationReason}</p>
                                                                                                </div>
                                                                                        )}
                                                                                        {cancellationBanner.tone !== 'pending' && cancellationResponseReason && (
                                                                                                <div className='rounded-2xl bg-white/80 px-4 py-3 text-sm text-base-content/80'>
                                                                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50'>
                                                                                                                {viewerRole === 'freelancer'
                                                                                                                        ? 'Lời nhắn bạn đã gửi'
                                                                                                                        : 'Lời nhắn từ freelancer'}
                                                                                                        </p>
                                                                                                        <p className='mt-1 whitespace-pre-line text-sm'>{cancellationResponseReason}</p>
                                                                                                </div>
                                                                                        )}
                                                                                </div>
                                                                        )}
                                                                        {viewerRole === 'client' && pendingSubmission ? (
                                                                                <div className='space-y-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4'>
                                                                                        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
												<div className='min-w-0 flex-1 space-y-2'>
													<p className='text-xs font-semibold uppercase tracking-[0.25em] text-sky-600'>
														Bàn giao chờ duyệt
													</p>
													<p className='whitespace-pre-line text-sm text-slate-700'>
														{pendingSubmission.message ?? 'Không có mô tả chi tiết.'}
													</p>
													{pendingSubmission.note ? (
														<p className='text-xs text-slate-500'>Ghi chú: {pendingSubmission.note}</p>
													) : null}
													{pendingSubmittedAtText && (
														<span className='text-xs text-slate-400'>Gửi {pendingSubmittedAtText}</span>
													)}
												</div>
												<div className='flex flex-shrink-0 flex-wrap items-center justify-end gap-2'>
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-success btn-sm gap-2'
                                                                                                                onClick={() => {
                                                                                                                        if (isContractFinalized) return
                                                                                                                        setMilestoneReviewState({
                                                                                                                                milestone,
                                                                                                                                submission: pendingSubmission,
                                                                                                                                mode: 'approve'
                                                                                                                        })
                                                                                                                }}
                                                                                                                disabled={isReviewingSubmission || isContractFinalized}>
														{isReviewingCurrentMilestone && milestoneReviewState?.mode === 'approve' ? (
															<>
																<Loader2 className='size-3.5 animate-spin' />
																Đang xử lý...
															</>
														) : (
															<>
																<CheckCircle2 className='size-3.5' />
																Chấp nhận
															</>
														)}
													</button>
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-warning btn-sm gap-2'
                                                                                                                onClick={() => {
                                                                                                                        if (isContractFinalized) return
                                                                                                                        setMilestoneReviewState({
                                                                                                                                milestone,
                                                                                                                                submission: pendingSubmission,
                                                                                                                                mode: 'decline'
                                                                                                                        })
                                                                                                                }}
                                                                                                                disabled={isReviewingSubmission || isContractFinalized}>
														{isReviewingCurrentMilestone && milestoneReviewState?.mode === 'decline' ? (
															<>
																<Loader2 className='size-3.5 animate-spin' />
																Đang xử lý...
															</>
														) : (
															<>
																<XCircle className='size-3.5' />
																Yêu cầu chỉnh sửa
															</>
														)}
													</button>
												</div>
											</div>
											{pendingSubmissionAttachments.length ? (
												<ul className='space-y-2'>
													{pendingSubmissionAttachments.map(attachment => (
														<li
															key={`${pendingSubmission.id}-${attachment.id ?? attachment.label}`}
															className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600'>
															<span className='font-medium text-slate-700'>{attachment.label}</span>
															{attachment.url ? (
																<div className='flex flex-wrap items-center gap-2'>
																	<a
																		href={attachment.url}
																		target='_blank'
																		rel='noopener noreferrer'
																		className='btn btn-ghost btn-xs gap-1'>
																		<Eye className='size-3.5' /> Xem
																	</a>
																	<a
																		href={attachment.url}
																		download={attachment.fileName ?? attachment.label}
																		className='btn btn-outline btn-xs gap-1'>
																		<Download className='size-3.5' /> Tải xuống
																	</a>
																</div>
															) : (
																<span className='text-slate-400'>Không có liên kết</span>
															)}
														</li>
													))}
												</ul>
											) : null}
										</div>
									) : null}
									{showMilestoneActions && (
                                                                                <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/70 p-3 text-sm text-slate-600'>
                                                                                        <span>Hoàn thành công việc? Gửi bàn giao để khách hàng duyệt.</span>
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-secondary btn-xs gap-2'
                                                                                                onClick={() => {
                                                                                                        if (isContractFinalized) return
                                                                                                        setMilestoneToSubmit(milestone)
                                                                                                }}
                                                                                                disabled={isSubmittingWork || isContractFinalized}>
                                                                                                {isSubmittingWork && milestoneToSubmit?.id === milestone.id ? (
                                                                                                        <>
                                                                                                                <Loader2 className='size-3.5 animate-spin' />
														Đang gửi...
													</>
												) : (
													<>
														<UploadCloud className='size-3.5' />
														Gửi bàn giao
													</>
												)}
											</button>
										</div>
									)}
									<div className='space-y-3'>
										<div className='flex items-center justify-between'>
											<p className='text-sm font-semibold text-slate-800'>Bàn giao milestone</p>
											{submissions.length > 1 && (
												<span className='text-xs text-slate-400'>{submissions.length} lần bàn giao</span>
											)}
										</div>
										{submissions.length ? (
											<ul className='space-y-3'>
												{submissions.map(submission => {
													const submissionMeta = getSubmissionStatusMeta(submission.status)
													const submittedAt = formatDateTime(submission.submittedAt, {
														dateStyle: 'medium',
														timeStyle: 'short'
													})
													const reviewNote =
														submission.reviewNote ??
														submission.reviewerNote ??
														submission.reason ??
														submission.note ??
														undefined
													const reviewRating =
														typeof submission.reviewRating === 'number' &&
														submission.reviewRating >= 1 &&
														submission.reviewRating <= 5
															? submission.reviewRating
															: undefined
													const reviewAt = formatDateTime(
														submission.reviewedAt ?? submission.approvedAt ?? submission.declinedAt,
														{ dateStyle: 'medium', timeStyle: 'short' }
													)
                                                                                                        const submissionAttachments = normalizeAttachments(
                                                                                                                collectAttachmentInputs(
                                                                                                                        submission.resources,
                                                                                                                        submission.attachments
                                                                                                                )
                                                                                                        )

													return (
														<li
															key={submission.id}
															className='space-y-2 rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-600'>
															<div className='flex flex-wrap items-center justify-between gap-2'>
																<span
																	className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${submissionMeta.badge} ${submissionMeta.text}`}>
																	<span className='size-2 rounded-full bg-current'></span>
																	{submissionMeta.label}
																</span>
																{submittedAt && <span className='text-xs text-slate-400'>Gửi {submittedAt}</span>}
																{typeof reviewRating === 'number' ? (
																	<span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600'>
																		{[1, 2, 3, 4, 5].map(value => (
																			<Star
																				key={`${submission.id}-rating-${value}`}
																				className='size-3'
																				strokeWidth={1.5}
																				fill={value <= reviewRating ? 'currentColor' : 'none'}
																			/>
																		))}
																		<span>{reviewRating}/5</span>
																	</span>
																) : null}
															</div>
															<p className='whitespace-pre-line text-sm text-slate-700'>
																{submission.message ?? 'Không có mô tả chi tiết.'}
															</p>
															{submissionAttachments.length ? (
																<ul className='space-y-2'>
																	{submissionAttachments.map(attachment => (
																		<li
																			key={`${submission.id}-${attachment.id}`}
																			className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs'>
																			<span className='font-medium text-slate-700'>{attachment.label}</span>
																			{attachment.url ? (
																				<div className='flex flex-wrap items-center gap-2'>
																					<a
																						href={attachment.url}
																						target='_blank'
																						rel='noopener noreferrer'
																						className='btn btn-ghost btn-xs'>
																						<Eye className='size-3.5' /> Xem
																					</a>
																					<a
																						href={attachment.url}
																						download={attachment.fileName ?? attachment.label}
																						className='btn btn-outline btn-xs'>
																						<Download className='size-3.5' /> Tải xuống
																					</a>
																				</div>
																			) : (
																				<span className='text-slate-400'>Không có liên kết</span>
																			)}
																		</li>
																	))}
																</ul>
															) : null}
															{reviewNote && <p className='text-xs text-slate-500'>Phản hồi: {reviewNote}</p>}
															{reviewAt && (
																<p className='text-[11px] uppercase tracking-wide text-slate-400'>
																	Cập nhật {reviewAt}
																</p>
															)}
														</li>
													)
												})}
											</ul>
										) : (
											<div className='rounded-2xl border border-dashed border-slate-200/80 bg-white/60 p-4 text-xs text-slate-500'>
												{viewerRole === 'freelancer'
													? 'Bạn chưa gửi bàn giao cho milestone này. Hoàn thành công việc và nhấn “Gửi bàn giao” để khách hàng duyệt.'
													: 'Freelancer chưa gửi bàn giao cho milestone này.'}
											</div>
										)}
									</div>
									<div className='rounded-2xl border border-white/70 bg-white/70 p-4'>
										<button
											type='button'
											className='flex w-full items-center justify-between gap-3 text-left'
											aria-expanded={isAttachmentsExpanded}
											onClick={() => toggleMilestoneAttachments(milestone.id)}>
											<div className='inline-flex items-center gap-2 text-sm font-semibold text-slate-800'>
												<Paperclip className='size-4 text-primary' /> Tệp đính kèm
												{milestoneAttachments.length ? (
													<span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'>
														{milestoneAttachments.length} tệp
													</span>
												) : null}
											</div>
											<ChevronDown
												className={`size-4 text-slate-400 transition-transform ${
													isAttachmentsExpanded ? 'rotate-180' : ''
												} ${milestoneAttachments.length ? 'opacity-100' : 'opacity-40'}`}
											/>
										</button>
										{isAttachmentsExpanded ? (
											<div className='mt-4 space-y-4'>
                                                                                                {viewerRole === 'client' && !isContractFinalized && (
                                                                                                        <div className='space-y-2 rounded-xl border border-dashed border-slate-200/80 bg-white/60 p-4 text-center'>
														<input
															id={`milestone-upload-${milestone.id}`}
															type='file'
															multiple
															className='hidden'
															onChange={event => handleMilestoneAttachmentFileChange(milestone.id, event)}
															disabled={uploadMilestoneAttachmentsMutation.isPending}
														/>
														<label
															htmlFor={`milestone-upload-${milestone.id}`}
															onDrop={event => handleMilestoneAttachmentDrop(milestone.id, event)}
															onDragOver={handleMilestoneAttachmentDragOver}
															className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300/80 bg-white/70 px-4 py-6 transition hover:border-primary/40 hover:bg-primary/5 ${
																uploadMilestoneAttachmentsMutation.isPending ? 'pointer-events-none opacity-60' : ''
															}`}>
															{uploadMilestoneAttachmentsMutation.isPending &&
															uploadMilestoneAttachmentsMutation.variables?.milestoneId === milestone.id ? (
																<>
																	<Loader2 className='size-6 animate-spin text-primary' />
																	<p className='text-sm font-medium text-slate-600'>Đang tải lên tệp...</p>
																</>
															) : (
																<>
																	<UploadCloud className='size-6 text-primary/80' />
																	<div className='space-y-1'>
																		<p className='text-sm font-semibold text-slate-700'>Kéo thả tệp vào đây</p>
																		<p className='text-xs text-slate-500'>hoặc nhấn để chọn từ thiết bị của bạn</p>
																	</div>
																</>
															)}
														</label>
														<p className='text-xs text-slate-400'>Hỗ trợ nhiều tệp cùng lúc, mỗi tệp tối đa 25MB.</p>
													</div>
												)}

												{milestoneAttachments.length ? (
													<ul className='space-y-3'>
														{milestoneAttachments.map(attachment => {
															const resource = attachment.id ? resourceMap.get(attachment.id) : undefined
															const resourceId = resource?.id ?? attachment.id
															const sizeLabel = formatFileSize(
																attachment.size ?? (resource?.size as number | undefined)
															)
															const typeLabel = formatFileType({
																mimeType: attachment.mimeType ?? (resource?.mimeType as string | undefined),
																extension: attachment.extension
															})
															const uploadedLabelSource =
																attachment.createdAt ?? (resource?.createdAt as string | undefined)
															const uploadedLabel = uploadedLabelSource
																? formatDateTime(uploadedLabelSource, {
																		dateStyle: 'medium',
																		timeStyle: 'short'
																  })
																: undefined
															const metadata = [
																sizeLabel,
																typeLabel,
																uploadedLabel ? `Tải lên ${uploadedLabel}` : undefined
															].filter((value): value is string => Boolean(value))
                                                                                                                        const canDeleteResource = Boolean(resourceId) && viewerRole === 'client' && !isContractFinalized
															const isDeletingResource =
																deleteMilestoneResourceMutation.isPending &&
																deleteMilestoneResourceMutation.variables?.resourceId === resourceId
															const attachmentLabel =
																attachment.label ??
																attachment.fileName ??
																(resource?.name as string | undefined) ??
																resourceId ??
																'Tệp đính kèm'

															return (
																<li
																	key={attachment.id ?? attachmentLabel}
																	className='flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between'>
																	<div className='flex min-w-0 items-start gap-3'>
																		<div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
																			{attachment.extension ?? 'FILE'}
																		</div>
																		<div className='min-w-0'>
																			<p className='truncate font-medium text-slate-800'>{attachmentLabel}</p>
																			{metadata.length ? (
																				<div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500'>
																					{metadata.map((value, index) => (
																						<span key={`${value}-${index}`}>{value}</span>
																					))}
																				</div>
																			) : null}
																		</div>
																	</div>
																	<div className='flex flex-shrink-0 flex-wrap items-center gap-2'>
																		{attachment.url ? (
																			<>
																				<a
																					href={attachment.url}
																					target='_blank'
																					rel='noopener noreferrer'
																					className='btn btn-ghost btn-xs gap-2'>
																					<Eye className='size-4' /> Xem
																				</a>
																				<a
																					href={attachment.url}
																					download={attachment.fileName ?? attachmentLabel}
																					className='btn btn-outline btn-xs gap-2'>
																					<Download className='size-4' /> Tải xuống
																				</a>
																			</>
																		) : (
																			<span className='text-xs text-slate-400'>Không có liên kết</span>
																		)}
																		{canDeleteResource && resourceId ? (
																			<button
																				type='button'
																				className='btn btn-ghost btn-xs text-error'
																				onClick={() =>
																					requestDeleteMilestoneResource(milestone, resourceId, attachmentLabel)
																				}
                                                                                                                               disabled={deleteMilestoneResourceMutation.isPending || isContractFinalized}
																				aria-label={`Xóa tệp ${attachmentLabel}`}>
																				{isDeletingResource ? (
																					<Loader2 className='size-4 animate-spin' />
																				) : (
																					<Trash2 className='size-4' />
																				)}
																			</button>
																		) : null}
																	</div>
																</li>
															)
														})}
													</ul>
												) : (
													<div className='rounded-xl border border-dashed border-slate-200/80 bg-white/60 p-3 text-xs text-slate-400'>
														Chưa có tệp đính kèm cho milestone này.
													</div>
												)}
											</div>
										) : (
											<p className='mt-3 text-xs text-slate-500'>Nhấn để quản lý tệp đính kèm.</p>
										)}
									</div>
								</div>
								<div className='mt-4 text-xs text-slate-400'>
									Tạo ngày {formatDateTime(milestone.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
								</div>
							</div>
						)
					})}
				</div>
				{totalPages > 1 && (
					<div className='flex flex-col gap-3 rounded-[24px] border border-white/70 bg-white/90 p-4 text-sm shadow-sm shadow-white/40 sm:flex-row sm:items-center sm:justify-between'>
						<span className='text-xs text-slate-500'>
							Trang {currentPage}/{totalPages}
						</span>
						<div className='flex flex-wrap items-center gap-2'>
							<button
								type='button'
								className='btn btn-ghost btn-sm'
								onClick={() => setMilestonePage(page => Math.max(1, page - 1))}
								disabled={currentPage === 1}>
								Trước
							</button>
							<select
								className='select select-bordered select-sm w-auto min-w-[80px]'
								value={currentPage}
								onChange={event => setMilestonePage(Number(event.target.value))}>
								{Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
									<option key={pageNumber} value={pageNumber}>
										Trang {pageNumber}
									</option>
								))}
							</select>
							<button
								type='button'
								className='btn btn-ghost btn-sm'
								onClick={() => setMilestonePage(page => Math.min(totalPages, page + 1))}
								disabled={currentPage === totalPages}>
								Sau
							</button>
						</div>
					</div>
				)}
			</div>
		)
	}

	const renderFiles = () => {
		if (!attachments.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<FolderOpen className='mx-auto mb-3 size-8 text-secondary' />
					<p className='text-base font-semibold text-slate-700'>Chưa có tệp nào trong Workroom</p>
					<p className='mt-2 text-sm text-slate-500'>
						Hãy tải tài liệu liên quan tới hợp đồng để cả hai bên dễ dàng truy cập.
					</p>
				</div>
			)
		}

		return (
			<div className='space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<table className='w-full table-fixed text-left text-sm text-slate-600'>
					<thead className='text-xs font-semibold uppercase tracking-wider text-slate-400'>
						<tr>
							<th className='pb-3'>Tên tệp</th>
							<th className='pb-3'>Dung lượng</th>
							<th className='pb-3'>Định dạng</th>
							<th className='pb-3 text-right'>Hành động</th>
						</tr>
					</thead>
					<tbody>
						{attachments.map(attachment => (
							<tr key={attachment.id} className='border-t border-white/70 last:border-b-0'>
								<td className='py-3 pr-4'>
									<div className='flex items-center gap-3'>
										{isImageAttachment(attachment) ? (
											attachment.url ? (
												<img
													src={attachment.url}
													alt={attachment.label}
													className='h-12 w-12 rounded-lg object-cover shadow-sm'
													loading='lazy'
												/>
											) : (
												<div className='flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold uppercase text-slate-400'>
													IMG
												</div>
											)
										) : (
											<div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
												{attachment.extension ?? 'FILE'}
											</div>
										)}
										<span className='font-medium text-slate-800'>{attachment.label}</span>
									</div>
								</td>
								<td className='py-3 pr-4'>{formatFileSize(attachment.size) ?? '—'}</td>
								<td className='py-3 pr-4'>
									{formatFileType({
										mimeType: attachment.mimeType,
										extension: attachment.extension
									}) ?? 'Không xác định'}
								</td>
								<td className='py-3 text-right'>
									{attachment.url ? (
										<div className='flex flex-wrap items-center justify-end gap-2'>
											<a
												href={attachment.url}
												target='_blank'
												rel='noreferrer'
												className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary'>
												Xem
											</a>
											<a
												href={attachment.url}
												download={attachment.fileName ?? attachment.label}
												className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'>
												Tải xuống
											</a>
										</div>
									) : (
										<span className='text-xs text-slate-400'>Không có liên kết</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	const renderPayments = () => (
		<div className='grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'>
			<div className='space-y-6 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<h3 className='text-sm font-semibold text-slate-800'>Tổng quan thanh toán</h3>
				<div className='grid gap-4 md:grid-cols-2'>
					<div className='rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-700'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em]'>Đã thanh toán</p>
						<p className='mt-2 text-2xl font-semibold text-emerald-900'>{totalPaid ?? '—'}</p>
						<p className='text-xs text-emerald-700/80'>Bao gồm các milestones đã duyệt và giải ngân.</p>
					</div>
					<div className='rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-amber-700'>
						<p className='text-xs font-semibold uppercase tracking-[0.3em]'>Số dư còn lại</p>
						<p className='mt-2 text-2xl font-semibold text-amber-900'>{outstanding ?? '—'}</p>
						<p className='text-xs text-amber-700/80'>Sẽ được thanh toán sau khi milestone hoàn tất.</p>
					</div>
				</div>
				<div className='space-y-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600'>
					<p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Phương thức thanh toán</p>
					<p>
						Quản lý thanh toán trực tiếp trong Workroom. Các khoản thanh toán sẽ hiển thị tại đây khi bạn phát hành
						milestone.
					</p>
					<p className='text-xs text-slate-400'>
						Lưu ý: hệ thống thanh toán đang được tích hợp, thông tin hiện tại chỉ mang tính mô phỏng.
					</p>
				</div>
			</div>
			<div className='space-y-4 rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-500 shadow-inner shadow-white/30'>
				<h3 className='text-sm font-semibold text-slate-800'>Lịch sử gần đây</h3>
				<p>
					Chưa có giao dịch nào được ghi nhận. Khi milestones được duyệt và giải ngân, bạn sẽ thấy chi tiết tại đây.
				</p>
			</div>
		</div>
	)

	const renderHistory = () => {
		if (!timelineEvents.length) {
			return (
				<div className='rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
					<History className='mx-auto mb-3 size-8 text-slate-400' />
					<p className='text-base font-semibold text-slate-700'>Chưa có hoạt động nào được ghi nhận</p>
					<p className='mt-2 text-sm text-slate-500'>
						Những cập nhật của hợp đồng sẽ hiển thị tại đây theo trình tự thời gian.
					</p>
				</div>
			)
		}

		return (
			<div className='rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)]'>
				<ol className='relative border-l border-slate-200 pl-6'>
					{timelineEvents.map(event => (
						<li key={event.id} className='mb-6 last:mb-0'>
							<span className='absolute -left-[9px] mt-1 inline-flex size-4 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary'>
								<span className='size-2 rounded-full bg-primary'></span>
							</span>
							<p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>
								{formatDateTime(event.date, { dateStyle: 'medium', timeStyle: 'short' }) ?? '—'}
							</p>
							<p className='mt-2 text-sm font-semibold text-slate-800'>{event.label}</p>
							{event.description && <p className='text-sm text-slate-600'>{event.description}</p>}
						</li>
					))}
				</ol>
			</div>
		)
	}

	if (!contractId) {
		return (
			<div className='rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-10 text-center text-slate-500 shadow-inner shadow-white/30'>
				<p>Không tìm thấy hợp đồng. Vui lòng quay lại danh sách Workroom.</p>
				<Link
					to={routes.contracts.list}
					className='mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary'>
					Quay lại Workroom
				</Link>
			</div>
		)
	}

	if (contractQuery.isLoading) {
		return (
			<div className='flex justify-center py-20 text-slate-500'>
				<Loader2 className='size-6 animate-spin' />
			</div>
		)
	}

	if (contractQuery.isError) {
		return (
			<div className='rounded-[32px] border border-rose-200 bg-rose-50/70 p-10 text-center text-rose-600 shadow-inner shadow-white/30'>
				<p>Không thể tải thông tin hợp đồng. Vui lòng thử lại sau.</p>
				<button
					type='button'
					onClick={() => contractQuery.refetch()}
					className='mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100'>
					Thử lại
				</button>
			</div>
		)
	}

	return (
		<div className='space-y-8'>
			<div className='flex flex-col gap-4 rounded-[38px] border border-white/60 bg-gradient-to-br from-primary/10 via-white to-secondary/20 p-6 shadow-[0_30px_110px_rgba(15,23,42,0.1)] md:flex-row md:items-center md:justify-between md:p-10'>
				<div className='space-y-4'>
					<button
						type='button'
						onClick={() => navigate(-1)}
						className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-primary/30 hover:text-primary'>
						<ArrowLeft className='size-4' /> Quay lại
					</button>
					<div className='space-y-2'>
						<span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary'>
							{heroBadge}
						</span>
						<h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>
							{contract?.title ?? contract?.jobPost?.title ?? 'Workroom'}
						</h1>
						<p className='text-sm text-slate-600'>{heroSubtitle}</p>
					</div>
					<div className='flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 md:text-sm'>
						<span
							className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold shadow-sm shadow-primary/20 ${statusMeta.badge} ${statusMeta.text}`}>
							<span className='size-2 rounded-full bg-current'></span>
							{statusMeta.label}
						</span>
						<span className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-slate-600 shadow-sm shadow-white/40'>
							<ShieldCheck className='size-3.5 text-primary' />
							{statusDescription}
						</span>
						<span className='inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-slate-500 shadow-sm shadow-white/30'>
							<CalendarClock className='size-3.5 text-secondary' />
							Bắt đầu{' '}
							{formatDateTime(contract?.startDate || contract?.offer?.startDate, { dateStyle: 'medium' }) ?? '—'}
						</span>
					</div>
				</div>
                                <div className='flex flex-col items-start gap-3 md:items-end'>
                                        <div className='flex flex-wrap items-center gap-3'>
                                                {jobPostLink && (
                                                        <Link
                                                                to={jobPostLink}
								className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/20'>
								Xem job post
							</Link>
						)}
						<button
							type='button'
							className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm'
							disabled>
							Xuất hợp đồng (sắp ra mắt)
                                                </button>
                                        </div>
                                        <div className='flex flex-wrap items-center gap-2 md:justify-end'>
                                                {shouldShowFeedbackAction && (
                                                        <button
                                                                type='button'
                                                                className='btn btn-primary btn-sm gap-2'
                                                                onClick={() => setSubmitFeedbackOpen(true)}
                                                                disabled={submitContractFeedbackMutation.isPending}
                                                        >
                                                                {submitContractFeedbackMutation.isPending ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang mở...
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                <Star className='size-4' /> Đánh giá hợp đồng
                                                                        </>
                                                                )}
                                                        </button>
                                                )}
                                                {shouldShowEndContractAction && (
                                                        <button
                                                                type='button'
                                                                className='btn btn-warning btn-sm gap-2 text-warning-foreground'
                                                                onClick={() => setEndContractDialogOpen(true)}
                                                                disabled={endContractMutation.isPending}
                                                        >
                                                                {endContractMutation.isPending ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang xử lý...
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                <Ban className='size-4' /> Kết thúc hợp đồng
                                                                        </>
                                                                )}
                                                        </button>
                                                )}
                                        </div>
                                        {budgetSummary && <p className='text-sm text-slate-600'>Tổng quan: {budgetSummary}</p>}
                                </div>
			</div>

			<nav className='flex flex-wrap items-center gap-2 rounded-[28px] border border-white/70 bg-white/85 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'>
                                {tabs.map(tab => {
                                        const Icon = tab.icon
                                        const isActive = activeTab === tab.id
                                        return (
                                                <button
                                                        key={tab.id}
                                                        type='button'
                                                        onClick={() => handleTabChange(tab.id)}
                                                        className={`inline-flex items-center gap-2 rounded-[22px] px-4 py-2 text-sm font-semibold transition ${
                                                                isActive
                                                                        ? 'bg-gradient-to-r from-primary/90 to-secondary/80 text-white shadow-lg shadow-primary/25'
                                                                        : 'text-slate-500 hover:bg-primary/10 hover:text-primary'
                                                        }`}>
							<Icon className='size-4' />
							{tab.label}
						</button>
					)
				})}
			</nav>

			<section className='rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] md:p-8'>
				{activeTab === 'overview' && renderOverview()}
				{activeTab === 'milestones' && renderMilestones()}
				{activeTab === 'files' && renderFiles()}
				{activeTab === 'payments' && renderPayments()}
				{activeTab === 'history' && renderHistory()}
			</section>
                        <CreateMilestoneDialog
                                open={isCreateMilestoneOpen}
                                currency={currency}
                                isSubmitting={createMilestoneMutation.isPending}
                                onSubmit={(values, attachments) => {
                                        if (isContractFinalized) return
                                        return createMilestoneMutation.mutateAsync({ values, attachments })
                                }}
                                onClose={() => setCreateMilestoneOpen(false)}
                        />
                        <SubmitMilestoneWorkDialog
                                open={Boolean(milestoneToSubmit)}
                                milestoneTitle={milestoneToSubmit?.title}
                                isSubmitting={submitMilestoneWorkMutation.isPending}
                                onSubmit={async (values, files) => {
                                        if (!milestoneToSubmit || isContractFinalized) return
                                        await submitMilestoneWorkMutation.mutateAsync({
                                                milestoneId: milestoneToSubmit.id,
                                                message: values.message,
                                                note: values.note,
                                                files
					})
				}}
				onClose={() => setMilestoneToSubmit(null)}
			/>
			<ReviewMilestoneSubmissionDialog
				open={Boolean(milestoneReviewState)}
				mode={milestoneReviewState?.mode ?? 'approve'}
				milestoneTitle={milestoneReviewState?.milestone.title}
				submissionMessage={milestoneReviewState?.submission.message ?? undefined}
				submissionReviewNote={
					milestoneReviewState?.submission.reviewNote ??
					milestoneReviewState?.submission.reviewerNote ??
					milestoneReviewState?.submission.reason ??
					null
				}
				submissionReviewRating={
					typeof milestoneReviewState?.submission.reviewRating === 'number'
						? milestoneReviewState.submission.reviewRating
						: null
				}
				isSubmitting={approveMilestoneSubmissionMutation.isPending || declineMilestoneSubmissionMutation.isPending}
				onSubmit={async values => {
                                        if (!milestoneReviewState) return

                                        if (isContractFinalized) return

                                        if (milestoneReviewState.mode === 'approve') {
                                                const { reviewNote, reviewRating } = values as ApproveMilestoneSubmissionFormValues

                                                await approveMilestoneSubmissionMutation.mutateAsync({
                                                        milestoneId: milestoneReviewState.milestone.id,
							submissionId: milestoneReviewState.submission.id,
							reviewNote,
							reviewRating
						})
					} else {
						const { reviewNote, reviewRating } = values as DeclineMilestoneSubmissionFormValues

						await declineMilestoneSubmissionMutation.mutateAsync({
							milestoneId: milestoneReviewState.milestone.id,
							submissionId: milestoneReviewState.submission.id,
							reviewNote,
							reviewRating
						})
					}
				}}
				onClose={() => setMilestoneReviewState(null)}
			/>
                        <FundMilestoneDialog
                                open={Boolean(milestoneToFund)}
                                milestoneTitle={milestoneToFund?.title}
                                amountLabel={formatCurrency(milestoneToFund?.amount ?? undefined, milestoneToFund?.currency ?? currency)}
                                paymentMethods={(paymentMethodsQuery.data as PaymentMethod[] | undefined) ?? []}
                                isLoadingPaymentMethods={paymentMethodsQuery.isFetching}
                                isSubmitting={payMilestoneMutation.isPending}
                                onRefreshPaymentMethods={() => paymentMethodsQuery.refetch()}
                                onSubmit={async values => {
                                        if (!milestoneToFund || isContractFinalized) return
                                        await payMilestoneMutation.mutateAsync({
                                                milestoneId: milestoneToFund.id,
                                                paymentMethodId: values.paymentMethodId,
                                                note: values.note,
                                                idempotencyKey: values.idempotencyKey
                                        })
                                }}
                                onClose={() => setMilestoneToFund(null)}
                                pendingIdempotencyKey={pendingIdempotencyKey}
                        />
                        <CancelMilestoneDialog
                                open={Boolean(milestoneToCancel)}
                                milestoneTitle={milestoneToCancel?.title}
                                isSubmitting={cancelMilestoneMutation.isPending}
                                onSubmit={confirmCancelMilestone}
                                onClose={() => {
                                        if (cancelMilestoneMutation.isPending) return
                                        setMilestoneToCancel(null)
                                }}
                        />
                        <RespondMilestoneCancellationDialog
                                open={Boolean(cancellationResponseState)}
                                action={cancellationResponseState?.action ?? 'accept'}
                                milestoneTitle={cancellationResponseState?.milestone.title}
                                cancellationReason={cancellationResponseState?.milestone.cancellationReason}
                                requestedAt={cancellationResponseState?.milestone.cancellationRequestedAt}
                                isSubmitting={respondMilestoneCancellationMutation.isPending}
                                onSubmit={confirmRespondCancellation}
                                onClose={() => {
                                        if (respondMilestoneCancellationMutation.isPending) return
                                        setCancellationResponseState(null)
                                }}
                        />
                        <EndContractDialog
                                open={isEndContractDialogOpen}
                                reasonOptions={closureReasonOptions}
                                isSubmitting={endContractMutation.isPending}
                                onSubmit={async values => {
                                        await endContractMutation.mutateAsync(values)
                                }}
                                onClose={() => {
                                        if (endContractMutation.isPending) return
                                        setEndContractDialogOpen(false)
                                }}
                        />
                        <SubmitContractFeedbackDialog
                                open={isSubmitFeedbackOpen}
                                partnerName={partnerDisplayName}
                                isSubmitting={submitContractFeedbackMutation.isPending}
                                initialRating={viewerFeedback?.rating ?? null}
                                initialComment={viewerFeedback?.comment ?? null}
                                initialWouldHireAgain={
                                        typeof viewerFeedback?.wouldHireAgain === 'boolean'
                                                ? viewerFeedback.wouldHireAgain
                                                : null
                                }
                                onSubmit={async values => {
                                        await submitContractFeedbackMutation.mutateAsync(values)
                                }}
                                onClose={() => {
                                        if (submitContractFeedbackMutation.isPending) return
                                        setSubmitFeedbackOpen(false)
                                }}
                        />
                        <ConfirmDelete
                                open={Boolean(milestoneToDelete)}
                                onClose={() => setMilestoneToDelete(null)}
                                onConfirm={confirmDeleteMilestone}
                                name={milestoneToDelete?.title}
				title='Xóa milestone'
				description={
					<p>
						Bạn có chắc chắn muốn xóa milestone{' '}
						<span className='font-semibold text-base-content'>{milestoneToDelete?.title}</span>? Hành động này không thể
						hoàn tác.
					</p>
				}
				confirmLabel='Xóa'
				cancelLabel='Hủy'
				isProcessing={deleteMilestoneMutation.isPending}
			/>
			<ConfirmDelete
				open={Boolean(resourceToDelete)}
				onClose={() => setResourceToDelete(null)}
				onConfirm={confirmDeleteMilestoneResource}
				name={resourceToDelete?.resourceLabel}
				title='Xóa tệp đính kèm'
				description={
					<p>
						Tệp{' '}
						<span className='font-semibold text-base-content'>{resourceToDelete?.resourceLabel ?? 'đính kèm này'}</span>{' '}
						sẽ được gỡ khỏi milestone{' '}
						<span className='font-semibold text-base-content'>{resourceToDelete?.milestone.title}</span>. Hành động này
						không thể hoàn tác.
					</p>
				}
				confirmLabel='Xóa'
				cancelLabel='Hủy'
				isProcessing={deleteMilestoneResourceMutation.isPending}
			/>
		</div>
	)
}

export default ContractWorkroomPage
