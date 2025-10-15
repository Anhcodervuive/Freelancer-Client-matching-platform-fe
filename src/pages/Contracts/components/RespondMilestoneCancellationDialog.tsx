import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react'

import {
        RespondMilestoneCancellationSchema,
        type RespondMilestoneCancellationFormValues
} from '../schemas'
import { formatDateTime } from '~/utils/format'

const createIdempotencyKey = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID()
        }

        return `cancel-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
}

const buildDefaultValues = (
        action: 'accept' | 'decline'
): RespondMilestoneCancellationFormValues => ({
        action,
        reason: '',
        idempotencyKey: createIdempotencyKey()
})

type RespondMilestoneCancellationDialogProps = {
        open: boolean
        action: 'accept' | 'decline'
        milestoneTitle?: string
        cancellationReason?: string | null
        requestedAt?: string | null
        isSubmitting?: boolean
        onSubmit: (_values: RespondMilestoneCancellationFormValues) => Promise<void> | void
        onClose: () => void
}

const RespondMilestoneCancellationDialog = ({
        open,
        action,
        milestoneTitle,
        cancellationReason,
        requestedAt,
        isSubmitting = false,
        onSubmit,
        onClose
}: RespondMilestoneCancellationDialogProps) => {
        const {
                register,
                handleSubmit,
                reset,
                setValue,
                formState: { errors }
        } = useForm<RespondMilestoneCancellationFormValues>({
                resolver: zodResolver(
                        RespondMilestoneCancellationSchema
                ) as Resolver<RespondMilestoneCancellationFormValues>,
                defaultValues: buildDefaultValues(action)
        })

        useEffect(() => {
                if (!open) return

                reset(buildDefaultValues(action))
        }, [open, action, reset])

        useEffect(() => {
                setValue('action', action, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
        }, [action, setValue])

        const submit = handleSubmit(async values => {
                await onSubmit(values)
                reset(buildDefaultValues(action))
        })

        const requestedAtLabel = requestedAt
                ? formatDateTime(requestedAt, { dateStyle: 'medium', timeStyle: 'short' })
                : undefined
        const normalizedReason = cancellationReason?.trim()
        const isDecline = action === 'decline'

        const heading = isDecline ? 'Từ chối yêu cầu hủy milestone' : 'Chấp nhận yêu cầu hủy milestone'
        const caption = isDecline
                ? 'Bạn sẽ giữ milestone tiếp tục thực hiện và thông báo cho client lý do từ chối.'
                : 'Bạn đồng ý hủy milestone. Số tiền (nếu đã giải ngân) sẽ được xử lý theo chính sách của nền tảng.'
        const primaryLabel = isDecline ? 'Từ chối yêu cầu' : 'Chấp nhận yêu cầu'
        const PrimaryIcon = isDecline ? XCircle : CheckCircle2
        const accentClasses = isDecline
                ? 'border-rose-200 bg-rose-50/80 text-rose-700'
                : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div
                                        className={`flex items-start gap-3 rounded-t-3xl px-6 py-5 ${
                                                isDecline ? 'bg-rose-50/80 text-rose-700' : 'bg-emerald-50/80 text-emerald-700'
                                        }`}
                                >
                                        <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/60 ${
                                                        isDecline ? 'text-rose-600' : 'text-emerald-600'
                                                }`}
                                        >
                                                {isDecline ? <AlertTriangle className='size-5' /> : <CheckCircle2 className='size-5' />}
                                        </div>
                                        <div className='flex-1 text-left'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] opacity-70'>
                                                        Phản hồi yêu cầu
                                                </p>
                                                <h3 className='text-lg font-semibold text-base-content'>{heading}</h3>
                                                {milestoneTitle && (
                                                        <p className='mt-1 text-sm text-base-content/70'>
                                                                Milestone: <span className='font-semibold text-base-content'>{milestoneTitle}</span>
                                                        </p>
                                                )}
                                                <p className='text-xs text-base-content/60'>{caption}</p>
                                                {requestedAtLabel && (
                                                        <p className='mt-2 text-xs text-base-content/50'>Gửi yêu cầu lúc {requestedAtLabel}</p>
                                                )}
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isSubmitting) return
                                                        reset(buildDefaultValues(action))
                                                        onClose()
                                                }}
                                                aria-label='Đóng phản hồi hủy milestone'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        <input type='hidden' {...register('action')} />
                                        <input type='hidden' {...register('idempotencyKey')} />

                                        <div className='space-y-4 px-6 py-6'>
                                                <div className={`rounded-2xl border px-4 py-3 text-sm ${accentClasses}`}>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] opacity-60'>
                                                                Lý do từ khách hàng
                                                        </p>
                                                        <p className='mt-2 whitespace-pre-line text-sm font-medium text-base-content'>
                                                                {normalizedReason || 'Client không chia sẻ lý do cụ thể.'}
                                                        </p>
                                                </div>
                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>
                                                                Gửi lời nhắn tới client (không bắt buộc)
                                                        </label>
                                                        <textarea
                                                                {...register('reason')}
                                                                className='textarea textarea-bordered min-h-[120px]'
                                                                placeholder={
                                                                        isDecline
                                                                                ? 'Giải thích lý do bạn tiếp tục giữ milestone hoặc đề xuất hướng xử lý khác.'
                                                                                : 'Nếu muốn, hãy chia sẻ thêm về việc đồng ý hủy milestone.'
                                                                }
                                                                disabled={isSubmitting}
                                                        />
                                                        {errors.reason ? (
                                                                <p className='text-xs text-error'>{errors.reason.message}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>
                                                                        Tin nhắn sẽ được gửi kèm phản hồi của bạn tới client.
                                                                </p>
                                                        )}
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>
                                                        Hành động này sẽ được ghi lại trong lịch sử hợp tác giữa hai bên.
                                                </p>
                                                <div className='flex flex-wrap items-center justify-end gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-ghost btn-sm'
                                                                onClick={() => {
                                                                        if (isSubmitting) return
                                                                        reset(buildDefaultValues(action))
                                                                        onClose()
                                                                }}
                                                                disabled={isSubmitting}
                                                        >
                                                                Để sau
                                                        </button>
                                                        <button
                                                                type='submit'
                                                                className={`btn btn-sm gap-2 ${isDecline ? 'btn-error' : 'btn-success'}`}
                                                                disabled={isSubmitting}
                                                        >
                                                                {isSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang gửi...
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                <PrimaryIcon className='size-4' />
                                                                                {primaryLabel}
                                                                        </>
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button
                                        onClick={() => {
                                                if (isSubmitting) return
                                                reset(buildDefaultValues(action))
                                                onClose()
                                        }}
                                        disabled={isSubmitting}
                                >
                                        close
                                </button>
                        </form>
                </dialog>
        )
}

export default RespondMilestoneCancellationDialog
