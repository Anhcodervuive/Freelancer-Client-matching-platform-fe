import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, FileText, Globe, Loader2, MapPin, Paperclip, Sparkles, Wallet } from 'lucide-react'
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

function parsePreferredLocations(preferred?: JobPostDetail['preferredLocations']) {
	if (!Array.isArray(preferred)) return []
	return preferred
		.map(entry => {
			if (typeof entry === 'string') {
				return { code: entry, label: entry }
			}
			if (entry && typeof entry === 'object') {
				const code = 'code' in entry ? String(entry.code) : ''
				const label = 'label' in entry ? String(entry.label) : ''
				if (code || label) {
					return { code: code || label, label: label || code }
				}
			}
			return null
		})
		.filter((item): item is { code: string; label: string } => Boolean(item))
}

export default function JobPostDetailPage() {
	const navigate = useNavigate()
	const { jobId } = useParams<{ jobId: string }>()

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

	const preferredLocations = useMemo(() => parsePreferredLocations(job?.preferredLocations), [job?.preferredLocations])
	const requiredSkills = job?.skills?.required ?? []
	const preferredSkills = job?.skills?.preferred ?? []
	const screeningQuestions = job?.screeningQuestions ?? []
	const attachments = job?.attachments ?? []
	const languages = job?.languages ?? []

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

	return (
		<div className='mx-auto w-full max-w-5xl px-4 py-8 lg:px-0'>
			<button type='button' className='btn btn-ghost btn-sm gap-2' onClick={() => navigate(routes.me.client.jobs.list)}>
				<ArrowLeft className='size-4' /> Back to listings
			</button>

			<div className='mt-4 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
				<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
					<div>
						<h1 className='text-2xl font-semibold text-base-content'>{job.title}</h1>
						<div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-base-content/70'>
							<span className='badge badge-outline'>{statusLabel}</span>
							<span className='badge badge-outline'>{visibilityLabel}</span>
							<span className='badge badge-outline'>{paymentLabel}</span>
							<span className='badge badge-outline'>
								{job.specialty?.category?.name ?? 'Uncategorized'} · {job.specialty?.name ?? 'General'}
							</span>
						</div>
						<p className='mt-4 text-sm leading-relaxed text-base-content/70'>{job.description}</p>
					</div>
					<div className='flex flex-col items-start gap-3 text-sm text-base-content/80 md:items-end'>
						<div>
							<div className='text-xs uppercase tracking-wide text-base-content/60'>Budget</div>
							<div className='text-base font-semibold text-base-content'>{formatBudget(job)}</div>
						</div>
						<div>
							<div className='text-xs uppercase tracking-wide text-base-content/60'>Published</div>
							<div className='text-sm text-base-content/70'>{formatDate(job.publishedAt ?? job.createdAt)}</div>
						</div>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								className='btn btn-outline btn-sm gap-2'
								onClick={() => navigate(routes.me.client.jobs.edit(job.id))}>
								Edit job
							</button>
						</div>
					</div>
				</div>

				<div className='mt-6 grid gap-4 rounded-2xl bg-base-200/40 p-4 text-sm text-base-content/80 md:grid-cols-2'>
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

				<div className='mt-6 grid gap-6 lg:grid-cols-2'>
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

				<div className='mt-6 grid gap-6 lg:grid-cols-2'>
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
									return (
										<li
											key={`${language.languageCode}-${language.proficiency}`}
											className='flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2'>
											<span>{languageNameFromCode(language.languageCode.toLowerCase())}</span>
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
							<ul className='mt-3 space-y-3 text-sm text-base-content/80'>
								{attachments.map(attachment => (
									<li
										key={attachment.id ?? attachment.name}
										className='flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2'>
										<span className='truncate pr-3'>{attachment.name}</span>
										{attachment.url ? (
											<a
												href={attachment.url}
												target='_blank'
												rel='noopener noreferrer'
												className='link link-primary text-xs'>
												Download
											</a>
										) : (
											<span className='text-xs text-base-content/50'>No link available</span>
										)}
									</li>
								))}
							</ul>
						)}
					</section>
				</div>

				{job.customTerms ? (
					<section className='mt-6 rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
						<div className='flex items-center gap-2 text-base font-semibold text-base-content'>
							<FileText className='size-5 text-primary' /> Custom terms
						</div>
						<div className='mt-3 space-y-3 text-sm text-base-content/70'>
							{Object.entries(job.customTerms).map(([key, value]) => (
								<div key={key}>
									<div className='text-xs uppercase tracking-wide text-base-content/60'>{key}</div>
									<div className='mt-1 rounded-xl bg-base-200/60 px-3 py-2 text-base-content/80'>
										{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
									</div>
								</div>
							))}
						</div>
					</section>
				) : null}
			</div>
		</div>
	)
}
