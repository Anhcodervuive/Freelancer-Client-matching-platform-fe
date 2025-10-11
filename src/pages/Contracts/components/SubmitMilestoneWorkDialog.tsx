import {
        useEffect,
        useMemo,
        useRef,
        useState,
        type ChangeEventHandler,
        type DragEventHandler
} from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Paperclip, UploadCloud, X } from 'lucide-react'

import { formatFileSize } from '~/utils/format'

import {
        SubmitMilestoneWorkSchema,
        type SubmitMilestoneWorkFormValues
} from '../schemas'

type SubmitMilestoneWorkDialogProps = {
        open: boolean
        milestoneTitle?: string
        isSubmitting?: boolean
        onSubmit: (_values: SubmitMilestoneWorkFormValues, _files: File[]) => Promise<void> | void
        onClose: () => void
}

const SubmitMilestoneWorkDialog = ({
        open,
        milestoneTitle,
        isSubmitting = false,
        onSubmit,
        onClose
}: SubmitMilestoneWorkDialogProps) => {
        const [attachments, setAttachments] = useState<File[]>([])
        const fileInputRef = useRef<HTMLInputElement | null>(null)

        const {
                register,
                handleSubmit,
                reset,
                formState: { errors }
        } = useForm<SubmitMilestoneWorkFormValues>({
                resolver: zodResolver(SubmitMilestoneWorkSchema) as Resolver<SubmitMilestoneWorkFormValues>,
                defaultValues: {
                        message: '',
                        note: undefined
                }
        })

        useEffect(() => {
            if (!open) return

            reset({
                    message: '',
                    note: undefined
            })
            setAttachments([])
        }, [open, reset])

        const mergeFiles = (incoming: FileList | null) => {
                if (!incoming || !incoming.length) return

                setAttachments(prev => {
                        const existing = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
                        const additions: File[] = []

                        Array.from(incoming).forEach(file => {
                                const signature = `${file.name}-${file.size}-${file.lastModified}`
                                if (existing.has(signature)) return
                                existing.add(signature)
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
                event.dataTransfer.dropEffect = 'copy'
        }

        const removeAttachment = (index: number) => {
                setAttachments(prev => prev.filter((_, idx) => idx !== index))
        }

        const attachmentSummary = useMemo(() => {
                if (!attachments.length) return 'Chưa chọn tệp nào'
                const totalSize = attachments.reduce((sum, file) => sum + file.size, 0)
                const readableSize = formatFileSize(totalSize)
                return `${attachments.length} tệp${readableSize ? ` · ${readableSize}` : ''}`
        }, [attachments])

        const submit = handleSubmit(async values => {
                await onSubmit(values, attachments)
                reset({
                        message: '',
                        note: undefined
                })
                setAttachments([])
        })

        const messageError = errors.message?.message
        const noteError = errors.note?.message

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-center justify-between rounded-t-3xl bg-secondary/10 px-6 py-4'>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-secondary'>Bàn giao milestone</p>
                                                <h3 className='text-lg font-semibold text-base-content'>
                                                        {milestoneTitle ? `Gửi bàn giao cho "${milestoneTitle}"` : 'Gửi bàn giao milestone'}
                                                </h3>
                                                <p className='mt-1 text-xs text-base-content/70'>Chia sẻ kết quả, mô tả chi tiết và đính kèm các tệp liên quan tới milestone này.</p>
                                        </div>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm rounded-full'
                                                onClick={() => {
                                                        if (isSubmitting) return
                                                        onClose()
                                                }}
                                                aria-label='Đóng gửi bàn giao'
                                                disabled={isSubmitting}
                                        >
                                                <X className='size-4' />
                                        </button>
                                </div>

                                <form onSubmit={submit} className='flex flex-1 min-h-0 flex-col'>
                                        <div className='flex-1 space-y-6 overflow-y-auto px-6 py-6'>
                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Mô tả bàn giao</label>
                                                        <textarea
                                                                {...register('message')}
                                                                className='textarea textarea-bordered min-h-[120px]'
                                                                placeholder='Tóm tắt công việc đã hoàn thành, các điểm nổi bật và hướng dẫn kiểm tra nếu có.'
                                                                disabled={isSubmitting}
                                                        />
                                                        {messageError ? (
                                                                <p className='text-xs text-error'>{messageError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Nêu rõ kết quả đạt được và những gì khách hàng cần kiểm tra.</p>
                                                        )}
                                                </div>

                                                <div className='space-y-2'>
                                                        <label className='text-sm font-semibold text-base-content'>Ghi chú bổ sung (không bắt buộc)</label>
                                                        <textarea
                                                                {...register('note')}
                                                                className='textarea textarea-bordered min-h-[80px]'
                                                                placeholder='Ví dụ: Liên kết staging, thông tin đăng nhập tạm thời hoặc lưu ý triển khai.'
                                                                disabled={isSubmitting}
                                                        />
                                                        {noteError ? (
                                                                <p className='text-xs text-error'>{noteError}</p>
                                                        ) : (
                                                                <p className='text-xs text-base-content/60'>Thông tin thêm giúp khách hàng hiểu rõ hơn về bàn giao.</p>
                                                        )}
                                                </div>

                                                <div className='space-y-3'>
                                                        <label className='text-sm font-semibold text-base-content'>Tệp đính kèm</label>
                                                        <label
                                                                htmlFor='milestone-submission-files'
                                                                onDrop={handleDrop}
                                                                onDragOver={handleDragOver}
                                                                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-base-content/20 bg-base-200/40 px-6 py-8 text-center transition ${
                                                                        isSubmitting ? 'opacity-60' : 'hover:border-secondary hover:bg-secondary/10'
                                                                }`}
                                                        >
                                                                <UploadCloud className='size-8 text-secondary' />
                                                                <p className='mt-2 text-sm font-semibold text-base-content'>Kéo thả hoặc nhấn để tải tệp lên</p>
                                                                <p className='text-xs text-base-content/60'>Hỗ trợ nhiều tệp cùng lúc. Tổng dung lượng tối đa 100MB.</p>
                                                                <input
                                                                        type='file'
                                                                        id='milestone-submission-files'
                                                                        className='hidden'
                                                                        multiple
                                                                        ref={fileInputRef}
                                                                        onChange={handleFileInputChange}
                                                                        disabled={isSubmitting}
                                                                />
                                                        </label>
                                                        <p className='text-xs text-base-content/60'>{attachmentSummary}</p>

                                                        {attachments.length ? (
                                                                <ul className='space-y-2'>
                                                                        {attachments.map((file, index) => (
                                                                                <li
                                                                                        key={`${file.name}-${file.lastModified}`}
                                                                                        className='flex items-center justify-between gap-3 rounded-xl border border-base-200 bg-base-100 px-3 py-2 text-sm'
                                                                                >
                                                                                        <div className='flex flex-1 items-center gap-3 overflow-hidden'>
                                                                                                <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary'>
                                                                                                        <Paperclip className='size-4' />
                                                                                                </div>
                                                                                                <div className='min-w-0'>
                                                                                                        <p className='truncate font-medium text-base-content'>{file.name}</p>
                                                                                                        <p className='text-xs text-base-content/60'>{formatFileSize(file.size) ?? ''}</p>
                                                                                                </div>
                                                                                        </div>
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-ghost btn-xs text-error'
                                                                                                onClick={() => removeAttachment(index)}
                                                                                                disabled={isSubmitting}
                                                                                                aria-label={`Xóa tệp ${file.name}`}
                                                                                        >
                                                                                                <X className='size-3.5' />
                                                                                        </button>
                                                                                </li>
                                                                        ))}
                                                                </ul>
                                                        ) : null}
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>Bàn giao sẽ được gửi tới khách hàng để duyệt trước khi giải ngân milestone.</p>
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
                                                                className='btn btn-secondary btn-sm gap-2'
                                                                disabled={isSubmitting}
                                                        >
                                                                {isSubmitting ? (
                                                                        <>
                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                Đang gửi...
                                                                        </>
                                                                ) : (
                                                                        'Gửi bàn giao'
                                                                )}
                                                        </button>
                                                </div>
                                        </div>
                                </form>
                        </div>
                </dialog>
        )
}

export default SubmitMilestoneWorkDialog
