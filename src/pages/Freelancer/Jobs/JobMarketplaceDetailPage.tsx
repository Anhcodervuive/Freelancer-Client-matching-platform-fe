import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import {
        ArrowLeft,
        Bookmark,
        BookmarkCheck,
        BriefcaseBusiness,
        Clock,
        DollarSign,
        Globe,
        Loader2,
        MapPin,
        Sparkles,
        Wallet
} from 'lucide-react'
import {
        fetchFreelancerJobPostDetail,
        saveFreelancerJobPost,
        unsaveFreelancerJobPost
} from '~/apis/job-post.api'
import { routes } from '~/config/routes'
import {
        JOB_DURATION_COMMITMENTS,
        JOB_EXPERIENCE_LEVELS,
        JOB_LOCATION_TYPES,
        JOB_PAYMENT_MODES,
        JOB_VISIBILITY_OPTIONS,
        type JobDurationCommitment,
        type JobExperienceLevel,
        type JobLocationType,
        type JobPaymentMode,
        type JobVisibility
} from '~/constants/job'
import { languageNameFromCode, PROFICIENCY_OPTIONS } from '~/constants/language'
import type { JobPostDetail, PaginatedJobPostResponse } from '~/types/job-post'
import type { LanguageProficiency } from '~/types/profile'
import {
        normalizeCustomTerms,
        normalizeLanguages,
        normalizePreferredLocations,
        normalizeScreeningQuestions,
        normalizeSkills
} from '~/utils/jobPost'

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
const visibilityMap = Object.fromEntries(
        JOB_VISIBILITY_OPTIONS.map(option => [option.value, option.label])
) as Record<JobVisibility, string>
const proficiencyMap = Object.fromEntries(
        PROFICIENCY_OPTIONS.map(option => [option.value, option.name])
) as Record<LanguageProficiency, string>

const formatBudget = (job: JobPostDetail) => {
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

export default function JobMarketplaceDetailPage() {
        const { jobId } = useParams<{ jobId: string }>()

        const queryClient = useQueryClient()

        const {
                data: job,
                isLoading,
                isError,
                error
        } = useQuery<JobPostDetail>({
                queryKey: ['freelancer-job-post', jobId],
                enabled: Boolean(jobId),
                queryFn: async () => {
                        if (!jobId) {
                                throw new Error('Missing job identifier')
                        }
                        return fetchFreelancerJobPostDetail(jobId)
                }
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
                        queryClient.setQueryData<JobPostDetail>(['freelancer-job-post', id], previous => {
                                if (!previous) return previous
                                return { ...previous, isSaved }
                        })

                        queryClient.setQueriesData<PaginatedJobPostResponse>({ queryKey: ['freelancer-job-posts'] }, previous => {
                                if (!previous) return previous
                                return {
                                        ...previous,
                                        data: previous.data.map(item => (item.id === id ? { ...item, isSaved } : item))
                                }
                        })

                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-posts'] })
                }
        })

        const sanitizedDescription = useMemo(() => {
                if (!job?.description) return '<p class="text-base-content/70">No description provided.</p>'
                return DOMPurify.sanitize(job.description, { USE_PROFILES: { html: true } })
        }, [job?.description])

        const preferredLocations = useMemo(
                () => normalizePreferredLocations(job?.preferredLocations),
                [job?.preferredLocations]
        )
        const normalizedSkills = useMemo(() => normalizeSkills(job?.skills), [job?.skills])
        const screeningQuestions = useMemo(
                () => normalizeScreeningQuestions(job?.screeningQuestions),
                [job?.screeningQuestions]
        )
        const languages = useMemo(() => normalizeLanguages(job?.languages), [job?.languages])
        const customTerms = useMemo(() => normalizeCustomTerms(job?.customTerms), [job?.customTerms])
        const customTermEntries = useMemo(() => Object.entries(customTerms), [customTerms])

        if (!jobId) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10'>
                                <div className='rounded-2xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Job identifier is missing. Please return to the listings page.
                                </div>
                        </div>
                )
        }

        if (isLoading) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10 text-base-content/70'>
                                <div className='flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm'>
                                        <Loader2 className='size-5 animate-spin text-primary' />
                                        <span>Loading job details…</span>
                                </div>
                        </div>
                )
        }

        if (isError || !job) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10'>
                                <div className='rounded-2xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
                                        Unable to load the job post. {(error as Error)?.message || 'Please try again later.'}
                                </div>
                        </div>
                )
        }

        const experienceLabel = experienceMap[job.experienceLevel as JobExperienceLevel] ?? job.experienceLevel
        const locationLabel = locationMap[job.locationType as JobLocationType] ?? job.locationType
        const paymentLabel = paymentModeMap[job.paymentMode as JobPaymentMode] ?? job.paymentMode
        const durationLabel = job.duration
                ? durationMap[job.duration as JobDurationCommitment] ?? 'Duration flexible'
                : 'Duration flexible'
        const visibilityLabel = visibilityMap[job.visibility as JobVisibility] ?? job.visibility

        const isTogglingSave = toggleSaveMutation.isPending && toggleSaveMutation.variables?.id === job.id
        const SaveIcon = isTogglingSave ? Loader2 : job.isSaved ? BookmarkCheck : Bookmark

        return (
                <div className='mx-auto w-full max-w-5xl px-4 py-8 lg:px-0'>
                        <div className='flex items-center gap-3 text-sm text-base-content/70'>
                                <ArrowLeft className='size-4' />
                                <Link to={routes.freelancer.jobs.list} className='link link-hover text-primary'>
                                        Back to job listings
                                </Link>
                        </div>

                        <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
                                <article className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                        <header className='border-b border-base-200 pb-5'>
                                                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-wide text-primary/80'>
                                                                        {job.specialty?.category?.name ?? 'General'} · {job.specialty?.name ?? 'General'}
                                                                </p>
                                                                <h1 className='mt-2 text-3xl font-semibold text-base-content'>{job.title}</h1>
                                                                <div className='mt-3 flex flex-wrap items-center gap-3 text-xs text-base-content/70'>
                                                                        <span>Posted {formatDate(job.publishedAt ?? job.createdAt)}</span>
                                                                        <span>Attachments: {job.attachmentsCount ?? 0}</span>
                                                                </div>
                                                        </div>
                                                        <button
                                                                type='button'
                                                                className='btn btn-outline btn-sm gap-2 self-start'
                                                                onClick={() =>
                                                                        toggleSaveMutation.mutate({
                                                                                id: job.id,
                                                                                isSaved: job.isSaved
                                                                        })
                                                                }
                                                                disabled={isTogglingSave}
                                                        >
                                                                <SaveIcon className={`size-4 ${isTogglingSave ? 'animate-spin' : ''}`} />
                                                                {job.isSaved ? 'Saved job' : 'Save job'}
                                                        </button>
                                                </div>
                                        </header>

                                        <section className='prose mt-6 max-w-none text-base text-base-content prose-headings:mb-3 prose-headings:mt-6'>
                                                <h2 className='text-xl font-semibold'>Job description</h2>
                                                <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }} />
                                        </section>

                                        {(normalizedSkills.required.length > 0 || normalizedSkills.preferred.length > 0) && (
                                                <section className='mt-8'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Skills & expertise</h2>
                                                        <div className='mt-3 flex flex-wrap gap-2'>
                                                                {normalizedSkills.required.map(skill => (
                                                                        <span key={`required-${skill}`} className='badge badge-primary badge-outline'>
                                                                                {skill}
                                                                        </span>
                                                                ))}
                                                                {normalizedSkills.preferred.map(skill => (
                                                                        <span key={`preferred-${skill}`} className='badge badge-outline'>
                                                                                {skill}
                                                                        </span>
                                                                ))}
                                                        </div>
                                                </section>
                                        )}

                                        {screeningQuestions.length > 0 && (
                                                <section className='mt-8'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Screening questions</h2>
                                                        <ul className='mt-3 list-disc space-y-2 pl-6 text-sm text-base-content/80'>
                                                                {screeningQuestions.map(item => (
                                                                        <li key={item.question}>
                                                                                <span className='font-medium text-base-content'>{item.question}</span>
                                                                                {item.isRequired ? ' (Required)' : ' (Optional)'}
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                </section>
                                        )}

                                        {customTermEntries.length > 0 && (
                                                <section className='mt-8'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Additional details</h2>
                                                        <dl className='mt-3 grid gap-3 text-sm text-base-content/80 sm:grid-cols-2'>
                                                                {customTermEntries.map(([key, value]) => (
                                                                        <div key={key} className='rounded-2xl border border-base-200 bg-base-200/40 p-3'>
                                                                                <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                        {key}
                                                                                </dt>
                                                                                <dd className='mt-1 text-base-content'>{String(value)}</dd>
                                                                        </div>
                                                                ))}
                                                        </dl>
                                                </section>
                                        )}
                                </article>

                                <aside className='space-y-5'>
                                        <div className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                <h2 className='text-lg font-semibold text-base-content'>Project overview</h2>
                                                <dl className='mt-4 space-y-4 text-sm text-base-content/80'>
                                                        <div className='flex items-start gap-3'>
                                                                <DollarSign className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Budget</dt>
                                                                        <dd className='text-base font-semibold text-base-content'>{formatBudget(job)}</dd>
                                                                </div>
                                                        </div>
                                                        <div className='flex items-start gap-3'>
                                                                <Wallet className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Payment mode</dt>
                                                                        <dd className='text-base-content'>{paymentLabel}</dd>
                                                                </div>
                                                        </div>
                                                        <div className='flex items-start gap-3'>
                                                                <BriefcaseBusiness className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Experience level</dt>
                                                                        <dd className='text-base-content'>{experienceLabel}</dd>
                                                                </div>
                                                        </div>
                                                        <div className='flex items-start gap-3'>
                                                                <MapPin className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Location type</dt>
                                                                        <dd className='text-base-content'>{locationLabel}</dd>
                                                                </div>
                                                        </div>
                                                        <div className='flex items-start gap-3'>
                                                                <Clock className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Expected duration</dt>
                                                                        <dd className='text-base-content'>{durationLabel}</dd>
                                                                </div>
                                                        </div>
                                                        <div className='flex items-start gap-3'>
                                                                <Globe className='size-4 text-primary/80' />
                                                                <div>
                                                                        <dt className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Visibility</dt>
                                                                        <dd className='text-base-content'>{visibilityLabel}</dd>
                                                                </div>
                                                        </div>
                                                </dl>
                                        </div>

                                        {preferredLocations.length > 0 && (
                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Preferred locations</h2>
                                                        <ul className='mt-3 space-y-2 text-sm text-base-content/80'>
                                                                {preferredLocations.map(location => (
                                                                        <li key={`${location.code}-${location.label}`} className='flex items-center gap-2'>
                                                                                <Sparkles className='size-4 text-primary/80' />
                                                                                <span>{location.label}</span>
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                </div>
                                        )}

                                        {languages.length > 0 && (
                                                <div className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Language requirements</h2>
                                                        <ul className='mt-3 space-y-2 text-sm text-base-content/80'>
                                                                {languages.map(language => (
                                                                        <li key={`${language.languageCode}-${language.proficiency}`} className='flex items-center justify-between'>
                                                                                <span>{languageNameFromCode(language.languageCode)}</span>
                                                                                <span className='text-base-content/60'>
                                                                                        {proficiencyMap[language.proficiency] ?? language.proficiency}
                                                                                </span>
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                </div>
                                        )}
                                </aside>
                        </div>
                </div>
        )
}
