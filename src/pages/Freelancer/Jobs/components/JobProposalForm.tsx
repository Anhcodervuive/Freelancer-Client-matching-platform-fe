import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { JOB_DURATION_COMMITMENTS } from '~/constants/job'
import { UpdateJobProposalSchema } from '~/types/job-proposal'
import type { JobDurationCommitment } from '~/constants/job'
import type { z } from 'zod'

const BaseProposalSchema = UpdateJobProposalSchema.pick({
        coverLetter: true,
        bidAmount: true,
        bidCurrency: true,
        estimatedDuration: true
}).partial()

export type JobProposalFormValues = z.infer<typeof BaseProposalSchema>

type JobProposalFormProps = {
        mode: 'create' | 'edit'
        defaultValues?: Partial<JobProposalFormValues>
        onSubmit: (_values: JobProposalFormValues) => Promise<void> | void
        isSubmitting?: boolean
        submitLabel: string
        onCancel?: () => void
}

const normalizeDurationOptions = JOB_DURATION_COMMITMENTS.filter(option => option.value !== 'ONGOING')

const JobProposalForm = ({
        mode,
        defaultValues,
        onSubmit,
        isSubmitting,
        submitLabel,
        onCancel
}: JobProposalFormProps) => {
        const {
                control,
                handleSubmit,
                formState: { errors },
                reset,
                watch,
                setValue
        } = useForm<JobProposalFormValues>({
                resolver: zodResolver(BaseProposalSchema) as Resolver<JobProposalFormValues>,
                defaultValues: {
                        coverLetter: defaultValues?.coverLetter ?? '',
                        bidAmount: defaultValues?.bidAmount ?? undefined,
                        bidCurrency: defaultValues?.bidAmount ? 'USD' : undefined,
                        estimatedDuration: defaultValues?.estimatedDuration ?? undefined
                }
        })

        useEffect(() => {
                reset({
                        coverLetter: defaultValues?.coverLetter ?? '',
                        bidAmount: defaultValues?.bidAmount ?? undefined,
                        bidCurrency: defaultValues?.bidAmount ? 'USD' : undefined,
                        estimatedDuration: defaultValues?.estimatedDuration ?? undefined
                })
        }, [defaultValues?.bidAmount, defaultValues?.bidCurrency, defaultValues?.coverLetter, defaultValues?.estimatedDuration, reset])

        const watchedBidAmount = watch('bidAmount')

        useEffect(() => {
                if (watchedBidAmount === undefined || watchedBidAmount === null) {
                        setValue('bidCurrency', undefined, { shouldValidate: true })
                        return
                }

                setValue('bidCurrency', 'USD', { shouldValidate: true })
        }, [setValue, watchedBidAmount])

        const handleFormSubmit = (values: JobProposalFormValues) => {
                onSubmit(values)
        }

        return (
                <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
                        <div>
                                <h2 className='text-xl font-semibold text-base-content'>
                                        {mode === 'create' ? 'Craft your proposal' : 'Update your proposal'}
                                </h2>
                                <p className='mt-2 text-sm text-base-content/70'>
                                        Share how you would approach this project and include any optional bid details you want the client to review.
                                </p>
                        </div>

                        <div className='space-y-2'>
                                <label className='text-sm font-medium text-base-content' htmlFor='coverLetter'>
                                        Cover letter <span className='font-normal text-base-content/60'>(optional)</span>
                                </label>
                                <Controller
                                        name='coverLetter'
                                        control={control}
                                        render={({ field }) => (
                                                <textarea
                                                        id='coverLetter'
                                                        rows={6}
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        placeholder='Explain why you are a great fit for this project and mention any similar work you have done.'
                                                        className='textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100 text-sm text-base-content'
                                                />
                                        )}
                                />
                                {errors.coverLetter && (
                                        <p className='text-xs text-error'>{errors.coverLetter.message}</p>
                                )}
                                <p className='text-xs text-base-content/60'>Provide at least 10 characters if you include a message.</p>
                        </div>

                        <div className='grid gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='bidAmount'>
                                                Bid amount
                                                <span className='font-normal text-base-content/60'> (optional)</span>
                                        </label>
                                        <Controller
                                                name='bidAmount'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='bidAmount'
                                                                type='number'
                                                                min={0}
                                                                step='0.01'
                                                                value={field.value ?? ''}
                                                                onChange={event => {
                                                                        const rawValue = event.target.value
                                                                        if (rawValue === '') {
                                                                                field.onChange(undefined)
                                                                                return
                                                                        }
                                                                        const nextValue = Number(rawValue)
                                                                        field.onChange(Number.isNaN(nextValue) ? undefined : nextValue)
                                                                }}
                                                                placeholder='Enter your project bid'
                                                                className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                        />
                                                )}
                                        />
                                        {errors.bidAmount && <p className='text-xs text-error'>{errors.bidAmount.message}</p>}
                                </div>
                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='bidCurrency'>Currency</label>
                                        <Controller
                                                name='bidCurrency'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='bidCurrency'
                                                                value={field.value ?? ''}
                                                                readOnly
                                                                disabled={watchedBidAmount === undefined || watchedBidAmount === null}
                                                                className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                                placeholder='USD'
                                                        />
                                                )}
                                        />
                                        {errors.bidCurrency && <p className='text-xs text-error'>{errors.bidCurrency.message}</p>}
                                        <p className='text-xs text-base-content/60'>Currency is fixed to USD.</p>
                                </div>
                        </div>

                        <div className='space-y-2'>
                                <label className='text-sm font-medium text-base-content' htmlFor='estimatedDuration'>Estimated project length</label>
                                <Controller
                                        name='estimatedDuration'
                                        control={control}
                                        render={({ field }) => (
                                                <select
                                                        {...field}
                                                        id='estimatedDuration'
                                                        value={(field.value as JobDurationCommitment | null | undefined) ?? ''}
                                                        onChange={event => {
                                                                const value = event.target.value as JobDurationCommitment | ''
                                                                field.onChange(value ? value : undefined)
                                                        }}
                                                        className='select select-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                >
                                                        <option value=''>Select an option</option>
                                                        {normalizeDurationOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        )}
                                />
                                {errors.estimatedDuration && (
                                        <p className='text-xs text-error'>{errors.estimatedDuration.message}</p>
                                )}
                                <p className='text-xs text-base-content/60'>Let clients know how long you expect the engagement to take.</p>
                        </div>

                        <div className='flex flex-wrap items-center justify-end gap-3 pt-2'>
                                {onCancel && (
                                        <button
                                                type='button'
                                                onClick={onCancel}
                                                className='btn btn-ghost rounded-2xl text-base-content/70 hover:text-error'
                                        >
                                                Cancel
                                        </button>
                                )}
                                <button
                                        type='submit'
                                        className='btn btn-primary rounded-2xl px-6'
                                        disabled={isSubmitting}
                                >
                                        {isSubmitting && <Loader2 className='mr-2 size-4 animate-spin' />}
                                        {submitLabel}
                                </button>
                        </div>
                </form>
        )
}

export default JobProposalForm
