import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Filter, Loader2, Search, Trash2, Pencil, Layers, Clock, MapPin } from 'lucide-react'
import { listJobPosts, deleteJobPost } from '~/apis/job-post.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import {
        JOB_DURATION_COMMITMENTS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        JOB_STATUS_OPTIONS,
        JOB_VISIBILITY_OPTIONS,
        type JobDurationCommitment,
        type JobPaymentMode,
        type JobStatus,
        type JobVisibility
} from '~/constants/job'
import type { JobPostListItem } from '~/types/job-post'
import { routes } from '~/config/routes'
import ConfirmDelete from '~/components/ConfirmDelete'

const PAGE_SIZE = 6

const statusMap = Object.fromEntries(JOB_STATUS_OPTIONS.map(option => [option.value, option.label])) as Record<
        JobStatus,
        string
>
const visibilityMap = Object.fromEntries(JOB_VISIBILITY_OPTIONS.map(option => [option.value, option.label])) as Record<
        JobVisibility,
        string
>
const paymentModeMap = Object.fromEntries(JOB_PAYMENT_MODES.map(option => [option.value, option.label])) as Record<
        JobPaymentMode,
        string
>
const locationMap = Object.fromEntries(JOB_LOCATION_TYPES.map(option => [option.value, option.label]))
const durationMap = Object.fromEntries(JOB_DURATION_COMMITMENTS.map(option => [option.value, option.label])) as Record<
        JobDurationCommitment,
        string
>

function formatBudget(job: JobPostListItem) {
        if (job.budgetAmount == null || !job.budgetCurrency) return 'Budget TBD'
        return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: job.budgetCurrency,
                maximumFractionDigits: 0
        }).format(job.budgetAmount)
}

function formatDate(value?: string | null) {
        if (!value) return 'Not published yet'
        try {
                return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
        } catch {
                return 'Not published yet'
        }
}

export default function JobPostListPage() {
        const navigate = useNavigate()
        const queryClient = useQueryClient()
        const [page, setPage] = useState(1)
        const [search, setSearch] = useState('')
        const [status, setStatus] = useState('')
        const [visibility, setVisibility] = useState('')
        const [paymentMode, setPaymentMode] = useState('')
        const [jobToDelete, setJobToDelete] = useState<JobPostListItem | null>(null)

        const debouncedSearch = useDebounce(search, 400)

        const queryKey = useMemo(
                () => [
                        'job-posts',
                        { page, limit: PAGE_SIZE, search: debouncedSearch, status, visibility, paymentMode }
                ],
                [page, debouncedSearch, status, visibility, paymentMode]
        )

        const { data, isLoading, isFetching } = useQuery({
                queryKey,
                queryFn: () =>
                        listJobPosts({
                                page,
                                limit: PAGE_SIZE,
                                search: debouncedSearch || undefined,
                                statuses: status ? ([status] as JobStatus[]) : undefined,
                                visibility: visibility ? (visibility as JobVisibility) : undefined,
                                paymentModes: paymentMode ? ([paymentMode] as JobPaymentMode[]) : undefined,
                                mine: true
                        }),
        })

        const deleteMutation = useMutation({
                mutationFn: deleteJobPost,
                onSuccess: () => {
                        toast.success('Job post removed successfully')
                        queryClient.invalidateQueries({ queryKey: ['job-posts'] })
                }
        })

        const jobs = data?.data ?? []
        const total = data?.total ?? 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
        const endItem = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

        const isDeleting = deleteMutation.isPending
        const showEmptyState = !isLoading && jobs.length === 0

        const closeDeleteDialog = () => setJobToDelete(null)
        const confirmDeleteJob = async () => {
                if (!jobToDelete) return
                await deleteMutation.mutateAsync(jobToDelete.id)
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-semibold text-base-content'>Your job posts</h1>
                                        <p className='text-sm text-base-content/70'>
                                                Keep track of draft and published listings, refine details, and respond to talent quickly.
                                        </p>
                                </div>
                                <button
                                        type='button'
                                        className='btn btn-primary gap-2'
                                        onClick={() => navigate(routes.me.client.jobs.create)}
                                >
                                        Post a new job
                                </button>
                        </div>

                        <div className='mt-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
                                        <label className='input input-bordered flex items-center gap-2'>
                                                <Search className='size-4 text-base-content/60' />
                                                <input
                                                        value={search}
                                                        onChange={event => {
                                                                setSearch(event.target.value)
                                                                setPage(1)
                                                        }}
                                                        placeholder='Search by job title or keywords'
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
                                                                setStatus(event.target.value)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value=''>All statuses</option>
                                                        {JOB_STATUS_OPTIONS.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Layers className='size-3' /> Visibility
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={visibility}
                                                        onChange={event => {
                                                                setVisibility(event.target.value)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value=''>All visibility</option>
                                                        {JOB_VISIBILITY_OPTIONS.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Clock className='size-3' /> Payment mode
                                                </span>
                                                <select
                                                        className='select select-bordered select-sm'
                                                        value={paymentMode}
                                                        onChange={event => {
                                                                setPaymentMode(event.target.value)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value=''>All modes</option>
                                                        {JOB_PAYMENT_MODES.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                </div>
                        </div>

                        {isLoading ? (
                                <div className='mt-8 flex items-center justify-center rounded-3xl border border-base-200 bg-base-100 px-6 py-12 text-base-content/70 shadow-sm'>
                                        <div className='flex items-center gap-3'>
                                                <Loader2 className='size-5 animate-spin text-primary' />
                                                <span>Loading your job posts...</span>
                                        </div>
                                </div>
                        ) : showEmptyState ? (
                                <div className='mt-8 rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center shadow-sm'>
                                        <p className='text-lg font-medium text-base-content'>No job posts found</p>
                                        <p className='mt-2 text-sm text-base-content/70'>Adjust your filters or create a new posting to get started.</p>
                                        <button
                                                type='button'
                                                className='btn btn-primary mt-6'
                                                onClick={() => navigate(routes.me.client.jobs.create)}
                                        >
                                                Create your first post
                                        </button>
                                </div>
                        ) : (
                                <div className='mt-8 space-y-4'>
                                        {jobs.map(job => {
                                                const statusLabel =
                                                        job.status === 'DRAFT'
                                                                ? 'Draft'
                                                                : statusMap[job.status] ?? job.status
                                                const visibilityLabel = visibilityMap[job.visibility] ?? job.visibility
                                                const paymentLabel = paymentModeMap[job.paymentMode] ?? job.paymentMode
                                                const locationLabel = locationMap[job.locationType] ?? job.locationType
                                                const durationLabel = job.duration
                                                        ? durationMap[job.duration as JobDurationCommitment] ?? 'Duration flexible'
                                                        : 'Duration flexible'
                                                return (
                                                        <div
                                                                key={job.id}
                                                                className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm transition hover:border-primary/40'
                                                        >
                                                                <div className='flex flex-col gap-4 md:flex-row md:justify-between'>
                                                                        <div>
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        <h2 className='text-lg font-semibold text-base-content'>{job.title}</h2>
                                                                                        <span className='badge badge-soft badge-sm rounded-full bg-primary/10 text-primary'>{paymentLabel}</span>
                                                                                </div>
                                                                                <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-base-content/70'>
                                                                                        <span className='badge badge-outline'>{statusLabel}</span>
                                                                                        <span className='badge badge-outline'>{visibilityLabel}</span>
                                                                                        <span className='badge badge-outline'>
                                                                                                {job.specialty?.category?.name ?? 'Uncategorized'} · {job.specialty?.name ?? 'General'}
                                                                                        </span>
                                                                                        <span className='badge badge-outline'>
                                                                                                <MapPin className='mr-1 size-3' /> {locationLabel}
                                                                                        </span>
                                                                                </div>
                                                                                <p className='mt-3 line-clamp-2 text-sm text-base-content/70'>{job.description}</p>
                                                                        </div>
                                                                        <div className='flex flex-col items-start gap-2 text-sm text-base-content/80 md:items-end'>
                                                                                <div className='font-semibold text-base-content'>{formatBudget(job)}</div>
                                                                                <div className='text-xs text-base-content/60'>Published: {formatDate(job.publishedAt ?? job.createdAt)}</div>
                                                                                <div className='text-xs text-base-content/60'>Attachments: {job.attachmentsCount}</div>
                                                                        </div>
                                                                </div>
                                                                <div className='mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4 text-sm'>
                                                                        <div className='flex flex-wrap items-center gap-3 text-base-content/70'>
                                                                                <span className='flex items-center gap-2'>
                                                                                        <Clock className='size-4 text-primary' />
                                                                                        {durationLabel}
                                                                                </span>
                                                                        </div>
                                                                        <div className='flex items-center gap-2'>
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-ghost btn-sm gap-2'
                                                                                        onClick={() => navigate(routes.me.client.jobs.detail(job.id))}
                                                                                        disabled={isDeleting}
                                                                                >
                                                                                        View details
                                                                                </button>
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-outline btn-sm gap-2'
                                                                                        onClick={() => navigate(routes.me.client.jobs.edit(job.id))}
                                                                                        disabled={isDeleting}
                                                                                >
                                                                                        <Pencil className='size-4' /> Edit
                                                                                </button>
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-ghost btn-sm gap-2 text-error'
                                                                                        onClick={() => setJobToDelete(job)}
                                                                                        disabled={isDeleting}
                                                                                >
                                                                                        <Trash2 className='size-4' /> Delete
                                                                                </button>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )
                                        })}
                                </div>
                        )}

                        <div className='mt-8 flex flex-col items-center justify-between gap-3 border-t border-base-200 pt-6 text-sm text-base-content/70 md:flex-row'>
                                <div>
                                        Showing {startItem} – {endItem} of {total} posts
                                </div>
                                <div className='flex items-center gap-2'>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm'
                                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                                disabled={page === 1}
                                        >
                                                Previous
                                        </button>
                                        <span className='rounded-full border border-base-200 px-3 py-1 text-xs font-medium text-base-content/80'>
                                                Page {page} of {totalPages}
                                        </span>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm'
                                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={page === totalPages}
                                        >
                                                Next
                                        </button>
                                </div>
                        </div>

                        {isFetching ? (
                                <div className='pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-base-200 bg-base-100 px-4 py-2 text-xs text-base-content/70 shadow-lg'>
                                        <span className='flex items-center gap-2'>
                                                <Loader2 className='size-4 animate-spin text-primary' /> Refreshing results…
                                        </span>
                                </div>
                        ) : null}

                        <ConfirmDelete
                                open={Boolean(jobToDelete)}
                                title='Delete job post'
                                name={jobToDelete?.title}
                                description={
                                        <p>
                                                This will permanently remove{' '}
                                                <span className='font-medium text-base-content'>{jobToDelete?.title}</span> from your job listings. Freelancers will no
                                                longer be able to view or apply to it.
                                        </p>
                                }
                                confirmLabel='Delete post'
                                cancelLabel='Keep post'
                                isProcessing={deleteMutation.isPending}
                                onClose={closeDeleteDialog}
                                onConfirm={confirmDeleteJob}
                        />
                </div>
        )
}
