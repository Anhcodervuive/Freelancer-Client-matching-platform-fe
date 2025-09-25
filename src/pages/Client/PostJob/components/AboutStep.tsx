import { useCallback, useMemo, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Download, Eye, Paperclip, UploadCloud } from 'lucide-react'
import type { JobPostFormValues } from '../schema'
import type { NormalizedAttachment } from '~/utils/jobPost'
import { extractFileExtension, formatDateTime, formatFileSize, formatFileType } from '~/utils/format'

type AboutStepProps = {
        hidden?: boolean
        newAttachments: File[]
        existingAttachments: NormalizedAttachment[]
        onNewAttachmentsChange: (_files: File[]) => void
        onExistingAttachmentsChange: (_attachments: NormalizedAttachment[]) => void
}

export function AboutStep({
        hidden,
        newAttachments,
        existingAttachments,
        onNewAttachmentsChange,
        onExistingAttachmentsChange
}: AboutStepProps) {
        const inputRef = useRef<HTMLInputElement | null>(null)
        const {
                register,
                formState: { errors }
        } = useFormContext<JobPostFormValues>()

        type AttachmentItem =
                | { kind: 'existing'; attachment: NormalizedAttachment }
                | { kind: 'new'; file: File }

        const attachmentsWithMeta = useMemo<AttachmentItem[]>(
                () => [
                        ...existingAttachments.map(attachment => ({ kind: 'existing' as const, attachment })),
                        ...newAttachments.map(file => ({ kind: 'new' as const, file }))
                ],
                [existingAttachments, newAttachments]
        )

        const totalAttachments = attachmentsWithMeta.length
        const canAddMore = totalAttachments < 20

        const pickFiles = () => {
                if (inputRef.current) {
                        inputRef.current.click()
                }
        }

        const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
                const fileList = event.target.files
                if (!fileList) return
                const nextFiles = [...newAttachments]
                Array.from(fileList).forEach(file => {
                        if (existingAttachments.length + nextFiles.length < 20) {
                                nextFiles.push(file)
                        }
                })
                onNewAttachmentsChange(nextFiles)
        }

        const removeFile = (index: number) => {
                const existingCount = existingAttachments.length
                if (index < existingCount) {
                        const nextAttachments = existingAttachments.filter((_, i) => i !== index)
                        onExistingAttachmentsChange(nextAttachments)
                        return
                }
                const fileIndex = index - existingCount
                const nextFiles = newAttachments.filter((_, i) => i !== fileIndex)
                onNewAttachmentsChange(nextFiles)
        }

        const previewLocalFile = useCallback((file: File) => {
                if (typeof window === 'undefined') return
                const blobUrl = URL.createObjectURL(file)
                const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer')
                const revoke = () => URL.revokeObjectURL(blobUrl)
                if (!opened) {
                        revoke()
                        return
                }
                opened.addEventListener('load', revoke, { once: true })
                opened.addEventListener('beforeunload', revoke, { once: true })
                window.setTimeout(revoke, 15000)
        }, [])

        return (
                <section className={`rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm ${hidden ? 'hidden' : ''}`}>
                        <div className='mb-6 flex flex-col gap-2'>
                                <span className='text-xs font-semibold uppercase tracking-wide text-primary'>Step 1</span>
                                <h2 className='text-2xl font-semibold text-base-content'>Tell us about your job</h2>
                                <p className='text-base-content/70 text-sm'>
                                        Craft a clear project overview so qualified freelancers know you&apos;re serious.
                                </p>
                        </div>

                        <div className='space-y-6'>
                                <div>
                                        <label className='mb-2 block text-sm font-medium text-base-content'>Title</label>
                                        <input
                                                {...register('title')}
                                                placeholder='E.g. Build a marketing landing page in Next.js'
                                                className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
                                        />
                                        {errors.title ? (
                                                <p className='mt-1 text-xs text-error'>{errors.title.message}</p>
                                        ) : null}
                                </div>

                                <div>
                                        <label className='mb-2 block text-sm font-medium text-base-content'>Summary</label>
                                        <textarea
                                                {...register('description')}
                                                rows={5}
                                                placeholder='Share the context, goals, and success criteria for this project.'
                                                className={`textarea textarea-bordered w-full ${
                                                        errors.description ? 'textarea-error' : ''
                                                }`}
                                        />
                                        <p className='mt-1 text-xs text-base-content/60'>
                                                Minimum 20 characters. Highlight outcomes, expectations, and team collaboration.
                                        </p>
                                        {errors.description ? (
                                                <p className='mt-1 text-xs text-error'>{errors.description.message}</p>
                                        ) : null}
                                </div>

                                <div className='grid gap-4 lg:grid-cols-2'>
                                        <div>
                                                <label className='mb-2 block text-sm font-medium text-base-content'>Deliverables</label>
                                                <textarea
                                                        {...register('customTerms.deliverables')}
                                                        rows={4}
                                                        placeholder='List the concrete deliverables you expect by the end of the project.'
                                                        className='textarea textarea-bordered w-full'
                                                />
                                                <p className='mt-1 text-xs text-base-content/60'>
                                                        Optional, but helps talent understand scope and deadlines.
                                                </p>
                                        </div>
                                        <div>
                                                <label className='mb-2 block text-sm font-medium text-base-content'>Notes for talent</label>
                                                <textarea
                                                        {...register('customTerms.additionalNotes')}
                                                        rows={4}
                                                        placeholder='Add collaboration details, tooling preferences, or onboarding notes.'
                                                        className='textarea textarea-bordered w-full'
                                                />
                                                <p className='mt-1 text-xs text-base-content/60'>Visible to freelancers once they apply.</p>
                                        </div>
                                </div>

                                <div>
                                        <label className='mb-2 block text-sm font-medium text-base-content'>Supporting files</label>
                                        <div className='rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-6'>
                                                <input
                                                        ref={inputRef}
                                                        type='file'
                                                        multiple
                                                        hidden
                                                        onChange={handleFiles}
                                                        accept='.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar'
                                                />
                                                <div className='flex flex-col items-center justify-center gap-3 text-center'>
                                                        <UploadCloud className='size-8 text-primary' />
                                                        <p className='text-sm text-base-content'>
                                                                Drag & drop your briefing, wireframes, or specifications.
                                                        </p>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-outline gap-2'
                                                                onClick={pickFiles}
                                                                disabled={!canAddMore}
                                                        >
                                                                <Paperclip className='size-4' /> Upload files
                                                        </button>
                                                        <p className='text-xs text-base-content/60'>
                                                                {totalAttachments}/20 files attached. Accepted up to 25MB each.
                                                        </p>
                                                </div>
                                        </div>
                                        {totalAttachments > 0 ? (
                                                <ul className='mt-4 space-y-3'>
                                                        {attachmentsWithMeta.map((item, index) => {
                                                                if (item.kind === 'existing') {
                                                                        const { attachment } = item
                                                                        const sizeLabel = formatFileSize(attachment.size)
                                                                        const typeLabel = formatFileType({
                                                                                mimeType: attachment.mimeType,
                                                                                extension: attachment.extension
                                                                        })
                                                                        const uploadedLabel = attachment.createdAt
                                                                                ? formatDateTime(attachment.createdAt, {
                                                                                          dateStyle: 'medium',
                                                                                          timeStyle: 'short'
                                                                                  })
                                                                                : undefined
                                                                        const metadata = [
                                                                                sizeLabel,
                                                                                typeLabel,
                                                                                uploadedLabel ? `Uploaded ${uploadedLabel}` : undefined
                                                                        ].filter((value): value is string => Boolean(value))

                                                                        return (
                                                                                <li
                                                                                        key={attachment.id}
                                                                                        className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'
                                                                                >
                                                                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                                                                <div className='flex min-w-0 items-start gap-3'>
                                                                                                        <div className='flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold uppercase tracking-wide text-primary'>
                                                                                                                {attachment.extension ?? 'FILE'}
                                                                                                        </div>
                                                                                                        <div className='min-w-0'>
                                                                                                                <p className='truncate font-medium text-sm text-base-content'>
                                                                                                                        {attachment.label}
                                                                                                                </p>
                                                                                                                {metadata.length > 0 ? (
                                                                                                                        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60'>
                                                                                                                                {metadata.map((value, metaIndex) => (
                                                                                                                                        <span key={`${value}-${metaIndex}`}>{value}</span>
                                                                                                                                ))}
                                                                                                                        </div>
                                                                                                                ) : null}
                                                                                                        </div>
                                                                                                </div>
                                                                                                <div className='flex flex-wrap items-center gap-2 sm:flex-shrink-0'>
                                                                                                        {attachment.url ? (
                                                                                                                <>
                                                                                                                        <a
                                                                                                                                href={attachment.url}
                                                                                                                                target='_blank'
                                                                                                                                rel='noopener noreferrer'
                                                                                                                                className='btn btn-ghost btn-xs gap-2'
                                                                                                                        >
                                                                                                                                <Eye className='size-4' /> Preview
                                                                                                                        </a>
                                                                                                                        <a
                                                                                                                                href={attachment.url}
                                                                                                                                download={attachment.fileName ?? attachment.label}
                                                                                                                                className='btn btn-outline btn-xs gap-2'
                                                                                                                        >
                                                                                                                                <Download className='size-4' /> Download
                                                                                                                        </a>
                                                                                                                </>
                                                                                                        ) : (
                                                                                                                <span className='text-xs text-base-content/50'>No link available</span>
                                                                                                        )}
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-ghost btn-xs text-error'
                                                                                                                onClick={() => removeFile(index)}
                                                                                                        >
                                                                                                                Remove
                                                                                                        </button>
                                                                                                </div>
                                                                                        </div>
                                                                                </li>
                                                                        )
                                                                }

                                                                const { file } = item
                                                                const sizeLabel = formatFileSize(file.size)
                                                                const typeLabel = formatFileType({
                                                                        mimeType: file.type,
                                                                        extension: extractFileExtension(file.name)
                                                                })
                                                                const metadata = [
                                                                        sizeLabel,
                                                                        typeLabel,
                                                                        'Pending upload'
                                                                ].filter((value): value is string => Boolean(value))

                                                                return (
                                                                        <li
                                                                                key={`new-${file.name}-${index}`}
                                                                                className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'
                                                                        >
                                                                                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                                                        <div className='flex min-w-0 items-start gap-3'>
                                                                                                <div className='flex size-11 flex-shrink-0 items-center justify-center rounded-xl bg-base-200 text-xs font-semibold uppercase tracking-wide text-base-content/70'>
                                                                                                        {typeLabel ?? 'FILE'}
                                                                                                </div>
                                                                                                <div className='min-w-0'>
                                                                                                        <p className='truncate font-medium text-sm text-base-content'>
                                                                                                                {file.name}
                                                                                                        </p>
                                                                                                        {metadata.length > 0 ? (
                                                                                                                <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60'>
                                                                                                                        {metadata.map((value, metaIndex) => (
                                                                                                                                <span key={`${value}-${metaIndex}`}>{value}</span>
                                                                                                                        ))}
                                                                                                                </div>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                        <div className='flex flex-wrap items-center gap-2 sm:flex-shrink-0'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-ghost btn-xs gap-2'
                                                                                                        onClick={() => previewLocalFile(file)}
                                                                                                >
                                                                                                        <Eye className='size-4' /> Preview
                                                                                                </button>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-ghost btn-xs text-error'
                                                                                                        onClick={() => removeFile(index)}
                                                                                                >
                                                                                                        Remove
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        </li>
                                                                )
                                                        })}
                                                </ul>
                                        ) : null}
                                </div>
                        </div>
                </section>
        )
}
