import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        BriefcaseBusiness,
        CheckCircle2,
        CircleDollarSign,
        Clock,
        Eye,
        ExternalLink,
        Filter,
        Loader2,
        MapPin,
        MessageSquare,
        CalendarCheck2,
        Search,
        Sparkles,
        Star,
        UserX,
        Users2
} from 'lucide-react'

import { toast } from 'react-toastify'

import {
        acceptClientJobProposalInterview,
        declineClientJobProposal,
        listClientJobProposals
} from '~/apis/client-job-proposal.api'
import { createJobOffer } from '~/apis/job-offer.api'
import { routes } from '~/config/routes'
import {
        JOB_DURATION_COMMITMENTS,
        type JobDurationCommitment
} from '~/constants/job'
import {
        ACTIVE_PROPOSAL_STATUSES,
        JOB_PROPOSAL_STATUS_META,
        SUBMITTED_PROPOSAL_STATUSES
} from '~/constants/job-proposal'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { JobPostDetail } from '~/types/job-post'
import type { ClientJobProposal, PaginatedClientJobProposalResponse } from '~/types/client-job-proposal'
import type { JobProposalStatus } from '~/types/job-proposal'
import {
        formatCurrency as formatFreelancerCurrency,
        formatNumberValue,
        getFreelancerAvatar,
        getFreelancerHourlyRate,
        getFreelancerId,
        getFreelancerInitials,
        getFreelancerJobSuccess,
        getFreelancerLocation,
        getFreelancerName,
        getFreelancerRating,
        getFreelancerTitle,
        getFreelancerTotalEarned,
        getFreelancerTotalHoursWorked
} from '~/pages/Client/Freelancers/utils'
import { formatDateTime } from '~/utils/format'
import JobOfferForm, { type JobOfferFormValues } from '~/components/job-offers/JobOfferForm'

const PAGE_SIZE = 6

const sortOptions = [
        { value: 'newest', label: 'Newest first' },
        { value: 'oldest', label: 'Oldest first' },
        { value: 'bid-desc', label: 'Highest bid' },
        { value: 'bid-asc', label: 'Lowest bid' }
] as const

type SortOptionValue = (typeof sortOptions)[number]['value']

type Props = {
        job: JobPostDetail
        isActive: boolean
}

const durationMap = Object.fromEntries(
        JOB_DURATION_COMMITMENTS.map(option => [option.value, option.label])
) as Record<JobDurationCommitment, string>

const proposalStatusOptions = Object.entries(JOB_PROPOSAL_STATUS_META).map(([value, meta]) => ({
        value: value as JobProposalStatus,
        label: meta.label
}))

const isProposalStatus = (value: string): value is JobProposalStatus =>
        Object.hasOwn(JOB_PROPOSAL_STATUS_META, value as JobProposalStatus)

const chatThreadIdCandidateKeys = [
        'chatThreadId',
        'threadId',
        'jobChatThreadId',
        'chatThreadID',
        'chat_thread_id',
        'messageThreadId',
        'conversationId'
] as const

const extractChatThreadId = (proposal: ClientJobProposal | null): string | null => {
        if (!proposal) return null

        const proposalRecord = proposal as Record<string, unknown>

        for (const key of chatThreadIdCandidateKeys) {
                const value = proposalRecord[key]
                if (typeof value === 'string' && value.trim()) {
                        return value.trim()
                }
        }

        const metadata = proposalRecord.metadata
        if (metadata && typeof metadata === 'object' && metadata !== null) {
                const metadataRecord = metadata as Record<string, unknown>
                for (const key of chatThreadIdCandidateKeys) {
                        const value = metadataRecord[key]
                        if (typeof value === 'string' && value.trim()) {
                                return value.trim()
                        }
                }
        }

        const chatThread = proposalRecord.chatThread
        if (chatThread && typeof chatThread === 'object' && chatThread !== null) {
                const threadRecord = chatThread as Record<string, unknown>
                const id = threadRecord.id
                if (typeof id === 'string' && id.trim()) {
                        return id.trim()
                }
        }

        return null
}

const formatBidAmount = (amount?: number | null, currency?: string | null): string | undefined => {
        if (amount === undefined || amount === null) return undefined
        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD',
                        maximumFractionDigits: 0
                }).format(amount)
        } catch {
                return currency ? `${amount} ${currency}` : `${amount}`
        }
}

const computeStatusCounts = (
        response: PaginatedClientJobProposalResponse | undefined,
        proposals: ClientJobProposal[]
) => {
        const counts = new Map<JobProposalStatus, number>()
        const aggregates = response?.aggregates?.statuses ?? []
        let hasAggregates = false

        aggregates?.forEach(item => {
                if (!item) return
                const rawStatus = typeof item.status === 'string' ? item.status.toUpperCase() : undefined
                const status = rawStatus && isProposalStatus(rawStatus) ? rawStatus : undefined
                if (!status) return
                const countValue = Number(item.count ?? 0)
                if (Number.isNaN(countValue)) return
                counts.set(status, countValue)
                hasAggregates = true
        })

        if (!hasAggregates) {
                proposals.forEach(proposal => {
                        const status = proposal.status
                        if (!status) return
                        counts.set(status, (counts.get(status) ?? 0) + 1)
                })
        }

        return counts
}

const renderSkeletonCard = (index: number) => (
        <div
                key={`proposal-skeleton-${index}`}
                className='animate-pulse rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'
        >
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='flex flex-1 items-start gap-4'>
                                <div className='h-14 w-14 rounded-2xl bg-base-200' />
                                <div className='space-y-3'>
                                        <div className='h-5 w-40 rounded-full bg-base-200' />
                                        <div className='h-4 w-56 rounded-full bg-base-200' />
                                        <div className='h-4 w-72 rounded-full bg-base-200' />
                                </div>
                        </div>
                        <div className='flex w-full flex-col gap-3 lg:w-48'>
                                <div className='h-8 rounded-2xl bg-base-200' />
                                <div className='h-6 rounded-full bg-base-200' />
                                <div className='h-6 rounded-full bg-base-200' />
                        </div>
                </div>
        </div>
)

export default function JobProposalsTab({ job, isActive }: Props) {
        const [page, setPage] = useState(1)
        const [status, setStatus] = useState<JobProposalStatus | ''>('')
        const [sortBy, setSortBy] = useState<SortOptionValue>('newest')
        const [search, setSearch] = useState('')
        const [previewProposal, setPreviewProposal] = useState<ClientJobProposal | null>(null)
        const [offerDialogOpen, setOfferDialogOpen] = useState(false)
        const [offerDefaults, setOfferDefaults] = useState<Partial<JobOfferFormValues> | undefined>(undefined)
        const [offerTarget, setOfferTarget] = useState<ClientJobProposal | null>(null)

        const queryClient = useQueryClient()

        useEffect(() => {
                setPage(1)
        }, [job.id])

        useEffect(() => {
                setPreviewProposal(null)
                setOfferDialogOpen(false)
                setOfferDefaults(undefined)
                setOfferTarget(null)
        }, [job.id])

        const getErrorMessage = (error: unknown, fallback: string) =>
                error instanceof Error ? error.message : fallback

        const updatePreviewProposal = (
                updated: ClientJobProposal | null | undefined,
                fallbackStatus: JobProposalStatus,
        ) => {
                setPreviewProposal(current => {
                        if (!current) return current

                        if (updated && updated.id === current.id) {
                                return { ...current, ...updated }
                        }

                        if (!updated) {
                                if (current.status === fallbackStatus) return current
                                return { ...current, status: fallbackStatus }
                        }

                        return current
                })
        }

        const invalidateProposals = () =>
                queryClient.invalidateQueries({ queryKey: ['client-job-proposals'] })

        const handleMutationSuccess = (
                message: string,
                updated: ClientJobProposal | null | undefined,
                fallbackStatus: JobProposalStatus,
        ) => {
                toast.success(message)
                updatePreviewProposal(updated, fallbackStatus)
                void invalidateProposals()
        }

        const handleMutationError = (error: unknown, fallback: string) => {
                toast.error(getErrorMessage(error, fallback))
        }

        const buildOfferDefaults = (proposal: ClientJobProposal): Partial<JobOfferFormValues> => {
                const freelancerName = getFreelancerName(proposal.freelancer ?? null)
                const baseTitle = job.title ? `${job.title} – Offer` : 'New job offer'
                const currency = (proposal.bidCurrency ?? job.budgetCurrency ?? 'USD').toUpperCase()
                const fixedPrice = proposal.bidAmount ?? job.budgetAmount ?? undefined
                const greetingName = freelancerName || 'bạn'
                const defaultMessage = `Xin chào ${greetingName},\n\nTôi muốn mời bạn hợp tác cho dự án “${job.title ?? 'dự án này'}”. Vui lòng xem qua offer và phản hồi khi bạn sẵn sàng nhé.`

                return {
                        title: baseTitle,
                        message: defaultMessage,
                        currency,
                        fixedPrice,
                        sendNow: true
                }
        }

        const handleOfferDialogClose = () => {
                setOfferDialogOpen(false)
                setOfferDefaults(undefined)
                setOfferTarget(null)
        }

        const debouncedSearch = useDebounce(search, 400)

        const queryKey = useMemo(
                () => [
                        'client-job-proposals',
                        job.id,
                        {
                                page,
                                status,
                                sortBy,
                                search: debouncedSearch
                        }
                ],
                [job.id, page, status, sortBy, debouncedSearch]
        )

        const proposalsQuery = useQuery<PaginatedClientJobProposalResponse>({
                queryKey,
                enabled: isActive,
                placeholderData: previousData => previousData,
                queryFn: () =>
                        listClientJobProposals(job.id, {
                                page,
                                limit: PAGE_SIZE,
                                search: debouncedSearch ? debouncedSearch.trim() : undefined,
                                status: status || undefined,
                                sortBy
                        })
        })

        const proposals = (proposalsQuery.data?.data ?? []).filter(
                (proposal): proposal is ClientJobProposal => Boolean(proposal)
        )
        const total = proposalsQuery.data?.total ?? proposals.length ?? 0
        const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1
        const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
        const endItem = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

        useEffect(() => {
                if (!isActive) return
                if (page > totalPages) {
                        setPage(Math.max(1, totalPages))
                }
        }, [page, totalPages, isActive])

        const statusCounts = useMemo(
                () => computeStatusCounts(proposalsQuery.data, proposals),
                [proposalsQuery.data, proposals]
        )

        const submittedCount = SUBMITTED_PROPOSAL_STATUSES.reduce(
                (acc, key) => acc + (statusCounts.get(key) ?? 0),
                0
        )
        const activeCount = ACTIVE_PROPOSAL_STATUSES.reduce(
                (acc, key) => acc + (statusCounts.get(key) ?? 0),
                0
        )
        const hiredCount = statusCounts.get('HIRED') ?? 0
        const closedCount = (statusCounts.get('DECLINED') ?? 0) + (statusCounts.get('WITHDRAWN') ?? 0)
        const decisionsCount = hiredCount + closedCount

        const isLoading = proposalsQuery.isLoading
        const isFetching = proposalsQuery.isFetching && !proposalsQuery.isLoading
        const hasError = proposalsQuery.isError
        const errorMessage =
                proposalsQuery.error instanceof Error
                        ? proposalsQuery.error.message
                        : 'Unable to load proposals right now.'

        const acceptInterviewMutation = useMutation({
                mutationFn: (proposalId: string) => acceptClientJobProposalInterview(job.id, proposalId),
                onSuccess: data => handleMutationSuccess('Interview accepted successfully.', data, 'INTERVIEWING'),
                onError: error => handleMutationError(error, 'Unable to accept interview.')
        })

        const declineMutation = useMutation({
                mutationFn: (proposalId: string) => declineClientJobProposal(job.id, proposalId),
                onSuccess: data => handleMutationSuccess('Proposal declined.', data, 'DECLINED'),
                onError: error => handleMutationError(error, 'Unable to decline this proposal.')
        })

        const createOfferMutation = useMutation({
                mutationFn: async (values: JobOfferFormValues) => {
                        if (!offerTarget) {
                                throw new Error('Missing proposal reference')
                        }
                        const freelancerId =
                                offerTarget.freelancerId ?? getFreelancerId(offerTarget.freelancer ?? null)
                        if (!freelancerId) {
                                throw new Error('Không tìm thấy freelancerId của proposal này')
                        }
                        const payload = {
                                jobId: job.id,
                                freelancerId,
                                proposalId: offerTarget.id,
                                invitationId: offerTarget.invitationId ?? undefined,
                                title: values.title,
                                message: values.message ?? undefined,
                                currency: values.currency,
                                fixedPrice: values.fixedPrice,
                                startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
                                expireAt: values.expireAt ? new Date(values.expireAt).toISOString() : undefined,
                                sendNow: values.sendNow
                        }
                        return createJobOffer(payload)
                },
                onSuccess: () => {
                        toast.success('Offer đã được tạo và gửi tới freelancer.')
                        handleOfferDialogClose()
                        setPreviewProposal(null)
                        void queryClient.invalidateQueries({ queryKey: ['client-job-proposals'] })
                        void queryClient.invalidateQueries({ queryKey: ['client-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể tạo offer ngay lúc này.'
                        toast.error(message)
                }
        })

        const resetFilters = () => {
                setSearch('')
                setStatus('')
                setSortBy('newest')
                setPage(1)
        }

        const previewChatThreadId = extractChatThreadId(previewProposal)
        const previewMessageLink = previewChatThreadId
                ? `${routes.messages.jobs}?threadId=${encodeURIComponent(previewChatThreadId)}`
                : null

        const renderProposalCard = (proposal: ClientJobProposal) => {
                const freelancer = proposal.freelancer ?? null
                const freelancerId = getFreelancerId(freelancer)
                const freelancerName = getFreelancerName(freelancer)
                const freelancerTitle = getFreelancerTitle(freelancer)
                const avatarUrl = getFreelancerAvatar(freelancer)
                const avatarFallback = getFreelancerInitials(freelancerName)
                const location = getFreelancerLocation(freelancer)
                const jobSuccess = getFreelancerJobSuccess(freelancer)
                const rating = getFreelancerRating(freelancer)
                const totalEarned = getFreelancerTotalEarned(freelancer)
                const totalHoursWorked = getFreelancerTotalHoursWorked(freelancer)
                const hourlyMeta = getFreelancerHourlyRate(freelancer)
                const totalEarnedLabel =
                        totalEarned !== undefined
                                ? formatFreelancerCurrency(totalEarned, hourlyMeta.currency)
                                : undefined
                const hoursLabel =
                        totalHoursWorked !== undefined
                                ? `${formatNumberValue(totalHoursWorked)} hrs billed`
                                : undefined

                const statusMeta = JOB_PROPOSAL_STATUS_META[proposal.status]
                const amountLabel = formatBidAmount(proposal.bidAmount ?? undefined, proposal.bidCurrency ?? undefined)
                const durationLabel = proposal.estimatedDuration
                        ? durationMap[proposal.estimatedDuration as JobDurationCommitment] ?? proposal.estimatedDuration
                        : undefined
                const submittedLabel = formatDateTime(proposal.submittedAt ?? proposal.createdAt, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                })
                const coverLetter = proposal.coverLetter?.trim()
                const profileLink = freelancerId ? routes.comons.freelancerProfile(freelancerId) : undefined

                return (
                        <div key={proposal.id} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                        <div className='flex flex-1 items-start gap-4'>
                                                <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-semibold text-primary'>
                                                        {avatarUrl ? (
                                                                <img
                                                                        src={avatarUrl}
                                                                        alt={freelancerName}
                                                                        className='h-full w-full object-cover'
                                                                />
                                                        ) : (
                                                                <span>{avatarFallback}</span>
                                                        )}
                                                </div>
                                                <div className='space-y-2'>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                                <h3 className='text-lg font-semibold text-base-content'>{freelancerName}</h3>
                                                                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                                        </div>
                                                        {freelancerTitle ? (
                                                                <p className='text-sm text-base-content/70'>{freelancerTitle}</p>
                                                        ) : null}
                                                        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-base-content/60'>
                                                                {location ? (
                                                                        <span className='inline-flex items-center gap-1 text-base-content/70'>
                                                                                <MapPin className='size-3 text-primary/70' />
                                                                                {location}
                                                                        </span>
                                                                ) : null}
                                                                {typeof jobSuccess === 'number' ? (
                                                                        <span className='inline-flex items-center gap-1 text-emerald-600'>
                                                                                <CheckCircle2 className='size-3' />
                                                                                {jobSuccess}% success
                                                                        </span>
                                                                ) : null}
                                                                {typeof rating === 'number' ? (
                                                                        <span className='inline-flex items-center gap-1 text-amber-600'>
                                                                                <Star className='size-3 fill-current' />
                                                                                {rating.toFixed(1)} rating
                                                                        </span>
                                                                ) : null}
                                                                {totalEarnedLabel ? (
                                                                        <span className='inline-flex items-center gap-1 text-primary/70'>
                                                                                <CircleDollarSign className='size-3' />
                                                                                {totalEarnedLabel} earned
                                                                        </span>
                                                                ) : null}
                                                                {hoursLabel ? (
                                                                        <span className='inline-flex items-center gap-1 text-base-content/70'>
                                                                                <Clock className='size-3 text-primary/70' />
                                                                                {hoursLabel}
                                                                        </span>
                                                                ) : null}
                                                        </div>
                                                </div>
                                        </div>
                                        <div className='flex w-full flex-col items-start gap-3 text-sm text-base-content/80 lg:w-56 lg:items-end'>
                                                {submittedLabel ? (
                                                        <span className='inline-flex items-center gap-2 text-xs uppercase tracking-wide text-base-content/60'>
                                                                <Clock className='size-3 text-primary/70' /> Submitted {submittedLabel}
                                                        </span>
                                                ) : null}
                                                <div className='w-full rounded-2xl border border-base-200 bg-base-200/60 px-4 py-2 text-center text-base font-semibold text-base-content'>
                                                        {amountLabel ?? 'Bid pending'}
                                                </div>
                                                {durationLabel ? (
                                                        <span className='inline-flex items-center gap-2 text-xs text-base-content/60'>
                                                                <Sparkles className='size-3 text-secondary/70' /> {durationLabel}
                                                        </span>
                                                ) : null}
                                        </div>
                                </div>
                                {coverLetter ? (
                                        <div className='mt-5 rounded-2xl border border-base-200 bg-base-200/50 p-4 text-sm text-base-content/80'>
                                                <div className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                        <MessageSquare className='size-4 text-primary' /> Cover letter preview
                                                </div>
                                                <p className='mt-2 whitespace-pre-line leading-relaxed text-base-content/70 line-clamp-4'>{coverLetter}</p>
                                        </div>
                                ) : null}
                                <div className='mt-4 flex flex-wrap gap-2'>
                                        <button
                                                type='button'
                                                className='btn btn-sm btn-primary gap-2'
                                                onClick={() => setPreviewProposal(proposal)}
                                        >
                                                <Eye className='size-4' /> Preview proposal
                                        </button>
                                        {profileLink ? (
                                                <Link to={profileLink} className='btn btn-sm btn-outline gap-2'>
                                                        <ExternalLink className='size-4' /> View profile
                                                </Link>
                                        ) : null}
                                </div>
                        </div>
                )
        }

        const handleAcceptInterview = () => {
                if (!previewProposal) return
                acceptInterviewMutation.mutate(previewProposal.id)
        }

        const handleHireFreelancer = () => {
                if (!previewProposal) return
                const defaults = buildOfferDefaults(previewProposal)
                setOfferDefaults(defaults)
                setOfferTarget(previewProposal)
                setOfferDialogOpen(true)
        }

        const handleDeclineProposal = () => {
                if (!previewProposal) return
                declineMutation.mutate(previewProposal.id)
        }

        const offerFreelancerName = offerTarget ? getFreelancerName(offerTarget.freelancer ?? null) : null

        return (
                <div className='space-y-6'>
                        <section className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                        <div className='flex items-center gap-3'>
                                                <div className='flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                                                        <Users2 className='size-5' />
                                                </div>
                                                <div>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Total proposals</p>
                                                        <p className='text-xl font-semibold text-base-content'>{total}</p>
                                                </div>
                                        </div>
                                        <p className='mt-2 text-xs text-base-content/60'>Includes all proposals submitted for this job.</p>
                                </div>
                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                        <div className='flex items-center gap-3'>
                                                <div className='flex size-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary'>
                                                        <MessageSquare className='size-5' />
                                                </div>
                                                <div>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Awaiting review</p>
                                                        <p className='text-xl font-semibold text-base-content'>{submittedCount}</p>
                                                </div>
                                        </div>
                                        <p className='mt-2 text-xs text-base-content/60'>Proposals submitted and waiting for your response.</p>
                                </div>
                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                        <div className='flex items-center gap-3'>
                                                <div className='flex size-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary'>
                                                        <Sparkles className='size-5' />
                                                </div>
                                                <div>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Active pipeline</p>
                                                        <p className='text-xl font-semibold text-base-content'>{activeCount}</p>
                                                </div>
                                        </div>
                                        <p className='mt-2 text-xs text-base-content/60'>Shortlisted and interviewing candidates.</p>
                                </div>
                                <div className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                        <div className='flex items-center gap-3'>
                                                <div className='flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600'>
                                                        <BriefcaseBusiness className='size-5' />
                                                </div>
                                                <div>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Decisions made</p>
                                                        <p className='text-xl font-semibold text-base-content'>{decisionsCount}</p>
                                                </div>
                                        </div>
                                        <p className='mt-2 text-xs text-base-content/60'>Hired {hiredCount} · Declined {closedCount}</p>
                                </div>
                        </section>

                        <section className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='grid gap-4 md:grid-cols-[minmax(0,2.5fr)_repeat(2,minmax(0,1fr))]'>
                                        <label className='input input-bordered flex items-center gap-2'>
                                                <Search className='size-4 text-base-content/60' />
                                                <input
                                                        value={search}
                                                        onChange={event => {
                                                                setSearch(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Search by freelancer name or keywords'
                                                        className='grow'
                                                />
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Filter className='size-3' /> Status
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={status}
                                                        onChange={event => {
                                                                const value = event.target.value as JobProposalStatus | ''
                                                                setStatus(value)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value=''>All statuses</option>
                                                        {proposalStatusOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Sparkles className='size-3' /> Sort by
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={sortBy}
                                                        onChange={event => {
                                                                setSortBy(event.target.value as SortOptionValue)
                                                                setPage(1)
                                                        }}
                                                >
                                                        {sortOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                </div>

                                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-base-content/60'>
                                        <span>
                                                Showing {total === 0 ? 0 : `${startItem}-${endItem}`} of {total} proposals
                                        </span>
                                        <button
                                                type='button'
                                                onClick={resetFilters}
                                                className='btn btn-ghost btn-xs text-primary hover:bg-primary/10'
                                                disabled={!search && !status && sortBy === 'newest'}
                                        >
                                                Reset filters
                                        </button>
                                </div>
                        </section>

                        {isLoading ? (
                                <div className='space-y-4'>
                                        {Array.from({ length: 3 }).map((_, index) => renderSkeletonCard(index))}
                                </div>
                        ) : hasError ? (
                                <div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
                                        {errorMessage}
                                </div>
                        ) : proposals.length === 0 ? (
                                <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 p-10 text-center text-sm text-base-content/70 shadow-sm'>
                                        No proposals match your filters yet. Try adjusting the search or check back later.
                                </div>
                        ) : (
                                <div className='space-y-4'>
                                        {isFetching ? (
                                                <div className='flex items-center gap-2 rounded-2xl border border-base-200 bg-base-100 px-4 py-2 text-xs text-base-content/60'>
                                                        <Loader2 className='size-4 animate-spin text-primary' />
                                                        Updating results…
                                                </div>
                                        ) : null}
                                        {proposals.map(proposal => renderProposalCard(proposal))}
                                </div>
                        )}

                        {totalPages > 1 ? (
                                <div className='flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-base-200 bg-base-100 px-4 py-3 text-sm text-base-content/70 shadow-sm'>
                                        <div>
                                                Page {page} of {totalPages}
                                        </div>
                                        <div className='flex gap-2'>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-ghost'
                                                        onClick={() => setPage(Math.max(1, page - 1))}
                                                        disabled={page === 1}
                                                >
                                                        Previous
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-primary'
                                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                        disabled={page === totalPages}
                                                >
                                                        Next
                                                </button>
                                        </div>
                                </div>
                        ) : null}

                        {previewProposal ? (
                                <ProposalPreviewDialog
                                        open={Boolean(previewProposal)}
                                        proposal={previewProposal}
                                        jobTitle={job.title ?? 'Job proposal'}
                                        messageLink={previewMessageLink}
                                        acceptLoading={acceptInterviewMutation.isPending}
                                        hireLoading={createOfferMutation.isPending}
                                        declineLoading={declineMutation.isPending}
                                        onAcceptInterview={handleAcceptInterview}
                                        onHire={handleHireFreelancer}
                                        onDecline={handleDeclineProposal}
                                        onClose={() => {
                                                setPreviewProposal(null)
                                                handleOfferDialogClose()
                                        }}
                                />
                        ) : null}

                        <dialog className={`modal ${offerDialogOpen ? 'modal-open' : ''}`}>
                                <div className='modal-box max-w-2xl'>
                                        {offerTarget ? (
                                                <JobOfferForm
                                                        mode='create'
                                                        defaultValues={offerDefaults}
                                                        onSubmit={values => createOfferMutation.mutate(values)}
                                                        onCancel={handleOfferDialogClose}
                                                        isSubmitting={createOfferMutation.isPending}
                                                        submitLabel={createOfferMutation.isPending ? 'Đang gửi…' : 'Gửi offer'}
                                                        title='Tạo job offer'
                                                        description={`Xác nhận điều khoản trước khi gửi tới ${offerFreelancerName ?? 'freelancer'}.`}
                                                />
                                        ) : null}
                                </div>
                                <form method='dialog' className='modal-backdrop'>
                                        <button type='submit' onClick={handleOfferDialogClose} aria-label='Đóng tạo offer'>close</button>
                                </form>
                        </dialog>
                </div>
        )
}

type ProposalPreviewDialogProps = {
        open: boolean
        proposal: ClientJobProposal
        jobTitle: string
        messageLink: string | null
        acceptLoading: boolean
        hireLoading: boolean
        declineLoading: boolean
        onAcceptInterview: () => void
        onHire: () => void
        onDecline: () => void
        onClose: () => void
}

function ProposalPreviewDialog({
        open,
        proposal,
        jobTitle,
        messageLink,
        acceptLoading,
        hireLoading,
        declineLoading,
        onAcceptInterview,
        onHire,
        onDecline,
        onClose
}: ProposalPreviewDialogProps) {
        const freelancer = proposal.freelancer ?? null
        const freelancerId = getFreelancerId(freelancer)
        const freelancerName = getFreelancerName(freelancer)
        const freelancerTitle = getFreelancerTitle(freelancer)
        const avatarUrl = getFreelancerAvatar(freelancer)
        const avatarFallback = getFreelancerInitials(freelancerName)
        const location = getFreelancerLocation(freelancer)
        const jobSuccess = getFreelancerJobSuccess(freelancer)
        const rating = getFreelancerRating(freelancer)
        const totalEarned = getFreelancerTotalEarned(freelancer)
        const totalHoursWorked = getFreelancerTotalHoursWorked(freelancer)
        const hourlyMeta = getFreelancerHourlyRate(freelancer)
        const totalEarnedLabel =
                totalEarned !== undefined
                        ? formatFreelancerCurrency(totalEarned, hourlyMeta.currency)
                        : undefined
        const hoursLabel =
                totalHoursWorked !== undefined
                        ? `${formatNumberValue(totalHoursWorked)} hrs billed`
                        : undefined

        const statusMeta = JOB_PROPOSAL_STATUS_META[proposal.status]
        const amountLabel = formatBidAmount(proposal.bidAmount ?? undefined, proposal.bidCurrency ?? undefined)
        const durationLabel = proposal.estimatedDuration
                ? durationMap[proposal.estimatedDuration as JobDurationCommitment] ?? proposal.estimatedDuration
                : undefined
        const submittedLabel = formatDateTime(proposal.submittedAt ?? proposal.createdAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
        })
        const coverLetter = proposal.coverLetter?.trim()
        const profileLink = freelancerId ? routes.comons.freelancerProfile(String(freelancerId)) : undefined

        const canAcceptInterview = proposal.status === 'SUBMITTED' || proposal.status === 'SHORTLISTED'
        const canHire = proposal.status === 'INTERVIEWING' || proposal.status === 'SHORTLISTED'
        const canDecline =
                proposal.status === 'SUBMITTED' || proposal.status === 'SHORTLISTED' || proposal.status === 'INTERVIEWING'
        const showMessageShortcut = proposal.status === 'INTERVIEWING' || proposal.status === 'HIRED'
        const isMutating = acceptLoading || hireLoading || declineLoading

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-3xl space-y-6'>
                                <div className='flex flex-col gap-4'>
                                        <div className='flex items-start justify-between gap-4'>
                                                <div className='flex flex-1 items-start gap-3'>
                                                        <div className='flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-semibold text-primary'>
                                                                {avatarUrl ? (
                                                                        <img src={avatarUrl} alt={freelancerName} className='h-full w-full object-cover' />
                                                                ) : (
                                                                        <span>{avatarFallback}</span>
                                                                )}
                                                        </div>
                                                        <div className='min-w-0 space-y-1'>
                                                                <p className='truncate text-lg font-semibold text-base-content'>
                                                                        {freelancerName || 'Freelancer'}
                                                                </p>
                                                                {freelancerTitle ? (
                                                                        <p className='truncate text-sm text-base-content/70'>{freelancerTitle}</p>
                                                                ) : null}
                                                                <p className='text-xs text-base-content/60'>Proposal for: {jobTitle}</p>
                                                                <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-base-content/60'>
                                                                        {location ? (
                                                                                <span className='inline-flex items-center gap-1 text-base-content/70'>
                                                                                        <MapPin className='size-3 text-primary/70' /> {location}
                                                                                </span>
                                                                        ) : null}
                                                                        {typeof jobSuccess === 'number' ? (
                                                                                <span className='inline-flex items-center gap-1 text-emerald-600'>
                                                                                        <CheckCircle2 className='size-3' /> {jobSuccess}% success
                                                                                </span>
                                                                        ) : null}
                                                                        {typeof rating === 'number' ? (
                                                                                <span className='inline-flex items-center gap-1 text-amber-600'>
                                                                                        <Star className='size-3 fill-current' /> {rating.toFixed(1)} rating
                                                                                </span>
                                                                        ) : null}
                                                                        {totalEarnedLabel ? (
                                                                                <span className='inline-flex items-center gap-1 text-primary/70'>
                                                                                        <CircleDollarSign className='size-3' /> {totalEarnedLabel} earned
                                                                                </span>
                                                                        ) : null}
                                                                        {hoursLabel ? (
                                                                                <span className='inline-flex items-center gap-1 text-base-content/70'>
                                                                                        <Clock className='size-3 text-primary/70' /> {hoursLabel}
                                                                                </span>
                                                                        ) : null}
                                                                </div>
                                                        </div>
                                                </div>
                                                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        </div>

                                        <div className='grid gap-3 sm:grid-cols-2'>
                                                <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Bid amount</p>
                                                        <p className='mt-2 text-base font-semibold text-base-content'>
                                                                {amountLabel ?? 'Not specified'}
                                                        </p>
                                                </div>
                                                <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Estimated duration</p>
                                                        <p className='mt-2 text-base font-semibold text-base-content'>
                                                                {durationLabel ?? 'Not provided'}
                                                        </p>
                                                </div>
                                                <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Submitted</p>
                                                        <p className='mt-2 text-base font-semibold text-base-content'>
                                                                {submittedLabel ?? 'Not available'}
                                                        </p>
                                                </div>
                                                {profileLink ? (
                                                        <Link
                                                                to={profileLink}
                                                                className='rounded-2xl border border-base-200 bg-base-200/60 p-4 transition hover:border-primary/40 hover:bg-primary/10'
                                                        >
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Freelancer profile</p>
                                                                <p className='mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary'>
                                                                        <ExternalLink className='size-4' /> View profile
                                                                </p>
                                                        </Link>
                                                ) : null}
                                        </div>

                                        <div className='space-y-3'>
                                                <div className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                        <MessageSquare className='size-4 text-primary' /> Cover letter
                                                </div>
                                                {coverLetter ? (
                                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4 text-sm leading-relaxed text-base-content/80 whitespace-pre-line'>
                                                                {coverLetter}
                                                        </div>
                                                ) : (
                                                        <div className='rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-sm text-base-content/60'>
                                                                No cover letter was included with this proposal.
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                <div className='modal-action mt-6 flex flex-col gap-4'>
                                        <div className='flex flex-wrap gap-2'>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-primary gap-2'
                                                        disabled={!canAcceptInterview || isMutating}
                                                        onClick={onAcceptInterview}
                                                >
                                                        {acceptLoading ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <CalendarCheck2 className='size-4' />
                                                        )}
                                                        {acceptLoading ? 'Accepting…' : 'Accept interview'}
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-success gap-2'
                                                        disabled={!canHire || isMutating}
                                                        onClick={onHire}
                                                >
                                                        {hireLoading ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <CircleDollarSign className='size-4' />
                                                        )}
                                                        {hireLoading ? 'Sending…' : 'Send offer'}
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-outline btn-error gap-2'
                                                        disabled={!canDecline || isMutating}
                                                        onClick={onDecline}
                                                >
                                                        {declineLoading ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <UserX className='size-4' />
                                                        )}
                                                        {declineLoading ? 'Declining…' : 'Decline proposal'}
                                                </button>
                                        </div>

                                        <div className='flex flex-wrap items-center justify-between gap-2'>
                                                <div className='flex flex-wrap gap-2'>
                                                        {showMessageShortcut ? (
                                                                messageLink ? (
                                                                        <Link to={messageLink} className='btn btn-sm btn-secondary gap-2'>
                                                                                <MessageSquare className='size-4' /> Open chat
                                                                        </Link>
                                                                ) : (
                                                                        <button
                                                                                type='button'
                                                                                className='btn btn-sm btn-outline gap-2'
                                                                                disabled
                                                                                title='Chat thread will be available once the workspace is ready.'
                                                                        >
                                                                                <MessageSquare className='size-4' /> Chat unavailable
                                                                        </button>
                                                                )
                                                        ) : null}
                                                </div>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-ghost'
                                                        onClick={onClose}
                                                        disabled={isMutating}
                                                >
                                                        Close
                                                </button>
                                        </div>
                                </div>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={onClose}>Close</button>
                        </form>
                </dialog>
        )
}
