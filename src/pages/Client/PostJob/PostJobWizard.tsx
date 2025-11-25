import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronLeft, ChevronRight, FileText, Loader2, Sparkles, Wallet } from 'lucide-react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { JOB_PAYMENT_MODES } from '~/constants/job'
import { routes } from '~/config/routes'
import { createJobPost, fetchJobPostDetail, updateJobPost } from '~/apis/job-post.api'
import type { JobPostDetail } from '~/types/job-post'
import type { LanguageProficiency } from '~/types/profile'
import {
        normalizeCustomTerms,
        normalizeLanguages,
        normalizePreferredLocations,
        normalizeScreeningQuestions,
        normalizeSkillIds,
        normalizeAttachments,
        type NormalizedAttachment
} from '~/utils/jobPost'
import { jobPostFormSchema, type JobPostFormValues } from './schema'
import { AboutStep } from './components/AboutStep'
import { FreelancerRequirementsStep } from './components/FreelancerRequirementsStep'
import { BudgetStep } from './components/BudgetStep'

type JobPostRequestPayload = Parameters<typeof createJobPost>[0]['payload']

type WizardStep = {
	id: 'about' | 'requirements' | 'budget'
	title: string
	description: string
	icon: ReactNode
	validateFields: (keyof JobPostFormValues | `${keyof JobPostFormValues}.${string}`)[]
}

const wizardSteps: WizardStep[] = [
	{
		id: 'about',
		title: 'About the job',
		description: 'Share the essentials to attract the right talent.',
		icon: <FileText className='size-4' />,
		validateFields: ['title', 'description']
	},
	{
		id: 'requirements',
		title: 'Freelancer requirements',
		description: 'Specify the skills, expertise, and language expectations.',
		icon: <Sparkles className='size-4' />,
		validateFields: ['categoryId', 'specialtyId', 'experienceLevel']
	},
	{
		id: 'budget',
		title: 'Budget & visibility',
		description: 'Define payment, duration, and publishing preferences.',
		icon: <Wallet className='size-4' />,
		validateFields: ['paymentMode', 'budgetCurrency']
	}
]

const defaultValues: JobPostFormValues = {
	categoryId: '',
	specialtyId: '',
	title: '',
	description: '',
	customTerms: { deliverables: '', additionalNotes: '' },
	paymentMode: JOB_PAYMENT_MODES[0]?.value ?? 'fix_single',
	budgetAmount: undefined,
	budgetCurrency: 'USD',
	duration: 'LESS_THAN_ONE_MONTH',
	experienceLevel: 'ENTRY',
	locationType: 'REMOTE',
	preferredLocations: [],
	visibility: 'PUBLIC',
	status: 'DRAFT',
	languages: [{ languageCode: 'en', proficiency: 'CONVERSATIONAL' }],
	skills: { required: [], preferred: [] },
	screeningQuestions: [],
	attachments: []
}

function mapDetailToForm(detail: JobPostDetail): JobPostFormValues {
	const customTerms = normalizeCustomTerms(detail.customTerms)
	const deliverables = customTerms.deliverables ?? ''
	const additionalNotes = customTerms.additionalNotes ?? ''
	const preferredLocations = normalizePreferredLocations(detail.preferredLocations)
	const languages = normalizeLanguages(detail.languages)
        const skills = normalizeSkillIds(detail.skills)
	const screeningQuestions = normalizeScreeningQuestions(detail.screeningQuestions)
	const attachments = normalizeAttachments(detail.attachments)

	return {
		categoryId: detail.specialty?.category?.id ?? '',
		specialtyId: detail.specialty?.id ?? '',
		title: detail.title ?? '',
		description: detail.description ?? '',
		customTerms:
			deliverables || additionalNotes
				? { deliverables: deliverables || undefined, additionalNotes: additionalNotes || undefined }
				: undefined,
		paymentMode: detail.paymentMode ?? JOB_PAYMENT_MODES[0]?.value ?? 'fix_single',
		budgetAmount: detail.budgetAmount ?? undefined,
                budgetCurrency: 'USD',
		duration: detail.duration ?? undefined,
		experienceLevel: detail.experienceLevel ?? 'ENTRY_LEVEL',
		locationType: detail.locationType ?? 'REMOTE',
		preferredLocations,
		visibility: detail.visibility ?? 'PUBLIC',
		status: detail.status ?? 'DRAFT',
		languages,
		skills,
		screeningQuestions,
                attachments: attachments
                        .map(attachment => attachment.fileName ?? attachment.label ?? attachment.id)
                        .filter((value): value is string => Boolean(value))
	}
}

export default function PostJobWizard() {
	const navigate = useNavigate()
	const { jobId } = useParams<{ jobId?: string }>()
	const queryClient = useQueryClient()
	const isEditing = Boolean(jobId)
	const [newAttachments, setNewAttachments] = useState<File[]>([])
	const [existingAttachments, setExistingAttachments] = useState<NormalizedAttachment[]>([])

	const methods = useForm<JobPostFormValues>({
		resolver: zodResolver(jobPostFormSchema) as unknown as Resolver<JobPostFormValues>,
		mode: 'onChange',
		defaultValues
	})
	const [stepIndex, setStepIndex] = useState(0)

	const currentStep = wizardSteps[stepIndex]
	const totalSteps = wizardSteps.length

	const updateAttachmentField = useCallback(
		(existing: NormalizedAttachment[], files: File[], opts?: { shouldDirty?: boolean }) => {
			methods.setValue(
				'attachments',
                                [
                                        ...existing
                                                .map(
                                                        attachment => attachment.fileName ?? attachment.label ?? attachment.id
                                                )
                                                .filter((value): value is string => Boolean(value)),
                                        ...files.map(file => file.name)
                                ],
				{ shouldValidate: true, shouldDirty: opts?.shouldDirty ?? true }
			)
		},
		[methods]
	)

	const {
		data: jobDetail,
		isLoading: isLoadingJob,
		isError
	} = useQuery<JobPostDetail>({
		queryKey: ['job-post', jobId],
		enabled: isEditing && Boolean(jobId),
		queryFn: async () => {
			if (!jobId) {
				throw new Error('Missing job identifier')
			}

			return fetchJobPostDetail(jobId)
		}
	})

	useEffect(() => {
		if (!isEditing || !jobDetail) return
		const mapped = mapDetailToForm(jobDetail)
		methods.reset({ ...defaultValues, ...mapped })
		const normalizedAttachments = normalizeAttachments(jobDetail.attachments)
		setExistingAttachments(normalizedAttachments)
		setNewAttachments([])
		updateAttachmentField(normalizedAttachments, [], { shouldDirty: false })
	}, [isEditing, jobDetail, methods, updateAttachmentField])

	const handleNewAttachmentsChange = useCallback(
		(files: File[]) => {
			setNewAttachments(files)
			updateAttachmentField(existingAttachments, files)
		},
		[existingAttachments, updateAttachmentField]
	)

	const handleExistingAttachmentsChange = useCallback(
		(attachments: NormalizedAttachment[]) => {
			setExistingAttachments(attachments)
			updateAttachmentField(attachments, newAttachments)
		},
		[newAttachments, updateAttachmentField]
	)

	const progress = useMemo(() => Math.round(((stepIndex + 1) / totalSteps) * 100), [stepIndex, totalSteps])

	const goToStep = useCallback(
		async (nextIndex: number) => {
			if (nextIndex === stepIndex) return
			const step = wizardSteps[Math.min(stepIndex, nextIndex)]
			if (nextIndex > stepIndex && step) {
				const isValid = await methods.trigger(step.validateFields as (keyof JobPostFormValues)[], {
					shouldFocus: true
				})
				if (!isValid) return
			}
			setStepIndex(nextIndex)
		},
		[methods, stepIndex]
	)

	const goNext = useCallback(
		async (event?: MouseEvent<HTMLButtonElement>) => {
			event?.preventDefault()
			const step = wizardSteps[stepIndex]
			if (!step) return
			const isValid = await methods.trigger(step.validateFields as (keyof JobPostFormValues)[], {
				shouldFocus: true
			})
			if (!isValid) return
			setStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
		},
		[methods, stepIndex, totalSteps]
	)

	const goPrev = useCallback(() => {
		setStepIndex(prev => Math.max(prev - 1, 0))
	}, [])

	const createMutation = useMutation({
		mutationFn: createJobPost,
		onSuccess: () => {
			toast.success('Job post created successfully')
			queryClient.invalidateQueries({ queryKey: ['job-posts'] })
			navigate(routes.me.client.jobs.list)
		}
	})

	const updateMutation = useMutation({
		mutationFn: async (payload: Parameters<typeof createJobPost>[0]) => {
			if (!jobId) throw new Error('Missing job identifier')
			return updateJobPost(jobId, payload)
		},
		onSuccess: () => {
			toast.success('Job post updated successfully')
			queryClient.invalidateQueries({ queryKey: ['job-posts'] })
			if (jobId) {
				queryClient.invalidateQueries({ queryKey: ['job-post', jobId] })
			}
			navigate(routes.me.client.jobs.list)
		}
	})

	const isSubmitting = createMutation.isPending || updateMutation.isPending

	const buildPayload = useCallback(
		(values: JobPostFormValues): JobPostRequestPayload => {
			const {
				categoryId: _categoryId,
				customTerms,
				preferredLocations,
				languages,
				screeningQuestions,
				skills,
				...rest
			} = values

			void _categoryId

			const normalizeStringArray = (items: Array<string | null | undefined>) =>
				Array.from(
					new Set(
						items
							.map(item => (typeof item === 'string' ? item.trim() : ''))
							.filter((item): item is string => Boolean(item))
					)
				)

			const trimmedCustomTerms = customTerms
				? Object.fromEntries(
						Object.entries(customTerms)
							.map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
							.filter(([, value]) => (typeof value === 'string' ? value.length > 0 : value !== undefined))
				  )
				: undefined

			const formattedLocations = (preferredLocations ?? [])
				.map(location => {
					const code = typeof location.code === 'string' ? location.code.trim() : ''
					const label = typeof location.label === 'string' ? location.label.trim() : ''
					if (!code && !label) return null
					const normalizedCode = code || label
					const normalizedLabel = label || code || ''
					return { code: normalizedCode, label: normalizedLabel }
				})
				.filter((location): location is { code: string; label: string } => Boolean(location))

			const formattedLanguagesMap = new Map<string, { languageCode: string; proficiency: LanguageProficiency }>()
			for (const language of languages ?? []) {
				const rawCode = typeof language.languageCode === 'string' ? language.languageCode.trim() : ''
				if (!rawCode) continue
				const code = rawCode.toUpperCase()
				const proficiency = (language.proficiency ?? 'CONVERSATIONAL') as LanguageProficiency
				formattedLanguagesMap.set(code, { languageCode: code, proficiency })
			}
			const formattedLanguages = Array.from(formattedLanguagesMap.values())

			const formattedSkills = {
				required: normalizeStringArray(skills?.required ?? []),
				preferred: normalizeStringArray(skills?.preferred ?? [])
			}

			const formattedScreeningQuestions = (screeningQuestions ?? [])
				.map(question => {
					const prompt = typeof question.question === 'string' ? question.question.trim() : ''
					if (!prompt) return null
					return { question: prompt, isRequired: question.isRequired !== false }
				})
				.filter((question): question is { question: string; isRequired: boolean } => Boolean(question))

			const attachmentIds = Array.from(
				new Set(
					existingAttachments
						.map(attachment => attachment.id)
						.filter((id): id is string => Boolean(id?.trim()))
						.map(id => id.trim())
				)
			)

			const shouldSendPreferredLocations = isEditing || formattedLocations.length > 0
			const shouldSendLanguages = isEditing || formattedLanguages.length > 0
			const shouldSendScreening = isEditing || formattedScreeningQuestions.length > 0

			const payload: Record<string, unknown> = {
				...rest,
				specialtyId: values.specialtyId,
				title: values.title.trim(),
				description: values.description.trim(),
				paymentMode: values.paymentMode,
				formVersion: 'VERSION_1',
				experienceLevel: values.experienceLevel,
				customTerms: trimmedCustomTerms && Object.keys(trimmedCustomTerms).length > 0 ? trimmedCustomTerms : undefined,
				preferredLocations: shouldSendPreferredLocations ? formattedLocations : undefined,
				languages: shouldSendLanguages ? formattedLanguages : undefined,
				skills: formattedSkills,
				screeningQuestions: shouldSendScreening ? formattedScreeningQuestions : undefined,
				attachments: isEditing || attachmentIds.length > 0 ? attachmentIds : undefined
			}

			const optionalKeys: Array<keyof JobPostRequestPayload> = [
				'budgetAmount',
				'budgetCurrency',
				'duration',
				'locationType',
				'visibility',
				'status'
			]

                        optionalKeys.forEach(key => {
                                const value = payload[key]
                                if (value === undefined || value === null || value === '') {
                                        delete payload[key]
                                }
                        })

                        payload.budgetCurrency = 'USD'

			if (typeof values.budgetAmount === 'number') {
				payload.budgetAmount = values.budgetAmount
			}

			if (values.duration) {
				payload.duration = values.duration
			}

			if (values.locationType) {
				payload.locationType = values.locationType
			}

			if (values.visibility) {
				payload.visibility = values.visibility
			}

			if (values.status) {
				payload.status = values.status
			}

			return payload as JobPostRequestPayload
		},
		[existingAttachments, isEditing]
	)

	const onSubmit = useCallback(
		async (values: JobPostFormValues) => {
			const payload = buildPayload(values)
			const request = { payload, attachmentFiles: newAttachments }
			if (isEditing) {
				await updateMutation.mutateAsync(request)
			} else {
				await createMutation.mutateAsync(request)
			}
		},
		[buildPayload, createMutation, isEditing, newAttachments, updateMutation]
	)

	if (isEditing && isLoadingJob) {
		return (
			<div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10 text-base-content/70'>
				<div className='flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 px-6 py-4 shadow-sm'>
					<Loader2 className='size-5 animate-spin text-primary' />
					<span>Loading job post details...</span>
				</div>
			</div>
		)
	}

	if (isEditing && isError) {
		return (
			<div className='mx-auto flex min-h-[50vh] w-full max-w-4xl items-center justify-center px-4 py-10'>
				<div className='rounded-2xl border border-error/40 bg-error/10 px-6 py-5 text-center text-sm text-error'>
					Unable to load the job post. Please return to the list and try again.
				</div>
			</div>
		)
	}

	const headerTitle = isEditing ? 'Edit job post' : 'Create a job post'
	const headerDescription = isEditing
		? 'Update your listing to keep freelancers informed with the latest requirements.'
		: "Guide clients through a focused, three-step flow inspired by Upwork's posting experience."

	return (
		<FormProvider {...methods}>
			<form className='mx-auto w-full max-w-5xl px-4 py-8 lg:px-0' onSubmit={methods.handleSubmit(onSubmit)}>
				<div className='mb-8 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
					<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
						<div>
							<h1 className='text-2xl font-semibold text-base-content'>{headerTitle}</h1>
							<p className='text-base-content/70 mt-1 text-sm'>{headerDescription}</p>
						</div>
						<div className='flex items-center gap-3'>
							<div className='text-sm text-base-content/70'>Progress</div>
							<div className='w-32 rounded-full bg-base-200 p-1 text-center text-xs font-medium text-primary'>
								{progress}% complete
							</div>
						</div>
					</div>
					<div className='mt-6 grid gap-4 md:grid-cols-3'>
						{wizardSteps.map((step, index) => {
							const status = index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo'
							return (
								<button
									type='button'
									key={step.id}
									className={`rounded-2xl border p-4 text-left transition ${
										status === 'current'
											? 'border-primary bg-primary/10'
											: status === 'done'
											? 'border-success/70 bg-success/10'
											: 'border-base-200 hover:border-primary/40'
									}`}
									onClick={() => goToStep(index)}>
									<div className='flex items-center gap-3'>
										<span
											className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
												status === 'done'
													? 'bg-success text-success-content'
													: status === 'current'
													? 'bg-primary text-primary-content'
													: 'bg-base-200 text-base-content'
											}`}>
											{status === 'done' ? <Check className='size-4' /> : index + 1}
										</span>
										<div>
											<div className='flex items-center gap-2 text-sm font-medium text-base-content'>
												{step.icon}
												{step.title}
											</div>
											<p className='text-base-content/70 mt-1 text-xs'>{step.description}</p>
										</div>
									</div>
								</button>
							)
						})}
					</div>
				</div>

				<div className='space-y-6'>
					<AboutStep
						hidden={currentStep.id !== 'about'}
						newAttachments={newAttachments}
						existingAttachments={existingAttachments}
						onNewAttachmentsChange={handleNewAttachmentsChange}
						onExistingAttachmentsChange={handleExistingAttachmentsChange}
					/>
					<FreelancerRequirementsStep hidden={currentStep.id !== 'requirements'} />
					<BudgetStep hidden={currentStep.id !== 'budget'} />
				</div>

				<div className='mt-10 flex flex-col gap-4 border-t border-base-200 pt-6 md:flex-row md:items-center md:justify-between'>
					<button
						type='button'
						onClick={goPrev}
						className='btn btn-ghost gap-2'
						disabled={stepIndex === 0 || isSubmitting}>
						<ChevronLeft className='size-4' /> Back
					</button>
					<div className='flex flex-1 flex-col items-stretch gap-3 md:flex-row md:justify-end'>
						{stepIndex === totalSteps - 1 ? (
							<button type='submit' className='btn btn-primary gap-2' disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<Loader2 className='size-4 animate-spin' />
										Saving...
									</>
								) : (
									<>
										Finalize job post
										<Check className='size-4' />
									</>
								)}
							</button>
						) : (
							<button type='button' className='btn btn-primary gap-2' onClick={goNext} disabled={isSubmitting}>
								Continue
								<ChevronRight className='size-4' />
							</button>
						)}
					</div>
				</div>
			</form>
		</FormProvider>
	)
}
