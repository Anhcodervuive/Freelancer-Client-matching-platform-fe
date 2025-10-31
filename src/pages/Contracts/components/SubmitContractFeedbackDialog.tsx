import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MessageCircle, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react'

import { SubmitContractFeedbackSchema, type SubmitContractFeedbackFormValues } from '../schemas'

type SubmitContractFeedbackDialogProps = {
        open: boolean
        partnerName?: string
        isSubmitting?: boolean
        initialRating?: number | null
        initialComment?: string | null
        initialWouldHireAgain?: boolean | null
        mode?: 'create' | 'edit'
        submitLabel?: string
        footerHint?: string
        onSubmit: (_values: SubmitContractFeedbackFormValues) => Promise<void> | void
        onClose: () => void
}

const defaultValues: Partial<SubmitContractFeedbackFormValues> = {
        rating: undefined,
        comment: '',
        wouldHireAgain: undefined
}

const SubmitContractFeedbackDialog = ({
        open,
        partnerName,
        isSubmitting = false,
        initialRating,
        initialComment,
        initialWouldHireAgain,
        mode = 'create',
        submitLabel,
        footerHint,
        onSubmit,
        onClose
}: SubmitContractFeedbackDialogProps) => {
        const normalizedInitialRating =
                typeof initialRating === 'number' && initialRating >= 1 && initialRating <= 5
                        ? initialRating
                        : undefined
        const normalizedInitialComment = initialComment?.trim() ?? ''
        const normalizedInitialWouldHireAgain =
                typeof initialWouldHireAgain === 'boolean' ? initialWouldHireAgain : undefined

        const [hoverRating, setHoverRating] = useState<number | null>(null)

        const {
                control,
                register,
                handleSubmit,
                reset,
                watch,
                formState: { errors, isSubmitting: isFormSubmitting }
        } = useForm<SubmitContractFeedbackFormValues>({
                resolver: zodResolver(SubmitContractFeedbackSchema) as Resolver<SubmitContractFeedbackFormValues>,
                defaultValues: {
                        ...defaultValues,
                        rating: normalizedInitialRating,
                        comment: normalizedInitialComment,
                        wouldHireAgain: normalizedInitialWouldHireAgain
                }
        })

        useEffect(() => {
                if (!open) return

                reset({
                        rating: normalizedInitialRating,
                        comment: normalizedInitialComment,
                        wouldHireAgain: normalizedInitialWouldHireAgain
                })
                setHoverRating(null)
        }, [open, normalizedInitialComment, normalizedInitialRating, normalizedInitialWouldHireAgain, reset])

        const submit = handleSubmit(async values => {
                await onSubmit({
                        rating: values.rating,
                        comment: values.comment?.trim() ? values.comment.trim() : undefined,
                        wouldHireAgain:
                                typeof values.wouldHireAgain === 'boolean' ? values.wouldHireAgain : undefined
                })
                reset(defaultValues)
        })

        const ratingError = errors.rating?.message
        const commentError = errors.comment?.message
        const commentValue = watch('comment')
        const selectedRating = watch('rating')
        const trimmedComment = typeof commentValue === 'string' ? commentValue.trim() : ''
        const isExternalSubmitting = isSubmitting || isFormSubmitting
        const isSubmitDisabled = isExternalSubmitting || typeof selectedRating !== 'number'
        const resolvedSubmitLabel = submitLabel ?? (mode === 'edit' ? 'Lưu thay đổi' : 'Gửi đánh giá')
        const resolvedFooterHint =
                footerHint ??
                (mode === 'edit'
                        ? 'Bạn chỉ có thể chỉnh sửa hoặc xóa đánh giá trong vòng 2 ngày kể từ khi gửi.'
                        : 'Bạn có thể chỉnh sửa hoặc xóa đánh giá trong vòng 2 ngày sau khi gửi.')
        const dialogTitle = mode === 'edit' ? 'Cập nhật đánh giá hợp đồng' : 'Chia sẻ trải nghiệm cộng tác'

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-start gap-3 rounded-t-3xl bg-primary/10 px-6 py-5'>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
                                                <Star className='size-5' />
                                        </div>
                                        <div className='flex-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/80'>Đánh giá hợp đồng</p>
                                                <h3 className='text-lg font-semibold text-base-content'>{dialogTitle}</h3>
                                                <p className='mt-1 text-xs text-base-content/70'>Đánh giá của bạn giúp cải thiện trải nghiệm làm việc đôi bên và xây dựng niềm tin trong cộng đồng.</p>
                                                {partnerName && (
                                                        <p className='mt-2 text-sm text-base-content/80'>Đối tác: <span className='font-semibold text-base-content'>{partnerName}</span></p>
                                                )}
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isExternalSubmitting) return
                                                        onClose()
                                                }}
                                                aria-label='Đóng đánh giá hợp đồng'
                                                disabled={isExternalSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        <div className='space-y-5 px-6 py-6'>
                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Đánh giá tổng thể (bắt buộc)</label>
                                                        <Controller
                                                                control={control}
                                                                name='rating'
                                                                render={({ field }) => {
                                                                        const currentRating = typeof field.value === 'number' ? field.value : undefined
                                                                        const highlightedRating = hoverRating ?? currentRating ?? 0

                                                                        return (
                                                                                <div className='flex flex-wrap items-center gap-3'>
                                                                                        <div className='flex items-center gap-1'>
                                                                                                {[1, 2, 3, 4, 5].map(value => {
                                                                                                        const isActive = value <= highlightedRating
                                                                                                        return (
                                                                                                                <button
                                                                                                                        key={value}
                                                                                                                        type='button'
                                                                                                                        className={`rounded-full p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 ${
                                                                                                                                isActive
                                                                                                                                        ? 'text-amber-500'
                                                                                                                                        : 'text-base-content/30 hover:text-amber-400'
                                                                                                                        } ${
                                                                                                                                isExternalSubmitting ? 'pointer-events-none opacity-60' : ''
                                                                                                                        }`}
                                                                                                                        onMouseEnter={() => setHoverRating(value)}
                                                                                                                        onMouseLeave={() => setHoverRating(null)}
                                                                                                                        onClick={() => {
                                                                                                                                if (isExternalSubmitting) return
                                                                                                                                field.onChange(value)
                                                                                                                        }}
                                                                                                                        disabled={isExternalSubmitting}
                                                                                                                        aria-label={`Đánh giá ${value} sao`}
                                                                                                                >
                                                                                                                        <Star
                                                                                                                                className={`size-8 ${isActive ? '' : 'stroke-[1.5]'}`}
                                                                                                                                fill={isActive ? 'currentColor' : 'none'}
                                                                                                                        />
                                                                                                                </button>
                                                                                                        )
                                                                                                })}
                                                                                        </div>
                                                                                        {currentRating ? (
                                                                                                <span className='text-sm font-semibold text-amber-600'>{currentRating}/5</span>
                                                                                        ) : (
                                                                                                <span className='text-sm text-base-content/60'>Chọn số sao để đánh giá chất lượng hợp tác</span>
                                                                                        )}
                                                                                </div>
                                                                        )
                                                                }}
                                                        />
                                                        {ratingError ? (
                                                                <p className='text-xs text-error'>{ratingError}</p>
                                                        ) : null}
                                                </div>

                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Nhận xét chi tiết (không bắt buộc)</label>
                                                        <div className='relative'>
                                                                <textarea
                                                                        {...register('comment')}
                                                                        className='textarea textarea-bordered min-h-[140px] pr-10'
                                                                        placeholder='Chia sẻ điều bạn hài lòng, những điều cần cải thiện hoặc lưu ý cho lần hợp tác tiếp theo.'
                                                                        disabled={isExternalSubmitting}
                                                                />
                                                                <MessageCircle className='pointer-events-none absolute bottom-3 right-3 size-4 text-base-content/30' />
                                                        </div>
                                                        <div className='flex items-center justify-between text-xs text-base-content/60'>
                                                                {commentError ? <span className='text-error'>{commentError}</span> : <span>Chúng tôi khuyến khích mô tả tối thiểu 10 ký tự.</span>}
                                                                <span>{trimmedComment.length}/2000</span>
                                                        </div>
                                                </div>

                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Bạn có muốn tiếp tục hợp tác trong tương lai?</label>
                                                        <Controller
                                                                control={control}
                                                                name='wouldHireAgain'
                                                                render={({ field }) => {
                                                                        const value = field.value
                                                                        const isYes = value === true
                                                                        const isNo = value === false

                                                                        return (
                                                                                <div className='flex flex-wrap items-center gap-2'>
                                                                                        <button
                                                                                                type='button'
                                                                                                onClick={() => field.onChange(isYes ? undefined : true)}
                                                                                                className={`btn btn-sm gap-2 ${
                                                                                                        isYes ? 'btn-success text-success-content' : 'btn-outline'
                                                                                                }`}
                                                                                                disabled={isExternalSubmitting}
                                                                                        >
                                                                                                <ThumbsUp className='size-4' /> Có
                                                                                        </button>
                                                                                        <button
                                                                                                type='button'
                                                                                                onClick={() => field.onChange(isNo ? undefined : false)}
                                                                                                className={`btn btn-sm gap-2 ${
                                                                                                        isNo ? 'btn-error text-error-content' : 'btn-outline'
                                                                                                }`}
                                                                                                disabled={isExternalSubmitting}
                                                                                        >
                                                                                                <ThumbsDown className='size-4' /> Không
                                                                                        </button>
                                                                                        <button
                                                                                                type='button'
                                                                                                onClick={() => field.onChange(undefined)}
                                                                                                className={`btn btn-sm ${value === undefined ? 'btn-neutral text-neutral-content' : 'btn-ghost'}`}
                                                                                                disabled={isExternalSubmitting}
                                                                                        >
                                                                                                Bỏ qua
                                                                                        </button>
                                                                                </div>
                                                                        )
                                                                }}
                                                        />
                                                        <p className='text-xs text-base-content/60'>Thông tin này chỉ hiển thị với đối tác của bạn để họ hiểu mong muốn cộng tác tiếp theo.</p>
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>{resolvedFooterHint}</p>
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
                                                        <button type='submit' className='btn btn-primary btn-sm gap-2' disabled={isSubmitDisabled}>
                                                                {isExternalSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang gửi...
                                                                        </>
                                                                ) : (
                                                                        resolvedSubmitLabel
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={() => { if (!isExternalSubmitting) onClose() }} disabled={isExternalSubmitting}>
                                        close
                                </button>
                        </form>
                </dialog>
        )
}

export default SubmitContractFeedbackDialog
