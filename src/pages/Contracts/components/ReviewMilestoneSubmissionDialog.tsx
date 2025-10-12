import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react'

import {
        ApproveMilestoneSubmissionSchema,
        DeclineMilestoneSubmissionSchema,
        type ApproveMilestoneSubmissionFormValues,
        type DeclineMilestoneSubmissionFormValues
} from '../schemas'

const actionMeta = {
        approve: {
                title: 'Chấp nhận bàn giao',
                description:
                        'Xác nhận bàn giao đạt yêu cầu. Milestone sẽ chuyển sang trạng thái chờ giải ngân.',
                accent: 'text-success',
                Icon: CheckCircle2,
                buttonLabel: 'Chấp nhận'
        },
        decline: {
                title: 'Yêu cầu chỉnh sửa',
                description:
                        'Chia sẻ lý do để freelancer cập nhật lại bàn giao trước khi milestone được duyệt.',
                accent: 'text-warning',
                Icon: XCircle,
                buttonLabel: 'Gửi yêu cầu'
        }
} as const

type ReviewMode = keyof typeof actionMeta

type ReviewMilestoneSubmissionDialogProps = {
        open: boolean
        mode: ReviewMode
        milestoneTitle?: string
        submissionMessage?: string
        isSubmitting?: boolean
        onSubmit: (
                _values:
                        | ApproveMilestoneSubmissionFormValues
                        | DeclineMilestoneSubmissionFormValues
        ) => Promise<void> | void
        onClose: () => void
}

const ReviewMilestoneSubmissionDialog = ({
        open,
        mode,
        milestoneTitle,
        submissionMessage,
        isSubmitting = false,
        onSubmit,
        onClose
}: ReviewMilestoneSubmissionDialogProps) => {
        const meta = actionMeta[mode]
        const Icon = meta.Icon
        const schema =
                mode === 'approve'
                        ? ApproveMilestoneSubmissionSchema
                        : DeclineMilestoneSubmissionSchema

        const {
                register,
                handleSubmit,
                reset,
                watch,
                formState: { errors, isSubmitting: isFormSubmitting }
        } = useForm<
                ApproveMilestoneSubmissionFormValues | DeclineMilestoneSubmissionFormValues
        >({
                resolver: zodResolver(schema) as Resolver<
                        ApproveMilestoneSubmissionFormValues | DeclineMilestoneSubmissionFormValues
                >,
                defaultValues: mode === 'approve' ? { note: '' } : { reason: '' }
        })

        useEffect(() => {
                if (!open) return

                reset(mode === 'approve' ? { note: '' } : { reason: '' })
        }, [open, mode, reset])

        const submit = handleSubmit(async values => {
                const sanitizedValues =
                        mode === 'approve'
                                ? {
                                          note: values.note?.trim() ? values.note.trim() : undefined
                                  }
                                : {
                                          reason: values.reason.trim()
                                  }

                await onSubmit(
                        sanitizedValues as
                                | ApproveMilestoneSubmissionFormValues
                                | DeclineMilestoneSubmissionFormValues
                )
                reset(mode === 'approve' ? { note: '' } : { reason: '' })
        })

        const errorMessage = mode === 'approve' ? errors?.note?.message : errors?.reason?.message
        const declineReason = watch('reason')
        const trimmedReason =
                typeof declineReason === 'string' ? declineReason.trim() : undefined
        const isExternalSubmitting = isSubmitting || isFormSubmitting
        const isSubmitDisabled =
                isExternalSubmitting || (mode === 'decline' && !trimmedReason?.length)

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-xl flex-col gap-0 overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-start gap-3 rounded-t-3xl bg-base-200/60 px-6 py-5'>
                                        <Icon className={`size-6 ${meta.accent}`} />
                                        <div className='flex-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-base-content/60'>Đánh giá bàn giao</p>
                                                <h3 className='text-lg font-semibold text-base-content'>{meta.title}</h3>
                                                <p className='mt-1 text-xs text-base-content/70'>{meta.description}</p>
                                                {milestoneTitle && (
                                                        <p className='mt-2 text-sm text-base-content/80'>Milestone: <span className='font-semibold text-base-content'>{milestoneTitle}</span></p>
                                                )}
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isExternalSubmitting) return
                                                        onClose()
                                                }}
                                                aria-label='Đóng đánh giá bàn giao'
                                                disabled={isExternalSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        {submissionMessage && (
                                                <div className='space-y-2 border-b border-base-200 bg-base-100 px-6 py-5'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-base-content/50'>Nội dung bàn giao</p>
                                                        <div className='rounded-2xl border border-base-200 bg-base-100/80 px-4 py-3 text-sm text-base-content/80'>
                                                                {submissionMessage}
                                                        </div>
                                                </div>
                                        )}

                                        <div className='space-y-2 px-6 py-5'>
                                                <label className='text-sm font-semibold text-base-content'>
                                                        {mode === 'approve' ? 'Ghi chú cho freelancer (không bắt buộc)' : 'Lý do yêu cầu chỉnh sửa'}
                                                </label>
                                                <textarea
                                                        {...register(mode === 'approve' ? 'note' : 'reason')}
                                                        className='textarea textarea-bordered min-h-[120px]'
                                                        placeholder={
                                                                mode === 'approve'
                                                                        ? 'Ví dụ: Cảm ơn bạn! Hãy chuẩn bị triển khai bước tiếp theo.'
                                                                        : 'Ví dụ: Cần bổ sung trạng thái loading và cập nhật tài liệu hướng dẫn.'
                                                        }
                                                        disabled={isExternalSubmitting}
                                                />
                                                {errorMessage ? (
                                                        <p className='text-xs text-error'>{errorMessage}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>
                                                                {mode === 'approve'
                                                                        ? 'Thông tin này sẽ được gửi tới freelancer cùng quyết định duyệt.'
                                                                        : 'Giải thích cụ thể giúp freelancer cập nhật bàn giao nhanh hơn.'}
                                                        </p>
                                                )}
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>Bạn có thể cập nhật quyết định này sau khi freelancer gửi lại bàn giao mới.</p>
                                                <div className='flex flex-wrap items-center justify-end gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-ghost btn-sm'
                                                                onClick={() => {
                                                                        if (isExternalSubmitting) return
                                                                        onClose()
                                                                }}
                                                                disabled={isExternalSubmitting}
                                                        >
                                                                Hủy
                                                        </button>
                                                        <button
                                                                type='submit'
                                                                className={`btn btn-sm gap-2 ${mode === 'approve' ? 'btn-success' : 'btn-warning'}`}
                                                                disabled={isSubmitDisabled}
                                                        >
                                                                {isExternalSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang gửi...
                                                                        </>
                                                                ) : (
                                                                        meta.buttonLabel
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                </dialog>
        )
}

export default ReviewMilestoneSubmissionDialog
