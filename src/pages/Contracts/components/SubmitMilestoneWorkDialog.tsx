import {
        useEffect,
        useMemo,
        useRef,
        useState,
        type ChangeEventHandler,
        type DragEventHandler,
        type KeyboardEventHandler
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

        const wasOpenRef = useRef(open)

        useEffect(() => {
                const wasOpen = wasOpenRef.current

                if (open && !wasOpen) {
                        reset({
                                message: '',
                                note: undefined
                        })
                        setAttachments([])
                }

                if (!open && wasOpen) {
                        setAttachments([])
                }

                wasOpenRef.current = open
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

        const openFilePicker = () => {
                if (isSubmitting) return
                fileInputRef.current?.click()
        }

        const handleDrop: DragEventHandler<HTMLDivElement> = event => {
                event.preventDefault()
                if (isSubmitting) return
                mergeFiles(event.dataTransfer.files)
        }

        const handleDragOver: DragEventHandler<HTMLDivElement> = event => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
        }

        const handleDropzoneKeyDown: KeyboardEventHandler<HTMLDivElement> = event => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openFilePicker()
                }
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
                        <div className='modal-box flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-base-100 p-0 shadow-xl'>
                                <div className='flex items-start gap-4 rounded-t-3xl bg-secondary/10 px-6 py-5'>
                                        <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary'>
                                                <UploadCloud className='size-5' />
                                        </div>
                                        <div className='flex-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-secondary/80'>Bàn giao milestone</p>
                                                <h3 className='text-xl font-semibold text-base-content'>
                                                        {milestoneTitle ? `Gửi bàn giao cho "${milestoneTitle}"` : 'Gửi bàn giao milestone'}
                                                </h3>
                                                <p className='mt-1 text-sm text-base-content/70'>Chia sẻ rõ ràng những gì bạn đã hoàn thành và thêm các tệp minh chứng nếu cần.</p>
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
                                        <div className='flex-1 overflow-y-auto px-6 py-6'>
                                                <div className='grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'>
                                                        <div className='space-y-6'>
                                                                <div className='space-y-2'>
                                                                        <label className='text-sm font-semibold text-base-content'>Mô tả bàn giao</label>
                                                                        <textarea
                                                                                {...register('message')}
                                                                                className='textarea textarea-bordered min-h-[160px]'
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
                                                                                className='textarea textarea-bordered min-h-[120px]'
                                                                                placeholder='Ví dụ: Liên kết staging, thông tin đăng nhập tạm thời hoặc lưu ý triển khai.'
                                                                                disabled={isSubmitting}
                                                                        />
                                                                        {noteError ? (
                                                                                <p className='text-xs text-error'>{noteError}</p>
                                                                        ) : (
                                                                                <p className='text-xs text-base-content/60'>Thông tin thêm giúp khách hàng hiểu rõ hơn về bàn giao.</p>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        <div className='space-y-4'>
                                                                <div className='flex items-center justify-between gap-2'>
                                                                        <label className='text-sm font-semibold text-base-content'>Tệp đính kèm</label>
                                                                        <span className='text-xs text-base-content/60'>{attachmentSummary}</span>
                                                                </div>
                                                                <div
                                                                        role='button'
                                                                        tabIndex={0}
                                                                        onClick={openFilePicker}
                                                                        onKeyDown={handleDropzoneKeyDown}
                                                                        onDrop={handleDrop}
                                                                        onDragOver={handleDragOver}
                                                                        className={`group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-secondary/30 bg-secondary/5 px-6 py-8 text-center transition ${
                                                                                isSubmitting ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-secondary hover:bg-secondary/10'
                                                                        }`}
                                                                        aria-label='Chọn hoặc kéo thả tệp đính kèm'
                                                                >
                                                                        <UploadCloud className='size-9 text-secondary' />
                                                                        <div className='space-y-1'>
                                                                                <p className='text-sm font-semibold text-base-content'>Kéo thả tệp vào đây</p>
                                                                                <p className='text-xs text-base-content/60'>hoặc nhấn để chọn từ thiết bị của bạn (tối đa 100MB).</p>
                                                                        </div>
                                                                        <span className='btn btn-outline btn-secondary btn-sm mt-1 inline-flex items-center gap-2'>
                                                                                <UploadCloud className='size-4' /> Chọn tệp
                                                                        </span>
                                                                        <input
                                                                                type='file'
                                                                                id='milestone-submission-files'
                                                                                className='hidden'
                                                                                multiple
                                                                                ref={fileInputRef}
                                                                                onChange={handleFileInputChange}
                                                                                disabled={isSubmitting}
                                                                        />
                                                                </div>

                                                                {attachments.length ? (
                                                                        <ul className='space-y-2 rounded-2xl border border-base-200 bg-base-100/80 p-3'>
                                                                                {attachments.map((file, index) => (
                                                                                        <li
                                                                                                key={`${file.name}-${file.lastModified}`}
                                                                                                className='flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm shadow-sm'
                                                                                        >
                                                                                                <div className='flex flex-1 items-center gap-3 overflow-hidden'>
                                                                                                        <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary'>
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
                                                                ) : (
                                                                        <p className='rounded-2xl border border-dashed border-base-200 bg-base-200/40 px-4 py-3 text-xs text-base-content/60'>Bạn có thể đính kèm các tệp như hình ảnh, tài liệu hoặc liên kết ZIP để khách hàng kiểm tra.</p>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='flex flex-col gap-3 border-t border-base-200 bg-base-100/90 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-xs text-base-content/60'>Bàn giao sẽ được gửi tới khách hàng để duyệt trước khi milestone được giải ngân.</p>
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
                                                                className='btn btn-secondary btn-sm gap-2 shadow-sm'
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
