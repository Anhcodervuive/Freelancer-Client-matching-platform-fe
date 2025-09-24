import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronLeft, ChevronRight, FileText, Sparkles, Wallet } from 'lucide-react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { JOB_PAYMENT_MODES } from '~/constants/job'
import { jobPostFormSchema, type JobPostFormValues } from './schema'
import { AboutStep } from './components/AboutStep'
import { FreelancerRequirementsStep } from './components/FreelancerRequirementsStep'
import { BudgetStep } from './components/BudgetStep'

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

export default function PostJobWizard() {
        const [attachments, setAttachments] = useState<File[]>([])
        const methods = useForm<JobPostFormValues>({
                resolver: zodResolver(jobPostFormSchema),
                mode: 'onChange',
                defaultValues: {
                        categoryId: '',
                        specialtyId: '',
                        title: '',
                        description: '',
                        customTerms: { deliverables: '', additionalNotes: '' },
                        paymentMode: JOB_PAYMENT_MODES[0]?.value ?? 'HOURLY',
                        budgetAmount: undefined,
                        budgetCurrency: 'USD',
                        duration: 'LESS_THAN_ONE_MONTH',
                        experienceLevel: 'ENTRY_LEVEL',
                        locationType: 'REMOTE',
                        preferredLocations: [],
                        visibility: 'PUBLIC',
                        status: 'DRAFT',
                        languages: [{ languageCode: 'en', proficiency: 'CONVERSATIONAL' }],
                        skills: { required: [], preferred: [] },
                        screeningQuestions: [],
                        attachments: []
                }
        })
        const [stepIndex, setStepIndex] = useState(0)

        const currentStep = wizardSteps[stepIndex]
        const totalSteps = wizardSteps.length

        const handleAttachmentsChange = useCallback(
                (files: File[]) => {
                        setAttachments(files)
                        methods.setValue(
                                'attachments',
                                files.map(file => file.name),
                                { shouldValidate: true, shouldDirty: true }
                        )
                },
                [methods]
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

        const goNext = useCallback(async () => {
                const step = wizardSteps[stepIndex]
                if (!step) return
                const isValid = await methods.trigger(step.validateFields as (keyof JobPostFormValues)[], {
                        shouldFocus: true
                })
                if (!isValid) return
                setStepIndex(prev => Math.min(prev + 1, totalSteps - 1))
        }, [methods, stepIndex, totalSteps])

        const goPrev = useCallback(() => {
                setStepIndex(prev => Math.max(prev - 1, 0))
        }, [])

        const onSubmit = useCallback(
                (values: JobPostFormValues) => {
                        const payload = {
                                ...values,
                                attachments: attachments.map(file => file.name),
                                formVersion: 'VERSION_1'
                        }
                        console.info('Job post payload', payload)
                        toast.success('Draft job post saved!')
                },
                [attachments]
        )

        return (
                <FormProvider {...methods}>
                        <form
                                className='mx-auto w-full max-w-5xl px-4 py-8 lg:px-0'
                                onSubmit={methods.handleSubmit(onSubmit)}
                        >
                                <div className='mb-8 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                                <div>
                                                        <h1 className='text-2xl font-semibold text-base-content'>Draft job post</h1>
                                                        <p className='text-base-content/70 mt-1 text-sm'>
                                                                Guide clients through a focused, three-step flow inspired by Upwork&apos;s posting
                                                                experience.
                                                        </p>
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
                                                                        onClick={() => goToStep(index)}
                                                                >
                                                                        <div className='flex items-center gap-3'>
                                                                                <span
                                                                                        className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${
                                                                                                status === 'done'
                                                                                                        ? 'bg-success text-success-content'
                                                                                                        : status === 'current'
                                                                                                        ? 'bg-primary text-primary-content'
                                                                                                        : 'bg-base-200 text-base-content'
                                                                                        }`}
                                                                                >
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
                                        <AboutStep onAttachmentsChange={handleAttachmentsChange} attachments={attachments} hidden={currentStep.id !== 'about'} />
                                        <FreelancerRequirementsStep hidden={currentStep.id !== 'requirements'} />
                                        <BudgetStep hidden={currentStep.id !== 'budget'} />
                                </div>

                                <div className='mt-10 flex flex-col gap-4 border-t border-base-200 pt-6 md:flex-row md:items-center md:justify-between'>
                                        <button
                                                type='button'
                                                onClick={goPrev}
                                                className='btn btn-ghost gap-2'
                                                disabled={stepIndex === 0}
                                        >
                                                <ChevronLeft className='size-4' /> Back
                                        </button>
                                        <div className='flex flex-1 flex-col items-stretch gap-3 md:flex-row md:justify-end'>
                                                {stepIndex === totalSteps - 1 ? (
                                                        <button type='submit' className='btn btn-primary gap-2'>
                                                                Finalize job post
                                                                <Check className='size-4' />
                                                        </button>
                                                ) : (
                                                        <button type='button' className='btn btn-primary gap-2' onClick={goNext}>
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
