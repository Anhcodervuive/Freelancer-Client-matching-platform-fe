import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, CalendarClock, CalendarRange, FileText, Hash, Layers, Plus, Trash2, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import z from 'zod'
import { PLATFORM_TERMS_STATUSES, type PlatformTerm, type PlatformTermsStatus } from '~/types/platform-terms'

const statusSchema = z.enum(PLATFORM_TERMS_STATUSES)

const SectionSchema = z.object({
        code: z
                .string()
                .trim()
                .min(1, 'Vui lòng nhập mã định danh')
                .max(100, 'Mã không được vượt quá 100 ký tự'),
        title: z
                .string()
                .trim()
                .min(1, 'Vui lòng nhập tiêu đề')
                .max(255, 'Tiêu đề không được vượt quá 255 ký tự'),
        version: z
                .string()
                .trim()
                .max(50, 'Phiên bản section không được vượt quá 50 ký tự')
                .optional()
                .or(z.literal('')),
        body: z
                .string()
                .trim()
                .min(1, 'Vui lòng nhập nội dung cho section'),
        metadata: z.string().optional()
})

const FormSchema = z
        .object({
                version: z
                        .string()
                        .trim()
                        .min(1, 'Phiên bản là bắt buộc')
                        .max(100, 'Phiên bản không được vượt quá 100 ký tự'),
                title: z
                        .string()
                        .trim()
                        .min(1, 'Tiêu đề là bắt buộc')
                        .max(255, 'Tiêu đề không được vượt quá 255 ký tự'),
                status: statusSchema.default('DRAFT'),
                effectiveFrom: z.string().optional(),
                effectiveTo: z.string().optional(),
                sections: z
                        .array(SectionSchema)
                        .min(1, 'Cần ít nhất một section để mô tả điều khoản')
                        .max(50, 'Tối đa 50 section trong một điều khoản')
        })
        .superRefine((data, ctx) => {
                if (data.status === 'ACTIVE' && !data.effectiveFrom) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['effectiveFrom'],
                                message: 'Vui lòng cung cấp ngày hiệu lực khi kích hoạt điều khoản'
                        })
                }

                if (data.effectiveFrom && data.effectiveTo) {
                        const from = new Date(data.effectiveFrom)
                        const to = new Date(data.effectiveTo)
                        if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        path: ['effectiveTo'],
                                        message: 'Ngày kết thúc hiệu lực phải sau ngày bắt đầu'
                                })
                        }
                }

                const codes = data.sections.map(section => section.code.trim())
                codes.forEach((code, index) => {
                        if (codes.indexOf(code) !== index) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        path: ['sections', index, 'code'],
                                        message: 'Mã section cần là duy nhất'
                                })
                        }
                })

                data.sections.forEach((section, index) => {
                        if (section.metadata && section.metadata.trim().length > 0) {
                                try {
                                        JSON.parse(section.metadata)
                                } catch (error) {
                                        if (error instanceof Error) {
                                                ctx.addIssue({
                                                        code: z.ZodIssueCode.custom,
                                                        path: ['sections', index, 'metadata'],
                                                        message: 'Metadata phải là JSON hợp lệ'
                                                })
                                        }
                                }
                        }
                })
        })

type FormValues = z.infer<typeof FormSchema>

type NormalizedSection = {
        code: string
        title: string
        body: string
        version?: string
        metadata?: Record<string, unknown>
}

export type PlatformTermFormSubmitPayload = {
        version: string
        title: string
        status: PlatformTermsStatus
        effectiveFrom?: string
        effectiveTo?: string | null
        body: {
                sections: NormalizedSection[]
        }
}

type PlatformTermFormModalProps = {
        open: boolean
        mode: 'create' | 'edit'
        initialTerm?: PlatformTerm
        loading?: boolean
        submitting?: boolean
        onClose: () => void
        onSubmit: (_payload: PlatformTermFormSubmitPayload) => Promise<void>
}

const defaultSection = { code: '', title: '', version: '', body: '', metadata: '' }

const toDateTimeLocalValue = (value?: string | null) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        const offsetMs = date.getTimezoneOffset() * 60000
        return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const normalizeSectionBody = (body: unknown) => {
        if (typeof body === 'string') return body
        try {
                return JSON.stringify(body, null, 2)
        } catch {
                return String(body ?? '')
        }
}

const metadataToString = (metadata: Record<string, unknown> | null | undefined) => {
        if (!metadata) return ''
        try {
                return JSON.stringify(metadata, null, 2)
        } catch {
                return ''
        }
}

const buildDefaultValues = (term?: PlatformTerm): FormValues => {
        if (!term) {
                return {
                        version: '',
                        title: '',
                        status: 'DRAFT',
                        effectiveFrom: '',
                        effectiveTo: '',
                        sections: [defaultSection]
                }
        }

        const sections = Array.isArray(term.body?.sections)
                ? term.body?.sections.map(section => ({
                          code: section.code ?? '',
                          title: section.title ?? '',
                          version: section.version ?? '',
                          body: normalizeSectionBody(section.body),
                          metadata: metadataToString(section.metadata ?? undefined)
                  }))
                : [
                          {
                                  ...defaultSection,
                                  body: normalizeSectionBody(term.body)
                          }
                  ]

        return {
                version: term.version,
                title: term.title,
                status: term.status,
                effectiveFrom: toDateTimeLocalValue(term.effectiveFrom ?? undefined),
                effectiveTo: toDateTimeLocalValue(term.effectiveTo ?? undefined),
                sections: sections.length > 0 ? sections : [defaultSection]
        }
}

export default function PlatformTermFormModal({
        open,
        mode,
        initialTerm,
        loading = false,
        submitting = false,
        onClose,
        onSubmit
}: PlatformTermFormModalProps) {
        const defaultValues = useMemo(() => buildDefaultValues(initialTerm), [initialTerm])

        const {
                register,
                control,
                handleSubmit,
                reset,
                watch,
                formState: { errors }
        } = useForm<FormValues>({
                resolver: zodResolver(FormSchema),
                defaultValues
        })

        const { fields, append, remove } = useFieldArray({ control, name: 'sections' })
        const [expandedSectionIndex, setExpandedSectionIndex] = useState(0)

        useEffect(() => {
                if (open) {
                        reset(buildDefaultValues(initialTerm))
                        setExpandedSectionIndex(0)
                }
        }, [initialTerm, open, reset])

        useEffect(() => {
                setExpandedSectionIndex(prev => {
                        if (fields.length === 0) {
                                return 0
                        }

                        const next = Math.min(prev, fields.length - 1)
                        return next < 0 ? 0 : next
                })
        }, [fields.length])

        const status = watch('status')

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-4xl space-y-6'>
                                <div className='flex items-center justify-between gap-3'>
                                        <div>
                                                <h3 className='text-xl font-semibold flex items-center gap-2'>
                                                        <FileText className='size-5 text-primary' />
                                                        {mode === 'edit' ? 'Chỉnh sửa điều khoản' : 'Tạo điều khoản mới'}
                                                </h3>
                                                <p className='text-sm text-base-content/60'>
                                                        Lưu trữ điều khoản theo từng section với mã định danh để dễ dàng tái sử dụng
                                                        và cập nhật.
                                                </p>
                                        </div>
                                </div>

                                {loading ? (
                                        <div className='grid h-48 place-items-center text-base-content/60'>
                                                Đang tải dữ liệu điều khoản...
                                        </div>
                                ) : (
                                        <form
                                                className='space-y-6'
                                                onSubmit={handleSubmit(async formData => {
                                                        const sections: NormalizedSection[] = formData.sections.map(section => {
                                                                const payload: NormalizedSection = {
                                                                        code: section.code.trim(),
                                                                        title: section.title.trim(),
                                                                        body: section.body.trim()
                                                                }

                                                                if (section.version && section.version.trim().length > 0) {
                                                                        payload.version = section.version.trim()
                                                                }

                                                                if (section.metadata && section.metadata.trim().length > 0) {
                                                                        payload.metadata = JSON.parse(section.metadata)
                                                                }

                                                                return payload
                                                        })

                                                        const effectiveFromIso = formData.effectiveFrom
                                                                ? new Date(formData.effectiveFrom).toISOString()
                                                                : undefined

                                                        const effectiveToIso = formData.effectiveTo
                                                                ? new Date(formData.effectiveTo).toISOString()
                                                                : null

                                                        await onSubmit({
                                                                version: formData.version.trim(),
                                                                title: formData.title.trim(),
                                                                status: formData.status,
                                                                effectiveFrom: effectiveFromIso,
                                                                effectiveTo: formData.effectiveTo !== undefined ? effectiveToIso : undefined,
                                                                body: { sections }
                                                        })
                                                        onClose()
                                                })}
                                        >
                                                <div className='grid gap-5 md:grid-cols-2'>
                                                        <div className='form-control gap-2'>
                                                                <span className='label-text text-sm font-medium flex items-center gap-2'>
                                                                        <Hash className='size-4 text-primary' /> Phiên bản
                                                                </span>
                                                                <input
                                                                        className={`input input-bordered ${
                                                                                errors.version ? 'input-error' : ''
                                                                        }`}
                                                                        placeholder='v1.0'
                                                                        {...register('version')}
                                                                />
                                                                {errors.version && (
                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                {errors.version.message}
                                                                        </span>
                                                                )}
                                                        </div>

                                                        <div className='form-control gap-2'>
                                                                <span className='label-text text-sm font-medium flex items-center gap-2'>
                                                                        <Type className='size-4 text-primary' /> Tiêu đề
                                                                </span>
                                                                <input
                                                                        className={`input input-bordered ${
                                                                                errors.title ? 'input-error' : ''
                                                                        }`}
                                                                        placeholder='Điều khoản sử dụng nền tảng'
                                                                        {...register('title')}
                                                                />
                                                                {errors.title && (
                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                {errors.title.message}
                                                                        </span>
                                                                )}
                                                        </div>

                                                        <div className='form-control gap-2'>
                                                                <span className='label-text text-sm font-medium flex items-center gap-2'>
                                                                        <BadgeCheck className='size-4 text-primary' /> Trạng thái
                                                                </span>
                                                                <select className='select select-bordered' {...register('status')}>
                                                                        {PLATFORM_TERMS_STATUSES.map(statusValue => (
                                                                                <option key={statusValue} value={statusValue}>
                                                                                        {statusValue === 'DRAFT'
                                                                                                ? 'Bản nháp'
                                                                                                : statusValue === 'ACTIVE'
                                                                                                        ? 'Đang hiệu lực'
                                                                                                        : 'Ngừng áp dụng'}
                                                                                </option>
                                                                        ))}
                                                                </select>
                                                                {errors.status && (
                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                {errors.status.message}
                                                                        </span>
                                                                )}
                                                        </div>

                                                        <div className='grid gap-4 sm:grid-cols-2 sm:gap-5'>
                                                                <div className='form-control gap-2'>
                                                                        <span className='label-text text-sm font-medium flex items-center gap-2'>
                                                                                <CalendarClock className='size-4 text-primary' /> Hiệu lực từ
                                                                        </span>
                                                                        <input
                                                                                type='datetime-local'
                                                                                className={`input input-bordered ${
                                                                                        errors.effectiveFrom ? 'input-error' : ''
                                                                                }`}
                                                                                {...register('effectiveFrom')}
                                                                        />
                                                                        {errors.effectiveFrom && (
                                                                                <span className='label-text-alt text-error text-sm'>
                                                                                        {errors.effectiveFrom.message}
                                                                                </span>
                                                                        )}
                                                                </div>

                                                                <div className='form-control gap-2'>
                                                                        <span className='label-text text-sm font-medium flex items-center gap-2'>
                                                                                <CalendarRange className='size-4 text-primary' /> Hiệu lực đến
                                                                        </span>
                                                                        <input
                                                                                type='datetime-local'
                                                                                className={`input input-bordered ${
                                                                                        errors.effectiveTo ? 'input-error' : ''
                                                                                }`}
                                                                                {...register('effectiveTo')}
                                                                        />
                                                                        {errors.effectiveTo && (
                                                                                <span className='label-text-alt text-error text-sm'>
                                                                                        {errors.effectiveTo.message}
                                                                                </span>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>

                                                <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                        <div className='flex items-start justify-between gap-3'>
                                                                <div>
                                                                        <h4 className='font-semibold text-base'>Nội dung section</h4>
                                                                        <p className='text-xs text-base-content/60 max-w-2xl'>
                                                                                Nên chia điều khoản thành các section có mã định danh để tái sử dụng.
                                                                                Ví dụ: <code className='badge badge-ghost'>work</code>,{' '}
                                                                                <code className='badge badge-ghost'>payment</code>,{' '}
                                                                                <code className='badge badge-ghost'>dispute</code>.
                                                                        </p>
                                                                </div>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-sm btn-primary gap-2'
                                                                        onClick={() => {
                                                                                append({ ...defaultSection })
                                                                                setExpandedSectionIndex(fields.length)
                                                                        }}
                                                                >
                                                                        <Plus className='size-4' /> Thêm section
                                                                </button>
                                                        </div>

                                                        <div className='mt-4 join join-vertical w-full space-y-0'>
                                                                {fields.map((field, index) => {
                                                                        const sectionErrors = errors.sections?.[index]
                                                                        const isExpanded = expandedSectionIndex === index

                                                                        return (
                                                                                <div
                                                                                        key={field.id}
                                                                                        className={`collapse collapse-arrow join-item border border-base-300 bg-base-100 ${
                                                                                                isExpanded ? 'collapse-open' : ''
                                                                                        }`}
                                                                                >
                                                                                        <input
                                                                                                type='radio'
                                                                                                name='platform-term-section'
                                                                                                checked={isExpanded}
                                                                                                onChange={() => setExpandedSectionIndex(index)}
                                                                                        />
                                                                                        <div className='collapse-title flex items-center justify-between gap-3 text-sm font-medium uppercase text-base-content/70'>
                                                                                                <div className='flex flex-1 items-center gap-2 truncate'>
                                                                                                        <Layers className='size-4 shrink-0' />
                                                                                                        <span className='truncate'>Section {index + 1}</span>
                                                                                                        {(watch(`sections.${index}.code`) || '').trim().length > 0 && (
                                                                                                                <span className='badge badge-ghost badge-sm truncate'>
                                                                                                                        {watch(`sections.${index}.code`)}
                                                                                                                </span>
                                                                                                        )}
                                                                                                </div>
                                                                                                {fields.length > 1 && (
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-ghost btn-xs text-error gap-1'
                                                                                                                onClick={event => {
                                                                                                                        event.stopPropagation()
                                                                                                                        remove(index)
                                                                                                                        setExpandedSectionIndex(prev => {
                                                                                                                                const nextLength = fields.length - 1

                                                                                                                                if (nextLength <= 0) {
                                                                                                                                        return 0
                                                                                                                                }

                                                                                                                                if (prev === index) {
                                                                                                                                        return Math.max(0, index - 1)
                                                                                                                                }

                                                                                                                                if (prev > index) {
                                                                                                                                        return prev - 1
                                                                                                                                }

                                                                                                                                return prev
                                                                                                                        })
                                                                                                                }}
                                                                                                        >
                                                                                                                <Trash2 className='size-3.5' /> Xóa
                                                                                                        </button>
                                                                                                )}
                                                                                        </div>
                                                                                        <div className='collapse-content space-y-4 border-t border-base-200 pt-4 text-left'>
                                                                                                <div className='grid gap-4 md:grid-cols-2'>
                                                                                                        <div className='form-control gap-2'>
                                                                                                                <span className='label-text text-sm font-medium'>Mã section</span>
                                                                                                                <input
                                                                                                                        className={`input input-bordered ${
                                                                                                                                sectionErrors?.code ? 'input-error' : ''
                                                                                                                        }`}
                                                                                                                        placeholder='work'
                                                                                                                        {...register(`sections.${index}.code` as const)}
                                                                                                                />
                                                                                                                {sectionErrors?.code && (
                                                                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                                                                {sectionErrors.code.message}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>

                                                                                                        <div className='form-control gap-2'>
                                                                                                                <span className='label-text text-sm font-medium'>Tiêu đề section</span>
                                                                                                                <input
                                                                                                                        className={`input input-bordered ${
                                                                                                                                sectionErrors?.title ? 'input-error' : ''
                                                                                                                        }`}
                                                                                                                        placeholder='Điều khoản làm việc'
                                                                                                                        {...register(`sections.${index}.title` as const)}
                                                                                                                />
                                                                                                                {sectionErrors?.title && (
                                                                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                                                                {sectionErrors.title.message}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>

                                                                                                        <div className='form-control gap-2'>
                                                                                                                <span className='label-text text-sm font-medium'>Phiên bản section</span>
                                                                                                                <input
                                                                                                                        className='input input-bordered'
                                                                                                                        placeholder='v1'
                                                                                                                        {...register(`sections.${index}.version` as const)}
                                                                                                                />
                                                                                                                {sectionErrors?.version && (
                                                                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                                                                {sectionErrors.version.message}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>

                                                                                                        <div className='form-control gap-2'>
                                                                                                                <span className='label-text text-sm font-medium'>Metadata (JSON)</span>
                                                                                                                <textarea
                                                                                                                        className={`textarea textarea-bordered min-h-24 ${
                                                                                                                                sectionErrors?.metadata ? 'textarea-error' : ''
                                                                                                                        }`}
                                                                                                                        placeholder='{"provider": "stripe"}'
                                                                                                                        {...register(`sections.${index}.metadata` as const)}
                                                                                                                />
                                                                                                                {sectionErrors?.metadata && (
                                                                                                                        <span className='label-text-alt text-error text-sm'>
                                                                                                                                {sectionErrors.metadata.message}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                </div>

                                                                                                <div className='form-control gap-2'>
                                                                                                        <span className='label-text text-sm font-medium'>Nội dung section</span>
                                                                                                        <textarea
                                                                                                                className={`textarea textarea-bordered min-h-40 font-mono text-sm ${
                                                                                                                        sectionErrors?.body ? 'textarea-error' : ''
                                                                                                                }`}
                                                                                                                placeholder='Mô tả chi tiết điều khoản...'
                                                                                                                {...register(`sections.${index}.body` as const)}
                                                                                                        />
                                                                                                        {sectionErrors?.body && (
                                                                                                                <span className='label-text-alt text-error text-sm'>
                                                                                                                        {sectionErrors.body.message}
                                                                                                                </span>
                                                                                                        )}
                                                                                                </div>
                                                                                        </div>
                                                                                </div>
                                                                        )
                                                                })}

                                                                {fields.length === 0 && (
                                                                        <div className='rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60'>
                                                                                Nhấn “Thêm section” để bắt đầu mô tả điều khoản.
                                                                        </div>
                                                                )}
                                                        </div>

                                                        <div className='mt-4 rounded-xl bg-base-100/80 p-4 text-xs text-base-content/70'>
                                                                <p className='font-medium text-base-content'>Gợi ý cấu trúc JSON khi lưu</p>
                                                                <pre className='mt-2 max-h-48 overflow-x-auto whitespace-pre-wrap rounded-lg bg-base-200 p-3 font-mono text-[11px]'>
{`{
  "sections": [
    {
      "code": "work",
      "title": "Điều khoản làm việc",
      "body": "...",
      "version": "v1"
    },
    {
      "code": "payment",
      "title": "Thanh toán & Stripe",
      "body": "...",
      "metadata": { "provider": "stripe", "country": "SG" }
    }
  ]
}`}
                                                                </pre>
                                                        </div>
                                                </div>

                                                <div className='alert alert-info text-sm'>
                                                        <div>
                                                                Khi trạng thái là <strong>Đang hiệu lực</strong>, hệ thống sẽ yêu cầu nhập ngày hiệu lực.
                                                                Bạn có thể lưu bản nháp để hoàn thiện nội dung trước khi kích hoạt.
                                                        </div>
                                                </div>

                                                <div className='modal-action flex items-center justify-between gap-4'>
                                                        <div className='text-xs text-base-content/60'>
                                                                {status === 'ACTIVE'
                                                                        ? 'Điều khoản sẽ áp dụng ngay khi lưu nếu ngày hiệu lực hợp lệ.'
                                                                        : 'Bạn có thể cập nhật lại trạng thái bất cứ lúc nào.'}
                                                        </div>
                                                        <div className='flex gap-3'>
                                                                <button type='button' className='btn' onClick={onClose} disabled={submitting}>
                                                                        Hủy
                                                                </button>
                                                                <button type='submit' className='btn btn-primary' disabled={submitting}>
                                                                        {submitting ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo điều khoản'}
                                                                </button>
                                                        </div>
                                                </div>
                                        </form>
                                )}
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={onClose}>close</button>
                        </form>
                </dialog>
        )
}
