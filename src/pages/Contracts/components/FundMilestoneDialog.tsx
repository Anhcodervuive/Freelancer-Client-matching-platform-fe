import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCard, Loader2, RefreshCw, X } from 'lucide-react'

import type { PaymentMethod } from '~/types/payment-method'

import { PayMilestoneSchema, type PayMilestoneFormValues } from '../schemas'

const generateIdempotencyKey = () => {
        const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

        if (cryptoObj?.randomUUID) {
                return cryptoObj.randomUUID()
        }

        return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
}

type FundMilestoneDialogProps = {
        open: boolean
        milestoneTitle?: string
        amountLabel?: string
        paymentMethods: PaymentMethod[]
        isLoadingPaymentMethods?: boolean
        isSubmitting?: boolean
        onRefreshPaymentMethods?: () => void
        onSubmit: (_values: PayMilestoneFormValues) => Promise<void> | void
        onClose: () => void
}

const formatPaymentMethodLabel = (method: PaymentMethod) => {
        const brand = method.brand ? method.brand.toUpperCase() : 'Card'
        const last4 = method.last4 ? `•••• ${method.last4}` : '••••'
        const expMonth = method.expMonth ? method.expMonth.toString().padStart(2, '0') : '--'
        const expYear = method.expYear ? method.expYear.toString().slice(-2) : '--'
        return `${brand} ${last4} · ${expMonth}/${expYear}`
}

const createDefaultPayMilestoneValues = () => ({
        paymentMethodId: '',
        note: '',
        idempotencyKey: generateIdempotencyKey()
})

const FundMilestoneDialog = ({
        open,
        milestoneTitle,
        amountLabel,
        paymentMethods,
        isLoadingPaymentMethods = false,
        isSubmitting = false,
        onRefreshPaymentMethods,
        onSubmit,
        onClose
}: FundMilestoneDialogProps) => {
        const {
                register,
                handleSubmit,
                reset,
                formState: { errors }
        } = useForm<PayMilestoneFormValues>({
                resolver: zodResolver(PayMilestoneSchema) as Resolver<PayMilestoneFormValues>,
                defaultValues: createDefaultPayMilestoneValues()
        })

        useEffect(() => {
                if (!open) return
                reset(createDefaultPayMilestoneValues())
        }, [open, reset])

        const submit = handleSubmit(async values => {
                await onSubmit(values)
                reset(createDefaultPayMilestoneValues())
        })

        const paymentMethodError = errors.paymentMethodId?.message
        const noteError = errors.note?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-start gap-3 rounded-t-3xl bg-primary/10 px-6 py-5'>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary'>
                                                <CreditCard className='size-5' />
                                        </div>
                                        <div className='flex-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/80'>Giải ngân milestone</p>
                                                <h3 className='text-lg font-semibold text-base-content'>Chọn phương thức thanh toán</h3>
                                                {milestoneTitle && (
                                                        <p className='mt-1 text-sm text-base-content/70'>Milestone: <span className='font-semibold text-base-content'>{milestoneTitle}</span></p>
                                                )}
                                                {amountLabel && (
                                                        <p className='text-sm text-base-content/60'>Số tiền: <span className='font-semibold text-base-content'>{amountLabel}</span></p>
                                                )}
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isSubmitting) return
                                                        onClose()
                                                }}
                                                aria-label='Đóng giải ngân milestone'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-col gap-0'>
                                        <input type='hidden' {...register('idempotencyKey')} />

                                        <div className='space-y-4 px-6 py-6'>
                                                <div className='flex items-center justify-between'>
                                                        <h4 className='text-sm font-semibold text-base-content'>Phương thức thanh toán</h4>
                                                        {onRefreshPaymentMethods && (
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-ghost btn-xs gap-2'
                                                                        onClick={() => {
                                                                                if (isLoadingPaymentMethods) return
                                                                                onRefreshPaymentMethods()
                                                                        }}
                                                                        disabled={isLoadingPaymentMethods}
                                                                >
                                                                        <RefreshCw className={`size-3.5 ${isLoadingPaymentMethods ? 'animate-spin' : ''}`} />
                                                                        Làm mới
                                                                </button>
                                                        )}
                                                </div>

                                                {isLoadingPaymentMethods ? (
                                                        <div className='flex items-center gap-2 rounded-2xl border border-dashed border-base-200 bg-base-100 px-4 py-6 text-sm text-base-content/70'>
                                                                <Loader2 className='size-4 animate-spin text-primary' />
                                                                Đang tải phương thức thanh toán...
                                                        </div>
                                                ) : paymentMethods.length ? (
                                                        <ul className='space-y-2'>
                                                                {paymentMethods.map(method => (
                                                                        <li key={method.id} className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                                                                <label className='flex cursor-pointer items-center gap-3'>
                                                                                        <input
                                                                                                type='radio'
                                                                                                value={method.paymentMethodId}
                                                                                                className='radio radio-primary'
                                                                                                {...register('paymentMethodId')}
                                                                                                disabled={isSubmitting}
                                                                                        />
                                                                                        <div>
                                                                                                <p className='text-sm font-semibold text-base-content'>{formatPaymentMethodLabel(method)}</p>
                                                                                                <p className='text-xs text-base-content/60'>Tên chủ thẻ: {method.firstName} {method.lastName}</p>
                                                                                                {method.isDefault && (
                                                                                                        <span className='badge badge-soft badge-sm mt-1 rounded-full bg-primary/10 text-primary'>Mặc định</span>
                                                                                                )}
                                                                                        </div>
                                                                                </label>
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                ) : (
                                                        <div className='space-y-2 rounded-2xl border border-dashed border-base-200 bg-base-100 px-4 py-6 text-sm text-base-content/70'>
                                                                <p>Chưa có phương thức thanh toán. Vui lòng thêm thẻ trong mục Billing & payments trước khi giải ngân.</p>
                                                        </div>
                                                )}
                                                {paymentMethodError ? (
                                                        <p className='text-xs text-error'>{paymentMethodError}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>Chọn thẻ bạn muốn sử dụng để thanh toán milestone này.</p>
                                                )}

                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Ghi chú cho freelancer (không bắt buộc)</label>
                                                        <textarea
                                                                {...register('note')}
                                                                className='textarea textarea-bordered min-h-[100px]'
                                                                placeholder='Ví dụ: Giải ngân cho milestone thiết kế. Hẹn bạn ở giai đoạn tiếp theo!'
                                                                disabled={isSubmitting}
                                                        />
                                                        {noteError ? (
                                                                <p className='text-xs text-error'>{noteError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Ghi chú sẽ được gửi kèm thông báo giải ngân.</p>
                                                        )}
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>Số tiền sẽ được giữ an toàn cho đến khi milestone được hoàn tất trên hệ thống.</p>
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
                                                                Hủy
                                                        </button>
                                                        <button
                                                                type='submit'
                                                                className='btn btn-primary btn-sm gap-2'
                                                                disabled={isSubmitting || (!paymentMethods.length && !isLoadingPaymentMethods)}
                                                        >
                                                                {isSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang thanh toán...
                                                                        </>
                                                                ) : (
                                                                        'Giải ngân'
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                </dialog>
        )
}

export default FundMilestoneDialog
