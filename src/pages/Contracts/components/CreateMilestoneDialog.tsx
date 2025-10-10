import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Flag, Loader2, X } from 'lucide-react'

import type { CreateContractMilestoneInput } from '~/types/contract'

import {
        CreateContractMilestoneSchema,
        type CreateContractMilestoneFormValues
} from '../schemas'

type CreateMilestoneDialogProps = {
        open: boolean
        defaultCurrency?: string
        isSubmitting?: boolean
        onSubmit: (_values: CreateContractMilestoneInput) => Promise<void> | void
        onClose: () => void
}

const normalizeCurrency = (value?: string) => {
        if (!value) return ''
        return value.slice(0, 3).toUpperCase()
}

const CreateMilestoneDialog = ({
        open,
        defaultCurrency,
        isSubmitting = false,
        onSubmit,
        onClose
}: CreateMilestoneDialogProps) => {
        const {
                control,
                handleSubmit,
                register,
                reset,
                formState: { errors }
        } = useForm<CreateContractMilestoneFormValues>({
                resolver: zodResolver(CreateContractMilestoneSchema) as Resolver<CreateContractMilestoneFormValues>,
                defaultValues: {
                        title: '',
                        amount: undefined as unknown as number,
                        currency: normalizeCurrency(defaultCurrency) || 'USD'
                }
        })

        useEffect(() => {
                if (!open) return
                reset({
                        title: '',
                        amount: undefined as unknown as number,
                        currency: normalizeCurrency(defaultCurrency) || 'USD'
                })
        }, [defaultCurrency, open, reset])

        const closeDialog = () => {
                if (isSubmitting) return
                onClose()
        }

        const submit = handleSubmit(async values => {
                await onSubmit({
                        ...values,
                        currency: values.currency.toUpperCase()
                })
                reset({
                        title: '',
                        amount: undefined as unknown as number,
                        currency: normalizeCurrency(defaultCurrency) || 'USD'
                })
        })

        const titleError = errors.title?.message
        const amountError = errors.amount?.message
        const currencyError = errors.currency?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box w-full max-w-3xl overflow-visible rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-center justify-between rounded-t-3xl bg-primary/10 px-6 py-4'>
                                        <div>
                                                <div className='flex items-center gap-2 text-primary'>
                                                        <Flag className='size-4' />
                                                        <h3 className='text-lg font-semibold text-base-content'>Tạo milestone mới</h3>
                                                </div>
                                                <p className='mt-1 text-xs text-base-content/70'>Chia nhỏ công việc thành các mục tiêu rõ ràng và quản lý việc giải ngân dễ dàng.</p>
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={closeDialog}
                                                aria-label='Đóng tạo milestone'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='space-y-6 px-6 py-6'>
                                        <div className='space-y-2'>
                                                <label className='text-sm font-semibold text-base-content'>Tên milestone</label>
                                                <input
                                                        type='text'
                                                        {...register('title')}
                                                        className='input input-bordered w-full'
                                                        placeholder='Ví dụ: Bàn giao thiết kế trang chủ'
                                                        disabled={isSubmitting}
                                                />
                                                {titleError ? (
                                                        <p className='text-xs text-error'>{titleError}</p>
                                                ) : (
                                                        <p className='text-xs text-base-content/60'>Đặt tên mô tả rõ ràng công việc sẽ hoàn thành trong milestone này.</p>
                                                )}
                                        </div>

                                        <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)]'>
                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Giá trị thanh toán</label>
                                                        <Controller
                                                                control={control}
                                                                name='amount'
                                                                render={({ field }) => (
                                                                        <input
                                                                                type='number'
                                                                                inputMode='decimal'
                                                                                min={0}
                                                                                step='0.01'
                                                                                className='input input-bordered w-full'
                                                                                placeholder='Nhập số tiền'
                                                                                value={field.value === undefined ? '' : field.value}
                                                                                onChange={event => {
                                                                                        const { value } = event.target
                                                                                        if (value === '') {
                                                                                                field.onChange(undefined)
                                                                                                return
                                                                                        }
                                                                                        const parsed = Number(value)
                                                                                        field.onChange(Number.isNaN(parsed) ? field.value : parsed)
                                                                                }}
                                                                                disabled={isSubmitting}
                                                                        />
                                                                )}
                                                        />
                                                        {amountError ? (
                                                                <p className='text-xs text-error'>{amountError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Số tiền sẽ được giải ngân khi milestone được duyệt.</p>
                                                        )}
                                                </div>
                                                <div className='space-y-2'>
                                                        <label className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                                <CalendarClock className='size-4 text-secondary' /> Tiền tệ
                                                        </label>
                                                        <Controller
                                                                control={control}
                                                                name='currency'
                                                                render={({ field }) => (
                                                                        <input
                                                                                type='text'
                                                                                className='input input-bordered w-full uppercase tracking-[0.3em]'
                                                                                maxLength={3}
                                                                                placeholder='USD'
                                                                                value={normalizeCurrency(field.value)}
                                                                                onChange={event => field.onChange(normalizeCurrency(event.target.value))}
                                                                                disabled={isSubmitting}
                                                                        />
                                                                )}
                                                        />
                                                        {currencyError ? (
                                                                <p className='text-xs text-error'>{currencyError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Sử dụng mã tiền tệ gồm 3 ký tự (ví dụ: USD, VND).</p>
                                                        )}
                                                </div>
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/70'>
                                                <p>
                                                        Milestones giúp cả hai bên theo dõi tiến độ và giải ngân minh bạch. Bạn có thể cập nhật hoặc thêm tài liệu bàn giao sau khi tạo.
                                                </p>
                                        </div>

                                        <div className='modal-action mt-8 flex flex-col gap-3 sm:flex-row'>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost flex-1'
                                                        onClick={closeDialog}
                                                        disabled={isSubmitting}
                                                >
                                                        Hủy
                                                </button>
                                                <button
                                                        type='submit'
                                                        className='btn btn-primary flex-1 gap-2'
                                                        disabled={isSubmitting}
                                                >
                                                        {isSubmitting ? (
                                                                <>
                                                                        <Loader2 className='size-4 animate-spin' />
                                                                        Đang tạo...
                                                                </>
                                                        ) : (
                                                                'Tạo milestone'
                                                        )}
                                                </button>
                                        </div>
                                </form>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={closeDialog} disabled={isSubmitting}>
                                        close
                                </button>
                        </form>
                </dialog>
        )
}

export default CreateMilestoneDialog
