import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { CURRENCY_CODES } from '~/constants/job'

const JobOfferFormSchema = z
        .object({
                title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(255, 'Tiêu đề tối đa 255 ký tự'),
                message: z
                        .preprocess(value => {
                                if (value === undefined || value === null) return undefined
                                if (typeof value !== 'string') return value
                                const trimmed = value.trim()
                                return trimmed.length === 0 ? undefined : trimmed
                        }, z.string().max(5000, 'Tin nhắn quá dài').optional())
                        .optional(),
                currency: z
                        .string()
                        .trim()
                        .length(3, 'Currency phải có 3 ký tự')
                        .transform(value => value.toUpperCase()),
                fixedPrice: z.preprocess(value => {
                        if (typeof value === 'number') return value
                        if (typeof value === 'string') {
                                const trimmed = value.trim()
                                if (!trimmed) return undefined
                                const parsed = Number(trimmed)
                                return Number.isNaN(parsed) ? NaN : parsed
                        }
                        return value
                }, z.number().positive('Giá phải lớn hơn 0')),
                startDate: z
                        .preprocess(value => {
                                if (value === undefined || value === null) return undefined
                                if (typeof value === 'string' && value.trim() === '') return undefined
                                return value
                        }, z.string().optional())
                        .optional(),
                expireAt: z
                        .preprocess(value => {
                                if (value === undefined || value === null) return undefined
                                if (typeof value === 'string' && value.trim() === '') return undefined
                                return value
                        }, z.string().optional())
                        .optional(),
                sendNow: z.boolean().optional()
        })
        .superRefine((data, ctx) => {
                const startDate = data.startDate ? new Date(data.startDate) : undefined
                const expireAt = data.expireAt ? new Date(data.expireAt) : undefined

                if (expireAt && Number.isNaN(expireAt.getTime())) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt không hợp lệ',
                                path: ['expireAt']
                        })
                }

                if (startDate && Number.isNaN(startDate.getTime())) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate không hợp lệ',
                                path: ['startDate']
                        })
                }

                if (expireAt && expireAt.getTime() <= Date.now()) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt phải ở tương lai',
                                path: ['expireAt']
                        })
                }

                if (startDate && expireAt && startDate > expireAt) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước expireAt',
                                path: ['startDate']
                        })
                }
        })

export type JobOfferFormValues = z.infer<typeof JobOfferFormSchema>

type JobOfferFormProps = {
        mode: 'create' | 'edit'
        defaultValues?: Partial<JobOfferFormValues>
        onSubmit: (_values: JobOfferFormValues) => Promise<void> | void
        isSubmitting?: boolean
        submitLabel: string
        onCancel?: () => void
        showSendNowToggle?: boolean
        title?: string
        description?: string
        footer?: React.ReactNode
}

const normalizeDateInput = (value?: string | null) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        return local.toISOString().slice(0, 16)
}

export const JobOfferForm = ({
        mode,
        defaultValues,
        onSubmit,
        isSubmitting,
        submitLabel,
        onCancel,
        showSendNowToggle = true,
        title: heading,
        description,
        footer
}: JobOfferFormProps) => {
        const {
                control,
                handleSubmit,
                reset,
                formState: { errors }
        } = useForm<JobOfferFormValues>({
                resolver: zodResolver(JobOfferFormSchema) as Resolver<JobOfferFormValues>,
                defaultValues: {
                        title: defaultValues?.title ?? '',
                        message: defaultValues?.message ?? undefined,
                        currency: defaultValues?.currency ?? 'USD',
                        fixedPrice: defaultValues?.fixedPrice ?? undefined,
                        startDate: defaultValues?.startDate ?? undefined,
                        expireAt: defaultValues?.expireAt ?? undefined,
                        sendNow: defaultValues?.sendNow ?? true
                }
        })

        useEffect(() => {
                reset({
                        title: defaultValues?.title ?? '',
                        message: defaultValues?.message ?? undefined,
                        currency: defaultValues?.currency ?? 'USD',
                        fixedPrice: defaultValues?.fixedPrice ?? undefined,
                        startDate: defaultValues?.startDate ?? undefined,
                        expireAt: defaultValues?.expireAt ?? undefined,
                        sendNow: defaultValues?.sendNow ?? true
                })
        }, [
                defaultValues?.currency,
                defaultValues?.expireAt,
                defaultValues?.fixedPrice,
                defaultValues?.message,
                defaultValues?.sendNow,
                defaultValues?.startDate,
                defaultValues?.title,
                reset
        ])

        const handleFormSubmit = (values: JobOfferFormValues) => {
                onSubmit(values)
        }

        return (
                <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
                        <div className='space-y-2'>
                                <h2 className='text-xl font-semibold text-base-content'>
                                        {heading ?? (mode === 'create' ? 'Tạo job offer' : 'Cập nhật job offer')}
                                </h2>
                                <p className='text-sm text-base-content/70'>
                                        {description ??
                                                'Điền các điều khoản công việc mà bạn muốn đề xuất. Bạn có thể gửi ngay cho freelancer hoặc lưu lại.'}
                                </p>
                        </div>

                        <div className='space-y-2'>
                                <label className='text-sm font-medium text-base-content' htmlFor='title'>
                                        Tiêu đề offer
                                </label>
                                <Controller
                                        name='title'
                                        control={control}
                                        render={({ field }) => (
                                                <input
                                                        {...field}
                                                        id='title'
                                                        type='text'
                                                        value={field.value ?? ''}
                                                        placeholder='Ví dụ: Offer hợp tác phát triển website'
                                                        className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                />
                                        )}
                                />
                                {errors.title && <p className='text-xs text-error'>{errors.title.message}</p>}
                        </div>

                        <div className='space-y-2'>
                                <label className='text-sm font-medium text-base-content' htmlFor='message'>
                                        Lời nhắn
                                        <span className='font-normal text-base-content/60'> (tùy chọn)</span>
                                </label>
                                <Controller
                                        name='message'
                                        control={control}
                                        render={({ field }) => (
                                                <textarea
                                                        {...field}
                                                        id='message'
                                                        rows={5}
                                                        value={field.value ?? ''}
                                                        placeholder='Chia sẻ thêm kỳ vọng hoặc chi tiết bạn muốn freelancer biết.'
                                                        className='textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100 text-sm text-base-content'
                                                />
                                        )}
                                />
                                {errors.message && <p className='text-xs text-error'>{errors.message.message}</p>}
                        </div>

                        <div className='grid gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='fixedPrice'>
                                                Giá trọn gói
                                        </label>
                                        <Controller
                                                name='fixedPrice'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='fixedPrice'
                                                                type='number'
                                                                min={0}
                                                                step='0.01'
                                                                value={
                                                                        field.value === undefined || field.value === null
                                                                                ? ''
                                                                                : field.value
                                                                }
                                                                onChange={event => {
                                                                        const raw = event.target.value
                                                                        if (raw === '') {
                                                                                field.onChange(undefined)
                                                                                return
                                                                        }
                                                                        const next = Number(raw)
                                                                        field.onChange(Number.isNaN(next) ? field.value : next)
                                                                }}
                                                                className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                        />
                                                )}
                                        />
                                        {errors.fixedPrice && <p className='text-xs text-error'>{errors.fixedPrice.message}</p>}
                                </div>

                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='currency'>
                                                Đơn vị tiền tệ
                                        </label>
                                        <Controller
                                                name='currency'
                                                control={control}
                                                render={({ field }) => (
                                                        <select
                                                                {...field}
                                                                id='currency'
                                                                className='select select-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                        >
                                                                {CURRENCY_CODES.map(code => (
                                                                        <option key={code} value={code}>
                                                                                {code}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                )}
                                        />
                                        {errors.currency && <p className='text-xs text-error'>{errors.currency.message}</p>}
                                </div>
                        </div>

                        <div className='grid gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='startDate'>
                                                Ngày bắt đầu dự kiến
                                        </label>
                                        <Controller
                                                name='startDate'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='startDate'
                                                                type='datetime-local'
                                                                value={normalizeDateInput(field.value ?? undefined)}
                                                                onChange={event => field.onChange(event.target.value)}
                                                                className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                        />
                                                )}
                                        />
                                        {errors.startDate && <p className='text-xs text-error'>{errors.startDate.message}</p>}
                                </div>

                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content' htmlFor='expireAt'>
                                                Hạn phản hồi
                                        </label>
                                        <Controller
                                                name='expireAt'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='expireAt'
                                                                type='datetime-local'
                                                                value={normalizeDateInput(field.value ?? undefined)}
                                                                onChange={event => field.onChange(event.target.value)}
                                                                className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                        />
                                                )}
                                        />
                                        {errors.expireAt && <p className='text-xs text-error'>{errors.expireAt.message}</p>}
                                </div>
                        </div>

                        {showSendNowToggle ? (
                                <div className='flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-4'>
                                        <Controller
                                                name='sendNow'
                                                control={control}
                                                render={({ field }) => (
                                                        <input
                                                                {...field}
                                                                id='sendNow'
                                                                type='checkbox'
                                                                className='toggle toggle-primary'
                                                                checked={Boolean(field.value)}
                                                                onChange={event => field.onChange(event.target.checked)}
                                                        />
                                                )}
                                        />
                                        <div className='space-y-1'>
                                                <label htmlFor='sendNow' className='text-sm font-medium text-base-content'>
                                                        Gửi offer ngay cho freelancer
                                                </label>
                                                <p className='text-xs text-base-content/60'>Nếu tắt, offer sẽ lưu dạng draft.</p>
                                        </div>
                                </div>
                        ) : null}

                        <div className='flex flex-wrap items-center justify-end gap-3 border-t border-base-200 pt-4'>
                                {onCancel ? (
                                        <button
                                                type='button'
                                                className='btn btn-ghost'
                                                onClick={onCancel}
                                                disabled={isSubmitting}
                                        >
                                                Hủy
                                        </button>
                                ) : null}
                                <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : null}
                                        {isSubmitting ? 'Đang lưu…' : submitLabel}
                                </button>
                        </div>

                        {footer}
                </form>
        )
}

export default JobOfferForm
