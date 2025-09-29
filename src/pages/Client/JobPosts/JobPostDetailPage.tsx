import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
        ArrowLeft,
        BookmarkCheck,
        Check,
        Clock,
        Download,
        Eye,
        FileText,
        Globe,
        Loader2,
        MapPin,
        Paperclip,
        Sparkles,
        Users2,
        Wallet
} from 'lucide-react'
import { fetchJobPostDetail } from '~/apis/job-post.api'
import {
	JOB_DURATION_COMMITMENTS,
	JOB_EXPERIENCE_LEVELS,
	JOB_LOCATION_TYPES,
	JOB_PAYMENT_MODES,
	JOB_STATUS_OPTIONS,
	JOB_VISIBILITY_OPTIONS,
	type JobDurationCommitment,
	type JobExperienceLevel,
	type JobLocationType,
	type JobPaymentMode,
	type JobStatus,
	type JobVisibility
} from '~/constants/job'
import { languageNameFromCode, PROFICIENCY_OPTIONS } from '~/constants/language'
import { routes } from '~/config/routes'
import type { JobPostDetail } from '~/types/job-post'
import type { LanguageProficiency } from '~/types/profile'
import {
        normalizeAttachments,
        normalizeCustomTerms,
        normalizeLanguages,
        normalizePreferredLocations,
        normalizeScreeningQuestions,
        normalizeSkills
} from '~/utils/jobPost'
import { formatDateTime, formatFileSize, formatFileType } from '~/utils/format'
import InviteFreelancersTab from './components/InviteFreelancersTab'
import JobProposalsTab from './components/JobProposalsTab'

const jobDetailTabs = [
        {
                key: 'overview',
                label: 'Overview',
                description: 'Review the job summary and key requirements.',
                icon: <FileText className='size-4 text-primary' />
        },
        {
                key: 'invite',
                label: 'Invite freelancers',
                description: 'Discover matching freelancers and send invitations.',
                icon: <Sparkles className='size-4 text-secondary' />
        },
        {
                key: 'proposals',
                label: 'Review proposals',
                description: 'Track interested talent and evaluate proposals.',
                icon: <Users2 className='size-4 text-emerald-500' />
        },
        {
                key: 'saved',
                label: 'Saved',
                description: 'Manage freelancers you bookmarked for this job.',
                icon: <BookmarkCheck className='size-4 text-sky-500' />
        }
] as const

type JobDetailTabKey = (typeof jobDetailTabs)[number]['key']

const statusMap = Object.fromEntries(JOB_STATUS_OPTIONS.map(option => [option.value, option.label])) as Record<
	JobStatus,
	string
>
statusMap.DRAFT = 'Draft'

const visibilityMap = Object.fromEntries(JOB_VISIBILITY_OPTIONS.map(option => [option.value, option.label])) as Record<
	JobVisibility,
	string
>

const paymentModeMap = Object.fromEntries(JOB_PAYMENT_MODES.map(option => [option.value, option.label])) as Record<
	JobPaymentMode,
	string
>

const experienceMap = Object.fromEntries(JOB_EXPERIENCE_LEVELS.map(option => [option.value, option.label])) as Record<
	JobExperienceLevel,
	string
>

const locationMap = Object.fromEntries(JOB_LOCATION_TYPES.map(option => [option.value, option.label])) as Record<
	JobLocationType,
	string
>

const durationMap = Object.fromEntries(JOB_DURATION_COMMITMENTS.map(option => [option.value, option.label])) as Record<
	JobDurationCommitment,
	string
>

const proficiencyMap = Object.fromEntries(PROFICIENCY_OPTIONS.map(option => [option.value, option.name])) as Record<
	LanguageProficiency,
	string
>

function formatBudget(job: JobPostDetail) {
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

export default function JobPostDetailPage() {
        const navigate = useNavigate()
        const { jobId } = useParams<{ jobId: string }>()
        const [activeTab, setActiveTab] = useState<JobDetailTabKey>('overview')

        const {
                data: job,
                isLoading,
                isError
        } = useQuery<JobPostDetail>({
		queryKey: ['job-post', jobId],
		enabled: Boolean(jobId),
		queryFn: async () => {
			if (!jobId) {
				throw new Error('Missing job identifier')
			}

			return fetchJobPostDetail(jobId)
		}
	})

	const preferredLocations = useMemo(
		() => normalizePreferredLocations(job?.preferredLocations),
		[job?.preferredLocations]
	)
	const normalizedSkills = useMemo(() => normalizeSkills(job?.skills), [job?.skills])
	const requiredSkills = normalizedSkills.required
	const preferredSkills = normalizedSkills.preferred
	const screeningQuestions = useMemo(
		() => normalizeScreeningQuestions(job?.screeningQuestions),
		[job?.screeningQuestions]
	)
	const attachments = useMemo(() => normalizeAttachments(job?.attachments), [job?.attachments])
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
					<span>Loading job post details...</span>
				</div>
			</div>
		)
	}
        if (isError || !job) {
                return (
                        <div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10'>
				<div className='rounded-2xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
					Unable to load the job post. Please return to the list and try again.
				</div>
			</div>
		)
	}

	const statusLabel = statusMap[job.status] ?? job.status
	const visibilityLabel = visibilityMap[job.visibility] ?? job.visibility
	const paymentLabel = paymentModeMap[job.paymentMode] ?? job.paymentMode
	const experienceLabel = experienceMap[job.experienceLevel] ?? job.experienceLevel
	const locationLabel = locationMap[job.locationType] ?? job.locationType
        const durationLabel = job.duration
                ? durationMap[job.duration as JobDurationCommitment] ?? 'Duration flexible'
                : 'Duration flexible'
        const activeStepIndex = jobDetailTabs.findIndex(tab => tab.key === activeTab)
        const resolvedActiveIndex = activeStepIndex >= 0 ? activeStepIndex : 0

        const overviewContent = (
                <div className='space-y-6'>
                        <div className='grid gap-4 rounded-2xl bg-base-200/40 p-4 text-sm text-base-content/80 md:grid-cols-2'>
                                <div className='flex items-start gap-3'>
                                        <Wallet className='mt-1 size-4 text-primary' />
                                        <div>
                                                <div className='font-semibold text-base-content'>Payment mode</div>
                                                <div>{paymentLabel}</div>
                                        </div>
                                </div>
                                <div className='flex items-start gap-3'>
                                        <Clock className='mt-1 size-4 text-primary' />
                                        <div>
                                                <div className='font-semibold text-base-content'>Duration</div>
                                                <div>{durationLabel}</div>
                                        </div>
                                </div>
                                <div className='flex items-start gap-3'>
                                        <Sparkles className='mt-1 size-4 text-primary' />
                                        <div>
                                                <div className='font-semibold text-base-content'>Experience level</div>
                                                <div>{experienceLabel}</div>
                                        </div>
                                </div>
                                <div className='flex items-start gap-3'>
                                        <MapPin className='mt-1 size-4 text-primary' />
                                        <div>
                                                <div className='font-semibold text-base-content'>Location</div>
                                                <div>{locationLabel}</div>
                                                {preferredLocations.length > 0 ? (
                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                {preferredLocations.map(location => (
                                                                        <span
                                                                                key={location.code}
                                                                                className='badge badge-soft badge-sm rounded-full bg-primary/10 text-primary'>
                                                                                {location.label}
                                                                        </span>
                                                                ))}
                                                        </div>
                                                ) : null}
                                        </div>
                                </div>
                        </div>

                        <div className='grid gap-6 lg:grid-cols-2'>
                                <section className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <div className='flex items-center gap-2 text-base font-semibold text-base-content'>
                                                <FileText className='size-5 text-primary' /> Screening questions
                                        </div>
                                        {screeningQuestions.length === 0 ? (
                                                <p className='mt-3 text-sm text-base-content/70'>No screening questions added.</p>
                                        ) : (
                                                <ol className='mt-4 space-y-3 text-sm text-base-content/80'>
                                                        {screeningQuestions.map((question, index) => (
                                                                <li key={`${question.question}-${index}`} className='rounded-xl bg-base-200/60 p-3'>
                                                                        <div className='font-medium text-base-content'>Question {index + 1}</div>
                                                                        <p className='mt-1 text-base-content/70'>{question.question}</p>
                                                                        <div className='mt-2 text-xs uppercase tracking-wide text-base-content/60'>
                                                                                {question.isRequired ? 'Required' : 'Optional'}
                                                                        </div>
                                                                </li>
                                                        ))}
                                                </ol>
                                        )}
                                </section>

                                <section className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <div className='flex items-center gap-2 text-base font-semibold text-base-content'>
                                                <Sparkles className='size-5 text-primary' /> Skills
                                        </div>
                                        <div className='mt-4 text-sm text-base-content/70'>
                                                <div className='font-semibold text-base-content'>Must-have skills</div>
                                                {requiredSkills.length === 0 ? (
                                                        <p className='mt-1'>No required skills listed.</p>
                                                ) : (
                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                {requiredSkills.map(skill => (
                                                                        <span key={skill} className='badge badge-outline'>
                                                                                {skill}
                                                                        </span>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                        <div className='mt-4 text-sm text-base-content/70'>
                                                <div className='font-semibold text-base-content'>Nice-to-have skills</div>
                                                {preferredSkills.length === 0 ? (
                                                        <p className='mt-1'>No preferred skills listed.</p>
                                                ) : (
                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                {preferredSkills.map(skill => (
                                                                        <span key={skill} className='badge badge-outline badge-soft'>
                                                                                {skill}
                                                                        </span>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </section>
                        </div>

                        <div className='grid gap-6 lg:grid-cols-2'>
                                <section className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <div className='flex items-center gap-2 text-base font-semibold text-base-content'>
                                                <Globe className='size-5 text-primary' /> Languages
                                        </div>
                                        {languages.length === 0 ? (
                                                <p className='mt-3 text-sm text-base-content/70'>No language requirements specified.</p>
                                        ) : (
                                                <ul className='mt-3 space-y-3 text-sm text-base-content/80'>
                                                        {languages.map(language => {
                                                                const proficiencyLabel = proficiencyMap[language.proficiency] ?? language.proficiency
                                                                const code = language.languageCode?.toLowerCase()
                                                                const displayName = code ? languageNameFromCode(code) : language.languageCode
                                                                if (!displayName) return null
                                                                return (
                                                                        <li
                                                                                key={`${language.languageCode}-${language.proficiency}`}
                                                                                className='flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2'>
                                                                                <span>{displayName}</span>
                                                                                <span className='text-xs uppercase tracking-wide text-base-content/60'>{proficiencyLabel}</span>
                                                                        </li>
                                                                )
                                                        })}
                                                </ul>
                                        )}
                                </section>

                                <section className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <div className='flex items-center gap-2 text-base font-semibold text-base-content'>
                                                <Paperclip className='size-5 text-primary' /> Attachments
                                        </div>
                                        {attachments.length === 0 ? (
                                                <p className='mt-3 text-sm text-base-content/70'>No attachments were uploaded.</p>
                                        ) : (
                                                <ul className='mt-4 space-y-3'>
                                                        {attachments.map(attachment => {
                                                                const sizeLabel = formatFileSize(attachment.size)
                                                                const typeLabel = formatFileType({
                                                                        mimeType: attachment.mimeType,
                                                                        extension: attachment.extension
                                                                })
                                                                const uploadedLabel = attachment.createdAt
                                                                        ? formatDateTime(attachment.createdAt, {
                                                                                  dateStyle: 'medium',
                                                                                  timeStyle: 'short'
                                                                          })
                                                                        : undefined
                                                                const metadata = [
                                                                        sizeLabel,
                                                                        typeLabel,
                                                                        uploadedLabel ? `Uploaded ${uploadedLabel}` : undefined
                                                                ].filter((value): value is string => Boolean(value))

                                                                return (
                                                                        <li
                                                                                key={attachment.id}
                                                                                className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'
                                                                        >
                                                                                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                                                                                        <div className='flex min-w-0 items-start gap-3'>
                                                                                                <div className='flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                                                                                                        {attachment.extension ?? 'FILE'}
                                                                                                </div>
                                                                                                <div className='min-w-0'>
                                                                                                        <p className='truncate text-sm font-medium text-base-content'>
                                                                                                                {attachment.label}
                                                                                                        </p>
                                                                                                        {metadata.length > 0 ? (
                                                                                                                <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60'>
                                                                                                                        {metadata.map((value, metaIndex) => (
                                                                                                                                <span key={`${attachment.id}-meta-${metaIndex}`}>{value}</span>
                                                                                                                        ))}
                                                                                                                </div>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                        {attachment.url ? (
                                                                                                <div className='flex flex-wrap items-center gap-2 text-xs md:flex-shrink-0'>
                                                                                                        <a
                                                                                                                href={attachment.url}
                                                                                                                target='_blank'
                                                                                                                rel='noopener noreferrer'
                                                                                                                className='btn btn-ghost btn-sm gap-2'
                                                                                                        >
                                                                                                                <Eye className='size-4' /> Preview
                                                                                                        </a>
                                                                                                        <a
                                                                                                                href={attachment.url}
                                                                                                                download={attachment.fileName ?? attachment.label}
                                                                                                                className='btn btn-primary btn-sm gap-2'
                                                                                                        >
                                                                                                                <Download className='size-4' /> Download
                                                                                                        </a>
                                                                                                </div>
                                                                                        ) : (
                                                                                                <span className='text-xs text-base-content/50'>No link available</span>
                                                                                        )}
                                                                                </div>
                                                                        </li>
                                                                )
                                                        })}
                                                </ul>
                                        )}
                                </section>
                        </div>

                        {customTermEntries.length > 0 ? (
                                <section className='rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                                        <div className='flex items-center gap-2 text-base font-semibold text-base-content'>
                                                <FileText className='size-5 text-primary' /> Custom terms
                                        </div>
                                        <div className='mt-3 space-y-3 text-sm text-base-content/70'>
                                                {customTermEntries.map(([key, value]) => (
                                                        <div key={key}>
                                                                <div className='text-xs uppercase tracking-wide text-base-content/60'>{key}</div>
                                                                <div className='mt-1 rounded-xl bg-base-200/60 px-3 py-2 text-base-content/80'>{value}</div>
                                                        </div>
                                                ))}
                                        </div>
                                </section>
                        ) : null}
                </div>
        )

        const renderTabContent = () => {
                switch (activeTab) {
                        case 'overview':
                                return overviewContent
                        case 'invite':
                                return <InviteFreelancersTab job={job} isActive={activeTab === 'invite'} />
                        case 'proposals':
                                return <JobProposalsTab job={job} isActive={activeTab === 'proposals'} />
                        case 'saved':
                                return (
                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70 shadow-sm'>
                                                <p className='text-lg font-medium text-base-content'>No saved freelancers yet</p>
                                                <p className='mt-2'>Mark freelancers while browsing to keep them handy for quick invites from this job post.</p>
                                        </div>
                                )
                        default:
                                return null
                }
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <button type='button' className='btn btn-ghost btn-sm gap-2' onClick={() => navigate(routes.me.client.jobs.list)}>
                                <ArrowLeft className='size-4' /> Back to listings
                        </button>

                        <div className='mt-4 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)] md:items-start md:gap-8'>
                                        <div className='space-y-4'>
                                                <h1 className='text-2xl font-semibold text-base-content'>{job.title}</h1>
                                                <div className='flex flex-wrap items-center gap-2 text-xs text-base-content/70'>
                                                        <span className='badge badge-outline'>{statusLabel}</span>
                                                        <span className='badge badge-outline'>{visibilityLabel}</span>
                                                        <span className='badge badge-outline'>{paymentLabel}</span>
                                                        <span className='badge badge-outline'>
                                                                {job.specialty?.category?.name ?? 'Uncategorized'} · {job.specialty?.name ?? 'General'}
                                                        </span>
                                                </div>
                                                <p className='text-sm leading-relaxed text-base-content/70'>{job.description}</p>
                                        </div>
                                        <div className='flex flex-col gap-4 rounded-2xl border border-base-200 bg-base-200/50 p-4 text-sm text-base-content/80'>
                                                <div className='space-y-1'>
                                                        <div className='text-xs uppercase tracking-wide text-base-content/60'>Budget</div>
                                                        <div className='text-base font-semibold text-base-content'>{formatBudget(job)}</div>
                                                </div>
                                                <div className='space-y-1'>
                                                        <div className='text-xs uppercase tracking-wide text-base-content/60'>Published</div>
                                                        <div className='text-sm text-base-content/70'>{formatDate(job.publishedAt ?? job.createdAt)}</div>
                                                </div>
                                                <div className='flex flex-wrap gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-outline btn-sm gap-2'
                                                                onClick={() => navigate(routes.me.client.jobs.edit(job.id))}
                                                        >
                                                                Edit job
                                                        </button>
                                                        <Link to={routes.client.freelancers.list} className='btn btn-ghost btn-sm'>
                                                                Browse talent
                                                        </Link>
                                                </div>
                                        </div>
                                </div>

                                <div className='mt-8 rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                        <div className='grid gap-3 md:grid-cols-2'>
                                                {jobDetailTabs.map((tab, index) => {
                                                        const isSelected = activeTab === tab.key
                                                        const status =
                                                                index === resolvedActiveIndex
                                                                        ? 'current'
                                                                        : index < resolvedActiveIndex
                                                                                ? 'done'
                                                                                : 'upcoming'
                                                        const containerClass =
                                                                status === 'current'
                                                                        ? 'border-primary bg-primary/10 shadow-md'
                                                                        : status === 'done'
                                                                        ? 'border-success/60 bg-success/10'
                                                                        : 'border-base-200 hover:border-primary/40'
                                                        const indicatorClass =
                                                                status === 'done'
                                                                        ? 'bg-success text-success-content'
                                                                        : status === 'current'
                                                                        ? 'bg-primary text-primary-content'
                                                                        : 'bg-base-200 text-base-content/70'
                                                        return (
                                                                <button
                                                                        key={tab.key}
                                                                        type='button'
                                                                        onClick={() => setActiveTab(tab.key)}
                                                                        className={`group flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition ${containerClass}`}
                                                                        aria-pressed={isSelected}
                                                                >
                                                                        <div className='flex items-center gap-3'>
                                                                                <span
                                                                                        className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold ${indicatorClass}`}
                                                                                >
                                                                                        {status === 'done' ? <Check className='size-4' /> : index + 1}
                                                                                </span>
                                                                                <div>
                                                                                        <div className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                                                                {tab.icon}
                                                                                                {tab.label}
                                                                                        </div>
                                                                                        <p className='mt-1 text-xs text-base-content/60'>{tab.description}</p>
                                                                                </div>
                                                                        </div>
                                                                </button>
                                                        )
                                                })}
                                        </div>
                                </div>

                                <div className='mt-6'>{renderTabContent()}</div>
                        </div>
                </div>
        )
}
