import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Star, XCircle, X } from 'lucide-react'

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
        submissionReviewNote?: string | null
        submissionReviewRating?: number | null
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
        submissionReviewNote,
        submissionReviewRating,
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

        const [hoverRating, setHoverRating] = useState<number | null>(null)
        const normalizedInitialRating =
                typeof submissionReviewRating === 'number' && submissionReviewRating >= 1 && submissionReviewRating <= 5
                        ? submissionReviewRating
                        : undefined
        const normalizedInitialNote = submissionReviewNote?.trim() ?? ''

        const {
                control,
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
                defaultValues: {
                        reviewNote: normalizedInitialNote,
                        reviewRating: normalizedInitialRating
                }
        })

        useEffect(() => {
                if (!open) return

                reset({
                        reviewNote: normalizedInitialNote,
                        reviewRating: normalizedInitialRating
                })
                setHoverRating(null)
        }, [open, mode, normalizedInitialNote, normalizedInitialRating, reset])

        const submit = handleSubmit(async values => {
                const trimmedNote = values.reviewNote?.trim() ?? ''

                if (mode === 'approve') {
                        await onSubmit({
                                reviewRating: values.reviewRating,
                                reviewNote: trimmedNote ? trimmedNote : undefined
                        } as ApproveMilestoneSubmissionFormValues)
                } else {
                        await onSubmit({
                                reviewNote: trimmedNote,
                                ...(typeof values.reviewRating === 'number'
                                        ? { reviewRating: values.reviewRating }
                                        : {})
                        } as DeclineMilestoneSubmissionFormValues)
                }

                reset({ reviewNote: '', reviewRating: undefined })
        })

        const reviewNoteError = errors?.reviewNote?.message
        const reviewRatingError = errors?.reviewRating?.message
        const reviewNoteValue = watch('reviewNote')
        const reviewRatingValue = watch('reviewRating')
        const trimmedReviewNote =
                typeof reviewNoteValue === 'string' ? reviewNoteValue.trim() : ''
        const isExternalSubmitting = isSubmitting || isFormSubmitting
        const isSubmitDisabled =
                isExternalSubmitting ||
                (mode === 'decline' && trimmedReviewNote.length === 0) ||
                (mode === 'approve' && typeof reviewRatingValue !== 'number')

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
                                                        Đánh giá chất lượng bàn giao {mode === 'approve' ? '(bắt buộc)' : '(không bắt buộc)'}
                                                </label>
                                                <Controller
                                                        control={control}
                                                        name='reviewRating'
                                                        render={({ field }) => {
                                                                const selectedRating =
                                                                        typeof field.value === 'number' ? field.value : undefined
                                                                const highlightedRating = hoverRating ?? selectedRating ?? 0

                                                                return (
                                                                        <div className='flex flex-wrap items-center gap-3'>
                                                                                <div className='flex items-center gap-1'>
                                                                                        {[1, 2, 3, 4, 5].map(value => {
                                                                                                const isActive = value <= highlightedRating

                                                                                                return (
                                                                                                        <button
                                                                                                                key={value}
                                                                                                                type='button'
                                                                                                                className={`rounded-full p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400 ${
                                                                                                                        isActive
                                                                                                                                ? 'text-amber-500'
                                                                                                                                : 'text-base-content/30 hover:text-amber-400'
                                                                                                                } ${
                                                                                                                        isExternalSubmitting
                                                                                                                                ? 'cursor-not-allowed opacity-60'
                                                                                                                                : ''
                                                                                                                }`}
                                                                                                                onClick={() => {
                                                                                                                        if (isExternalSubmitting) return
                                                                                                                        setHoverRating(null)
                                                                                                                        field.onChange(value)
                                                                                                                }}
                                                                                                                onMouseEnter={() => {
                                                                                                                        if (isExternalSubmitting) return
                                                                                                                        setHoverRating(value)
                                                                                                                }}
                                                                                                                onMouseLeave={() => {
                                                                                                                        if (isExternalSubmitting) return
                                                                                                                        setHoverRating(null)
                                                                                                                }}
                                                                                                                aria-label={`Đánh giá ${value} sao`}
                                                                                                                aria-pressed={selectedRating === value}
                                                                                                                disabled={isExternalSubmitting}
                                                                                                        >
                                                                                                                <Star
                                                                                                                        className='size-5'
                                                                                                                        strokeWidth={1.5}
                                                                                                                        fill={isActive ? 'currentColor' : 'none'}
                                                                                                                />
                                                                                                        </button>
                                                                                                )
                                                                                        })}
                                                                                </div>
                                                                                {mode === 'decline' && typeof selectedRating === 'number' ? (
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-ghost btn-xs'
                                                                                                onClick={() => {
                                                                                                        if (isExternalSubmitting) return
                                                                                                        setHoverRating(null)
                                                                                                        field.onChange(undefined)
                                                                                                }}
                                                                                                disabled={isExternalSubmitting}
                                                                                        >
                                                                                                Bỏ đánh giá
                                                                                        </button>
                                                                                ) : null}
                                                                        </div>
                                                                )
                                                        }}
                                                />
                                                {reviewRatingError ? (
                                                        <p className='text-xs text-error'>{reviewRatingError}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>
                                                                {mode === 'approve'
                                                                        ? 'Hãy chấm điểm để hệ thống ghi nhận mức độ hài lòng của bạn.'
                                                                        : 'Bạn có thể chấm điểm nếu muốn chia sẻ thêm phản hồi với freelancer.'}
                                                        </p>
                                                )}
                                        </div>

                                        <div className='space-y-2 border-t border-base-200 px-6 py-5'>
                                                <label className='text-sm font-semibold text-base-content'>
                                                        {mode === 'approve'
                                                                ? 'Ghi chú cho freelancer (không bắt buộc)'
                                                                : 'Lý do yêu cầu chỉnh sửa (bắt buộc)'}
                                                </label>
                                                <textarea
                                                        {...register('reviewNote')}
                                                        className='textarea textarea-bordered min-h-[120px]'
                                                        placeholder={
                                                                mode === 'approve'
                                                                        ? 'Ví dụ: Cảm ơn bạn! Hãy chuẩn bị triển khai bước tiếp theo.'
                                                                        : 'Ví dụ: Cần bổ sung trạng thái loading và cập nhật tài liệu hướng dẫn.'
                                                        }
                                                        disabled={isExternalSubmitting}
                                                />
                                                {reviewNoteError ? (
                                                        <p className='text-xs text-error'>{reviewNoteError}</p>
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
