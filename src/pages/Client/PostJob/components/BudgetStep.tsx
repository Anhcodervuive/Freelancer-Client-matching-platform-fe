import { useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Banknote, CheckCircle2, Eye, Timer } from 'lucide-react'
import {
        CURRENCY_CODES,
        JOB_DURATION_COMMITMENTS,
        JOB_PAYMENT_MODES,
        JOB_STATUS_OPTIONS,
        JOB_VISIBILITY_OPTIONS
} from '~/constants/job'
import type { JobPostFormValues } from '../schema'

type BudgetStepProps = { hidden?: boolean }

export function BudgetStep({ hidden }: BudgetStepProps) {
        const {
                control,
                register,
                watch,
                setValue,
                formState: { errors }
        } = useFormContext<JobPostFormValues>()

        const paymentMode = watch('paymentMode')
        const languages = watch('languages') ?? []
        const attachments = watch('attachments') ?? []
        const skills = watch('skills') ?? { required: [], preferred: [] }

        const paymentModeConfig = useMemo(
                () => JOB_PAYMENT_MODES.find(mode => mode.value === paymentMode),
                [paymentMode]
        )
        const budgetLabel = paymentModeConfig?.budgetLabel ?? 'Project budget'
        const budgetPlaceholder = paymentModeConfig?.placeholder ?? 'e.g. 1500'
        const budgetStep = paymentModeConfig?.step ?? 5

        const talentSummary = useMemo(() => {
                const requiredCount = skills.required?.length ?? 0
                const preferredCount = skills.preferred?.length ?? 0
                const languageCount = languages.length
                const parts = [
                        `${requiredCount} mandatory skill${requiredCount === 1 ? '' : 's'}`,
                        `${preferredCount} bonus skill${preferredCount === 1 ? '' : 's'}`,
                        `${languageCount} language${languageCount === 1 ? '' : 's'}`
                ]
                return parts.join(' · ')
        }, [languages.length, skills.preferred, skills.required])

        return (
                <section className={`rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm ${hidden ? 'hidden' : ''}`}>
                        <div className='mb-6 flex flex-col gap-2'>
                                <span className='text-xs font-semibold uppercase tracking-wide text-primary'>Step 3</span>
                                <h2 className='text-2xl font-semibold text-base-content'>Budget & visibility</h2>
                                <p className='text-base-content/70 text-sm'>Set expectations for pricing, commitment, and who can discover this job.</p>
                        </div>

                        <div className='grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
                                <div className='space-y-6'>
                                        <div>
                                                <label className='mb-3 block text-sm font-medium text-base-content'>Project type</label>
                                                <div className='grid gap-3 md:grid-cols-2'>
                                                        {JOB_PAYMENT_MODES.map(mode => {
                                                                const active = paymentMode === mode.value
                                                                return (
                                                                        <label
                                                                                key={mode.value}
                                                                                className={`cursor-pointer rounded-2xl border p-4 transition ${
                                                                                        active
                                                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                                                : 'border-base-200 hover:border-primary/40'
                                                                                }`}
                                                                        >
                                                                                <input
                                                                                        type='radio'
                                                                                        className='hidden'
                                                                                        value={mode.value}
                                                                                        {...register('paymentMode')}
                                                                                />
                                                                                <div className='flex items-center gap-2 text-sm font-semibold'>
                                                                                        <Banknote className='size-4' />
                                                                                        {mode.label}
                                                                                </div>
                                                                                <p className='mt-2 text-xs text-base-content/70'>{mode.description}</p>
                                                                        </label>
                                                                )
                                                        })}
                                                </div>
                                        </div>

                                        <div className='rounded-2xl border border-base-200 p-5'>
                                                <div className='mb-4 flex items-center justify-between text-sm font-medium text-base-content'>
                                                        <span>{budgetLabel}</span>
                                                        <button type='button' className='btn btn-ghost btn-xs text-base-content/70' onClick={() => setValue('budgetAmount', undefined)}>
                                                                Not sure yet
                                                        </button>
                                                </div>
                                                <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
                                                        <Controller
                                                                control={control}
                                                                name='budgetAmount'
                                                                render={({ field }) => (
                                                                        <input
                                                                                type='number'
                                                                                min={0}
                                                                                step={budgetStep}
                                                                                value={field.value ?? ''}
                                                                                onChange={event => {
                                                                                        const raw = event.target.value
                                                                                        if (!raw) {
                                                                                                field.onChange(undefined)
                                                                                                return
                                                                                        }
                                                                                        const parsed = Number(raw)
                                                                                        field.onChange(Number.isNaN(parsed) ? raw : parsed)
                                                                                }}
                                                                                placeholder={budgetPlaceholder}
                                                                                className='input input-bordered'
                                                                        />
                                                                )}
                                                        />
                                                        <select
                                                                className={`select select-bordered ${errors.budgetCurrency ? 'select-error' : ''}`}
                                                                {...register('budgetCurrency')}
                                                        >
                                                                {CURRENCY_CODES.map(code => (
                                                                        <option key={code} value={code}>
                                                                                {code}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                                {errors.budgetAmount ? (
                                                        <p className='mt-1 text-xs text-error'>{errors.budgetAmount.message as string}</p>
                                                ) : null}
                                                {errors.budgetCurrency ? (
                                                        <p className='mt-1 text-xs text-error'>{errors.budgetCurrency.message}</p>
                                                ) : null}
                                                <p className='mt-3 text-xs text-base-content/60'>You can adjust the budget later or discuss alternative pricing with talent.</p>
                                        </div>

                                        <div className='grid gap-4 md:grid-cols-2'>
                                                <div>
                                                        <label className='mb-2 block text-sm font-medium text-base-content'>Expected duration</label>
                                                        <select className='select select-bordered w-full' {...register('duration')}>
                                                                {JOB_DURATION_COMMITMENTS.map(duration => (
                                                                        <option key={duration.value} value={duration.value}>
                                                                                {duration.label}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                                <div>
                                                        <label className='mb-2 block text-sm font-medium text-base-content'>Job visibility</label>
                                                        <select className='select select-bordered w-full' {...register('visibility')}>
                                                                {JOB_VISIBILITY_OPTIONS.map(option => (
                                                                        <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>
                                        </div>

                                        <div>
                                                <label className='mb-2 block text-sm font-medium text-base-content'>Status</label>
                                                <div className='flex flex-wrap gap-2'>
                                                        {JOB_STATUS_OPTIONS.map(option => {
                                                                const active = watch('status') === option.value
                                                                return (
                                                                        <button
                                                                                key={option.value}
                                                                                type='button'
                                                                                onClick={() => setValue('status', option.value, { shouldDirty: true })}
                                                                                className={`btn btn-sm ${
                                                                                        active ? 'btn-primary' : 'btn-outline'
                                                                                }`}
                                                                        >
                                                                                {option.label}
                                                                        </button>
                                                                )
                                                        })}
                                                </div>
                                        </div>
                                </div>

                                <div className='space-y-4'>
                                        <div className='rounded-2xl border border-primary/30 bg-primary/5 p-5'>
                                                <div className='flex items-start gap-3'>
                                                        <CheckCircle2 className='size-6 text-primary' />
                                                        <div>
                                                                <p className='font-semibold text-primary'>Posting checklist</p>
                                                                <ul className='mt-2 space-y-1 text-xs text-primary/80'>
                                                                        <li>• {talentSummary}</li>
                                                                        <li>• {attachments.length} attachment{attachments.length === 1 ? '' : 's'} ready for review</li>
                                                                        <li>• English level {languages.find(lang => lang.languageCode === 'en')?.proficiency ?? 'not specified'}</li>
                                                                </ul>
                                                        </div>
                                                </div>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 p-5'>
                                                <div className='flex items-center gap-3 text-sm font-semibold text-base-content'>
                                                        <Timer className='size-4 text-primary' />
                                                        Preview
                                                </div>
                                                <p className='mt-3 text-xs text-base-content/70'>
                                                        Save this job as a draft or publish immediately once you&apos;re satisfied with the details.
                                                </p>
                                                <div className='mt-4 rounded-xl border border-dashed border-base-300 p-3 text-xs text-base-content/60'>
                                                        Job will be visible as soon as you finalize unless you keep it as a draft.
                                                </div>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 p-5'>
                                                <div className='flex items-center gap-3 text-sm font-semibold text-base-content'>
                                                        <Eye className='size-4 text-primary' />
                                                        Visibility summary
                                                </div>
                                                <p className='mt-3 text-xs text-base-content/70'>
                                                        {watch('visibility') === 'PUBLIC'
                                                                ? 'Anyone on the marketplace can discover this job, including search engines.'
                                                                : watch('visibility') === 'INVITE_ONLY'
                                                                ? 'Only freelancers you invite can view and apply to this job.'
                                                                : 'Visible to talent with a direct link or invite.'}
                                                </p>
                                        </div>
                                </div>
                        </div>
                </section>
        )
}
