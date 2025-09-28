import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        CalendarClock,
        CheckCircle2,
        Clock3,
        Edit3,
        ExternalLink,
        FileText,
        Loader2,
        Sparkles,
        Trash2,
        XCircle
} from 'lucide-react'
import { toast } from 'react-toastify'
import {
        getFreelancerJobInvitationDetail,
        listFreelancerJobInvitations,
        respondToJobInvitation
} from '~/apis/job-invitation.api'
import {
        listFreelancerJobProposals,
        withdrawJobProposal
} from '~/apis/job-proposal.api'
import { JOB_PROPOSAL_STATUS_META } from '~/constants/job-proposal'
import { JOB_DURATION_COMMITMENTS } from '~/constants/job'
import { routes } from '~/config/routes'
import type { JobInvitation, PaginatedJobInvitationResponse } from '~/types/job-invitation'
import type { JobProposal, PaginatedJobProposalResponse } from '~/types/job-proposal'
import { JOB_PROPOSAL_STATUSES } from '~/types/job-proposal'

const PAGE_SIZE = 6

const tabs = [
        { key: 'invitations', label: 'Invitations to interview' },
        { key: 'proposals', label: 'All proposals' }
] as const

type TabKey = (typeof tabs)[number]['key']

type SortOption = 'newest' | 'oldest' | 'bid-asc' | 'bid-desc'

type FilterState = {
        search: string
        statuses: JobProposal['status'][]
        sortBy: SortOption
        submittedFrom: string
        submittedTo: string
}

const initialFilterState: FilterState = {
        search: '',
        statuses: [],
        sortBy: 'newest',
        submittedFrom: '',
        submittedTo: ''
}

type InvitationStatusKey =
        | 'SENT'
        | 'PENDING'
        | 'ACCEPTED'
        | 'DECLINED'
        | 'EXPIRED'
        | 'WITHDRAWN'

const invitationStatusMeta: Record<InvitationStatusKey, { label: string; className: string }> = {
        SENT: { label: 'Awaiting response', className: 'badge-warning/20 text-warning' },
        PENDING: { label: 'Awaiting response', className: 'badge-warning/20 text-warning' },
        ACCEPTED: { label: 'Accepted', className: 'badge-success/20 text-success' },
        DECLINED: { label: 'Declined', className: 'badge-error/20 text-error' },
        EXPIRED: { label: 'Expired', className: 'badge-ghost text-base-content/60' },
        WITHDRAWN: { label: 'Withdrawn', className: 'badge-ghost text-base-content/60' }
}

const durationMap = Object.fromEntries(
        JOB_DURATION_COMMITMENTS.map(item => [item.value, item.label])
) as Record<string, string>

const formatDateTime = (value?: string | null) => {
        if (!value) return undefined
        try {
                        return new Intl.DateTimeFormat('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                        }).format(new Date(value))
        } catch {
                return undefined
        }
}

const formatDateOnly = (value?: string | null) => {
        if (!value) return undefined
        try {
                return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
        } catch {
                return undefined
        }
}

const formatCurrency = (amount?: number | null, currency?: string | null) => {
        if (amount == null || !Number.isFinite(amount)) return undefined
        if (!currency) return amount.toLocaleString()
        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        maximumFractionDigits: 0
                }).format(amount)
        } catch {
                return `${amount.toLocaleString()} ${currency}`
        }
}

const normalizeInvitationStatus = (status?: string | null): InvitationStatusKey | undefined => {
        if (!status) return undefined
        const upper = status.toUpperCase() as InvitationStatusKey
        return upper in invitationStatusMeta ? upper : undefined
}

const isExpiredInvitation = (invitation?: JobInvitation) => {
        if (!invitation) return false
        const status = normalizeInvitationStatus(invitation.status)
        if (status === 'EXPIRED') return true
        if (invitation.expiresAt) {
                const expiresAt = new Date(invitation.expiresAt)
                if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
                        return true
                }
        }
        return false
}

const canEditProposal = (status: JobProposal['status']) =>
        status === 'SUBMITTED' || status === 'SHORTLISTED' || status === 'INTERVIEWING'

const canWithdrawProposal = (status: JobProposal['status']) =>
        status === 'SUBMITTED' || status === 'SHORTLISTED' || status === 'INTERVIEWING'

export default function JobProposalsPage() {
        const navigate = useNavigate()
        const params = useParams<{ invitationId?: string }>()
        const [searchParams, setSearchParams] = useSearchParams()
        const [invitationPage, setInvitationPage] = useState(1)
        const [proposalPage, setProposalPage] = useState(1)
        const [filterInputs, setFilterInputs] = useState<FilterState>({ ...initialFilterState })
        const [appliedFilters, setAppliedFilters] = useState<FilterState>({ ...initialFilterState })
        const [filterError, setFilterError] = useState<string | null>(null)

        const selectedInvitationId = params.invitationId
        const tabParam = (searchParams.get('tab') ?? '') as TabKey
        const inferredTab: TabKey = selectedInvitationId
                ? 'invitations'
                : tabs.some(tab => tab.key === tabParam)
                ? tabParam
                : 'invitations'
        const [activeTab, setActiveTab] = useState<TabKey>(inferredTab)

        useEffect(() => {
                setActiveTab(inferredTab)
        }, [inferredTab])

        useEffect(() => {
                if (selectedInvitationId && activeTab !== 'invitations') {
                        setActiveTab('invitations')
                        setSearchParams(prev => {
                                const next = new URLSearchParams(prev)
                                next.delete('tab')
                                return next
                        }, { replace: true })
                }
        }, [selectedInvitationId, activeTab, setSearchParams])

        const handleTabChange = (tab: TabKey) => {
                if (tab === activeTab) return
                setActiveTab(tab)
                if (tab === 'invitations') {
                        navigate(routes.freelancer.jobs.invitations)
                } else {
                        navigate(`${routes.freelancer.jobs.invitations}?tab=${tab}`)
                }
                if (tab === 'invitations') {
                        setInvitationPage(1)
                } else {
                        setProposalPage(1)
                }
        }

        const listInvitationQueryKey = useMemo(
                () => ['freelancer-job-invitations', { page: invitationPage }],
                [invitationPage]
        )

        const invitationsQuery = useQuery<PaginatedJobInvitationResponse>({
                queryKey: listInvitationQueryKey,
                queryFn: () => listFreelancerJobInvitations({ page: invitationPage, limit: PAGE_SIZE })
        })

        const invitations: JobInvitation[] = invitationsQuery.data?.data ?? []
        const invitationsTotal = invitationsQuery.data?.total ?? invitations.length
        const invitationTotalPages = Math.max(1, Math.ceil((invitationsQuery.data?.total ?? 0) / PAGE_SIZE))

        const queryClient = useQueryClient()

        const invitationDetailQuery = useQuery({
                queryKey: ['freelancer-job-invitation', selectedInvitationId],
                queryFn: () => getFreelancerJobInvitationDetail(selectedInvitationId ?? ''),
                enabled: Boolean(selectedInvitationId)
        })

        const respondMutation = useMutation({
                mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
                        respondToJobInvitation(id, { status }),
                onSuccess: async (_, variables) => {
                        toast.success(
                                variables.status === 'ACCEPTED'
                                        ? 'Invitation accepted successfully.'
                                        : 'Invitation declined successfully.'
                        )
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-invitations'] })
                        if (selectedInvitationId) {
                                await queryClient.invalidateQueries({
                                        queryKey: ['freelancer-job-invitation', selectedInvitationId]
                                })
                        }
                },
                onError: err => {
                        const message = err instanceof Error ? err.message : 'Failed to update invitation status.'
                        toast.error(message)
                }
        })

        useEffect(() => {
                if (activeTab === 'proposals') {
                        setProposalPage(1)
                }
        }, [appliedFilters, activeTab])

        const proposalFilters = useMemo(() => {
                const parseDate = (value: string) => {
                        if (!value) return undefined
                        const date = new Date(value)
                        return Number.isNaN(date.getTime()) ? undefined : date
                }

                return {
                        page: proposalPage,
                        limit: PAGE_SIZE,
                        search: appliedFilters.search.trim() ? appliedFilters.search.trim() : undefined,
                        statuses: appliedFilters.statuses.length ? appliedFilters.statuses : undefined,
                        sortBy: appliedFilters.sortBy,
                        submittedFrom: parseDate(appliedFilters.submittedFrom),
                        submittedTo: parseDate(appliedFilters.submittedTo)
                }
        }, [appliedFilters, proposalPage])

        const proposalsQuery = useQuery<PaginatedJobProposalResponse>({
                queryKey: ['freelancer-job-proposals', proposalFilters],
                queryFn: () => listFreelancerJobProposals(proposalFilters)
        })

        const proposals = proposalsQuery.data?.data ?? []
        const proposalsTotal = proposalsQuery.data?.total ?? proposals.length
        const proposalTotalPages = Math.max(1, Math.ceil((proposalsQuery.data?.total ?? 0) / PAGE_SIZE))
        const hasActiveFilters = Boolean(
                appliedFilters.search.trim() ||
                        appliedFilters.statuses.length ||
                        appliedFilters.submittedFrom ||
                        appliedFilters.submittedTo ||
                        appliedFilters.sortBy !== 'newest'
        )

        const withdrawMutation = useMutation({
                mutationFn: (proposalId: string) => withdrawJobProposal(proposalId),
                onSuccess: async (_, proposalId) => {
                        toast.success('Proposal withdrawn successfully.')
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-proposals'] })
                        queryClient.removeQueries({ queryKey: ['freelancer-job-proposal', proposalId] })
                },
                onError: err => {
                        const message = err instanceof Error ? err.message : 'Unable to withdraw proposal.'
                        toast.error(message)
                }
        })

        const handleSelectInvitation = (invitationId: string) => {
                if (selectedInvitationId === invitationId) return
                navigate(routes.freelancer.jobs.invitationDetail(invitationId))
        }

        const handleCloseInvitationDetail = () => {
                navigate(routes.freelancer.jobs.invitations)
        }

        const detail = invitationDetailQuery.data
        const detailStatus = normalizeInvitationStatus(detail?.status)
        const detailExpired = isExpiredInvitation(detail)
        const canRespond =
                detail && !detailExpired && (!detailStatus || detailStatus === 'SENT' || detailStatus === 'PENDING')

        const renderInvitationCard = (invitation: JobInvitation) => {
                const status = normalizeInvitationStatus(invitation.status)
                const meta = status ? invitationStatusMeta[status] : undefined
                const expiresLabel = formatDateTime(invitation.expiresAt)
                const isSelected = selectedInvitationId === invitation.id

                return (
                        <button
                                key={invitation.id}
                                type='button'
                                onClick={() => handleSelectInvitation(invitation.id)}
                                className={`flex w-full flex-col gap-3 rounded-3xl border p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md ${
                                        isSelected ? 'border-primary/50 shadow-md ring-2 ring-primary/30' : 'border-base-200 bg-base-100'
                                }`}>
                                <div className='flex items-center justify-between gap-3'>
                                        <div className='text-base font-semibold text-base-content'>
                                                {invitation.job?.title ?? 'Job invitation'}
                                        </div>
                                        {meta && <span className={`badge ${meta.className}`}>{meta.label}</span>}
                                </div>
                                <p className='text-sm text-base-content/70'>
                                        {invitation.message ?? 'No message included with this invitation.'}
                                </p>
                                <div className='flex flex-wrap items-center gap-4 text-xs text-base-content/60'>
                                        <span className='inline-flex items-center gap-2'>
                                                <CalendarClock className='size-3 text-primary/70' />
                                                {expiresLabel ? `Expires ${expiresLabel}` : 'No expiration provided'}
                                        </span>
                                        {invitation.sentAt && <span>Sent {formatDateTime(invitation.sentAt)}</span>}
                                </div>
                        </button>
                )
        }

        const renderInvitationDetail = () => {
                if (!selectedInvitationId) {
                        return (
                                <div className='rounded-3xl border border-dashed border-base-200 bg-base-100 p-8 text-center text-sm text-base-content/70 shadow-sm'>
                                        Select an invitation to see the full details and respond.
                                </div>
                        )
                }

                if (invitationDetailQuery.isLoading) {
                        return (
                                <div className='flex min-h-[220px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-8 text-base-content/60 shadow-sm'>
                                        <Loader2 className='size-5 animate-spin text-primary' />
                                </div>
                        )
                }

                if (invitationDetailQuery.isError) {
                        const message =
                                invitationDetailQuery.error instanceof Error
                                        ? invitationDetailQuery.error.message
                                        : 'Unable to load invitation details.'
                        return (
                                <div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
                                        {message}
                                </div>
                        )
                }

                if (!detail) {
                        return (
                                <div className='rounded-3xl border border-base-200 bg-base-100 p-8 text-sm text-base-content/70 shadow-sm'>
                                        Invitation details are not available.
                                </div>
                        )
                }

                const createdLabel = formatDateTime(detail.createdAt)
                const respondedLabel = formatDateTime(detail.respondedAt)
                const expiresLabel = formatDateTime(detail.expiresAt)

                return (
                        <div className='space-y-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex items-start justify-between gap-4'>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-primary/70'>Proposal & offers</p>
                                                <h2 className='mt-1 text-2xl font-semibold text-base-content'>
                                                        {detail.job?.title ?? 'Job invitation details'}
                                                </h2>
                                                <p className='mt-2 text-sm text-base-content/70'>
                                                        Review the client notes and decide whether to accept or decline this invitation.
                                                </p>
                                        </div>
                                        <button
                                                type='button'
                                                onClick={handleCloseInvitationDetail}
                                                className='btn btn-sm btn-ghost text-base-content/70 hover:text-error'
                                        >
                                                Close
                                        </button>
                                </div>

                                <div className='rounded-2xl border border-base-200 bg-base-100/80 p-5 text-sm text-base-content/80 shadow-inner'>
                                        <p>
                                                <span className='font-medium text-base-content'>Client message:</span>{' '}
                                                {detail.message ?? 'No additional message provided.'}
                                        </p>
                                </div>

                                <dl className='grid gap-4 rounded-2xl border border-base-200 bg-base-100/70 p-5 text-sm text-base-content/70'>
                                        {createdLabel && (
                                                <div className='flex items-center justify-between'>
                                                        <dt className='font-medium text-base-content'>Sent</dt>
                                                        <dd>{createdLabel}</dd>
                                                </div>
                                        )}
                                        {respondedLabel && (
                                                <div className='flex items-center justify-between'>
                                                        <dt className='font-medium text-base-content'>Responded</dt>
                                                        <dd>{respondedLabel}</dd>
                                                </div>
                                        )}
                                        {expiresLabel && (
                                                <div className='flex items-center justify-between'>
                                                        <dt className='font-medium text-base-content'>Expires</dt>
                                                        <dd>{expiresLabel}</dd>
                                                </div>
                                        )}
                                </dl>

                                {canRespond ? (
                                        <div className='flex flex-wrap gap-3'>
                                                <button
                                                        type='button'
                                                        onClick={() =>
                                                                respondMutation.mutate({
                                                                        id: detail.id,
                                                                        status: 'ACCEPTED'
                                                                })
                                                        }
                                                        className='btn btn-primary gap-2'
                                                        disabled={respondMutation.isPending}
                                                >
                                                        {respondMutation.isPending && respondMutation.variables?.status === 'ACCEPTED' ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <CheckCircle2 className='size-4' />
                                                        )}
                                                        Accept invitation
                                                </button>
                                                <button
                                                        type='button'
                                                        onClick={() =>
                                                                respondMutation.mutate({
                                                                        id: detail.id,
                                                                        status: 'DECLINED'
                                                                })
                                                        }
                                                        className='btn btn-ghost gap-2 text-error hover:bg-error/10 hover:text-error'
                                                        disabled={respondMutation.isPending}
                                                >
                                                        {respondMutation.isPending && respondMutation.variables?.status === 'DECLINED' ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <XCircle className='size-4' />
                                                        )}
                                                        Decline
                                                </button>
                                        </div>
                                ) : (
                                        <div className='rounded-2xl border border-base-200 bg-base-100/70 p-4 text-sm text-base-content/70'>
                                                Responses are no longer available for this invitation.
                                        </div>
                                )}
                        </div>
                )
        }

        const renderProposalCard = (proposal: JobProposal) => {
                const statusMeta = JOB_PROPOSAL_STATUS_META[proposal.status]
                const submittedLabel = formatDateOnly(proposal.submittedAt ?? proposal.createdAt)
                const amountLabel = formatCurrency(proposal.bidAmount ?? undefined, proposal.bidCurrency ?? undefined)
                const durationLabel = proposal.estimatedDuration
                        ? durationMap[proposal.estimatedDuration] ?? proposal.estimatedDuration
                        : undefined
                const jobTitle = proposal.job?.title ?? 'Job proposal'
                const jobId = proposal.job?.id ?? proposal.jobId
                const editing = withdrawMutation.isPending && withdrawMutation.variables === proposal.id
                const showEdit = canEditProposal(proposal.status)
                const showWithdraw = canWithdrawProposal(proposal.status)

                return (
                        <div key={proposal.id} className='flex flex-col gap-4 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                                <h3 className='text-lg font-semibold text-base-content'>{jobTitle}</h3>
                                                <p className='text-sm text-base-content/70'>{statusMeta.description}</p>
                                        </div>
                                        <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                </div>

                                <div className='flex flex-wrap gap-4 text-sm text-base-content/70'>
                                        {submittedLabel && (
                                                <span className='inline-flex items-center gap-2'>
                                                        <Clock3 className='size-4 text-primary/70' />
                                                        Submitted {submittedLabel}
                                                </span>
                                        )}
                                        {amountLabel && (
                                                <span className='inline-flex items-center gap-2'>
                                                        <FileText className='size-4 text-primary/70' />
                                                        Bid {amountLabel}
                                                </span>
                                        )}
                                        {durationLabel && (
                                                <span className='inline-flex items-center gap-2'>
                                                        <Sparkles className='size-4 text-primary/70' />
                                                        Duration {durationLabel}
                                                </span>
                                        )}
                                </div>

                                <div className='flex flex-wrap gap-3'>
                                        <Link
                                                to={routes.freelancer.jobs.detail(jobId)}
                                                className='btn btn-sm btn-ghost gap-2 text-primary hover:bg-primary/10'
                                        >
                                                <ExternalLink className='size-4' />
                                                View job
                                        </Link>
                                        {showEdit && (
                                                <Link
                                                        to={routes.freelancer.jobs.proposalEdit(proposal.id)}
                                                        className='btn btn-sm btn-outline gap-2'
                                                >
                                                        <Edit3 className='size-4' />
                                                        Edit proposal
                                                </Link>
                                        )}
                                        {showWithdraw && (
                                                <button
                                                        type='button'
                                                        onClick={() => {
                                                                const confirmed = window.confirm(
                                                                        'Are you sure you want to withdraw this proposal?'
                                                                )
                                                                if (confirmed) {
                                                                        withdrawMutation.mutate(proposal.id)
                                                                }
                                                        }}
                                                        className='btn btn-sm btn-ghost gap-2 text-error hover:bg-error/10 hover:text-error'
                                                        disabled={editing}
                                                >
                                                        {editing ? <Loader2 className='size-4 animate-spin' /> : <Trash2 className='size-4' />}
                                                        Withdraw
                                                </button>
                                        )}
                                </div>
                        </div>
                )
        }

        return (
                <div className='mx-auto w-full max-w-7xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-wrap items-start justify-between gap-4'>
                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/70'>Proposals & offers</p>
                                        <h1 className='mt-2 text-3xl font-semibold text-base-content'>Manage your proposals</h1>
                                        <p className='mt-2 max-w-2xl text-sm text-base-content/70'>Review client invitations, keep track of active discussions, and revisit the proposals you have submitted.</p>
                                </div>
                                <div className='flex gap-2'>
                                        <Link
                                                to={routes.freelancer.jobs.list}
                                                className='btn btn-outline btn-sm text-primary'
                                        >
                                                Browse jobs
                                        </Link>
                                </div>
                        </div>

                        <div className='mt-6 flex flex-wrap gap-2 rounded-3xl border border-base-200 bg-base-100 p-2 shadow-sm'>
                                {tabs.map(tab => {
                                        const totalCount = tab.key === 'invitations' ? invitationsTotal : proposalsTotal
                                        const isActive = activeTab === tab.key
                                        return (
                                                <button
                                                        key={tab.key}
                                                        type='button'
                                                        onClick={() => handleTabChange(tab.key)}
                                                        className={`flex flex-1 items-center justify-between gap-2 rounded-2xl px-4 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-initial ${
                                                                isActive
                                                                        ? 'bg-primary text-primary-content shadow'
                                                                        : 'bg-transparent text-base-content/70 hover:bg-base-200/80'
                                                        }`}
                                                >
                                                        <span className='font-medium'>{tab.label}</span>
                                                        <span className='rounded-full border border-current/20 px-3 py-1 text-xs font-semibold'>
                                                                {totalCount}
                                                        </span>
                                                </button>
                                        )
                                })}
                        </div>

                        <div className='mt-6'>
                                {activeTab === 'invitations' && (
                                        <div className='grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]'>
                                                <div className='space-y-4'>
                                                        {invitationsQuery.isLoading ? (
                                                                <div className='flex min-h-[220px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-8 text-base-content/60 shadow-sm'>
                                                                        <Loader2 className='size-5 animate-spin text-primary' />
                                                                </div>
                                                        ) : invitationsQuery.isError ? (
                                                                <div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
                                                                        {invitationsQuery.error instanceof Error
                                                                                ? invitationsQuery.error.message
                                                                                : 'Unable to load invitations.'}
                                                                </div>
                                                        ) : invitations.length === 0 ? (
                                                                <div className='rounded-3xl border border-dashed border-base-200 bg-base-100 p-10 text-center text-sm text-base-content/70 shadow-sm'>
                                                                        No invitations yet. As you continue submitting proposals, clients can invite you to interview.
                                                                </div>
                                                        ) : (
                                                                <div className='space-y-4'>
                                                                        {invitations.map(invitation => renderInvitationCard(invitation))}
                                                                        {invitationTotalPages > 1 && (
                                                                                <div className='flex items-center justify-between rounded-3xl border border-base-200 bg-base-100 p-4 text-sm shadow-sm'>
                                                                                        <span className='text-base-content/60'>
                                                                                                Page {invitationPage} of {invitationTotalPages}
                                                                                        </span>
                                                                                        <div className='flex gap-2'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-sm btn-ghost'
                                                                                                        onClick={() => setInvitationPage(Math.max(1, invitationPage - 1))}
                                                                                                        disabled={invitationPage === 1}
                                                                                                >
                                                                                                        Previous
                                                                                                </button>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-sm btn-ghost'
                                                                                                        onClick={() => setInvitationPage(Math.min(invitationTotalPages, invitationPage + 1))}
                                                                                                        disabled={invitationPage === invitationTotalPages}
                                                                                                >
                                                                                                        Next
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        )}
                                                </div>
                                                <div>{renderInvitationDetail()}</div>
                                        </div>
                                )}
                                {activeTab === 'proposals' && (
                                        <div className='space-y-6'>
                                                <form
                                                        className='space-y-4 rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm'
                                                        onSubmit={event => {
                                                                event.preventDefault()
                                                                if (
                                                                        filterInputs.submittedFrom &&
                                                                        filterInputs.submittedTo &&
                                                                        new Date(filterInputs.submittedFrom) >
                                                                                new Date(filterInputs.submittedTo)
                                                                ) {
                                                                        setFilterError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
                                                                        return
                                                                }
                                                                setFilterError(null)
                                                                setAppliedFilters({ ...filterInputs })
                                                        }}
                                                >
                                                        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]'>
                                                                <label className='flex flex-col gap-2 text-sm text-base-content/70'>
                                                                        <span className='text-xs font-semibold uppercase tracking-wide text-base-content'>Tìm kiếm</span>
                                                                        <input
                                                                                type='text'
                                                                                value={filterInputs.search}
                                                                                onChange={event =>
                                                                                        setFilterInputs(current => ({
                                                                                                ...current,
                                                                                                search: event.target.value
                                                                                        }))
                                                                                }
                                                                                placeholder='Tìm theo tiêu đề job hoặc khách hàng'
                                                                                className='input input-bordered input-sm rounded-2xl'
                                                                        />
                                                                </label>
                                                                <label className='flex flex-col gap-2 text-sm text-base-content/70'>
                                                                        <span className='text-xs font-semibold uppercase tracking-wide text-base-content'>Sắp xếp</span>
                                                                        <select
                                                                                className='select select-bordered select-sm rounded-2xl'
                                                                                value={filterInputs.sortBy}
                                                                                onChange={event => {
                                                                                        const value = event.target.value as SortOption
                                                                                        setFilterInputs(current => ({
                                                                                                ...current,
                                                                                                sortBy: value
                                                                                        }))
                                                                                }}
                                                                        >
                                                                                <option value='newest'>Mới nhất</option>
                                                                                <option value='oldest'>Cũ nhất</option>
                                                                                <option value='bid-asc'>Bid thấp đến cao</option>
                                                                                <option value='bid-desc'>Bid cao đến thấp</option>
                                                                        </select>
                                                                </label>
                                                        </div>
                                                        <div className='grid gap-4 lg:grid-cols-2'>
                                                                <fieldset className='rounded-2xl border border-base-200 bg-base-100/70 p-4'>
                                                                        <legend className='px-2 text-xs font-semibold uppercase tracking-wide text-base-content/80'>Trạng thái</legend>
                                                                        <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                                                                                {JOB_PROPOSAL_STATUSES.map(status => {
                                                                                        const meta = JOB_PROPOSAL_STATUS_META[status]
                                                                                        const checked = filterInputs.statuses.includes(status)
                                                                                        return (
                                                                                                <label
                                                                                                        key={status}
                                                                                                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                                                                                                                checked
                                                                                                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                                                                                                        : 'border-base-200 text-base-content/70 hover:border-primary/30'
                                                                                                        }`}
                                                                                                >
                                                                                                        <input
                                                                                                                type='checkbox'
                                                                                                                className='checkbox checkbox-sm'
                                                                                                                checked={checked}
                                                                                                                onChange={() => {
                                                                                                                        setFilterInputs(current => {
                                                                                                                                const exists = current.statuses.includes(status)
                                                                                                                                return {
                                                                                                                                        ...current,
                                                                                                                                        statuses: exists
                                                                                                                                                ? current.statuses.filter(item => item !== status)
                                                                                                                                                : [...current.statuses, status]
                                                                                                                                }
                                                                                                                        })
                                                                                                                }}
                                                                                                        />
                                                                                                        <span className='font-medium'>{meta.label}</span>
                                                                                                </label>
                                                                                        )
                                                                                })}
                                                                        </div>
                                                                </fieldset>
                                                                <div className='grid gap-4 rounded-2xl border border-base-200 bg-base-100/70 p-4 text-sm text-base-content/70 sm:grid-cols-2'>
                                                                        <label className='flex flex-col gap-2'>
                                                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/80'>Từ ngày</span>
                                                                                <input
                                                                                        type='date'
                                                                                        value={filterInputs.submittedFrom}
                                                                                        onChange={event => {
                                                                                                const value = event.target.value
                                                                                                setFilterError(null)
                                                                                                setFilterInputs(current => ({
                                                                                                        ...current,
                                                                                                        submittedFrom: value
                                                                                                }))
                                                                                        }}
                                                                                        className='input input-bordered input-sm rounded-2xl'
                                                                                />
                                                                        </label>
                                                                        <label className='flex flex-col gap-2'>
                                                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/80'>Đến ngày</span>
                                                                                <input
                                                                                        type='date'
                                                                                        value={filterInputs.submittedTo}
                                                                                        onChange={event => {
                                                                                                const value = event.target.value
                                                                                                setFilterError(null)
                                                                                                setFilterInputs(current => ({
                                                                                                        ...current,
                                                                                                        submittedTo: value
                                                                                                }))
                                                                                        }}
                                                                                        className='input input-bordered input-sm rounded-2xl'
                                                                                />
                                                                        </label>
                                                                </div>
                                                        </div>
                                                        {filterError && (
                                                                <div className='rounded-2xl border border-error/30 bg-error/10 p-3 text-sm text-error'>
                                                                        {filterError}
                                                                </div>
                                                        )}
                                                        <div className='flex flex-wrap justify-end gap-3 pt-2'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-sm btn-ghost'
                                                                        onClick={() => {
                                                                                const reset = { ...initialFilterState }
                                                                                setFilterError(null)
                                                                                setFilterInputs(reset)
                                                                                setAppliedFilters({ ...initialFilterState })
                                                                                setProposalPage(1)
                                                                        }}
                                                                >
                                                                        Xóa lọc
                                                                </button>
                                                                <button type='submit' className='btn btn-sm btn-primary'>
                                                                        Áp dụng lọc
                                                                </button>
                                                        </div>
                                                </form>

                                                {(() => {
                                                        if (proposalsQuery.isLoading) {
                                                                return (
                                                                        <div className='flex min-h-[220px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-8 text-base-content/60 shadow-sm'>
                                                                                <Loader2 className='size-5 animate-spin text-primary' />
                                                                        </div>
                                                                )
                                                        }

                                                        if (proposalsQuery.isError) {
                                                                const message =
                                                                        proposalsQuery.error instanceof Error
                                                                                ? proposalsQuery.error.message
                                                                                : 'Unable to load proposals.'
                                                                return (
                                                                        <div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
                                                                                {message}
                                                                        </div>
                                                                )
                                                        }

                                                        if (!proposals.length) {
                                                                return (
                                                                        <div className='rounded-3xl border border-dashed border-base-200 bg-base-100 p-10 text-center text-sm text-base-content/70 shadow-sm'>
                                                                                Không có proposal nào khớp với bộ lọc hiện tại.
                                                                        </div>
                                                                )
                                                        }

                                                        const startItem = proposalsTotal === 0 ? 0 : (proposalPage - 1) * PAGE_SIZE + 1
                                                        const endItem = proposalsTotal === 0 ? 0 : Math.min(proposalPage * PAGE_SIZE, proposalsTotal)

                                                        return (
                                                                <div className='space-y-5'>
                                                                        <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-base-content/60'>
                                                                                <span>
                                                                                        Hiển thị {startItem} - {endItem} trong tổng số {proposalsTotal} proposal
                                                                                </span>
                                                                                <span className='text-xs uppercase tracking-wide text-base-content/60'>
                                                                                        Lọc đang áp dụng: {hasActiveFilters ? 'Có' : 'Không'}
                                                                                </span>
                                                                        </div>
                                                                        <div className='space-y-4'>
                                                                                {proposals.map(proposal => renderProposalCard(proposal))}
                                                                        </div>
                                                                        {proposalTotalPages > 1 && (
                                                                                <div className='flex items-center justify-between rounded-3xl border border-base-200 bg-base-100 p-4 text-sm shadow-sm'>
                                                                                        <span className='text-base-content/60'>Trang {proposalPage} / {proposalTotalPages}</span>
                                                                                        <div className='flex gap-2'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-sm btn-ghost'
                                                                                                        onClick={() => setProposalPage(Math.max(1, proposalPage - 1))}
                                                                                                        disabled={proposalPage === 1}
                                                                                                >
                                                                                                        Trước
                                                                                                </button>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-sm btn-ghost'
                                                                                                        onClick={() => setProposalPage(Math.min(proposalTotalPages, proposalPage + 1))}
                                                                                                        disabled={proposalPage === proposalTotalPages}
                                                                                                >
                                                                                                        Sau
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        )
                                                })()}
                                        </div>
                                )}
                        </div>
                </div>
        )
}
