import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react'
import {
	getFreelancerJobInvitationDetail,
	listFreelancerJobInvitations,
	respondToJobInvitation
} from '~/apis/job-invitation.api'
import type { JobInvitation, PaginatedJobInvitationResponse } from '~/types/job-invitation'
import { routes } from '~/config/routes'
import { toast } from 'react-toastify'

const PAGE_SIZE = 6

const statusMeta = {
	SENT: { label: 'Awaiting response', className: 'badge-warning/20 text-warning' },
	PENDING: { label: 'Awaiting response', className: 'badge-warning/20 text-warning' },
	ACCEPTED: { label: 'Accepted', className: 'badge-success/20 text-success' },
	DECLINED: { label: 'Declined', className: 'badge-error/20 text-error' },
	EXPIRED: { label: 'Expired', className: 'badge-ghost text-base-content/60' },
	WITHDRAWN: { label: 'Withdrawn', className: 'badge-ghost text-base-content/60' }
} as const

type StatusKey = keyof typeof statusMeta

const normalizeStatus = (status?: string | null): StatusKey | undefined => {
	if (!status) return undefined
	const upper = status.toUpperCase() as StatusKey
	return upper in statusMeta ? upper : undefined
}

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

const isExpiredInvitation = (invitation?: JobInvitation) => {
	if (!invitation) return false
	const status = normalizeStatus(invitation.status)
	if (status === 'EXPIRED') return true
	if (invitation.expiresAt) {
		const expiresAt = new Date(invitation.expiresAt)
		if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
			return true
		}
	}
	return false
}

export default function JobInvitationsPage() {
	const navigate = useNavigate()
	const params = useParams<{ invitationId?: string }>()
	const selectedInvitationId = params.invitationId
	const [page, setPage] = useState(1)

	const listQueryKey = useMemo(() => ['freelancer-job-invitations', { page }], [page])

	const { data, isLoading, isFetching, isError, error } = useQuery<PaginatedJobInvitationResponse>({
		queryKey: listQueryKey,
		queryFn: () => listFreelancerJobInvitations({ page, limit: PAGE_SIZE })
	})

	const invitations: JobInvitation[] = data?.data ?? []
	const total = data?.total ?? invitations.length
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
	const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
	const endItem = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

	const queryClient = useQueryClient()

	const detailQuery = useQuery({
		queryKey: ['freelancer-job-invitation', selectedInvitationId],
		queryFn: () => getFreelancerJobInvitationDetail(selectedInvitationId ?? ''),
		enabled: Boolean(selectedInvitationId)
	})

	const respondMutation = useMutation({
		mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
			respondToJobInvitation(id, { status }),
		onSuccess: async (_, variables) => {
			toast.success(
				variables.status === 'ACCEPTED' ? 'Invitation accepted successfully.' : 'Invitation declined successfully.'
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

	const handleSelectInvitation = (invitationId: string) => {
		if (selectedInvitationId === invitationId) return
		navigate(routes.freelancer.jobs.invitationDetail(invitationId))
	}

	const handleCloseDetail = () => {
		navigate(routes.freelancer.jobs.invitations)
	}

	const detail = detailQuery.data
	const detailStatus = normalizeStatus(detail?.status)
	const detailExpired = isExpiredInvitation(detail)
	const canRespond =
		detail && !detailExpired && (!detailStatus || detailStatus === 'SENT' || detailStatus === 'PENDING')

	const renderInvitationCard = (invitation: JobInvitation) => {
		const status = normalizeStatus(invitation.status)
		const meta = status ? statusMeta[status] : undefined
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
					<div className='text-base font-semibold text-base-content'>{invitation.job?.title ?? 'Job invitation'}</div>
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

	const renderDetail = () => {
		if (!selectedInvitationId) {
			return (
				<div className='rounded-3xl border border-dashed border-base-200 bg-base-100 p-8 text-center text-sm text-base-content/70 shadow-sm'>
					Select an invitation to see the full details and respond.
				</div>
			)
		}

		if (detailQuery.isLoading) {
			return (
				<div className='flex min-h-[220px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-8 text-base-content/60 shadow-sm'>
					<Loader2 className='size-5 animate-spin text-primary' />
				</div>
			)
		}

		if (detailQuery.isError) {
			const message =
				detailQuery.error instanceof Error ? detailQuery.error.message : 'Unable to load invitation details.'
			return (
				<div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>{message}</div>
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
						onClick={handleCloseDetail}
						className='btn btn-ghost btn-sm text-base-content/70 hover:text-base-content'>
						Close
					</button>
				</div>

				<div className='space-y-4 text-sm text-base-content/70'>
					<div className='flex flex-wrap items-center gap-3 text-xs text-base-content/60'>
						{createdLabel && <span>Sent {createdLabel}</span>}
						{respondedLabel && <span>Responded {respondedLabel}</span>}
						{expiresLabel && <span>Expires {expiresLabel}</span>}
					</div>

					<div className='rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-base-content'>
						<p className='font-semibold text-base-content'>Client message</p>
						<p className='mt-2 whitespace-pre-line text-base-content/80'>
							{detail.message ?? 'No additional message provided.'}
						</p>
					</div>

					<div className='rounded-2xl border border-base-200 bg-base-200/40 p-4'>
						<p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Job overview</p>
						<div className='mt-2 text-base font-semibold text-base-content'>{detail.job?.title ?? 'Untitled job'}</div>
						<Link
							to={routes.freelancer.jobs.detail(detail.job?.id)}
							className='mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'>
							<FileText className='size-4' /> View job post
						</Link>
					</div>

					{detail.respondedMessage && (
						<div className='rounded-2xl border border-base-200 bg-base-100 p-4'>
							<p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Your response</p>
							<p className='mt-2 text-base-content'>{detail.respondedMessage}</p>
						</div>
					)}

					{detailExpired && (
						<div className='rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning'>
							This invitation has expired and can no longer be accepted or declined.
						</div>
					)}

					{detailStatus === 'WITHDRAWN' && (
						<div className='rounded-2xl border border-base-200 bg-base-100 p-4 text-sm text-base-content/70'>
							The client withdrew this invitation.
						</div>
					)}
				</div>

				<div className='flex flex-col gap-3 border-t border-base-200 pt-4 sm:flex-row'>
					<button
						type='button'
						className='btn btn-primary gap-2 disabled:btn-disabled'
						disabled={!canRespond || respondMutation.isPending}
						onClick={() =>
							selectedInvitationId && respondMutation.mutate({ id: selectedInvitationId, status: 'ACCEPTED' })
						}>
						{respondMutation.isPending ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<CheckCircle2 className='size-4' />
						)}
						Accept invitation
					</button>
					<button
						type='button'
						className='btn btn-outline gap-2 disabled:btn-disabled'
						disabled={!canRespond || respondMutation.isPending}
						onClick={() =>
							selectedInvitationId && respondMutation.mutate({ id: selectedInvitationId, status: 'DECLINED' })
						}>
						{respondMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <XCircle className='size-4' />}
						Decline
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
			<div className='flex flex-col gap-2 pb-6'>
				<p className='text-sm font-semibold uppercase tracking-wide text-primary/80'>Proposals & offers</p>
				<h1 className='text-3xl font-semibold text-base-content'>Manage your job invitations</h1>
				<p className='max-w-2xl text-sm text-base-content/70'>
					Review invitations from clients, stay on top of deadlines, and respond when you are ready.
				</p>
			</div>

			<div className='grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
				<section className='space-y-4'>
					<div className='flex items-center justify-between text-xs text-base-content/60'>
						<span>
							Showing {startItem}-{endItem} of {total} invitations
						</span>
						{isFetching && (
							<span className='inline-flex items-center gap-2 text-primary'>
								<Loader2 className='size-3 animate-spin' /> Updating
							</span>
						)}
					</div>

					{isLoading && (
						<div className='flex min-h-[200px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-8 text-base-content/60 shadow-sm'>
							<Loader2 className='size-5 animate-spin text-primary' />
						</div>
					)}

					{isError && !isLoading && (
						<div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
							Unable to load invitations. {(error as Error)?.message ?? 'Please try again later.'}
						</div>
					)}

					{!isLoading && !isError && invitations.length === 0 && (
						<div className='rounded-3xl border border-dashed border-base-200 bg-base-100 p-8 text-center text-sm text-base-content/70 shadow-sm'>
							You have no invitations yet. Invitations from clients will appear here once they reach out.
						</div>
					)}

					<div className='grid gap-4'>{invitations.map(invitation => renderInvitationCard(invitation))}</div>

					{totalPages > 1 && (
						<div className='flex items-center justify-between gap-4 rounded-3xl border border-base-200 bg-base-100 p-4 text-sm text-base-content shadow-sm'>
							<button
								type='button'
								className='btn btn-sm'
								disabled={page === 1}
								onClick={() => setPage(prev => Math.max(1, prev - 1))}>
								Previous
							</button>
							<span>
								Page {page} of {totalPages}
							</span>
							<button
								type='button'
								className='btn btn-sm'
								disabled={page === totalPages}
								onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
								Next
							</button>
						</div>
					)}
				</section>

				<aside className='space-y-4'>{renderDetail()}</aside>
			</div>
		</div>
	)
}
