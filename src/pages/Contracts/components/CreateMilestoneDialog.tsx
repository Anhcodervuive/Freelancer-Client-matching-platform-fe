import {
        useEffect,
        useMemo,
        useRef,
        useState,
        type ChangeEventHandler,
        type DragEventHandler
} from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Flag, Image, Loader2, Trash2, UploadCloud, Video, X } from 'lucide-react'

import type { CreateContractMilestoneInput } from '~/types/contract'
import { formatFileSize } from '~/utils/format'

import {
        CreateContractMilestoneSchema,
        type CreateContractMilestoneFormValues
} from '../schemas'

type CreateMilestoneDialogProps = {
        open: boolean
        currency?: string
        isSubmitting?: boolean
        onSubmit: (_values: CreateContractMilestoneInput, _attachments: File[]) => Promise<void> | void
        onClose: () => void
}

const CreateMilestoneDialog = ({
        open,
        currency,
        isSubmitting = false,
        onSubmit,
        onClose
}: CreateMilestoneDialogProps) => {
        const [attachments, setAttachments] = useState<File[]>([])
        const fileInputRef = useRef<HTMLInputElement | null>(null)

        const normalizedCurrency = useMemo(() => (currency ?? 'USD').toUpperCase(), [currency])

        const {
                control,
                handleSubmit,
                register,
                reset,
                setValue,
                formState: { errors }
        } = useForm<CreateContractMilestoneFormValues>({
                resolver: zodResolver(CreateContractMilestoneSchema) as Resolver<CreateContractMilestoneFormValues>,
                defaultValues: {
                        title: '',
                        amount: undefined as unknown as number,
                        currency: normalizedCurrency,
                        startDate: undefined,
                        endDate: undefined
                }
        })

        useEffect(() => {
                if (!open) return
                reset({
                        title: '',
                        amount: undefined as unknown as number,
                        currency: normalizedCurrency,
                        startDate: undefined,
                        endDate: undefined
                })
                setAttachments([])
        }, [open, reset, normalizedCurrency])

        useEffect(() => {
                setValue('currency', normalizedCurrency)
        }, [normalizedCurrency, setValue])

        const closeDialog = () => {
                if (isSubmitting) return
                onClose()
        }

        const mergeFiles = (incoming: FileList | null) => {
                if (!incoming || !incoming.length) return

                setAttachments(prev => {
                        const existingSignatures = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
                        const additions: File[] = []

                        Array.from(incoming).forEach(file => {
                                const signature = `${file.name}-${file.size}-${file.lastModified}`
                                if (existingSignatures.has(signature)) return
                                existingSignatures.add(signature)
                                additions.push(file)
                        })

                        return [...prev, ...additions]
                })
        }

        const handleFileInputChange: ChangeEventHandler<HTMLInputElement> = event => {
                mergeFiles(event.target.files)
                event.target.value = ''
        }

        const handleDrop: DragEventHandler<HTMLLabelElement> = event => {
                event.preventDefault()
                if (isSubmitting) return
                mergeFiles(event.dataTransfer.files)
        }

        const handleDragOver: DragEventHandler<HTMLLabelElement> = event => {
                event.preventDefault()
        }

        const removeAttachment = (index: number) => {
                setAttachments(prev => prev.filter((_, idx) => idx !== index))
        }

        const attachmentSummary = useMemo(() => {
                if (!attachments.length) return 'Chưa chọn tệp nào'
                const totalSize = attachments.reduce((sum, file) => sum + file.size, 0)
                return `${attachments.length} tệp · ${formatFileSize(totalSize) ?? ''}`.trim()
        }, [attachments])

        const submit = handleSubmit(async ({
                startDate,
                endDate,
                currency: formCurrency,
                ...rest
        }) => {
                const resolvedCurrency = (currency ?? formCurrency ?? 'USD').toUpperCase()

                await onSubmit(
                        {
                                ...rest,
                                currency: resolvedCurrency,
                                startDate: startDate ? startDate.toISOString() : undefined,
                                endDate: endDate ? endDate.toISOString() : undefined
                        },
                        attachments
                )
                reset({
                        title: '',
                        amount: undefined as unknown as number,
                        currency: resolvedCurrency,
                        startDate: undefined,
                        endDate: undefined
                })
                setAttachments([])
        })

        const titleError = errors.title?.message
        const amountError = errors.amount?.message
        const startDateError = errors.startDate?.message
        const endDateError = errors.endDate?.message

        const renderAttachmentIcon = (file: File) => {
                if (file.type.startsWith('image/')) {
                        return <Image className='size-4 text-primary' />
                }
                if (file.type.startsWith('video/')) {
                        return <Video className='size-4 text-secondary' />
                }
                return <FileText className='size-4 text-base-content/70' />
        }

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
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

                                <form onSubmit={submit} className='flex flex-1 min-h-0 flex-col'>
                                        <div className='flex-1 space-y-6 overflow-y-auto px-6 py-6 min-h-0'>
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
                                                                <label className='text-sm font-semibold text-base-content'>Tiền tệ</label>
                                                                <div className='flex h-11 items-center justify-between rounded-xl border border-base-300 bg-base-100 px-3 font-semibold uppercase tracking-[0.3em] text-base-content/80'>
                                                                        <span>{normalizedCurrency}</span>
                                                                </div>
                                                                <p className='text-xs text-base-content/60'>Tiền tệ được cố định theo hợp đồng.</p>
                                                                <input type='hidden' {...register('currency')} />
                                                        </div>
                                                </div>

                                                <div className='grid gap-4 md:grid-cols-2'>
                                                        <div className='space-y-2'>
                                                                <label className='text-sm font-semibold text-base-content'>Ngày bắt đầu (tùy chọn)</label>
                                                                <Controller
                                                                        control={control}
                                                                        name='startDate'
                                                                        render={({ field }) => (
                                                                                <input
                                                                                        type='date'
                                                                                        className='input input-bordered w-full'
                                                                                        value={
                                                                                                field.value instanceof Date
                                                                                                        ? field.value.toISOString().slice(0, 10)
                                                                                                        : ''
                                                                                        }
                                                                                        onChange={event => {
                                                                                                const { value } = event.target
                                                                                                if (!value) {
                                                                                                        field.onChange(undefined)
                                                                                                        return
                                                                                                }
                                                                                                const parsed = new Date(value)
                                                                                                field.onChange(Number.isNaN(parsed.getTime()) ? field.value : parsed)
                                                                                        }}
                                                                                        disabled={isSubmitting}
                                                                                />
                                                                        )}
                                                                />
                                                                {startDateError ? (
                                                                        <p className='text-xs text-error'>{startDateError}</p>
                                                                ) : (
                                                                        <p className='text-xs text-base-content/60'>Chọn ngày dự kiến bắt đầu milestone.</p>
                                                                )}
                                                        </div>
                                                        <div className='space-y-2'>
                                                                <label className='text-sm font-semibold text-base-content'>Ngày kết thúc (tùy chọn)</label>
                                                                <Controller
                                                                        control={control}
                                                                        name='endDate'
                                                                        render={({ field }) => (
                                                                                <input
                                                                                        type='date'
                                                                                        className='input input-bordered w-full'
                                                                                        value={
                                                                                                field.value instanceof Date
                                                                                                        ? field.value.toISOString().slice(0, 10)
                                                                                                        : ''
                                                                                        }
                                                                                        onChange={event => {
                                                                                                const { value } = event.target
                                                                                                if (!value) {
                                                                                                        field.onChange(undefined)
                                                                                                        return
                                                                                                }
                                                                                                const parsed = new Date(value)
                                                                                                field.onChange(Number.isNaN(parsed.getTime()) ? field.value : parsed)
                                                                                        }}
                                                                                        disabled={isSubmitting}
                                                                                />
                                                                        )}
                                                                />
                                                                {endDateError ? (
                                                                        <p className='text-xs text-error'>{endDateError}</p>
                                                                ) : (
                                                                        <p className='text-xs text-base-content/60'>Thiết lập hạn hoàn thành để theo dõi tiến độ.</p>
                                                                )}
                                                        </div>
                                                </div>

                                                <div className='space-y-3'>
                                                        <div className='flex items-center justify-between gap-2'>
                                                                <label className='text-sm font-semibold text-base-content'>Tệp đính kèm (tùy chọn)</label>
                                                                <span className='text-xs text-base-content/60'>{attachmentSummary}</span>
                                                        </div>
                                                        <label
                                                                htmlFor='milestone-attachments'
                                                                onDrop={handleDrop}
                                                                onDragOver={handleDragOver}
                                                                aria-disabled={isSubmitting}
                                                                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-300 bg-base-100/70 px-6 py-8 text-center transition hover:border-primary/40 hover:bg-primary/5 ${
                                                                        isSubmitting ? 'pointer-events-none opacity-60' : ''
                                                                }`}
                                                        >
                                                                <UploadCloud className='size-8 text-primary/80' />
                                                                <div className='space-y-1'>
                                                                        <p className='text-sm font-semibold text-base-content'>Kéo thả tệp vào đây</p>
                                                                        <p className='text-xs text-base-content/60'>hoặc nhấn để chọn từ thiết bị của bạn</p>
                                                                </div>
                                                                <span className='btn btn-sm btn-outline mt-2 inline-flex items-center gap-2'>
                                                                        <UploadCloud className='size-4 text-primary/80' /> Chọn tệp
                                                                </span>
                                                        </label>
                                                        <p className='text-xs text-base-content/50'>Hỗ trợ nhiều tệp cùng lúc, mỗi tệp tối đa 25MB.</p>
                                                        <input
                                                                id='milestone-attachments'
                                                                ref={fileInputRef}
                                                                type='file'
                                                                multiple
                                                                className='hidden'
                                                                onChange={handleFileInputChange}
                                                                disabled={isSubmitting}
                                                        />

                                                        {attachments.length > 0 && (
                                                                <ul className='space-y-2 rounded-2xl border border-base-200 bg-base-100/60 p-3'>
                                                                        {attachments.map((file, index) => {
                                                                                const sizeLabel = formatFileSize(file.size) ?? ''
                                                                                return (
                                                                                        <li
                                                                                                key={`${file.name}-${file.lastModified}-${index}`}
                                                                                                className='flex items-center justify-between gap-3 rounded-xl bg-base-100 px-3 py-2 shadow-sm'
                                                                                        >
                                                                                                <div className='flex min-w-0 items-center gap-3'>
                                                                                                        <div className='flex size-10 items-center justify-center rounded-lg bg-base-200'>
                                                                                                                {renderAttachmentIcon(file)}
                                                                                                        </div>
                                                                                                        <div className='min-w-0'>
                                                                                                                <p className='truncate text-sm font-medium text-base-content'>{file.name}</p>
                                                                                                                <p className='text-xs text-base-content/60'>{sizeLabel}</p>
                                                                                                        </div>
                                                                                                </div>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-ghost btn-xs text-error'
                                                                                                        onClick={() => removeAttachment(index)}
                                                                                                        disabled={isSubmitting}
                                                                                                        aria-label={`Xóa tệp ${file.name}`}
                                                                                                >
                                                                                                        <Trash2 className='size-4' />
                                                                                                </button>
                                                                                        </li>
                                                                                )
                                                                        })}
                                                                </ul>
                                                        )}
                                                </div>

                                                <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/70'>
                                                        <p>
                                                                Milestones giúp cả hai bên theo dõi tiến độ và giải ngân minh bạch. Bạn có thể cập nhật hoặc thêm tài liệu bàn giao sau khi tạo.
                                                        </p>
                                                </div>
                                        </div>

                                        <div className='modal-action mt-0 flex flex-col gap-3 border-t border-base-200 bg-base-100/95 px-6 py-4 sm:flex-row'>
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
