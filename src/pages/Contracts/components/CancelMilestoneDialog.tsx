import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, X } from 'lucide-react'

import { CancelMilestoneSchema, type CancelMilestoneFormValues } from '../schemas'

type CancelMilestoneDialogProps = {
        open: boolean
        milestoneTitle?: string
        isSubmitting?: boolean
        onSubmit: (_values: CancelMilestoneFormValues) => Promise<void> | void
        onClose: () => void
}

const defaultValues: CancelMilestoneFormValues = {
        reason: ''
}

const CancelMilestoneDialog = ({
        open,
        milestoneTitle,
        isSubmitting = false,
        onSubmit,
        onClose
}: CancelMilestoneDialogProps) => {
        const {
                register,
                handleSubmit,
                reset,
                formState: { errors }
        } = useForm<CancelMilestoneFormValues>({
                resolver: zodResolver(CancelMilestoneSchema) as Resolver<CancelMilestoneFormValues>,
                defaultValues
        })

        useEffect(() => {
                if (!open) return
                reset(defaultValues)
        }, [open, reset])

        const submit = handleSubmit(async values => {
                await onSubmit(values)
                reset(defaultValues)
        })

        const reasonError = errors.reason?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-start gap-3 rounded-t-3xl bg-error/10 px-6 py-5'>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-error/10 text-error'>
                                                <AlertTriangle className='size-5' />
                                        </div>
                                        <div className='flex-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-error/80'>Hủy milestone</p>
                                                <h3 className='text-lg font-semibold text-base-content'>Xác nhận hủy milestone</h3>
                                                {milestoneTitle && (
                                                        <p className='mt-1 text-sm text-base-content/70'>Milestone: <span className='font-semibold text-base-content'>{milestoneTitle}</span></p>
                                                )}
                                                <p className='text-xs text-base-content/60'>Khi hủy, milestone sẽ được hoàn tiền (nếu đủ điều kiện) và freelancer sẽ được thông báo.</p>
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isSubmitting) return
                                                        onClose()
                                                }}
                                                aria-label='Đóng hủy milestone'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        <div className='space-y-3 px-6 py-6'>
                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Lý do hủy (không bắt buộc)</label>
                                                        <textarea
                                                                {...register('reason')}
                                                                className='textarea textarea-bordered min-h-[120px]'
                                                                placeholder='Chia sẻ lý do để freelancer và đội ngũ hỗ trợ nắm rõ tình hình.'
                                                                disabled={isSubmitting}
                                                        />
                                                        {reasonError ? (
                                                                <p className='text-xs text-error'>{reasonError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Lý do giúp hai bên hiểu rõ hơn về quyết định hủy milestone.</p>
                                                        )}
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>Hành động này không thể hoàn tác. Hãy chắc chắn trước khi tiếp tục.</p>
                                                <div className='flex flex-wrap items-center justify-end gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-ghost btn-sm'
                                                                onClick={() => {
                                                                        if (isSubmitting) return
                                                                        onClose()
                                                                }}
                                                                disabled={isSubmitting}
                                                        >
                                                                Không hủy
                                                        </button>
                                                        <button type='submit' className='btn btn-error btn-sm gap-2' disabled={isSubmitting}>
                                                                {isSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang hủy...
                                                                        </>
                                                                ) : (
                                                                        'Hủy milestone'
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={() => { if (!isSubmitting) onClose() }} disabled={isSubmitting}>
                                        close
                                </button>
                        </form>
                </dialog>
        )
}

export default CancelMilestoneDialog
