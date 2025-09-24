import { useMemo, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Paperclip, UploadCloud } from 'lucide-react'
import type { JobPostFormValues } from '../schema'

type AboutStepProps = {
        hidden?: boolean
        newAttachments: File[]
        existingAttachments: string[]
        onNewAttachmentsChange: (_files: File[]) => void
        onExistingAttachmentsChange: (_names: string[]) => void
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

        const attachmentNames = useMemo(
                () => [...existingAttachments, ...newAttachments.map(file => file.name)],
                [existingAttachments, newAttachments]
        )

        const canAddMore = useMemo(
                () => existingAttachments.length + newAttachments.length < 20,
                [existingAttachments.length, newAttachments.length]
        )

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
                        const nextNames = existingAttachments.filter((_, i) => i !== index)
                        onExistingAttachmentsChange(nextNames)
                        return
                }
                const fileIndex = index - existingCount
                const nextFiles = newAttachments.filter((_, i) => i !== fileIndex)
                onNewAttachmentsChange(nextFiles)
        }

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
                                                                {attachmentNames.length}/20 files attached. Accepted up to 25MB each.
                                                        </p>
                                                </div>
                                        </div>
                                        {attachmentNames.length > 0 ? (
                                                <ul className='mt-4 space-y-2'>
                                                        {attachmentNames.map((name, index) => (
                                                                <li
                                                                        key={`${name}-${index}`}
                                                                        className='flex items-center justify-between rounded-xl border border-base-200 bg-base-100 p-3 text-sm'
                                                                >
                                                                        <span className='truncate pr-4'>{name}</span>
                                                                        <button
                                                                                type='button'
                                                                                className='btn btn-ghost btn-xs text-error'
                                                                                onClick={() => removeFile(index)}
                                                                        >
                                                                                Remove
                                                                        </button>
                                                                </li>
                                                        ))}
                                                </ul>
                                        ) : null}
                                </div>
                        </div>
                </section>
        )
}
