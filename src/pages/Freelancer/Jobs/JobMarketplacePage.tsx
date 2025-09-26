import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
        Bookmark,
        BookmarkCheck,
        BriefcaseBusiness,
        Clock,
        DollarSign,
        Filter,
        Layers,
        Loader2,
        MapPin,
        Search
} from 'lucide-react'
import {
        listFreelancerJobPosts,
        saveFreelancerJobPost,
        unsaveFreelancerJobPost
} from '~/apis/job-post.api'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import {
        JOB_DURATION_COMMITMENTS,
        JOB_EXPERIENCE_LEVELS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        type JobDurationCommitment,
        type JobExperienceLevel,
        type JobLocationType,
        type JobPaymentMode
} from '~/constants/job'
import type { JobPostDetail, JobPostListItem, PaginatedJobPostResponse } from '~/types/job-post'

const PAGE_SIZE = 6
const SEARCH_DEBOUNCE = 400
const FILTER_DEBOUNCE = 300

const experienceMap = Object.fromEntries(
        JOB_EXPERIENCE_LEVELS.map(option => [option.value, option.label])
) as Record<JobExperienceLevel, string>
const locationMap = Object.fromEntries(
        JOB_LOCATION_TYPES.map(option => [option.value, option.label])
) as Record<JobLocationType, string>
const paymentModeMap = Object.fromEntries(
        JOB_PAYMENT_MODES.map(option => [option.value, option.label])
) as Record<JobPaymentMode, string>
const durationMap = Object.fromEntries(
        JOB_DURATION_COMMITMENTS.map(option => [option.value, option.label])
) as Record<JobDurationCommitment, string>

const formatBudget = (job: JobPostListItem) => {
        if (job.budgetAmount == null || !job.budgetCurrency) return 'Budget TBD'
        return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: job.budgetCurrency,
                maximumFractionDigits: 0
        }).format(job.budgetAmount)
}

const formatDate = (value?: string | null) => {
        if (!value) return 'Recently posted'
        try {
                return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
        } catch {
                return 'Recently posted'
        }
}

const toggleFilterValue = (values: string[], value: string): string[] => {
        if (values.includes(value)) {
                return values.filter(item => item !== value)
        }
        return [...values, value]
}

export default function JobMarketplacePage() {
        const [page, setPage] = useState(1)
        const [search, setSearch] = useState('')
        const [experienceLevels, setExperienceLevels] = useState<string[]>([])
        const [paymentModes, setPaymentModes] = useState<string[]>([])
        const [locationTypes, setLocationTypes] = useState<string[]>([])
        const [budgetMin, setBudgetMin] = useState('')
        const [budgetMax, setBudgetMax] = useState('')
        const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
        const [savedOnly, setSavedOnly] = useState(false)

        const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE)
        const debouncedExperienceLevels = useDebounce(experienceLevels, FILTER_DEBOUNCE)
        const debouncedPaymentModes = useDebounce(paymentModes, FILTER_DEBOUNCE)
        const debouncedLocationTypes = useDebounce(locationTypes, FILTER_DEBOUNCE)
        const debouncedBudgetMin = useDebounce(budgetMin, FILTER_DEBOUNCE)
        const debouncedBudgetMax = useDebounce(budgetMax, FILTER_DEBOUNCE)
        const debouncedSavedOnly = useDebounce(savedOnly, FILTER_DEBOUNCE)

        const queryClient = useQueryClient()

        const budgetMinNumber = useMemo(() => {
                if (!debouncedBudgetMin.trim()) return undefined
                const parsed = Number(debouncedBudgetMin)
                return Number.isFinite(parsed) ? parsed : undefined
        }, [debouncedBudgetMin])

        const budgetMaxNumber = useMemo(() => {
                if (!debouncedBudgetMax.trim()) return undefined
                const parsed = Number(debouncedBudgetMax)
                return Number.isFinite(parsed) ? parsed : undefined
        }, [debouncedBudgetMax])

        const filters = useMemo(
                () => ({
                        page,
                        limit: PAGE_SIZE,
                        search: debouncedSearch || undefined,
                        experienceLevels: debouncedExperienceLevels.length
                                ? (debouncedExperienceLevels as JobExperienceLevel[])
                                : undefined,
                        paymentModes: debouncedPaymentModes.length
                                ? (debouncedPaymentModes as JobPaymentMode[])
                                : undefined,
                        locationTypes: debouncedLocationTypes.length
                                ? (debouncedLocationTypes as JobLocationType[])
                                : undefined,
                        budgetMin: budgetMinNumber,
                        budgetMax: budgetMaxNumber,
                        sortBy,
                        savedOnly: debouncedSavedOnly ? true : undefined
                }),
                [
                        page,
                        debouncedSearch,
                        debouncedExperienceLevels,
                        debouncedPaymentModes,
                        debouncedLocationTypes,
                        budgetMinNumber,
                        budgetMaxNumber,
                        sortBy,
                        debouncedSavedOnly
                ]
        )

        const queryKey = useMemo(() => ['freelancer-job-posts', filters], [filters])

        const { data, isLoading, isFetching, isError, error } = useQuery<PaginatedJobPostResponse>({
                queryKey,
                queryFn: () => listFreelancerJobPosts(filters)
        })

        const toggleSaveMutation = useMutation({
                mutationFn: async ({ id, isSaved }: { id: string; isSaved?: boolean }) => {
                        if (isSaved) {
                                await unsaveFreelancerJobPost(id)
                                return { id, isSaved: false }
                        }

                        await saveFreelancerJobPost(id)
                        return { id, isSaved: true }
                },
                onSuccess: async ({ id, isSaved }) => {
                        queryClient.setQueriesData<PaginatedJobPostResponse>(
                                { queryKey: ['freelancer-job-posts'] },
                                previous => {
                                        if (!previous) return previous
                                        const updatedData = previous.data.map(job =>
                                                job.id === id ? { ...job, isSaved } : job
                                        )

                                        return { ...previous, data: updatedData }
                                }
                        )

                        queryClient.setQueryData<JobPostDetail>(['freelancer-job-post', id], previous => {
                                if (!previous) return previous
                                return { ...previous, isSaved }
                        })

                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-posts'] })
                }
        })

        const jobs = data?.data ?? []
        const total = data?.total ?? 0
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
        const endItem = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

        const resetFilters = () => {
                setExperienceLevels([])
                setPaymentModes([])
                setLocationTypes([])
                setBudgetMin('')
                setBudgetMax('')
                setSortBy('newest')
                setSavedOnly(false)
                setPage(1)
        }

        const renderJobCard = (job: JobPostListItem) => {
                const experienceLabel = experienceMap[job.experienceLevel as JobExperienceLevel] ?? job.experienceLevel
                const locationLabel = locationMap[job.locationType as JobLocationType] ?? job.locationType
                const paymentLabel = paymentModeMap[job.paymentMode as JobPaymentMode] ?? job.paymentMode
                const durationLabel = job.duration
                        ? durationMap[job.duration as JobDurationCommitment] ?? 'Duration flexible'
                        : 'Duration flexible'

                const isMutating =
                        toggleSaveMutation.isPending && toggleSaveMutation.variables?.id === job.id
                const Icon = isMutating ? Loader2 : job.isSaved ? BookmarkCheck : Bookmark

                return (
                        <article
                                key={job.id}
                                className='group rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md'
                        >
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                                <Link
                                                        to={routes.freelancer.jobs.detail(job.id)}
                                                        className='text-lg font-semibold text-base-content transition group-hover:text-primary'
                                                >
                                                        {job.title}
                                                </Link>
                                                <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-base-content/70'>
                                                        <span className='badge badge-outline'>
                                                                {job.specialty?.category?.name ?? 'General'} · {job.specialty?.name ?? 'General'}
                                                        </span>
                                                        <span className='badge badge-outline'>{formatDate(job.publishedAt ?? job.createdAt)}</span>
                                                </div>
                                        </div>
                                        <div className='flex flex-col items-end gap-3 text-right sm:flex-row sm:items-center sm:gap-4'>
                                                <div>
                                                        <div className='text-sm text-base-content/70'>Budget</div>
                                                        <div className='text-base font-semibold text-base-content'>
                                                                {formatBudget(job)}
                                                        </div>
                                                </div>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost btn-sm gap-2 text-sm'
                                                        onClick={() =>
                                                                toggleSaveMutation.mutate({
                                                                        id: job.id,
                                                                        isSaved: job.isSaved
                                                                })
                                                        }
                                                        disabled={isMutating}
                                                >
                                                        <Icon className={`size-4 ${isMutating ? 'animate-spin' : ''}`} />
                                                        {job.isSaved ? 'Saved' : 'Save job'}
                                                </button>
                                        </div>
                                </div>

                                <p
                                        className='mt-3 text-sm leading-relaxed text-base-content/80'
                                        style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                        }}
                                >
                                        {job.description}
                                </p>

                                <dl className='mt-4 grid gap-3 text-xs text-base-content/70 sm:grid-cols-2 lg:grid-cols-4'>
                                        <div className='flex items-center gap-2'>
                                                <BriefcaseBusiness className='size-4 text-primary/80' />
                                                <div>
                                                        <dt className='uppercase tracking-wide'>Experience</dt>
                                                        <dd className='text-sm text-base-content'>{experienceLabel}</dd>
                                                </div>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <DollarSign className='size-4 text-primary/80' />
                                                <div>
                                                        <dt className='uppercase tracking-wide'>Payment</dt>
                                                        <dd className='text-sm text-base-content'>{paymentLabel}</dd>
                                                </div>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <MapPin className='size-4 text-primary/80' />
                                                <div>
                                                        <dt className='uppercase tracking-wide'>Location</dt>
                                                        <dd className='text-sm text-base-content'>{locationLabel}</dd>
                                                </div>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <Clock className='size-4 text-primary/80' />
                                                <div>
                                                        <dt className='uppercase tracking-wide'>Duration</dt>
                                                        <dd className='text-sm text-base-content'>{durationLabel}</dd>
                                                </div>
                                        </div>
                                </dl>

                                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-sm'>
                                        <div className='text-base-content/70'>
                                                {job.attachmentsCount > 0 ? `${job.attachmentsCount} attachment(s)` : 'No attachments'}
                                        </div>
                                        <Link to={routes.freelancer.jobs.detail(job.id)} className='text-primary hover:underline'>
                                                View job details →
                                        </Link>
                                </div>
                        </article>
                )
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-2 pb-6'>
                                <p className='text-sm font-semibold uppercase tracking-wide text-primary/80'>Find work</p>
                                <h1 className='text-3xl font-semibold text-base-content'>Explore jobs tailored to your expertise</h1>
                                <p className='max-w-2xl text-sm text-base-content/70'>
                                        Browse curated opportunities and use filters to surface the projects that match your skills and
                                        interests.
                                </p>
                        </div>

                        <div className='grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
                                <aside className='space-y-6'>
                                        <div className='rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                                <div className='flex items-center justify-between'>
                                                        <h2 className='text-sm font-semibold text-base-content'>Filters</h2>
                                                        <button
                                                                type='button'
                                                                className='text-xs font-medium text-primary hover:underline'
                                                                onClick={resetFilters}
                                                        >
                                                                Reset
                                                        </button>
                                                </div>
                                                <div className='mt-4 space-y-5 text-sm text-base-content/80'>
                    <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                    <Filter className='size-3' /> Experience level
                            </div>
                            <div className='space-y-2'>
                                    {JOB_EXPERIENCE_LEVELS.map(option => (
                                            <label
                                                    key={option.value}
                                                    className='flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 hover:border-base-200'
                                            >
                                                    <input
                                                            type='checkbox'
                                                            className='checkbox checkbox-sm'
                                                            checked={experienceLevels.includes(option.value)}
                                                            onChange={() => {
                                                                    setExperienceLevels(prev => {
                                                                            const next = toggleFilterValue(prev, option.value)
                                                                            setPage(1)
                                                                            return next
                                                                    })
                                                            }}
                                                    />
                                                    <span>{option.label}</span>
                                            </label>
                                    ))}
                            </div>
                    </div>

                    <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                    <Layers className='size-3' /> Payment mode
                            </div>
                            <div className='space-y-2'>
                                    {JOB_PAYMENT_MODES.map(option => (
                                            <label
                                                    key={option.value}
                                                    className='flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 hover:border-base-200'
                                            >
                                                    <input
                                                            type='checkbox'
                                                            className='checkbox checkbox-sm'
                                                            checked={paymentModes.includes(option.value)}
                                                            onChange={() => {
                                                                    setPaymentModes(prev => {
                                                                            const next = toggleFilterValue(prev, option.value)
                                                                            setPage(1)
                                                                            return next
                                                                    })
                                                            }}
                                                    />
                                                    <span>{option.label}</span>
                                            </label>
                                    ))}
                            </div>
                    </div>

                    <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                    <MapPin className='size-3' /> Location type
                            </div>
                            <div className='space-y-2'>
                                    {JOB_LOCATION_TYPES.map(option => (
                                            <label
                                                    key={option.value}
                                                    className='flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 hover:border-base-200'
                                            >
                                                    <input
                                                            type='checkbox'
                                                            className='checkbox checkbox-sm'
                                                            checked={locationTypes.includes(option.value)}
                                                            onChange={() => {
                                                                    setLocationTypes(prev => {
                                                                            const next = toggleFilterValue(prev, option.value)
                                                                            setPage(1)
                                                                            return next
                                                                    })
                                                            }}
                                                    />
                                                    <span>{option.label}</span>
                                            </label>
                                    ))}
                            </div>
                    </div>

                    <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                    <DollarSign className='size-3' /> Budget range (USD)
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                    <label className='flex flex-col gap-1 text-xs text-base-content/60'>
                                            <span>Min</span>
                                            <input
                                                    type='number'
                                                    inputMode='numeric'
                                                    className='input input-bordered input-sm'
                                                    value={budgetMin}
                                                    onChange={event => {
                                                            setBudgetMin(event.target.value)
                                                            setPage(1)
                                                    }}
                                            />
                                    </label>
                                    <label className='flex flex-col gap-1 text-xs text-base-content/60'>
                                            <span>Max</span>
                                            <input
                                                    type='number'
                                                    inputMode='numeric'
                                                    className='input input-bordered input-sm'
                                                    value={budgetMax}
                                                    onChange={event => {
                                                            setBudgetMax(event.target.value)
                                                            setPage(1)
                                                    }}
                                            />
                                    </label>
                            </div>
                    </div>

                    <div>
                            <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                    <Bookmark className='size-3' /> Saved jobs
                            </div>
                            <label className='flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2 hover:border-base-200'>
                                    <span className='text-sm text-base-content/80'>Show saved jobs only</span>
                                    <input
                                            type='checkbox'
                                            className='toggle toggle-sm'
                                            checked={savedOnly}
                                            onChange={event => {
                                                    setSavedOnly(event.target.checked)
                                                    setPage(1)
                                            }}
                                    />
                            </label>
                    </div>
            </div>
                    </div>
                                </aside>

                                <main className='space-y-6'>
                                        <div className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                                        <label className='input input-bordered flex items-center gap-2 md:max-w-md'>
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
                                                        <label className='flex items-center gap-2 text-sm text-base-content'>
                                                                <span className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Sort</span>
                                                                <select
                                                                        className='select select-bordered select-sm'
                                                                        value={sortBy}
                                                                        onChange={event => {
                                                                                setSortBy(event.target.value as 'newest' | 'oldest')
                                                                                setPage(1)
                                                                        }}
                                                                >
                                                                        <option value='newest'>Newest first</option>
                                                                        <option value='oldest'>Oldest first</option>
                                                                </select>
                                                        </label>
                                                </div>
                                                <div className='mt-3 text-xs text-base-content/70'>
                                                        Showing {startItem}-{endItem} of {total} jobs
                                                        {isFetching && (
                                                                <span className='ml-2 inline-flex items-center gap-1 text-primary'>
                                                                        <Loader2 className='size-3 animate-spin' /> Updating
                                                                </span>
                                                        )}
                                                </div>
                                        </div>

                                        {isLoading && (
                                                <div className='flex min-h-[200px] items-center justify-center rounded-3xl border border-base-200 bg-base-100 p-10 text-base-content/70 shadow-sm'>
                                                        <div className='flex items-center gap-3'>
                                                                <Loader2 className='size-5 animate-spin text-primary' />
                                                                <span>Loading job opportunities…</span>
                                                        </div>
                                                </div>
                                        )}

                                        {isError && !isLoading && (
                                                <div className='rounded-3xl border border-error/40 bg-error/10 p-6 text-sm text-error shadow-sm'>
                                                        Unable to load job posts. {(error as Error)?.message || 'Please try again later.'}
                                                </div>
                                        )}

                                        {!isLoading && !isError && jobs.length === 0 && (
                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-10 text-center text-sm text-base-content/70 shadow-sm'>
                                                        No jobs found with the current filters. Try adjusting your search or filters to discover more opportunities.
                                                </div>
                                        )}

                                        <div className='grid gap-5'>
                                                {jobs.map(job => renderJobCard(job))}
                                        </div>

                                        {totalPages > 1 && (
                                                <div className='flex items-center justify-between gap-4 rounded-3xl border border-base-200 bg-base-100 p-4 text-sm text-base-content shadow-sm'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page === 1}
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                        >
                                                                Previous
                                                        </button>
                                                        <div>
                                                                Page {page} of {totalPages}
                                                        </div>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page === totalPages}
                                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                        >
                                                                Next
                                                        </button>
                                                </div>
                                        )}
                                </main>
                        </div>
                </div>
        )
}
