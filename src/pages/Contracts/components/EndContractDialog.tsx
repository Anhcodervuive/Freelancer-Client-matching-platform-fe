import { useEffect, useId } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, X } from 'lucide-react'

import type { ContractClosureReasonOption } from '~/types/contract'
import { EndContractSchema, type EndContractFormValues } from '../schemas'

type EndContractDialogProps = {
        open: boolean
        reasonOptions?: ContractClosureReasonOption[] | null
        isSubmitting?: boolean
        onSubmit: (_values: EndContractFormValues) => Promise<void> | void
        onClose: () => void
}

const defaultValues: Partial<EndContractFormValues> = {
        closureReasonOptionId: undefined,
        closureReason: ''
}

const EndContractDialog = ({
        open,
        reasonOptions,
        isSubmitting = false,
        onSubmit,
        onClose
}: EndContractDialogProps) => {
        const normalizedOptions = (reasonOptions ?? []).filter(
                (option): option is ContractClosureReasonOption => Boolean(option?.id && option?.label)
        )

        const detailedReasonId = useId()

        const {
                control,
                register,
                handleSubmit,
                reset,
                formState: { errors }
        } = useForm<EndContractFormValues>({
                resolver: zodResolver(EndContractSchema) as Resolver<EndContractFormValues>,
                defaultValues
        })

        useEffect(() => {
                if (!open) return

                reset(defaultValues)
        }, [open, reset])

        const submit = handleSubmit(async values => {
                await onSubmit({
                        closureReasonOptionId: values.closureReasonOptionId,
                        closureReason: values.closureReason?.trim() || undefined
                })
                reset(defaultValues)
        })

        const closureReasonError = errors.closureReason?.message
        const optionError = errors.closureReasonOptionId?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='rounded-t-3xl bg-warning/10 px-6 py-5'>
                                        <div className='flex flex-wrap items-center gap-4 sm:flex-nowrap'>
                                                <div className='flex items-center gap-3'>
                                                        <div className='flex h-11 w-11 items-center justify-center rounded-full bg-warning/15 text-warning'>
                                                                <AlertTriangle className='size-5' />
                                                        </div>
                                                        <div className='min-w-0'>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-warning/80'>Kết thúc hợp đồng</p>
                                                                <h3 className='text-lg font-semibold text-base-content'>Xác nhận kết thúc hợp đồng</h3>
                                                        </div>
                                                </div>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost btn-sm ml-auto rounded-full self-start sm:self-center'
                                                        onClick={() => {
                                                                if (isSubmitting) return
                                                                onClose()
                                                        }}
                                                        aria-label='Đóng kết thúc hợp đồng'
                                                        disabled={isSubmitting}
                                                >
                                                        <X className='size-4' />
                                                </button>
                                        </div>
                                        <p className='mt-3 text-xs leading-relaxed text-base-content/70'>
                                                Sau khi kết thúc, hợp đồng sẽ chuyển sang trạng thái đóng và hai bên có thể đánh giá lẫn nhau.
                                        </p>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        <div className='space-y-6 px-6 py-6'>
                                                {normalizedOptions.length > 0 && (
                                                        <Controller
                                                                control={control}
                                                                name='closureReasonOptionId'
                                                                render={({ field }) => (
                                                                        <div className='space-y-3'>
                                                                                <label className='text-sm font-semibold text-base-content'>Lý do phổ biến</label>
                                                                                <div className='space-y-2'>
                                                                                        {normalizedOptions.map(option => {
                                                                                                const isActive = field.value === option.id
                                                                                                return (
                                                                                                        <button
                                                                                                                key={option.id}
                                                                                                                type='button'
                                                                                                                onClick={() => field.onChange(isActive ? undefined : option.id)}
                                                                                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-warning/60 ${
                                                                                                                        isActive
                                                                                                                                ? 'border-warning bg-warning/10 text-warning'
                                                                                                                                : 'border-base-200 bg-base-100 hover:border-warning/60 hover:bg-warning/5'
                                                                                                                }`}
                                                                                                                disabled={isSubmitting}
                                                                                                        >
                                                                                                                <p className='text-sm font-semibold'>
                                                                                                                        {option.label}
                                                                                                                </p>
                                                                                                                {option.description ? (
                                                                                                                        <p className='mt-1 text-xs text-base-content/70'>{option.description}</p>
                                                                                                                ) : null}
                                                                                                        </button>
                                                                                                )
                                                                                        })}
                                                                                </div>
                                                                                {optionError ? (
                                                                                        <p className='text-xs text-error'>{optionError}</p>
                                                                                ) : (
                                                                                        <p className='text-xs text-base-content/60'>Bạn có thể chọn một lý do có sẵn hoặc nhập lý do chi tiết hơn bên dưới.</p>
                                                                                )}
                                                                        </div>
                                                                )}
                                                        />
                                                )}

                                                <div className='space-y-2'>
                                                        <label
                                                                htmlFor={detailedReasonId}
                                                                className='block text-sm font-semibold text-base-content'
                                                        >
                                                                Lý do kết thúc chi tiết
                                                        </label>
                                                        <textarea
                                                                {...register('closureReason')}
                                                                id={detailedReasonId}
                                                                className='textarea textarea-bordered min-h-[150px] w-full rounded-2xl border-base-200 bg-base-100 text-base shadow-sm transition focus:border-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/40'
                                                                placeholder='Chia sẻ kết quả hợp tác, những gì đã hoàn thành và lý do muốn kết thúc hợp đồng.'
                                                                disabled={isSubmitting}
                                                        />
                                                        {closureReasonError ? (
                                                                <p className='text-xs text-error'>{closureReasonError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Lý do giúp đối tác và đội ngũ hỗ trợ hiểu rõ bối cảnh kết thúc hợp đồng.</p>
                                                        )}
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                                                <p className='text-xs text-base-content/60'>Hành động này không thể hoàn tác. Hãy chắc chắn trước khi tiếp tục.</p>
                                                <div className='flex items-center justify-end gap-2 sm:gap-3'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-ghost btn-sm'
                                                                onClick={() => {
                                                                        if (isSubmitting) return
                                                                        onClose()
                                                                }}
                                                                disabled={isSubmitting}
                                                        >
                                                                Hủy
                                                        </button>
                                                        <button type='submit' className='btn btn-warning gap-2 rounded-full px-6 text-warning-content shadow-sm disabled:cursor-not-allowed disabled:opacity-70' disabled={isSubmitting}>
                                                                {isSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang kết thúc...
                                                                        </>
                                                                ) : (
                                                                        'Kết thúc hợp đồng'
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

export default EndContractDialog
