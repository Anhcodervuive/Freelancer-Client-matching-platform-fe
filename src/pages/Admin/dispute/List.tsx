import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import {
        AlertTriangle,
        BadgeDollarSign,
        CalendarClock,
        ChevronDown,
        Filter,
        Lock,
        LifeBuoy,
        Link2,
        RefreshCcw,
        ScrollText,
        Search,
        ShieldCheck,
        Undo2
} from 'lucide-react'
import { toast } from 'react-toastify'

import {
	getAdminDisputes,
        generateArbitrationDossier,
        getAdminDisputeDetail,
        joinDisputeAsAdmin,
        lockDispute,
        requestArbitrationFees
} from '~/apis/admin/dispute.api'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type {
        AdminDisputeDetail,
        AdminDisputeListItem,
        AdminGenerateArbitrationDossierInput,
        AdminJoinDisputeInput,
        AdminLockDisputeInput,
        AdminRequestArbitrationFeesInput,
        DecimalLike,
        DisputeFinalEvidenceSubmission,
        DisputePayment,
        DisputeUserSummary
} from '~/types/dispute'
import { DisputeNegotiationStatus, DisputeStatus } from '~/types/dispute'
import {
	getDisputePaymentIdentityKey,
	getDisputePaymentPayerId,
	getDisputePaymentReference,
	humanizeDisputePaymentStatus,
	isDisputePaymentSuccessful
} from '~/utils/disputePayments'
import {
        AdminGenerateArbitrationDossierFormSchema,
        AdminLockDisputeFormSchema,
        AdminRequestArbitrationFeesSchema,
        type AdminGenerateArbitrationDossierFormOutput,
        type AdminLockDisputeFormOutput,
        type AdminRequestArbitrationFeesFormOutput
} from './schemas'

const STATUS_OPTIONS = Object.values(DisputeStatus)

const statusClassMap: Partial<Record<DisputeStatus, string>> = {
	[DisputeStatus.OPEN]: 'badge-warning',
	[DisputeStatus.NEGOTIATION]: 'badge-info',
	[DisputeStatus.INTERNAL_MEDIATION]: 'badge-info',
	[DisputeStatus.AWAITING_ARBITRATION_FEES]: 'badge-warning',
	[DisputeStatus.ARBITRATION_READY]: 'badge-secondary',
	[DisputeStatus.ARBITRATION]: 'badge-secondary',
	[DisputeStatus.RESOLVED_RELEASE_ALL]: 'badge-success',
	[DisputeStatus.RESOLVED_REFUND_ALL]: 'badge-success',
	[DisputeStatus.RESOLVED_SPLIT]: 'badge-success',
	[DisputeStatus.CANCELED]: 'badge-neutral',
	[DisputeStatus.EXPIRED]: 'badge-neutral'
}

const negotiationStatusClassMap: Partial<Record<DisputeNegotiationStatus, string>> = {
	[DisputeNegotiationStatus.PENDING]: 'badge-warning',
	[DisputeNegotiationStatus.ACCEPTED]: 'badge-success',
	[DisputeNegotiationStatus.REJECTED]: 'badge-error',
	[DisputeNegotiationStatus.WITHDRAWN]: 'badge-neutral',
	[DisputeNegotiationStatus.EXPIRED]: 'badge-neutral'
}

const FINAL_DISPUTE_STATUSES = new Set<DisputeStatus | string>([
	DisputeStatus.RESOLVED_RELEASE_ALL,
	DisputeStatus.RESOLVED_REFUND_ALL,
	DisputeStatus.RESOLVED_SPLIT,
	DisputeStatus.CANCELED,
	DisputeStatus.EXPIRED
])

const ADMIN_JOIN_WAIT_MS = 5 * 24 * 60 * 60 * 1000

const hasAdminJoinWindowElapsed = (createdAt?: string | null) => {
	if (!createdAt) return true
	const createdAtDate = new Date(createdAt)
	if (Number.isNaN(createdAtDate.getTime())) return true
	return Date.now() - createdAtDate.getTime() >= ADMIN_JOIN_WAIT_MS
}

const formatDateTime = (value?: string | null) => {
	if (!value) return '—'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleString()
}

const humanizeStatus = (status?: DisputeStatus | null) =>
	status
		? status
				.split('_')
				.map(part => part.charAt(0) + part.slice(1).toLowerCase())
				.join(' ')
		: 'Unknown'

const toNumber = (value: DecimalLike | null | undefined) => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null
	}

	if (typeof value === 'string') {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : null
	}

	return null
}

const formatCurrencyValue = (value: DecimalLike | null | undefined, currency?: string | null) => {
	const amount = toNumber(value)
	if (amount === null) return '—'

	const normalizedCurrency = currency && currency.trim() ? currency : 'USD'

	try {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: normalizedCurrency,
			maximumFractionDigits: 2
		}).format(amount)
	} catch {
		return `${amount.toLocaleString()} ${normalizedCurrency}`.trim()
	}
}

const humanizeNegotiationStatus = (status?: DisputeNegotiationStatus | null) =>
	status
		? status
				.split('_')
				.map(part => part.charAt(0) + part.slice(1).toLowerCase())
				.join(' ')
		: '—'

const formatBoolean = (value?: boolean | null, positiveLabel: string = 'Có', negativeLabel: string = 'Không') => {
	if (value === undefined || value === null) {
		return '—'
	}
	return value ? positiveLabel : negativeLabel
}

const formatUserName = (user?: DisputeUserSummary | null, fallback?: string | null) => {
        if (!user) {
                return fallback ?? '—'
        }

	const record = user as Record<string, unknown>
	const displayName = (() => {
		const direct = record.displayName ?? record.name ?? record.fullName
		if (typeof direct === 'string' && direct.trim().length) {
			return direct.trim()
		}
		if (user.profile && typeof user.profile === 'object') {
			const profileDisplay = (user.profile as Record<string, unknown>).displayName
			if (typeof profileDisplay === 'string' && profileDisplay.trim().length) {
				return profileDisplay.trim()
			}
		}
		return undefined
	})()

	if (displayName) {
		return displayName
	}

	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
	if (fullName.length) return fullName
	if (user.profile && typeof user.profile === 'object') {
		const profileName = [
			(user.profile as Record<string, unknown>).firstName,
			(user.profile as Record<string, unknown>).lastName
		]
			.filter(value => typeof value === 'string')
			.join(' ')
			.trim()
		if (profileName.length) {
			return profileName
		}
        }
        return user.id || fallback || '—'
}

const humanizeEvidenceSourceType = (value?: string | null) => {
        if (!value) {
                return 'Không rõ nguồn'
        }

        const normalized = value.toString().trim().toUpperCase()

        switch (normalized) {
                case 'MILESTONE_ATTACHMENT':
                        return 'Tệp milestone'
                case 'CHAT_ATTACHMENT':
                        return 'Tệp trò chuyện'
                case 'ASSET':
                        return 'Tệp đã tải lên'
                case 'EXTERNAL_URL':
                        return 'Liên kết ngoài'
                default:
                        return 'Nguồn khác'
        }
}

const formatEvidencePersonName = (
        person: DisputeFinalEvidenceSubmission['submittedBy']
): string | undefined => {
        if (!person) {
                return undefined
        }

        if (typeof person.displayName === 'string' && person.displayName.trim().length) {
                return person.displayName.trim()
        }

        if (typeof person.name === 'string' && person.name.trim().length) {
                return person.name.trim()
        }

        const firstName = typeof person.firstName === 'string' ? person.firstName.trim() : ''
        const lastName = typeof person.lastName === 'string' ? person.lastName.trim() : ''
        const fullName = `${firstName} ${lastName}`.trim()

        return fullName.length ? fullName : undefined
}

const formatSubmissionSubmitterLabel = (
        submission: DisputeFinalEvidenceSubmission,
        clientId?: string | null,
        clientLabel?: string | null,
        freelancerId?: string | null,
        freelancerLabel?: string | null
) => {
        const submitterId = submission.submittedById ?? undefined

        if (submitterId && clientId && submitterId === clientId) {
                return clientLabel ?? `Khách hàng #${clientId}`
        }

        if (submitterId && freelancerId && submitterId === freelancerId) {
                return freelancerLabel ?? `Freelancer #${freelancerId}`
        }

        const personName = formatEvidencePersonName(submission.submittedBy)
        if (personName) {
                return personName
        }

        if (submitterId) {
                const shortened = submitterId.length > 8 ? `${submitterId.slice(0, 8)}…` : submitterId
                return `Người dùng #${shortened}`
        }

        return 'Không rõ'
}

const getEvidenceItemUrl = (
        item: NonNullable<DisputeFinalEvidenceSubmission['items']>[number] | null | undefined
) => {
        if (!item) {
                return null
        }

        if (typeof item.url === 'string') {
                const trimmed = item.url.trim()
                if (trimmed.length) {
                        return trimmed
                }
        }

        if (item.asset && typeof item.asset.url === 'string') {
                        const trimmed = item.asset.url.trim()
                        if (trimmed.length) {
                                return trimmed
                        }
        }

        return null
}

const getEvidenceFlagClass = (value?: boolean | null) => {
        if (value === true) {
                return 'text-emerald-600'
        }

        if (value === false) {
                return 'text-base-content/70'
        }

        return 'text-base-content/60'
}

const pickBooleanFlag = (record: AdminDisputeListItem, keys: string[]) => {
        for (const key of keys) {
                const value = record[key]
                if (typeof value === 'boolean') {
                        return value
		}
	}
	return undefined
}

type NeedsAdminOption = 'all' | 'true' | 'false'
type AdminDetailTabId = 'overview' | 'negotiations' | 'payments' | 'evidence' | 'activity'

export default function AdminDisputeListPage() {
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(10)
	const [search, setSearch] = useState('')
	const debouncedSearch = useDebounce(search, 500)

	const [selectedStatuses, setSelectedStatuses] = useState<DisputeStatus[]>([])
	const [needsAdminFilter, setNeedsAdminFilter] = useState<NeedsAdminOption>('all')
	const [contractId, setContractId] = useState('')
	const [clientId, setClientId] = useState('')
	const [freelancerId, setFreelancerId] = useState('')
	const [createdFrom, setCreatedFrom] = useState('')
	const [createdTo, setCreatedTo] = useState('')
	const [filtersOpen, setFiltersOpen] = useState(false)

	const [joinTarget, setJoinTarget] = useState<AdminDisputeListItem | null>(null)
	const [joinReason, setJoinReason] = useState('')
	const [detailTarget, setDetailTarget] = useState<AdminDisputeListItem | null>(null)
        const [requestFeesOpen, setRequestFeesOpen] = useState(false)
        const [lockDisputeOpen, setLockDisputeOpen] = useState(false)
        const [generateDossierOpen, setGenerateDossierOpen] = useState(false)
        const [detailActiveTab, setDetailActiveTab] = useState<AdminDetailTabId>('overview')

	const queryClient = useQueryClient()

        const {
                register: requestFeesRegister,
                handleSubmit: handleRequestFeesSubmit,
                formState: { errors: requestFeesErrors },
                reset: resetRequestFeesForm
        } = useForm<AdminRequestArbitrationFeesFormOutput>({
                resolver: zodResolver(AdminRequestArbitrationFeesSchema),
                defaultValues: { deadlineDays: 7 }
        })

        const {
                register: lockDisputeRegister,
                handleSubmit: handleLockDisputeSubmit,
                formState: { errors: lockDisputeErrors },
                reset: resetLockDisputeForm
        } = useForm<AdminLockDisputeFormOutput>({
                resolver: zodResolver(AdminLockDisputeFormSchema),
                defaultValues: { note: '' }
        })

        const {
                register: generateDossierRegister,
                handleSubmit: handleGenerateDossierSubmit,
                formState: { errors: generateDossierErrors },
                reset: resetGenerateDossierForm
        } = useForm<AdminGenerateArbitrationDossierFormOutput>({
                resolver: zodResolver(AdminGenerateArbitrationDossierFormSchema),
                defaultValues: { notes: '', finalize: false }
        })

	const dateRangeError = useMemo(() => {
		if (!createdFrom || !createdTo) return false
		return new Date(createdFrom) > new Date(createdTo)
	}, [createdFrom, createdTo])

	const queryKey = useMemo(
		() => [
			'admin-disputes',
			{
				page,
				limit,
				statuses: selectedStatuses.join(','),
				needsAdminFilter,
				search: debouncedSearch,
				contractId,
				clientId,
				freelancerId,
				createdFrom,
				createdTo
			}
		],
		[
			page,
			limit,
			selectedStatuses,
			needsAdminFilter,
			debouncedSearch,
			contractId,
			clientId,
			freelancerId,
			createdFrom,
			createdTo
		]
	)

	const filters = useMemo(
		() => ({
			page,
			limit,
			status: selectedStatuses.length ? selectedStatuses : undefined,
			needsAdmin: needsAdminFilter === 'all' ? undefined : needsAdminFilter === 'true',
			search: debouncedSearch || undefined,
			contractId: contractId.trim() || undefined,
			clientId: clientId.trim() || undefined,
			freelancerId: freelancerId.trim() || undefined,
			createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
			createdTo: createdTo ? new Date(createdTo).toISOString() : undefined
		}),
		[
			page,
			limit,
			selectedStatuses,
			needsAdminFilter,
			debouncedSearch,
			contractId,
			clientId,
			freelancerId,
			createdFrom,
			createdTo
		]
	)

	const { data, isLoading, isFetching, isError, refetch } = useQuery({
		queryKey,
		queryFn: () => getAdminDisputes(filters),
		enabled: !dateRangeError
	})

	const disputes = data?.data ?? []
	const total = data?.total ?? 0
	const pages = Math.max(1, Math.ceil(total / limit))

        const detailDisputeId = detailTarget?.id ?? null

        const joinMutation = useMutation({
                mutationFn: ({ disputeId, payload }: { disputeId: string; payload: AdminJoinDisputeInput }) =>
                        joinDisputeAsAdmin(disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã tham gia tranh chấp với tư cách admin')
                        setJoinTarget(null)
			setJoinReason('')
			await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
		},
		onError: () => {
			toast.error('Không thể tham gia tranh chấp, vui lòng thử lại sau')
		}
	})

        const requestFeesMutation = useMutation({
                mutationFn: ({ disputeId, payload }: { disputeId: string; payload: AdminRequestArbitrationFeesInput }) =>
                        requestArbitrationFees(disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã yêu cầu các bên nộp phí trọng tài.')
			resetRequestFeesForm({ deadlineDays: 7 })
			setRequestFeesOpen(false)
			await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
			if (detailDisputeId) {
				await queryClient.invalidateQueries({ queryKey: ['admin-dispute-detail', detailDisputeId] })
			}
		},
		onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể yêu cầu đóng phí trọng tài.'
                        toast.error(message)
                }
        })

        const lockDisputeMutation = useMutation({
                mutationFn: ({ disputeId, payload }: { disputeId: string; payload: AdminLockDisputeInput }) =>
                        lockDispute(disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã khóa tranh chấp.')
                        resetLockDisputeForm({ note: '' })
                        setLockDisputeOpen(false)
                        await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
                        if (detailDisputeId) {
                                await queryClient.invalidateQueries({ queryKey: ['admin-dispute-detail', detailDisputeId] })
                        }
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể khóa tranh chấp.'
                        toast.error(message)
                }
        })

        const generateDossierMutation = useMutation({
                mutationFn: ({
                        disputeId,
                        payload
                }: {
                        disputeId: string
                        payload: AdminGenerateArbitrationDossierInput
                }) => generateArbitrationDossier(disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã tạo hồ sơ tranh chấp.')
                        resetGenerateDossierForm({ notes: '', finalize: false })
                        setGenerateDossierOpen(false)
                        await queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
                        if (detailDisputeId) {
                                await queryClient.invalidateQueries({ queryKey: ['admin-dispute-detail', detailDisputeId] })
                        }
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể tạo hồ sơ tranh chấp.'
                        toast.error(message)
                }
        })

        const closeLockDisputeModal = () => {
                if (lockDisputeMutation.isPending) return
                setLockDisputeOpen(false)
                resetLockDisputeForm({ note: '' })
        }

        const closeGenerateDossierModal = () => {
                if (generateDossierMutation.isPending) return
                setGenerateDossierOpen(false)
                resetGenerateDossierForm({ notes: '', finalize: false })
        }

        const {
                data: detailData,
		isLoading: isDetailLoading,
		isFetching: isDetailFetching,
		isError: isDetailError,
		refetch: refetchDetail
	} = useQuery<AdminDisputeDetail>({
		queryKey: ['admin-dispute-detail', detailDisputeId],
		queryFn: () => getAdminDisputeDetail(detailDisputeId!),
		enabled: Boolean(detailDisputeId)
	})

	const toggleStatus = (status: DisputeStatus) => {
		setSelectedStatuses(prev => {
			if (prev.includes(status)) {
				return prev.filter(item => item !== status)
			}
			return [...prev, status]
		})
		setPage(1)
	}

	const resetFilters = () => {
		setSelectedStatuses([])
		setNeedsAdminFilter('all')
		setContractId('')
		setClientId('')
		setFreelancerId('')
		setCreatedFrom('')
		setCreatedTo('')
		setSearch('')
		setPage(1)
	}

	const handleJoin = () => {
		if (!joinTarget) return
		joinMutation.mutate({
			disputeId: joinTarget.id,
			payload: joinReason.trim() ? { reason: joinReason.trim() } : {}
		})
	}

        const handleRequestFees = (values: AdminRequestArbitrationFeesFormOutput) => {
                if (!detailDisputeId) return
                requestFeesMutation.mutate({
                        disputeId: detailDisputeId,
                        payload: { deadlineDays: values.deadlineDays }
                })
        }

        const handleLockDispute = (values: AdminLockDisputeFormOutput) => {
                if (!detailDisputeId) return
                const payload: AdminLockDisputeInput = {}
                if (values.note && values.note.trim().length) {
                        payload.note = values.note.trim()
                }
                lockDisputeMutation.mutate({
                        disputeId: detailDisputeId,
                        payload
                })
        }

        const handleGenerateDossier = (values: AdminGenerateArbitrationDossierFormOutput) => {
                if (!detailDisputeId) return
                const payload: AdminGenerateArbitrationDossierInput = {}
                if (values.notes && values.notes.trim().length) {
                        payload.notes = values.notes.trim()
                }
                if (values.finalize !== undefined) {
                        payload.finalize = values.finalize
                }
                generateDossierMutation.mutate({
                        disputeId: detailDisputeId,
                        payload
                })
        }

        useEffect(() => {
                if (!detailTarget) {
                        setRequestFeesOpen(false)
                        setLockDisputeOpen(false)
                        setGenerateDossierOpen(false)
                        setDetailActiveTab('overview')
                        resetLockDisputeForm({ note: '' })
                        resetGenerateDossierForm({ notes: '', finalize: false })
                }
        }, [detailTarget, resetGenerateDossierForm, resetLockDisputeForm])

        useEffect(() => {
                if (!detailDisputeId) {
                        setDetailActiveTab('overview')
                        return
                }

                setDetailActiveTab(current => {
                        const allowedTabs: AdminDetailTabId[] = [
                                'overview',
                                'negotiations',
                                'payments',
                                'evidence',
                                'activity'
                        ]

                        return allowedTabs.includes(current) ? current : 'overview'
                })
        }, [detailDisputeId])

	const limitOptions = [10, 20, 50]

	const detailDispute = detailData?.dispute ?? detailTarget?.dispute ?? null
	const detailMetrics = detailTarget?.metrics ?? null
	const detailAmounts = detailTarget?.amounts ?? null
	const detailParties = detailTarget?.parties ?? null
	const detailClient = detailTarget?.client ?? detailParties?.client ?? null
	const detailFreelancer = detailTarget?.freelancer ?? detailParties?.freelancer ?? null
	const detailContract = detailTarget?.contract ?? null
	const detailMilestoneSummary = detailTarget?.milestone ?? null
	const detailEscrow = detailData?.escrow ?? null
	const detailNegotiations = detailData?.negotiations ?? detailDispute?.negotiations ?? null
	const detailChatLogs = detailData?.chatAccessLogs ?? null
	const detailCounts = detailData?.counts ?? null
	const detailStatus = detailDispute?.status ?? detailTarget?.status ?? null
	const detailNeedsAdmin = Boolean(
		detailMetrics?.needsAdmin ??
			(typeof detailTarget?.needsAdmin === 'boolean'
				? detailTarget.needsAdmin
				: detailTarget
				? pickBooleanFlag(detailTarget, ['needs_admin', 'requiresAdmin', 'awaitingAdmin'])
				: false)
	)
	const detailHasJoined = Boolean(
		detailMetrics?.hasAdminJoined ??
			(typeof detailTarget?.joined === 'boolean'
				? detailTarget.joined
				: detailTarget
				? pickBooleanFlag(detailTarget, ['isAdminParticipant', 'adminJoined', 'hasJoined'])
				: false)
	)
	const detailResponseDeadline = detailDispute?.responseDeadline ?? null
	const detailArbitrationDeadline = detailDispute?.arbitrationDeadline ?? null
	const detailIsOverdue = Boolean(
		detailMetrics?.isResponseOverdue ??
			(detailResponseDeadline ? new Date(detailResponseDeadline).getTime() < Date.now() : false)
	)
	const detailArbitrationPayments = useMemo<DisputePayment[]>(() => {
		if (!detailDispute?.arbitrationFeePayments?.length) {
			return []
		}

		const filtered = detailDispute.arbitrationFeePayments.filter(Boolean) as DisputePayment[]
		return filtered.sort((a, b) => {
			const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
			const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
			return bTime - aTime
		})
	}, [detailDispute?.arbitrationFeePayments])
	const detailHasPartyPaid = useMemo(
		() => (flag: boolean | undefined | null, userId?: string | null) => {
			if (flag === true) {
				return true
			}
			if (!userId) {
				return false
			}
			return detailArbitrationPayments.some(
				payment => isDisputePaymentSuccessful(payment) && getDisputePaymentPayerId(payment) === userId
			)
		},
		[detailArbitrationPayments]
	)
	const detailAdminUser = detailTarget?.admin ?? null
	const detailAdminLabel = detailAdminUser
		? formatUserName(detailAdminUser)
		: detailHasJoined
		? 'Đã tham gia'
		: 'Chưa tham gia'
	const detailCurrency =
		detailAmounts?.currency ??
		detailEscrow?.currency ??
		detailEscrow?.milestone?.currency ??
		(typeof detailMilestoneSummary?.currency === 'string' ? detailMilestoneSummary.currency : undefined)
	const detailFunded = detailAmounts?.funded ?? detailEscrow?.amountFunded ?? null
	const detailReleased = detailAmounts?.released ?? detailEscrow?.amountReleased ?? null
	const detailRefunded = detailAmounts?.refunded ?? detailEscrow?.amountRefunded ?? null
	const detailDisputable = detailAmounts?.disputable ?? null
	const detailProposedRelease = detailAmounts?.proposedRelease ?? detailDispute?.proposedRelease ?? null
	const detailEscrowContract = detailEscrow?.milestone?.contract ?? null
	const detailClientId =
		detailClient?.id ??
		detailContract?.clientId ??
		(detailEscrowContract && typeof detailEscrowContract.clientId === 'string'
			? (detailEscrowContract.clientId as string)
			: null)
        const detailFreelancerId =
                detailFreelancer?.id ??
                detailContract?.freelancerId ??
                (detailEscrowContract && typeof detailEscrowContract.freelancerId === 'string'
                        ? (detailEscrowContract.freelancerId as string)
                        : null)
        const detailClientEvidenceSubmitted =
                detailDispute?.clientEvidenceSubmitted ?? detailDispute?.clientEvidenceSubmited ?? null
        const detailFreelancerEvidenceSubmitted =
                detailDispute?.freelancerEvidenceSubmitted ?? detailDispute?.freelancerEvidenceSubmited ?? null
        const detailClientEvidenceDone = detailClientEvidenceSubmitted === true
        const detailFreelancerEvidenceDone = detailFreelancerEvidenceSubmitted === true
        const detailBothEvidenceSubmitted = detailClientEvidenceDone && detailFreelancerEvidenceDone
        const detailProposedRefund = detailAmounts?.proposedRefund ?? detailDispute?.proposedRefund ?? null
        const detailArbFeePerParty = detailDispute?.arbFeePerParty ?? null
        const detailClientFeePaid = detailHasPartyPaid(detailDispute?.clientArbFeePaid, detailClientId)
        const detailFreelancerFeePaid = detailHasPartyPaid(detailDispute?.freelancerArbFeePaid, detailFreelancerId)
        const detailClientFeeDisplay = detailClientId ? detailClientFeePaid : undefined
        const detailFreelancerFeeDisplay = detailFreelancerId ? detailFreelancerFeePaid : undefined
        const detailBothFeesPaid = detailClientFeePaid && detailFreelancerFeePaid
        const detailLockedAt = detailDispute?.lockedAt ?? null
        const detailLockedBy = detailDispute?.lockedBy ?? null
        const detailLockedById = detailDispute?.lockedById ?? null
        const detailIsLocked = Boolean(detailLockedAt || detailLockedById)
        const getDetailPaymentPayerLabel = (payment: DisputePayment) => {
                const payerId = getDisputePaymentPayerId(payment)

                if (payerId && detailClientId && payerId === detailClientId) {
                        return formatUserName(detailClient ?? null, detailClientId) || `Khách hàng #${detailClientId}`
		}

		if (payerId && detailFreelancerId && payerId === detailFreelancerId) {
			return formatUserName(detailFreelancer ?? null, detailFreelancerId) || `Freelancer #${detailFreelancerId}`
		}

		if (payment.payer) {
			const label = formatUserName(payment.payer, payerId ?? undefined)
			if (label && label !== '—') {
				return label
			}
		}

		if (payerId) {
			return payerId.length > 8 ? `Người dùng #${payerId.slice(0, 8)}` : `Người dùng #${payerId}`
		}

		return 'Không xác định'
	}
	const detailNote = detailDispute?.note ?? null
	const detailOpenedBy = detailDispute?.openedBy ?? null
	const detailOpenedAt = detailDispute?.createdAt ?? detailTarget?.createdAt ?? null
	const detailUpdatedAt = detailDispute?.updatedAt ?? detailTarget?.updatedAt ?? null
        const detailLatestProposal = detailDispute?.latestProposal ?? null
        const detailEvidenceSubmissions: DisputeFinalEvidenceSubmission[] =
                detailData?.evidenceSubmissions?.filter(
                        (item): item is DisputeFinalEvidenceSubmission => Boolean(item)
                ) ?? []
        const detailEvidenceSubmissionCount = detailEvidenceSubmissions.length
        const detailNegotiationTotal =
                detailCounts?.negotiations ??
                detailMetrics?.negotiationCount ??
                (detailNegotiations ? detailNegotiations.length : null)
        const detailContractTitle = detailContract?.title || detailEscrow?.milestone?.contract?.title || null
	const detailContractId =
                detailContract?.id ?? detailEscrow?.milestone?.contractId ?? detailEscrow?.milestone?.contract?.id ?? null
        const detailMilestoneTitle = detailMilestoneSummary?.title ?? detailEscrow?.milestone?.title ?? null
        const detailMilestoneStatus = detailMilestoneSummary?.status ?? detailEscrow?.milestone?.status ?? null
        const detailMilestoneStart = detailMilestoneSummary?.startAt ?? detailEscrow?.milestone?.startAt ?? null
        const detailMilestoneEnd = detailMilestoneSummary?.endAt ?? detailEscrow?.milestone?.endAt ?? null
	const detailCanJoin = hasAdminJoinWindowElapsed(detailOpenedAt)
	const detailShowJoin = detailHasJoined || detailCanJoin
	const detailJoinDisabled = detailHasJoined || joinMutation.isPending || !detailCanJoin

        const detailCanRequestFees = Boolean(
                detailDisputeId &&
                detailArbFeePerParty &&
                detailStatus &&
                !FINAL_DISPUTE_STATUSES.has(detailStatus) &&
                ![DisputeStatus.AWAITING_ARBITRATION_FEES, DisputeStatus.ARBITRATION_READY, DisputeStatus.ARBITRATION].includes(
                                detailStatus as DisputeStatus
                        ) &&
                        !detailBothFeesPaid
        )
        const detailCanLockDispute = Boolean(
                detailDisputeId &&
                        !detailIsLocked &&
                        detailBothFeesPaid &&
                        detailBothEvidenceSubmitted &&
                        detailStatus &&
                        !FINAL_DISPUTE_STATUSES.has(detailStatus)
        )
        const detailCanGenerateDossier = Boolean(detailDisputeId && detailIsLocked)
        const detailDossierVersion = detailDispute?.currentDossierVersion ?? null
        const detailTabItems = useMemo(
                () => [
                        { id: 'overview', label: 'Tổng quan' },
                        { id: 'negotiations', label: 'Thương lượng' },
                        { id: 'payments', label: 'Phí & thanh toán' },
                        { id: 'evidence', label: 'Hồ sơ & chứng cứ' },
                        { id: 'activity', label: 'Hoạt động' }
                ] satisfies Array<{ id: AdminDetailTabId; label: string }>,
                []
        )

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
				<div className='space-y-1'>
					<h1 className='flex items-center gap-2 text-2xl font-semibold'>
						<BadgeDollarSign className='size-6 text-primary' /> Tranh chấp
					</h1>
					<p className='text-sm text-base-content/70'>
						Theo dõi và xử lý các tranh chấp giữa khách hàng và freelancer.
					</p>
				</div>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
					<div className='flex w-full flex-wrap items-center justify-end gap-2'>
						<div className='form-control w-full sm:w-72'>
							<label className='input input-bordered flex items-center gap-2'>
								<Search className='size-4 opacity-70' />
								<input
									type='search'
									className='grow bg-transparent outline-none'
									placeholder='Từ khóa, ghi chú, số hợp đồng...'
									value={search}
									onChange={event => {
										setSearch(event.target.value)
										setPage(1)
									}}
								/>
							</label>
						</div>
						<button
							type='button'
							className='btn btn-ghost'
							onClick={() => setFiltersOpen(open => !open)}
							aria-expanded={filtersOpen}>
							<Filter className='size-4' /> Bộ lọc
							<ChevronDown className={['size-4 transition', filtersOpen ? 'rotate-180' : ''].join(' ')} />
						</button>
						<button type='button' className='btn btn-ghost' onClick={resetFilters} disabled={isFetching}>
							<Undo2 className='size-4' /> Đặt lại
						</button>
						<button type='button' className='btn' onClick={() => refetch()} disabled={isFetching}>
							<RefreshCcw className='size-4' /> Làm mới
						</button>
					</div>
				</div>
			</header>

			{filtersOpen ? (
				<section className='card border border-base-200 bg-base-100 shadow-sm'>
					<div className='card-body space-y-4'>
						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo hợp đồng</span>
								<input
									className='input input-bordered'
									placeholder='ID hợp đồng'
									value={contractId}
									onChange={event => {
										setContractId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo khách hàng</span>
								<input
									className='input input-bordered'
									placeholder='ID khách hàng'
									value={clientId}
									onChange={event => {
										setClientId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Lọc theo freelancer</span>
								<input
									className='input input-bordered'
									placeholder='ID freelancer'
									value={freelancerId}
									onChange={event => {
										setFreelancerId(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Ngày tạo từ</span>
								<input
									type='date'
									className='input input-bordered'
									value={createdFrom}
									onChange={event => {
										setCreatedFrom(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Đến ngày</span>
								<input
									type='date'
									className='input input-bordered'
									value={createdTo}
									onChange={event => {
										setCreatedTo(event.target.value)
										setPage(1)
									}}
								/>
							</label>

							<label className='form-control'>
								<span className='label-text text-sm font-medium'>Cần admin can thiệp</span>
								<select
									className='select select-bordered'
									value={needsAdminFilter}
									onChange={event => {
										setNeedsAdminFilter(event.target.value as NeedsAdminOption)
										setPage(1)
									}}>
									<option value='all'>Tất cả</option>
									<option value='true'>Chỉ hiển thị</option>
									<option value='false'>Đã xử lý</option>
								</select>
							</label>
						</div>

						<div>
							<span className='label-text text-sm font-medium'>Trạng thái tranh chấp</span>
							<div className='mt-2 max-h-48 overflow-y-auto rounded-lg border border-dashed border-base-300 bg-base-200/40 p-3'>
								{STATUS_OPTIONS.map(status => {
									const checked = selectedStatuses.includes(status)
									return (
										<label key={status} className='flex items-center gap-3 rounded-md px-2 py-1 hover:bg-base-100'>
											<input
												type='checkbox'
												className='checkbox checkbox-sm'
												checked={checked}
												onChange={() => toggleStatus(status)}
											/>
											<span className='text-sm'>{humanizeStatus(status)}</span>
										</label>
									)
								})}
							</div>
						</div>

						{dateRangeError ? (
							<div className='alert alert-warning shadow-sm'>
								<CalendarClock className='size-5' />
								<span>Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</span>
							</div>
						) : null}
					</div>
				</section>
			) : null}

			<section className='card bg-base-100 shadow-sm'>
				<div className='card-body space-y-5'>
					{isLoading ? (
						<div className='space-y-4'>
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className='space-y-3 rounded-2xl border border-base-200 p-5'>
									<div className='skeleton h-6 w-1/3' />
									<div className='skeleton h-4 w-2/3' />
									<div className='skeleton h-32 w-full' />
								</div>
							))}
						</div>
					) : null}

					{!isLoading && isError ? (
						<div className='alert alert-error'>
							<ShieldCheck className='size-5' />
							<span>Không thể tải dữ liệu tranh chấp. Vui lòng thử lại.</span>
						</div>
					) : null}

					{!isLoading && !isError && disputes.length === 0 ? (
						<div className='py-12 text-center text-base-content/70'>Không tìm thấy tranh chấp phù hợp.</div>
					) : null}

					{!isLoading && !isError && isFetching ? (
						<div className='flex justify-end'>
							<span className='badge badge-outline gap-2 text-xs'>
								<span className='loading loading-spinner size-3' /> Đang cập nhật...
							</span>
						</div>
					) : null}

					{!isLoading && !isError && disputes.length > 0 ? (
						<div className='space-y-4'>
							{disputes.map(item => {
								const contractTitle = item.contract?.title || ''
								const milestoneTitle = item.milestone?.title || item.milestone?.description || ''
								const baseDispute = item.dispute ?? null
								const status = item.status ?? baseDispute?.status
								const amounts = item.amounts ?? null
								const metrics = item.metrics ?? null
								const parties = item.parties ?? null
								const client = item.client ?? parties?.client ?? null
								const freelancer = item.freelancer ?? parties?.freelancer ?? null
								const adminUser = item.admin ?? null
								const milestoneRecord = item.milestone ? (item.milestone as Record<string, unknown>) : null
								const milestoneCurrency =
									milestoneRecord && typeof milestoneRecord.currency === 'string'
										? (milestoneRecord.currency as string)
										: null
								const currency =
									typeof amounts?.currency === 'string' && amounts.currency.trim()
										? (amounts.currency as string)
										: milestoneCurrency
								const disputableAmount = amounts?.disputable
								const proposedRelease =
									amounts?.proposedRelease ?? baseDispute?.latestProposal?.releaseAmount ?? baseDispute?.proposedRelease
								const proposedRefund =
									amounts?.proposedRefund ?? baseDispute?.latestProposal?.refundAmount ?? baseDispute?.proposedRefund
								const responseDeadline = baseDispute?.responseDeadline ?? null
								const negotiationCount =
									metrics?.negotiationCount ?? (baseDispute?.negotiations ? baseDispute.negotiations.length : null)
								const latestProposalStatus = baseDispute?.latestProposal?.status ?? null
								const fallbackNeedsAdmin =
									typeof item.needsAdmin === 'boolean'
										? item.needsAdmin
										: pickBooleanFlag(item, ['needs_admin', 'requiresAdmin', 'awaitingAdmin']) ?? false
								const fallbackJoined =
									typeof item.joined === 'boolean'
										? item.joined
										: pickBooleanFlag(item, ['isAdminParticipant', 'adminJoined', 'hasJoined']) ?? false
								const needsAdminFlag = Boolean(metrics?.needsAdmin ?? fallbackNeedsAdmin)
								const hasAdminJoinedFlag = Boolean(metrics?.hasAdminJoined ?? fallbackJoined)
								const isResponseOverdue = Boolean(
									metrics?.isResponseOverdue ??
										(responseDeadline ? new Date(responseDeadline).getTime() < Date.now() : false)
								)
								const adminLabel = adminUser
									? formatUserName(adminUser)
									: hasAdminJoinedFlag
									? 'Đã tham gia'
									: 'Chưa tham gia'
								const canAdminJoin = hasAdminJoinWindowElapsed(item.createdAt)
								const showJoinButton = hasAdminJoinedFlag || canAdminJoin
								const joinDisabled = hasAdminJoinedFlag || joinMutation.isPending || !canAdminJoin

								const createdAt = item.createdAt ?? baseDispute?.createdAt ?? null
								const updatedAt = item.updatedAt ?? baseDispute?.updatedAt ?? null

								return (
									<article key={item.id} className='space-y-4 rounded-2xl border border-base-200 p-5 shadow-sm'>
										<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
											<div className='space-y-2'>
												<div className='flex flex-wrap items-center gap-2'>
													<span className='font-semibold text-base-content'>#{item.id}</span>
													<span
														className={[
															'badge',
															status ? statusClassMap[status] ?? 'badge-outline' : 'badge-outline'
														].join(' ')}>
														{humanizeStatus(status)}
													</span>
													{needsAdminFlag ? (
														<span className='badge badge-warning gap-1 text-xs'>
															<LifeBuoy className='size-3.5' /> Cần admin
														</span>
													) : null}
													{hasAdminJoinedFlag ? (
														<span className='badge badge-success gap-1 text-xs'>Đã tham gia</span>
													) : null}
													{isResponseOverdue ? (
														<span className='badge badge-error gap-1 text-xs'>
															<AlertTriangle className='size-3.5' /> Quá hạn phản hồi
														</span>
													) : null}
												</div>
												<div className='space-y-1 text-sm text-base-content/80'>
													<div>
														{contractTitle ||
															(item.contract?.id ? `Hợp đồng #${item.contract.id}` : 'Không rõ hợp đồng')}
													</div>
													{item.milestone || milestoneTitle ? (
														<div className='text-xs text-base-content/60'>
															Mốc: {milestoneTitle || (item.milestone?.id ? `#${item.milestone.id}` : '—')}
														</div>
													) : null}
													{item.contract?.id ? (
														<Link to={routes.contracts.detail(item.contract.id)} className='link link-primary text-xs'>
															Xem hợp đồng
														</Link>
													) : null}
												</div>
												<div className='flex flex-wrap gap-3 text-xs text-base-content/60'>
													<span>Tạo: {formatDateTime(createdAt)}</span>
													<span>Cập nhật: {formatDateTime(updatedAt)}</span>
													<span>
														Admin phụ trách: <span className='font-medium text-base-content'>{adminLabel}</span>
													</span>
												</div>
											</div>
											<div className='flex flex-wrap items-center gap-2'>
												{showJoinButton ? (
													<button
														type='button'
														className='btn btn-sm btn-outline'
														disabled={joinDisabled}
														onClick={() => {
															setJoinTarget(item)
															setJoinReason('')
														}}>
														{hasAdminJoinedFlag ? 'Đã tham gia' : 'Tham gia'}
													</button>
												) : null}
												<button type='button' className='btn btn-sm btn-primary' onClick={() => setDetailTarget(item)}>
													Xem chi tiết
												</button>
											</div>
										</div>
										<div className='grid gap-4 text-sm md:grid-cols-3'>
											<div className='space-y-1'>
												<p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Khách hàng</p>
												<p className='font-medium text-base-content'>
													{formatUserName(client, item.contract?.clientId ?? null)}
												</p>
												<p className='text-xs text-base-content/60'>
													ID: {client?.id ?? item.contract?.clientId ?? '—'}
												</p>
											</div>
											<div className='space-y-1'>
												<p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Freelancer</p>
												<p className='font-medium text-base-content'>
													{formatUserName(freelancer, item.contract?.freelancerId ?? null)}
												</p>
												<p className='text-xs text-base-content/60'>
													ID: {freelancer?.id ?? item.contract?.freelancerId ?? '—'}
												</p>
											</div>
											<div className='space-y-2'>
												<p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
													Tổng quan nhanh
												</p>
												<div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/70'>
													<span>
														Tranh chấp:{' '}
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(disputableAmount ?? null, currency)}
														</span>
													</span>
													<span>
														Thương lượng:{' '}
														<span className='font-medium text-base-content'>
															{typeof negotiationCount === 'number' ? negotiationCount : '—'}
														</span>
													</span>
													<span>
														Đề xuất trả FL:{' '}
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(proposedRelease ?? null, currency)}
														</span>
													</span>
													<span>
														Đề xuất trả KH:{' '}
														<span className='font-medium text-base-content'>
															{formatCurrencyValue(proposedRefund ?? null, currency)}
														</span>
													</span>
													<span>
														Đề xuất mới nhất:{' '}
														<span className='font-medium text-base-content'>
															{humanizeNegotiationStatus(latestProposalStatus)}
														</span>
													</span>
												</div>
											</div>
										</div>
									</article>
								)
							})}
						</div>
					) : null}
				</div>

				<div className='border-t border-base-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
					<div className='text-sm text-base-content/70'>
						Hiển thị {disputes.length ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} trong tổng số{' '}
						{total} tranh chấp
					</div>
					<div className='flex flex-wrap items-center gap-3'>
						<label className='flex items-center gap-2 text-sm'>
							<span>Hiển thị</span>
							<select
								className='select select-bordered select-sm'
								value={limit}
								onChange={event => {
									setLimit(Number(event.target.value))
									setPage(1)
								}}>
								{limitOptions.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
							<span>dòng</span>
						</label>
						<div className='join'>
							<button
								type='button'
								className='btn btn-sm join-item'
								onClick={() => setPage(page - 1)}
								disabled={page <= 1}>
								«
							</button>
							<button type='button' className='btn btn-sm join-item btn-ghost'>
								Trang {page}/{pages}
							</button>
							<button
								type='button'
								className='btn btn-sm join-item'
								onClick={() => setPage(page + 1)}
								disabled={page >= pages}>
								»
							</button>
						</div>
					</div>
				</div>
			</section>

			{detailTarget ? (
				<dialog className='modal modal-open'>
					<div className='modal-box max-w-5xl space-y-6'>
						<header className='space-y-3'>
							<div className='flex flex-wrap items-start justify-between gap-3'>
								<div className='space-y-2'>
									<h3 className='flex items-center gap-2 text-lg font-semibold'>
										<BadgeDollarSign className='size-5 text-primary' /> Chi tiết tranh chấp #{detailTarget.id}
									</h3>
									<div className='flex flex-wrap items-center gap-2 text-xs text-base-content/70'>
										<span
											className={[
												'badge',
												detailStatus ? statusClassMap[detailStatus] ?? 'badge-outline' : 'badge-outline'
											].join(' ')}>
											{humanizeStatus(detailStatus)}
										</span>
										{detailNeedsAdmin ? (
											<span className='badge badge-warning gap-1 text-xs'>
												<LifeBuoy className='size-3.5' /> Cần admin
											</span>
										) : null}
										{detailHasJoined ? <span className='badge badge-success gap-1 text-xs'>Đã tham gia</span> : null}
										{detailIsOverdue ? (
											<span className='badge badge-error gap-1 text-xs'>
												<AlertTriangle className='size-3.5' /> Quá hạn phản hồi
											</span>
										) : null}
										{isDetailFetching ? (
											<span className='badge badge-outline gap-2 text-xs'>
												<span className='loading loading-spinner size-3' /> Đang cập nhật
											</span>
										) : null}
									</div>
								</div>
								<div className='flex flex-wrap items-center gap-2'>
                                                                        {detailShowJoin ? (
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-sm btn-outline'
											disabled={detailJoinDisabled}
											onClick={() => {
												if (!detailJoinDisabled && detailTarget) {
													setDetailTarget(null)
													setJoinTarget(detailTarget)
													setJoinReason('')
                                                                                                }
                                                                                        }}>
                                                                                        {detailHasJoined ? 'Đã tham gia' : 'Tham gia tranh chấp'}
                                                                                </button>
                                                                        ) : null}
                                                                        {detailCanRequestFees ? (
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-sm btn-primary'
                                                                                        onClick={() => {
                                                                                                resetRequestFeesForm({ deadlineDays: 7 })
                                                                                                setRequestFeesOpen(true)
                                                                                        }}
                                                                                        disabled={requestFeesMutation.isPending}>
                                                                                        Yêu cầu đóng phí
                                                                                </button>
                                                                        ) : null}
                                                                        {detailCanLockDispute ? (
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-sm btn-secondary'
                                                                                        onClick={() => {
                                                                                                resetLockDisputeForm({ note: '' })
                                                                                                setLockDisputeOpen(true)
                                                                                        }}
                                                                                        disabled={lockDisputeMutation.isPending}>
                                                                                        <Lock className='size-4' /> Khóa tranh chấp
                                                                                </button>
                                                                        ) : null}
                                                                        {detailCanGenerateDossier ? (
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-sm btn-outline'
                                                                                        onClick={() => {
                                                                                                resetGenerateDossierForm({ notes: '', finalize: false })
                                                                                                setGenerateDossierOpen(true)
                                                                                        }}
                                                                                        disabled={generateDossierMutation.isPending}>
                                                                                        <ScrollText className='size-4' /> Tạo hồ sơ
                                                                                </button>
                                                                        ) : null}
                                                                        <button type='button' className='btn btn-sm btn-ghost' onClick={() => setDetailTarget(null)}>
                                                                                Đóng
                                                                        </button>
                                                                </div>
                                                        </div>
						</header>

						{isDetailLoading ? (
							<div className='space-y-3'>
								{Array.from({ length: 4 }).map((_, index) => (
									<div key={index} className='skeleton h-6 w-full rounded-lg' />
								))}
							</div>
						) : isDetailError ? (
							<div className='alert alert-error'>
								<AlertTriangle className='size-5' />
								<div className='flex-1 space-y-2'>
									<p>Không thể tải chi tiết tranh chấp. Vui lòng thử lại.</p>
									<button type='button' className='btn btn-sm' onClick={() => refetchDetail()}>
										Thử lại
									</button>
								</div>
							</div>
						) : (
                                                        <div className='space-y-6 text-sm'>
                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                        {detailTabItems.map(item => {
                                                                                const isActive = detailActiveTab === item.id
                                                                                return (
                                                                                        <button
                                                                                                key={item.id}
                                                                                                type='button'
                                                                                                className={`btn btn-sm ${
                                                                                                        isActive
                                                                                                                ? 'btn-primary'
                                                                                                                : 'btn-ghost border border-base-200 text-base-content/70'
                                                                                                }`}
                                                                                                onClick={() => setDetailActiveTab(item.id)}
                                                                                                aria-pressed={isActive}
                                                                                        >
                                                                                                {item.label}
                                                                                        </button>
                                                                                )
                                                                        })}
                                                                </div>

                                                                {detailActiveTab === 'overview' ? (
                                                                        <section className='grid gap-4 lg:grid-cols-2'>
                                                                                <div className='space-y-3'>
                                                                                        <div className='grid gap-3 sm:grid-cols-2'>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Trạng thái</p>
                                                                                                        <p className='font-medium text-base-content'>{humanizeStatus(detailStatus)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Admin phụ trách</p>
                                                                                                        <p className='font-medium text-base-content'>{detailAdminLabel}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Tạo lúc</p>
                                                                                                        <p className='font-medium text-base-content'>{formatDateTime(detailOpenedAt)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Cập nhật</p>
                                                                                                        <p className='font-medium text-base-content'>{formatDateTime(detailUpdatedAt)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Hạn phản hồi</p>
                                                                                                        <p className='font-medium text-base-content'>{formatDateTime(detailResponseDeadline)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Hạn trọng tài</p>
                                                                                                        <p className='font-medium text-base-content'>{formatDateTime(detailArbitrationDeadline)}</p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Khóa tranh chấp</p>
                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                {detailIsLocked
                                                                                                                        ? detailLockedAt
                                                                                                                                ? `Đã khóa (${formatDateTime(detailLockedAt)})`
                                                                                                                                : 'Đã khóa'
                                                                                                                        : 'Chưa khóa'}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Admin khóa</p>
                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                {detailIsLocked
                                                                                                                        ? formatUserName(detailLockedBy ?? null, detailLockedById ?? undefined)
                                                                                                                        : '—'}
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs uppercase text-base-content/60'>Phiên bản hồ sơ</p>
                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                {detailDossierVersion !== null && detailDossierVersion !== undefined
                                                                                                                        ? `#${detailDossierVersion}`
                                                                                                                        : 'Chưa tạo'}
                                                                                                        </p>
                                                                                                </div>
                                                                                        </div>
                                                                                        {detailOpenedBy ? (
                                                                                                <div className='text-xs text-base-content/70'>
                                                                                                        <span className='font-medium text-base-content'>Người mở tranh chấp:</span>{' '}
                                                                                                        {formatUserName(detailOpenedBy, detailOpenedBy.id)}
                                                                                                </div>
                                                                                        ) : null}
                                                                                        {detailNote ? (
                                                                                                <div className='rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-base-content/80'>
                                                                                                        <span className='font-medium text-primary'>Ghi chú:</span> {detailNote}
                                                                                                </div>
                                                                                        ) : null}
                                                                                </div>
                                                                                <div className='space-y-3'>
                                                                                        <div className='space-y-2'>
                                                                                                <p className='text-xs uppercase text-base-content/60'>Các bên liên quan</p>
                                                                                                <div>
                                                                                                        <p className='text-xs text-base-content/60'>Khách hàng</p>
                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                {formatUserName(detailClient, detailClientId ?? undefined)}
                                                                                                        </p>
                                                                                                        <p className='text-xs text-base-content/60'>ID: {detailClientId ?? '—'}</p>
                                                                                                        <p className='text-xs text-base-content/60'>
                                                                                                                Chứng cứ:{' '}
                                                                                                                <span className={`font-medium ${getEvidenceFlagClass(detailClientEvidenceSubmitted)}`}>
                                                                                                                        {formatBoolean(detailClientEvidenceSubmitted, 'Đã nộp', 'Chưa nộp')}
                                                                                                                </span>
                                                                                                        </p>
                                                                                                </div>
                                                                                                <div>
                                                                                                        <p className='text-xs text-base-content/60'>Freelancer</p>
                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                {formatUserName(detailFreelancer, detailFreelancerId ?? undefined)}
                                                                                                        </p>
                                                                                                        <p className='text-xs text-base-content/60'>ID: {detailFreelancerId ?? '—'}</p>
                                                                                                        <p className='text-xs text-base-content/60'>
                                                                                                                Chứng cứ:{' '}
                                                                                                                <span className={`font-medium ${getEvidenceFlagClass(detailFreelancerEvidenceSubmitted)}`}>
                                                                                                                        {formatBoolean(detailFreelancerEvidenceSubmitted, 'Đã nộp', 'Chưa nộp')}
                                                                                                                </span>
                                                                                                        </p>
                                                                                                </div>
                                                                                        </div>
                                                                                        <div className='space-y-2'>
                                                                                                <p className='text-xs uppercase text-base-content/60'>Hợp đồng &amp; mốc</p>
                                                                                                <div className='space-y-1'>
                                                                                                        <div>
                                                                                                                {detailContractTitle ||
                                                                                                                        (detailContractId ? `Hợp đồng #${detailContractId}` : 'Không rõ hợp đồng')}
                                                                                                        </div>
                                                                                                        {detailContractId ? (
                                                                                                                <Link to={routes.contracts.detail(detailContractId)} className='link link-primary text-xs'>
                                                                                                                        Xem hợp đồng
                                                                                                                </Link>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                                <div className='text-sm text-base-content/80'>
                                                                                                        Mốc:{' '}
                                                                                                        {detailMilestoneTitle || (detailMilestoneSummary?.id ? `#${detailMilestoneSummary.id}` : '—')}
                                                                                                </div>
                                                                                                <div className='grid gap-2 text-xs text-base-content/60 sm:grid-cols-2'>
                                                                                                        <span>
                                                                                                                Trạng thái:{' '}
                                                                                                                <span className='font-medium text-base-content'>{detailMilestoneStatus ?? '—'}</span>
                                                                                                        </span>
                                                                                                        <span>
                                                                                                                Bắt đầu:{' '}
                                                                                                                <span className='font-medium text-base-content'>{formatDateTime(detailMilestoneStart)}</span>
                                                                                                        </span>
                                                                                                        <span>
                                                                                                                Kết thúc:{' '}
                                                                                                                <span className='font-medium text-base-content'>{formatDateTime(detailMilestoneEnd)}</span>
                                                                                                        </span>
                                                                                                </div>
                                                                                        </div>
                                                                                </div>
                                                                        </section>
                                                                ) : null}

                                                                {detailActiveTab === 'payments' ? (
                                                                        <section className='grid gap-4 md:grid-cols-2'>
                                                                                <div className='space-y-2'>
                                                                                        <p className='text-xs uppercase text-base-content/60'>Tài chính</p>
                                                                                        <div className='space-y-1'>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Ký quỹ</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailFunded, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Đã giải ngân</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailReleased, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Đã hoàn</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailRefunded, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Đang tranh chấp</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailDisputable, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Đề xuất trả freelancer</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailProposedRelease, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span className='text-base-content/70'>Đề xuất trả khách hàng</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailProposedRefund, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                        </div>
                                                                                </div>
                                                                                <div className='space-y-3'>
                                                                                        <p className='text-xs uppercase text-base-content/60'>Phí trọng tài</p>
                                                                                        <div className='space-y-1 rounded-xl border border-base-200 bg-base-100 p-3 text-xs text-base-content/70'>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span>Phí mỗi bên</span>
                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                {formatCurrencyValue(detailArbFeePerParty, detailCurrency)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span>Khách đã nộp</span>
                                                                                                        <span
                                                                                                                className={`badge ${
                                                                                                                        detailClientId ? (detailClientFeePaid ? 'badge-success' : 'badge-warning') : 'badge-outline'
                                                                                                                }`}
                                                                                                        >
                                                                                                                {formatBoolean(detailClientFeeDisplay)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                                        <span>Freelancer đã nộp</span>
                                                                                                        <span
                                                                                                                className={`badge ${
                                                                                                                        detailFreelancerId
                                                                                                                                ? detailFreelancerFeePaid
                                                                                                                                        ? 'badge-success'
                                                                                                                                        : 'badge-warning'
                                                                                                                                : 'badge-outline'
                                                                                                                }`}
                                                                                                        >
                                                                                                                {formatBoolean(detailFreelancerFeeDisplay)}
                                                                                                        </span>
                                                                                                </div>
                                                                                                {detailArbitrationDeadline ? (
                                                                                                        <div className='flex items-center justify-between gap-3'>
                                                                                                                <span>Hạn nộp phí</span>
                                                                                                                <span className='font-medium text-base-content'>
                                                                                                                        {formatDateTime(detailArbitrationDeadline)}
                                                                                                                </span>
                                                                                                        </div>
                                                                                                ) : null}
                                                                                        </div>
                                                                                        {detailBothFeesPaid ? (
                                                                                                <div className='rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-xs text-success'>
                                                                                                        Cả hai bên đã hoàn tất việc nộp phí trọng tài.
                                                                                                </div>
                                                                                        ) : null}
                                                                                        <div className='space-y-2'>
                                                                                                <h5 className='text-xs font-semibold uppercase text-base-content/60'>Lịch sử thanh toán</h5>
                                                                                                {detailArbitrationPayments.length ? (
                                                                                                        <div className='space-y-2'>
                                                                                                                {detailArbitrationPayments.map((payment, index) => {
                                                                                                                        const reference = getDisputePaymentReference(payment)
                                                                                                                        const identityKey = getDisputePaymentIdentityKey(payment)
                                                                                                                        const statusLabel = humanizeDisputePaymentStatus(payment.status)
                                                                                                                        const statusClass = isDisputePaymentSuccessful(payment) ? 'badge-success' : 'badge-ghost'
                                                                                                                        const createdAtLabel = formatDateTime(payment.createdAt) ?? 'Không rõ'
                                                                                                                        const key =
                                                                                                                                payment.id || `${reference ?? identityKey ?? 'payment'}-${payment.createdAt ?? index}`

                                                                                                                        return (
                                                                                                                                <div key={key} className='space-y-2 rounded-xl border border-base-200 bg-base-200/60 p-3'>
                                                                                                                                        <div className='flex flex-wrap items-center justify-between gap-3'>
                                                                                                                                                <div className='space-y-1'>
                                                                                                                                                        <p className='font-medium text-base-content'>
                                                                                                                                                                {getDetailPaymentPayerLabel(payment)}
                                                                                                                                                        </p>
                                                                                                                                                        <p className='text-[11px] text-base-content/60'>
                                                                                                                                                                Mã tham chiếu:{' '}
                                                                                                                                                                <span className='break-all font-medium text-base-content'>
                                                                                                                                                                        {reference ?? identityKey ?? '—'}
                                                                                                                                                                </span>
                                                                                                                                                        </p>
                                                                                                                                                </div>
                                                                                                                                                <div className='text-right'>
                                                                                                                                                        <p className='text-sm font-semibold text-base-content'>
                                                                                                                                                                {formatCurrencyValue(payment.amount ?? null, payment.currency ?? detailCurrency)}
                                                                                                                                                        </p>
                                                                                                                                                        <div className='mt-1 flex flex-wrap items-center justify-end gap-2 text-[11px] text-base-content/60'>
                                                                                                                                                                <span className={`badge ${statusClass}`}>{statusLabel}</span>
                                                                                                                                                                <span>{createdAtLabel}</span>
                                                                                                                                                        </div>
                                                                                                                                                </div>
                                                                                                                                        </div>
                                                                                                                                        {identityKey && reference && identityKey !== reference ? (
                                                                                                                                                <p className='break-all text-[11px] text-base-content/60'>
                                                                                                                                                        Mã xác nhận: {identityKey}
                                                                                                                                                </p>
                                                                                                                                        ) : null}
                                                                                                                                        {payment.description ? (
                                                                                                                                                <p className='text-[11px] text-base-content/60'>Ghi chú: {payment.description}</p>
                                                                                                                                        ) : null}
                                                                                                                                </div>
                                                                                                                        )
                                                                                                                })}
                                                                                                        </div>
                                                                                                ) : (
                                                                                                        <p className='text-xs text-base-content/60'>Chưa có giao dịch phí trọng tài.</p>
                                                                                                )}
                                                                                        </div>
                                                                                </div>
                                                                        </section>
                                                                ) : null}

                                                                {detailActiveTab === 'evidence' ? (
                                                                        <section className='space-y-3'>
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        <ScrollText className='size-4 text-primary' />
                                                                                        <h4 className='text-sm font-semibold text-base-content'>Chứng cứ cuối cùng</h4>
                                                                                        {detailEvidenceSubmissionCount ? (
                                                                                                <span className='badge badge-outline text-[11px]'>
                                                                                                        {detailEvidenceSubmissionCount}
                                                                                                </span>
                                                                                        ) : null}
                                                                                </div>
                                                                                {detailEvidenceSubmissionCount ? (
                                                                                        <div className='space-y-3'>
                                                                                                {detailEvidenceSubmissions.map((submission, submissionIndex) => {
                                                                                                        const key = submission.id ?? `submission-${submissionIndex}`
                                                                                                        const submitterLabel = formatSubmissionSubmitterLabel(
                                                                                                                submission,
                                                                                                                detailClientId,
                                                                                                                formatUserName(detailClient, detailClientId ?? undefined),
                                                                                                                detailFreelancerId,
                                                                                                                formatUserName(detailFreelancer, detailFreelancerId ?? undefined)
                                                                                                        )
                                                                                                        const items = submission.items?.filter(Boolean) ?? []

                                                                                                        return (
                                                                                                                <div
                                                                                                                        key={key}
                                                                                                                        className='space-y-3 rounded-xl border border-base-200 bg-base-200/60 p-3 text-sm text-base-content'
                                                                                                                >
                                                                                                                        <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60'>
                                                                                                                                <span className='font-medium text-base-content'>{submitterLabel}</span>
                                                                                                                                <span>{formatDateTime(submission.submittedAt)}</span>
                                                                                                                        </div>
                                                                                                                        {submission.statement ? (
                                                                                                                                <p className='text-sm text-base-content'>{submission.statement}</p>
                                                                                                                        ) : null}
                                                                                                                        {submission.noAdditionalEvidence ? (
                                                                                                                                <div className='rounded-lg bg-base-100/80 p-2 text-[11px] text-base-content/70'>
                                                                                                                                        Người gửi xác nhận không có chứng cứ bổ sung.
                                                                                                                                </div>
                                                                                                                        ) : null}
                                                                                                                        {items.length ? (
                                                                                                                                <div className='space-y-2 text-xs text-base-content/80'>
                                                                                                                                        {items.map((item, itemIndex) => {
                                                                                                                                                const itemKey = item?.id ?? `${key}-item-${itemIndex}`
                                                                                                                                                const itemLabel = item?.label?.trim().length
                                                                                                                                                        ? item.label.trim()
                                                                                                                                                        : `Chứng cứ #${itemIndex + 1}`
                                                                                                                                                const itemSourceLabel = humanizeEvidenceSourceType(item?.sourceType)
                                                                                                                                                const itemUrl = getEvidenceItemUrl(item)
                                                                                                                                                const itemCreatedAt = formatDateTime(item?.createdAt ?? null)

                                                                                                                                                return (
                                                                                                                                                        <div
                                                                                                                                                                key={itemKey}
                                                                                                                                                                className='space-y-1 rounded-xl border border-base-200 bg-base-100 p-3'
                                                                                                                                                        >
                                                                                                                                                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                                                                                                                                                        <p className='font-medium text-base-content'>{itemLabel}</p>
                                                                                                                                                                        <span className='badge badge-ghost text-[11px]'>{itemSourceLabel}</span>
                                                                                                                                                                </div>
                                                                                                                                                                {item?.description ? (
                                                                                                                                                                        <p className='text-[11px] text-base-content/70'>{item.description}</p>
                                                                                                                                                                ) : null}
                                                                                                                                                                {itemUrl ? (
                                                                                                                                                                        <a
                                                                                                                                                                                href={itemUrl}
                                                                                                                                                                                target='_blank'
                                                                                                                                                                                rel='noopener noreferrer'
                                                                                                                                                                                className='inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline'
                                                                                                                                                                        >
                                                                                                                                                                                <Link2 className='size-3' /> Mở liên kết
                                                                                                                                                                        </a>
                                                                                                                                                                ) : null}
                                                                                                                                                                {item?.assetId ? (
                                                                                                                                                                        <p className='text-[11px] text-base-content/60'>Asset ID: {item.assetId}</p>
                                                                                                                                                                ) : null}
                                                                                                                                                                {item?.sourceId ? (
                                                                                                                                                                        <p className='text-[11px] text-base-content/60'>Nguồn: {item.sourceId}</p>
                                                                                                                                                                ) : null}
                                                                                                                                                                {itemCreatedAt !== '—' ? (
                                                                                                                                                                        <p className='text-[11px] text-base-content/60'>Thêm lúc: {itemCreatedAt}</p>
                                                                                                                                                                ) : null}
                                                                                                                                                        </div>
                                                                                                                                                )
                                                                                                                                        })}
                                                                                                                                </div>
                                                                                                                        ) : (
                                                                                                                                <p className='text-[11px] text-base-content/60'>Không có tài liệu đính kèm.</p>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        )
                                                                                                })}
                                                                                        </div>
                                                                                ) : (
                                                                                        <p className='text-xs text-base-content/60'>Chưa có chứng cứ cuối cùng nào được gửi.</p>
                                                                                )}
                                                                        </section>
                                                                ) : null}

                                                                {detailActiveTab === 'negotiations' ? (
                                                                        <>
                                                                                <section className='space-y-2'>
                                                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                                                <h4 className='text-sm font-semibold text-base-content'>Đề xuất mới nhất</h4>
                                                                                                {detailLatestProposal ? (
                                                                                                        <span
                                                                                                                className={[
                                                                                                                        'badge',
                                                                                                                        detailLatestProposal.status
                                                                                                                                ? negotiationStatusClassMap[detailLatestProposal.status] ?? 'badge-outline'
                                                                                                                                : 'badge-outline'
                                                                                                                ].join(' ')}
                                                                                                        >
                                                                                                                {humanizeNegotiationStatus(detailLatestProposal.status)}
                                                                                                        </span>
                                                                                                ) : null}
                                                                                        </div>
                                                                                        {detailLatestProposal ? (
                                                                                                <div className='space-y-2 rounded-xl border border-base-200 bg-base-200/50 p-3 text-base-content'>
                                                                                                        <div className='grid gap-2 text-xs text-base-content/70 sm:grid-cols-2'>
                                                                                                                <span>
                                                                                                                        Trả freelancer:{' '}
                                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                                {formatCurrencyValue(detailLatestProposal.releaseAmount, detailCurrency)}
                                                                                                                        </span>
                                                                                                                </span>
                                                                                                                <span>
                                                                                                                        Trả khách hàng:{' '}
                                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                                {formatCurrencyValue(detailLatestProposal.refundAmount, detailCurrency)}
                                                                                                                        </span>
                                                                                                                </span>
                                                                                                                <span>
                                                                                                                        Người đề xuất:{' '}
                                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                                {formatUserName(detailLatestProposal.proposer, detailLatestProposal.proposerId)}
                                                                                                                        </span>
                                                                                                                </span>
                                                                                                                {detailLatestProposal.respondedBy ? (
                                                                                                                        <span>
                                                                                                                                Phản hồi bởi:{' '}
                                                                                                                                <span className='font-medium text-base-content'>
                                                                                                                                        {formatUserName(detailLatestProposal.respondedBy, detailLatestProposal.respondedById ?? undefined)}
                                                                                                                                </span>
                                                                                                                                {detailLatestProposal.respondedAt ? ` (${formatDateTime(detailLatestProposal.respondedAt)})` : ''}
                                                                                                                        </span>
                                                                                                                ) : null}
                                                                                                        </div>
                                                                                                        {detailLatestProposal.message ? (
                                                                                                                <p className='whitespace-pre-line text-sm text-base-content/80'>
                                                                                                                        {detailLatestProposal.message}
                                                                                                                </p>
                                                                                                        ) : null}
                                                                                                        {detailLatestProposal.responseMessage ? (
                                                                                                                <div className='rounded-lg bg-base-100 p-2 text-xs text-base-content/70'>
                                                                                                                        <span className='font-medium text-base-content'>Phản hồi:</span>{' '}
                                                                                                                        {detailLatestProposal.responseMessage}
                                                                                                                </div>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        ) : (
                                                                                                <p className='text-sm text-base-content/70'>Chưa có đề xuất nào.</p>
                                                                                        )}
                                                                                </section>
                                                                                <section className='space-y-2'>
                                                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                                                <h4 className='text-sm font-semibold text-base-content'>Lịch sử thương lượng</h4>
                                                                                                {detailNegotiationTotal != null ? (
                                                                                                        <span className='badge badge-outline text-xs'>Tổng: {detailNegotiationTotal}</span>
                                                                                                ) : null}
                                                                                        </div>
                                                                                        {Array.isArray(detailNegotiations) && detailNegotiations.length ? (
                                                                                                <div className='space-y-3 max-h-64 overflow-y-auto pr-1'>
                                                                                                        {detailNegotiations.map(negotiation => (
                                                                                                                <div key={negotiation.id} className='space-y-2 rounded-xl border border-base-200 p-3'>
                                                                                                                        <div className='flex flex-wrap items-center gap-2 text-xs text-base-content/70'>
                                                                                                                                <span>{formatDateTime(negotiation.createdAt)}</span>
                                                                                                                                <span
                                                                                                                                        className={[
                                                                                                                                                'badge badge-sm',
                                                                                                                                                negotiationStatusClassMap[negotiation.status] ?? 'badge-outline'
                                                                                                                                        ].join(' ')}
                                                                                                                                >
                                                                                                                                        {humanizeNegotiationStatus(negotiation.status)}
                                                                                                                                </span>
                                                                                                                                <span>Bởi {formatUserName(negotiation.proposer, negotiation.proposerId)}</span>
                                                                                                                        </div>
                                                                                                                        <div className='grid gap-2 text-xs text-base-content/60 sm:grid-cols-2'>
                                                                                                                                <span>
                                                                                                                                        Trả freelancer:{' '}
                                                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                                                {formatCurrencyValue(negotiation.releaseAmount, detailCurrency)}
                                                                                                                                        </span>
                                                                                                                                </span>
                                                                                                                                <span>
                                                                                                                                        Trả khách hàng:{' '}
                                                                                                                                        <span className='font-medium text-base-content'>
                                                                                                                                                {formatCurrencyValue(negotiation.refundAmount, detailCurrency)}
                                                                                                                                        </span>
                                                                                                                                </span>
                                                                                                                        </div>
                                                                                                                        {negotiation.message ? (
                                                                                                                                <p className='whitespace-pre-line text-sm text-base-content'>
                                                                                                                                        {negotiation.message}
                                                                                                                                </p>
                                                                                                                        ) : null}
                                                                                                                        {negotiation.respondedBy ? (
                                                                                                                                <div className='rounded-lg bg-base-200/60 p-2 text-xs text-base-content/70'>
                                                                                                                                        <span className='font-medium text-base-content'>Phản hồi:</span>{' '}
                                                                                                                                        {formatUserName(negotiation.respondedBy, negotiation.respondedById ?? undefined)}
                                                                                                                                        {negotiation.respondedAt ? ` (${formatDateTime(negotiation.respondedAt)})` : ''}
                                                                                                                                        {negotiation.responseMessage ? ` — ${negotiation.responseMessage}` : ''}
                                                                                                                                </div>
                                                                                                                        ) : null}
                                                                                                                </div>
                                                                                                        ))}
                                                                                                </div>
                                                                                        ) : (
                                                                                                <p className='text-sm text-base-content/70'>Chưa có thương lượng nào được ghi nhận.</p>
                                                                                        )}
                                                                                </section>
                                                                        </>
                                                                ) : null}

                                                                {detailActiveTab === 'activity' ? (
                                                                        <section className='space-y-2'>
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        <h4 className='text-sm font-semibold text-base-content'>Nhật ký truy cập phòng chat</h4>
                                                                                        {Array.isArray(detailChatLogs) && detailChatLogs.length ? (
                                                                                                <span className='badge badge-outline text-xs'>Số lần: {detailChatLogs.length}</span>
                                                                                        ) : null}
                                                                                </div>
                                                                                {Array.isArray(detailChatLogs) && detailChatLogs.length ? (
                                                                                        <div className='space-y-3 max-h-48 overflow-y-auto pr-1'>
                                                                                                {detailChatLogs.map(log => (
                                                                                                        <div key={log.id} className='rounded-xl border border-base-200 p-3 text-base-content'>
                                                                                                                <div className='flex flex-wrap items-center gap-2 text-xs text-base-content/60'>
                                                                                                                        <span>{formatDateTime(log.createdAt)}</span>
                                                                                                                        {log.action ? <span className='badge badge-sm badge-ghost'>{log.action}</span> : null}
                                                                                                                </div>
                                                                                                                <div className='text-sm text-base-content'>
                                                                                                                        Admin: {formatUserName(log.admin, log.adminId ?? undefined)}
                                                                                                                </div>
                                                                                                                {log.reason ? <div className='text-xs text-base-content/70'>Lý do: {log.reason}</div> : null}
                                                                                                        </div>
                                                                                                ))}
                                                                                        </div>
                                                                                ) : (
                                                                                        <p className='text-sm text-base-content/70'>Chưa có dữ liệu truy cập phòng chat.</p>
                                                                                )}
                                                                        </section>
                                                                ) : null}
                                                        </div>

						)}
					</div>
					<form method='dialog' className='modal-backdrop' onClick={() => setDetailTarget(null)}>
						Đóng
					</form>
				</dialog>
			) : null}

                        {joinTarget ? (
                                <div className='modal modal-open'>
                                        <div className='modal-box space-y-4'>
                                                <h3 className='flex items-center gap-2 text-lg font-semibold'>
                                                        <ShieldCheck className='size-5 text-primary' /> Tham gia tranh chấp #{joinTarget.id}
						</h3>
						<p className='text-sm text-base-content/70'>
							Bạn có thể để lại ghi chú cho các bên trước khi tham gia phòng tranh chấp.
						</p>
						<textarea
							className='textarea textarea-bordered w-full'
							rows={4}
							placeholder='Ghi chú cho các bên (tuỳ chọn)'
							value={joinReason}
							onChange={event => setJoinReason(event.target.value)}
						/>
						<div className='modal-action'>
							<button className='btn btn-ghost' onClick={() => setJoinTarget(null)} disabled={joinMutation.isPending}>
								Huỷ
							</button>
							<button className='btn btn-primary' onClick={handleJoin} disabled={joinMutation.isPending}>
								{joinMutation.isPending ? 'Đang xử lý...' : 'Tham gia tranh chấp'}
							</button>
						</div>
                                        </div>
                                        <div className='modal-backdrop' onClick={() => !joinMutation.isPending && setJoinTarget(null)}>
                                                Đóng
                                        </div>
                                </div>
                        ) : null}

                        {lockDisputeOpen && detailDisputeId ? (
                                <div className='modal modal-open'>
                                        <div className='modal-box max-w-md space-y-4'>
                                                <h3 className='flex items-center gap-2 text-lg font-semibold text-base-content'>
                                                        <Lock className='size-5 text-primary' /> Khóa tranh chấp
                                                </h3>
                                                <p className='text-sm text-base-content/70'>
                                                        Chỉ khóa tranh chấp khi cả hai bên đã nộp phí trọng tài và hoàn tất việc gửi chứng cứ.
                                                </p>
                                                <form onSubmit={handleLockDisputeSubmit(handleLockDispute)} className='space-y-4'>
                                                        <div className='space-y-2'>
                                                                <label className='text-sm font-medium text-base-content'>Ghi chú (tuỳ chọn)</label>
                                                                <textarea
                                                                        className='textarea textarea-bordered w-full'
                                                                        rows={4}
                                                                        placeholder='Ghi chú nội bộ cho quyết định khóa'
                                                                        {...lockDisputeRegister('note')}
                                                                        disabled={lockDisputeMutation.isPending}
                                                                />
                                                                {lockDisputeErrors.note ? (
                                                                        <p className='text-xs text-error'>{lockDisputeErrors.note.message}</p>
                                                                ) : null}
                                                        </div>
                                                        <div className='modal-action'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-ghost'
                                                                        onClick={closeLockDisputeModal}
                                                                        disabled={lockDisputeMutation.isPending}>
                                                                        Hủy
                                                                </button>
                                                                <button type='submit' className='btn btn-secondary' disabled={lockDisputeMutation.isPending}>
                                                                        {lockDisputeMutation.isPending ? 'Đang khóa…' : 'Khóa tranh chấp'}
                                                                </button>
                                                        </div>
                                                </form>
                                        </div>
                                        <div className='modal-backdrop' onClick={closeLockDisputeModal}>
                                                Đóng
                                        </div>
                                </div>
                        ) : null}

                        {generateDossierOpen && detailDisputeId ? (
                                <div className='modal modal-open'>
                                        <div className='modal-box max-w-md space-y-4'>
                                                <h3 className='flex items-center gap-2 text-lg font-semibold text-base-content'>
                                                        <ScrollText className='size-5 text-primary' /> Tạo hồ sơ tranh chấp
                                                </h3>
                                                <p className='text-sm text-base-content/70'>
                                                        Tạo snapshot hồ sơ tranh chấp để lưu trữ trong hệ thống.
                                                </p>
                                                <form onSubmit={handleGenerateDossierSubmit(handleGenerateDossier)} className='space-y-4'>
                                                        <div className='space-y-2'>
                                                                <label className='text-sm font-medium text-base-content'>Ghi chú nội bộ (tuỳ chọn)</label>
                                                                <textarea
                                                                        className='textarea textarea-bordered w-full'
                                                                        rows={4}
                                                                        placeholder='Ghi chú bổ sung cho hồ sơ'
                                                                        {...generateDossierRegister('notes')}
                                                                        disabled={generateDossierMutation.isPending}
                                                                />
                                                                {generateDossierErrors.notes ? (
                                                                        <p className='text-xs text-error'>{generateDossierErrors.notes.message}</p>
                                                                ) : null}
                                                        </div>
                                                        <label className='flex items-center gap-2 text-sm text-base-content'>
                                                                <input
                                                                        type='checkbox'
                                                                        className='checkbox'
                                                                        {...generateDossierRegister('finalize', { valueAsBoolean: true })}
                                                                        disabled={generateDossierMutation.isPending}
                                                                />
                                                                <span>Đánh dấu hồ sơ là bản cuối cùng</span>
                                                        </label>
                                                        <p className='text-xs text-base-content/60'>Bản snapshot sẽ được ghi nhận cùng ghi chú của bạn.</p>
                                                        <div className='modal-action'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-ghost'
                                                                        onClick={closeGenerateDossierModal}
                                                                        disabled={generateDossierMutation.isPending}>
                                                                        Hủy
                                                                </button>
                                                                <button type='submit' className='btn btn-primary' disabled={generateDossierMutation.isPending}>
                                                                        {generateDossierMutation.isPending ? 'Đang tạo…' : 'Tạo hồ sơ'}
                                                                </button>
                                                        </div>
                                                </form>
                                        </div>
                                        <div className='modal-backdrop' onClick={closeGenerateDossierModal}>
                                                Đóng
                                        </div>
                                </div>
                        ) : null}

                        {requestFeesOpen && detailDisputeId ? (
                                <div className='modal modal-open'>
                                        <div className='modal-box max-w-md space-y-4'>
                                                <h3 className='flex items-center gap-2 text-lg font-semibold text-base-content'>
                                                        <BadgeDollarSign className='size-5 text-primary' /> Yêu cầu đóng phí trọng tài
						</h3>
						<p className='text-sm text-base-content/70'>
							Chọn số ngày mà các bên cần hoàn tất việc nộp phí trọng tài. Thời hạn tối đa là 14 ngày.
						</p>
						<form onSubmit={handleRequestFeesSubmit(handleRequestFees)} className='space-y-4'>
							<div className='space-y-2'>
								<label className='text-sm font-medium text-base-content'>Hạn nộp phí (ngày)</label>
								<input
									type='number'
									min={1}
									max={14}
									className='input input-bordered w-full'
									{...requestFeesRegister('deadlineDays', { valueAsNumber: true })}
									disabled={requestFeesMutation.isPending}
								/>
								{requestFeesErrors.deadlineDays ? (
									<p className='text-xs text-error'>{requestFeesErrors.deadlineDays.message}</p>
								) : null}
							</div>
							<div className='modal-action'>
								<button
									type='button'
									className='btn btn-ghost'
									onClick={() => !requestFeesMutation.isPending && setRequestFeesOpen(false)}
									disabled={requestFeesMutation.isPending}>
									Hủy
								</button>
								<button type='submit' className='btn btn-primary' disabled={requestFeesMutation.isPending}>
									{requestFeesMutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
								</button>
							</div>
						</form>
					</div>
					<div className='modal-backdrop' onClick={() => !requestFeesMutation.isPending && setRequestFeesOpen(false)}>
						Đóng
					</div>
				</div>
			) : null}
		</div>
	)
}
