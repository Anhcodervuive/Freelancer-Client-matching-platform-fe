import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, MessageSquare, Sparkles, X } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import type { JobPostDetail } from '~/types/job-post'
import type { NormalizedFreelancer } from '~/pages/Client/Freelancers/utils'

const invitationFormSchema = z
        .object({
                message: z
                        .preprocess(value => {
                                if (typeof value !== 'string') return undefined
                                const trimmed = value.trim()
                                return trimmed.length > 0 ? trimmed : undefined
                        }, z.string().max(5000, 'Message must be 5000 characters or fewer').optional()),
                expiresAt: z.preprocess(value => {
                        if (typeof value !== 'string') return undefined
                        const trimmed = value.trim()
                        return trimmed.length > 0 ? trimmed : undefined
                }, z.string().optional())
        })
        .superRefine((data, ctx) => {
                if (data.expiresAt) {
                        const expiresDate = new Date(data.expiresAt)
                        if (Number.isNaN(expiresDate.getTime())) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Please select a valid expiration date and time.',
                                        path: ['expiresAt']
                                })
                                return
                        }

                        if (expiresDate.getTime() <= Date.now()) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Expiration must be set in the future.',
                                        path: ['expiresAt']
                                })
                        }
                }
        })

type InvitationFormValues = z.infer<typeof invitationFormSchema>

type InviteFreelancerDialogProps = {
        open: boolean
        job: JobPostDetail
        freelancer: NormalizedFreelancer | null
        isSubmitting?: boolean
        onSubmit: (_values: InvitationFormValues) => Promise<void>
        onClose: () => void
}

export default function InviteFreelancerDialog({
        open,
        job,
        freelancer,
        isSubmitting = false,
        onSubmit,
        onClose
}: InviteFreelancerDialogProps) {
        const methods = useForm<InvitationFormValues>({
                resolver: zodResolver(invitationFormSchema) as Resolver<InvitationFormValues>,
                defaultValues: {
                        message: undefined,
                        expiresAt: undefined
                }
        })

        useEffect(() => {
                if (!open) {
                        methods.reset()
                        return
                }

                const firstName = freelancer?.name?.split(' ')[0] ?? 'there'
                const defaultMessage = `Hi ${firstName}, I believe you would be a great fit for "${job.title}". Let's chat about the details if you're interested!`
                methods.reset({
                        message: defaultMessage,
                        expiresAt: undefined
                })
        }, [freelancer?.name, job.title, methods, open])

        const handleClose = () => {
                if (isSubmitting) return
                onClose()
        }

        const submit = methods.handleSubmit(async values => {
                await onSubmit(values)
                methods.reset()
        })

        const expiresAtError = methods.formState.errors.expiresAt?.message
        const messageError = methods.formState.errors.message?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box w-full max-w-2xl overflow-visible rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-center justify-between rounded-t-3xl bg-primary/10 px-6 py-4'>
                                        <div>
                                                <h3 className='text-lg font-semibold text-base-content'>Send invitation</h3>
                                                <p className='text-xs text-base-content/70'>Reach out directly to highlight why this project suits them.</p>
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={handleClose}
                                                aria-label='Close invitation dialog'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='space-y-6 px-6 py-6'>
                                        <div className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                        <div>
                                                                <span className='text-xs uppercase tracking-wide text-base-content/60'>Inviting</span>
                                                                <p className='text-base font-semibold text-base-content'>
                                                                        {freelancer?.name}
                                                                </p>
                                                                {freelancer?.title ? (
                                                                        <p className='text-sm text-base-content/70'>{freelancer.title}</p>
                                                                ) : null}
                                                        </div>
                                                        <div className='rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-base-content/70'>
                                                                <span className='flex items-center gap-2 font-medium text-primary'>
                                                                        <Sparkles className='size-4' /> Job
                                                                </span>
                                                                <p className='mt-1 line-clamp-2 text-sm font-semibold text-base-content'>{job.title}</p>
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='space-y-2'>
                                                <label className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                        <MessageSquare className='size-4 text-primary' /> Personal message
                                                </label>
                                                <textarea
                                                        {...methods.register('message')}
                                                        className='textarea textarea-bordered h-32 w-full resize-none'
                                                        placeholder='Share why this project is a great match and what you expect next.'
                                                />
                                                {messageError ? (
                                                        <p className='text-xs text-error'>{messageError}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>Optional but recommended — make it personal for better response rates.</p>
                                                )}
                                        </div>

                                        <div className='space-y-2'>
                                                <label className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                        <CalendarClock className='size-4 text-secondary' /> Invitation expires
                                                </label>
                                                <input
                                                        type='datetime-local'
                                                        {...methods.register('expiresAt')}
                                                        className='input input-bordered w-full'
                                                        min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                                                />
                                                {expiresAtError ? (
                                                        <p className='text-xs text-error'>{expiresAtError}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>Leave blank to keep the invitation open. Set a deadline to encourage quick responses.</p>
                                                )}
                                        </div>

                                        <div className='modal-action mt-8 flex flex-col gap-3 sm:flex-row'>
                                                <button type='button' className='btn btn-ghost flex-1' onClick={handleClose} disabled={isSubmitting}>
                                                        Cancel
                                                </button>
                                                <button type='submit' className='btn btn-primary flex-1 gap-2' disabled={isSubmitting}>
                                                        {isSubmitting ? 'Sending…' : 'Send invitation'}
                                                </button>
                                        </div>
                                </form>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={handleClose} disabled={isSubmitting}>
                                        close
                                </button>
                        </form>
                </dialog>
        )
}

export type { InvitationFormValues }
