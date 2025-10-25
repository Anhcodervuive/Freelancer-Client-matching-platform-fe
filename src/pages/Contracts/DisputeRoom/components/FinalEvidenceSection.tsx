import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import {
        AlertTriangle,
        FileText,
        Link2,
        Loader2,
        Paperclip,
        Plus,
        Trash2
} from 'lucide-react'
import { Controller, type FieldErrors, type Resolver, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import { listFinalEvidenceSources, submitFinalEvidence } from '~/apis/contract.api'
import {
        ArbitrationEvidenceSourceType,
        type DisputeEvidenceChatAttachment,
        type DisputeEvidenceMilestoneAttachment
} from '~/types/dispute'
import { extractFileExtension, formatDateTime, formatFileSize, formatFileType } from '~/utils/format'

import {
        SubmitFinalEvidenceSchema,
        type SubmitFinalEvidenceFormOutput
} from '../schemas'

type FinalEvidenceSectionProps = {
        contractId: string
        milestoneId: string
        disputeId: string
        currentUserId?: string | null
        isClientParty: boolean
        isFreelancerParty: boolean
        isAwaitingArbitrationFees?: boolean
}

type EvidenceAttachment = DisputeEvidenceMilestoneAttachment | DisputeEvidenceChatAttachment

type EvidenceSource = 'milestone' | 'chat'

type EvidenceTabId = 'selected' | 'milestone' | 'chat'

const MAX_EVIDENCE_ITEMS = 50

const getTimestamp = (value?: string | null) => {
        if (!value) return 0
        const date = new Date(value)
        const timestamp = date.getTime()
        return Number.isNaN(timestamp) ? 0 : timestamp
}

const getParticipantName = (
        user: EvidenceAttachment['submission'] | EvidenceAttachment['message'],
        currentUserId?: string | null
) => {
        if (!user) {
                return 'Người dùng'
        }

        const base = 'freelancerId' in user ? user.freelancer : 'sender' in user ? user.sender : null

        if (!base) {
                return 'Người dùng'
        }

        if (currentUserId && base.id && base.id === currentUserId) {
                return 'Bạn'
        }

        const displayName = base.displayName?.trim()
        if (displayName) {
                return displayName
        }

        const firstName = base.firstName?.trim() ?? ''
        const lastName = base.lastName?.trim() ?? ''
        const fullName = `${firstName} ${lastName}`.trim()
        if (fullName) {
                return fullName
        }

        return 'Người dùng'
}

const getAttachmentLabel = (attachment: EvidenceAttachment) => {
        if ('submissionId' in attachment) {
                return attachment.name ?? attachment.asset?.url ?? `Tệp milestone #${attachment.id}`
        }

        return attachment.name ?? attachment.asset?.url ?? `Tệp trò chuyện #${attachment.id}`
}

const truncate = (value?: string | null, length = 160) => {
        if (!value) return ''
        const trimmed = value.trim()
        if (trimmed.length <= length) {
                return trimmed
        }

        return `${trimmed.slice(0, length)}…`
}

export default function FinalEvidenceSection({
        contractId,
        milestoneId,
        disputeId,
        currentUserId,
        isClientParty,
        isFreelancerParty,
        isAwaitingArbitrationFees
}: FinalEvidenceSectionProps) {
        const allowSubmission = isClientParty || isFreelancerParty
        const queryClient = useQueryClient()

        const {
                control,
                handleSubmit,
                watch,
                reset,
                formState: { errors }
        } = useForm<SubmitFinalEvidenceFormOutput>({
                resolver: zodResolver(SubmitFinalEvidenceSchema) as Resolver<SubmitFinalEvidenceFormOutput>,
                defaultValues: {
                        statement: undefined,
                        noAdditionalEvidence: false,
                        items: []
                }
        })

        const {
                fields,
                append,
                remove
        } = useFieldArray({
                control,
                name: 'items'
        })

        const noAdditionalEvidence = watch('noAdditionalEvidence')
        const currentItems = watch('items') ?? []

        const [activeTab, setActiveTab] = useState<EvidenceTabId>('selected')

        const evidenceSourcesQuery = useQuery({
                queryKey: ['dispute-final-evidence-sources', contractId, milestoneId, disputeId],
                queryFn: () => listFinalEvidenceSources(contractId, milestoneId, disputeId),
                enabled: allowSubmission
        })

        const sourcesError = evidenceSourcesQuery.isError

        const submitMutation = useMutation({
                mutationFn: (payload: SubmitFinalEvidenceFormOutput) =>
                        submitFinalEvidence(contractId, milestoneId, disputeId, payload),
                onSuccess: async () => {
                        toast.success('Đã gửi chứng cứ tới trọng tài.')
                        reset({ statement: undefined, noAdditionalEvidence: false, items: [] })
                        await queryClient.invalidateQueries({
                                queryKey: ['dispute-final-evidence-sources', contractId, milestoneId, disputeId]
                        })
                },
                onError: error => {
                        if (isAxiosError(error)) {
                                toast.error(error.response?.data?.message ?? 'Không thể gửi chứng cứ. Vui lòng thử lại.')
                                return
                        }

                        toast.error('Không thể gửi chứng cứ. Vui lòng thử lại.')
                }
        })

        const milestoneAttachments = useMemo(() => {
                if (!evidenceSourcesQuery.data?.milestoneAttachments?.length) {
                        return [] as DisputeEvidenceMilestoneAttachment[]
                }

                return [...evidenceSourcesQuery.data.milestoneAttachments].sort((a, b) => {
                        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
                })
        }, [evidenceSourcesQuery.data?.milestoneAttachments])

        const chatAttachments = useMemo(() => {
                if (!evidenceSourcesQuery.data?.chatAttachments?.length) {
                        return [] as DisputeEvidenceChatAttachment[]
                }

                return [...evidenceSourcesQuery.data.chatAttachments].sort((a, b) => {
                        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
                })
        }, [evidenceSourcesQuery.data?.chatAttachments])

        const evidenceTabs = useMemo(
                () => [
                        {
                                id: 'selected' as EvidenceTabId,
                                label: 'Chứng cứ đã chọn',
                                count: fields.length
                        },
                        {
                                id: 'milestone' as EvidenceTabId,
                                label: 'Tệp milestone',
                                count: milestoneAttachments.length
                        },
                        {
                                id: 'chat' as EvidenceTabId,
                                label: 'Tệp tin nhắn',
                                count: chatAttachments.length
                        }
                ],
                [fields.length, milestoneAttachments.length, chatAttachments.length]
        )

        const addAttachment = (attachment: EvidenceAttachment, source: EvidenceSource) => {
                if (noAdditionalEvidence) {
                        toast.info('Bạn đang đánh dấu không gửi thêm chứng cứ mới.')
                        return
                }

                        const attachmentId = attachment.id
                        if (!attachmentId) {
                                return
                        }

                        const exists = currentItems.some(item => {
                                if (!item) return false
                                if (source === 'milestone') {
                                        return (
                                                item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT &&
                                                item.sourceId === attachmentId
                                        )
                                }

                                if (source === 'chat') {
                                        return (
                                                item.sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT &&
                                                item.sourceId === attachmentId
                                        )
                                }

                                return false
                        })

                        if (exists) {
                                toast.info('Tệp này đã có trong danh sách chứng cứ.')
                                return
                        }

                        if (fields.length >= MAX_EVIDENCE_ITEMS) {
                                toast.warn('Bạn đã đạt số lượng chứng cứ tối đa.')
                                return
                        }

                        append({
                                sourceType:
                                        source === 'milestone'
                                                ? ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT
                                                : ArbitrationEvidenceSourceType.CHAT_ATTACHMENT,
                                sourceId: attachmentId,
                                label: getAttachmentLabel(attachment)
                        })
                }

        const handleAddExternalLink = () => {
                if (fields.length >= MAX_EVIDENCE_ITEMS) {
                        toast.warn('Bạn đã đạt số lượng chứng cứ tối đa.')
                        return
                }

                append({
                        sourceType: ArbitrationEvidenceSourceType.EXTERNAL_URL,
                        label: undefined,
                        url: undefined
                })
        }

        const globalError = (
                (errors as FieldErrors<SubmitFinalEvidenceFormOutput>).root?.message ??
                (typeof errors.items === 'object' && !Array.isArray(errors.items) && errors.items?.message
                        ? (errors.items as { message?: string }).message
                        : undefined)
        )

        const isSubmitting = submitMutation.isPending
        const disableAddButtons = noAdditionalEvidence || isSubmitting
        const disableSubmit = isSubmitting || !allowSubmission || Boolean(isAwaitingArbitrationFees)

        const onSubmit = (values: SubmitFinalEvidenceFormOutput) => {
                if (fields.length === 0 && !values.statement && !values.noAdditionalEvidence) {
                        return
                }

                submitMutation.mutate(values)
        }

        if (!allowSubmission) {
                return (
                        <div className='rounded-2xl border border-base-200 bg-base-50/80 p-5'>
                                <div className='mb-3 flex items-center gap-3'>
                                        <FileText className='size-5 text-primary' />
                                        <div>
                                                <p className='text-base font-semibold text-base-content'>Nộp chứng cứ cuối cùng</p>
                                                <p className='text-sm text-base-content/70'>Chỉ chủ hợp đồng và freelancer mới có thể gửi chứng cứ.</p>
                                        </div>
                                </div>
                                <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 text-sm text-base-content/80'>
                                        Bạn không có quyền gửi chứng cứ cho dispute này.
                                </div>
                        </div>
                )
        }

        return (
                <div className='rounded-2xl border border-base-200 bg-base-50/80 p-5'>
                        <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                                <div className='flex items-center gap-3'>
                                        <FileText className='size-5 text-primary' />
                                        <div>
                                                <p className='text-base font-semibold text-base-content'>Nộp chứng cứ cuối cùng</p>
                                                <p className='text-sm text-base-content/70'>Trình bày luận điểm và chọn những tài liệu hỗ trợ tranh chấp.</p>
                                        </div>
                                </div>
                                {isAwaitingArbitrationFees && (
                                        <div className='flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800'>
                                                <AlertTriangle className='size-4 flex-shrink-0' />
                                                <span>Cần hoàn tất phí trọng tài để trọng tài viên xem xét chứng cứ.</span>
                                        </div>
                                )}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                                <div className='space-y-2'>
                                        <label className='text-sm font-medium text-base-content'>Luận điểm của bạn</label>
                                        <Controller
                                                name='statement'
                                                control={control}
                                                render={({ field }) => (
                                                        <textarea
                                                                {...field}
                                                                rows={4}
                                                                className='textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100'
                                                                placeholder='Chia sẻ bối cảnh, yêu cầu và điều bạn muốn trọng tài cân nhắc.'
                                                                disabled={isSubmitting}
                                                        />
                                                )}
                                        />
                                        {errors.statement && (
                                                <p className='text-xs text-error'>{errors.statement.message}</p>
                                        )}
                                </div>

                                <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4'>
                                        <label className='flex items-start gap-3 text-sm text-base-content'>
                                                <Controller
                                                        name='noAdditionalEvidence'
                                                        control={control}
                                                        render={({ field }) => (
                                                                <input
                                                                        type='checkbox'
                                                                        className='checkbox checkbox-primary mt-1'
                                                                        checked={field.value ?? false}
                                                                        onChange={event => field.onChange(event.target.checked)}
                                                                        disabled={isSubmitting}
                                                                />
                                                        )}
                                                />
                                                <span>
                                                        Tôi không có chứng cứ bổ sung ngoài những gì đã cung cấp trước đó.
                                                        <span className='mt-1 block text-xs text-base-content/60'>Nếu chọn, danh sách chứng cứ bên dưới sẽ bị vô hiệu hóa.</span>
                                                </span>
                                        </label>
                                </div>

                                <div className='space-y-4'>
                                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                                <p className='text-sm font-semibold text-base-content'>Quản lý chứng cứ gửi tới trọng tài</p>
                                                {activeTab === 'selected' && (
                                                        <div className='flex flex-wrap gap-2'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-outline btn-sm'
                                                                        onClick={handleAddExternalLink}
                                                                        disabled={disableAddButtons}
                                                                >
                                                                        <Link2 className='mr-1 size-4' /> Thêm liên kết ngoài
                                                                </button>
                                                        </div>
                                                )}
                                        </div>

                                        <div className='flex flex-wrap gap-2 rounded-2xl border border-base-200 bg-base-100/60 p-1.5 shadow-sm'>
                                                {evidenceTabs.map(tab => {
                                                        const isActive = activeTab === tab.id
                                                        return (
                                                                <button
                                                                        key={tab.id}
                                                                        type='button'
                                                                        className={`flex flex-1 items-center justify-between gap-2 rounded-2xl px-4 py-2 text-xs font-medium uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-initial sm:text-sm ${
                                                                                isActive
                                                                                        ? 'bg-primary text-primary-content shadow'
                                                                                        : 'bg-transparent text-base-content/70 hover:bg-base-200/80'
                                                                        }`}
                                                                        onClick={() => setActiveTab(tab.id)}
                                                                        disabled={isSubmitting}
                                                                >
                                                                        <span>{tab.label}</span>
                                                                        <span className='rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold sm:text-xs'>
                                                                                {tab.count}
                                                                        </span>
                                                                </button>
                                                        )
                                                })}
                                        </div>

                                        <div className='rounded-2xl border border-base-200 bg-base-100/80 p-4 shadow-sm'>
                                                {activeTab === 'selected' && (
                                                        <div className='space-y-4'>
                                                                {fields.length === 0 ? (
                                                                        <div className='rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-4 py-6 text-center text-sm text-base-content/70'>
                                                                                Chưa có chứng cứ nào được chọn.
                                                                        </div>
                                                                ) : (
                                                                        fields.map((field, index) => {
                                                                                const sourceType = field.sourceType
                                                                                const itemErrors = errors.items?.[index]
                                                                                const isExternal = sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL
                                                                                const isAsset = sourceType === ArbitrationEvidenceSourceType.ASSET

                                                                                return (
                                                                                        <div
                                                                                                key={field.id}
                                                                                                className='rounded-2xl border border-base-200 bg-base-100/90 p-4 shadow-sm'
                                                                                        >
                                                                                                <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                                                                                                        <div className='inline-flex items-center gap-2 rounded-full border border-base-200 bg-base-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-base-content/70'>
                                                                                                                <Paperclip className='size-3.5 text-primary' />
                                                                                                                {sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT && 'Tệp milestone'}
                                                                                                                {sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT && 'Tệp trong chat'}
                                                                                                                {sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL && 'Liên kết ngoài'}
                                                                                                                {sourceType === ArbitrationEvidenceSourceType.ASSET && 'Tệp đã tải lên'}
                                                                                                        </div>
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className='btn btn-ghost btn-sm text-error'
                                                                                                                onClick={() => remove(index)}
                                                                                                                disabled={isSubmitting}
                                                                                                        >
                                                                                                                <Trash2 className='mr-1 size-4' /> Gỡ bỏ
                                                                                                        </button>
                                                                                                </div>

                                                                                                <div className='grid gap-4 md:grid-cols-2'>
                                                                                                        <div className='space-y-2'>
                                                                                                                <label className='text-xs font-medium uppercase tracking-wide text-base-content/70'>Tiêu đề chứng cứ</label>
                                                                                                                <Controller
                                                                                                                        name={`items.${index}.label`}
                                                                                                                        control={control}
                                                                                                                        render={({ field: labelField }) => (
                                                                                                                                <input
                                                                                                                                        {...labelField}
                                                                                                                                        type='text'
                                                                                                                                        className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                                                                                                        placeholder='Ví dụ: Trao đổi ngày 12/04'
                                                                                                                                        disabled={isSubmitting}
                                                                                                                                />
                                                                                                                        )}
                                                                                                                />
                                                                                                                {itemErrors?.label && (
                                                                                                                        <p className='text-xs text-error'>{itemErrors.label.message}</p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                        <div className='space-y-2'>
                                                                                                                <label className='text-xs font-medium uppercase tracking-wide text-base-content/70'>Mô tả</label>
                                                                                                                <Controller
                                                                                                                        name={`items.${index}.description`}
                                                                                                                        control={control}
                                                                                                                        render={({ field: descriptionField }) => (
                                                                                                                                <textarea
                                                                                                                                        {...descriptionField}
                                                                                                                                        rows={3}
                                                                                                                                        className='textarea textarea-bordered h-auto w-full rounded-2xl border-base-300 bg-base-100'
                                                                                                                                        placeholder='Tóm tắt nội dung chứng minh điều gì trong tranh chấp.'
                                                                                                                                        disabled={isSubmitting}
                                                                                                                                />
                                                                                                                        )}
                                                                                                                />
                                                                                                                {itemErrors?.description && (
                                                                                                                        <p className='text-xs text-error'>{itemErrors.description.message}</p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                </div>

                                                                                                {isExternal && (
                                                                                                        <div className='mt-3 space-y-2'>
                                                                                                                <label className='text-xs font-medium uppercase tracking-wide text-base-content/70'>Đường dẫn chứng cứ</label>
                                                                                                                <Controller
                                                                                                                        name={`items.${index}.url`}
                                                                                                                        control={control}
                                                                                                                        render={({ field: urlField }) => (
                                                                                                                                <input
                                                                                                                                        {...urlField}
                                                                                                                                        type='url'
                                                                                                                                        className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                                                                                                        placeholder='https://'
                                                                                                                                        disabled={isSubmitting}
                                                                                                                                />
                                                                                                                        )}
                                                                                                                />
                                                                                                                {itemErrors?.url && (
                                                                                                                        <p className='text-xs text-error'>{itemErrors.url.message}</p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                )}

                                                                                                {isAsset && (
                                                                                                        <div className='mt-3 space-y-2'>
                                                                                                                <label className='text-xs font-medium uppercase tracking-wide text-base-content/70'>Mã asset</label>
                                                                                                                <Controller
                                                                                                                        name={`items.${index}.assetId`}
                                                                                                                        control={control}
                                                                                                                        render={({ field: assetField }) => (
                                                                                                                                <input
                                                                                                                                        {...assetField}
                                                                                                                                        type='text'
                                                                                                                                        className='input input-bordered w-full rounded-2xl border-base-300 bg-base-100'
                                                                                                                                        placeholder='Nhập assetId đã được hệ thống cấp.'
                                                                                                                                        disabled={isSubmitting}
                                                                                                                                />
                                                                                                                        )}
                                                                                                                />
                                                                                                                {itemErrors?.assetId && (
                                                                                                                        <p className='text-xs text-error'>{itemErrors.assetId.message}</p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                )}

                                                                                                <Controller
                                                                                                        name={`items.${index}.sourceType`}
                                                                                                        control={control}
                                                                                                        render={({ field: sourceTypeField }) => (
                                                                                                                <input type='hidden' {...sourceTypeField} />
                                                                                                        )}
                                                                                                />
                                                                                                <Controller
                                                                                                        name={`items.${index}.sourceId`}
                                                                                                        control={control}
                                                                                                        render={({ field: sourceIdField }) => (
                                                                                                                <input type='hidden' {...sourceIdField} />
                                                                                                        )}
                                                                                                />
                                                                                        </div>
                                                                                )
                                                                        })
                                                                )}
                                                        </div>
                                                )}

                                                {activeTab === 'milestone' && (
                                                        <div className='space-y-3'>
                                                                {sourcesError ? (
                                                                        <div className='flex flex-wrap items-center gap-2 text-sm text-error'>
                                                                                Không thể tải danh sách tệp.
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-ghost btn-xs text-error underline'
                                                                                        onClick={() => evidenceSourcesQuery.refetch()}
                                                                                        disabled={evidenceSourcesQuery.isFetching}
                                                                                >
                                                                                        Thử lại
                                                                                </button>
                                                                        </div>
                                                                ) : evidenceSourcesQuery.isLoading ? (
                                                                        <div className='flex items-center gap-2 text-sm text-base-content/70'>
                                                                                <Loader2 className='size-4 animate-spin' /> Đang tải danh sách tệp…
                                                                        </div>
                                                                ) : milestoneAttachments.length ? (
                                                                        milestoneAttachments.map(attachment => {
                                                                                const sizeLabel = formatFileSize(attachment.size)
                                                                                const typeLabel = formatFileType({
                                                                                        mimeType: attachment.mimeType,
                                                                                        extension: extractFileExtension(attachment.name)
                                                                                })
                                                                                const submissionMessage = attachment.submission?.message
                                                                                const createdAt = attachment.createdAt || attachment.submission?.createdAt
                                                                                const authorLabel = getParticipantName(attachment.submission ?? null, currentUserId)

                                                                                return (
                                                                                        <div
                                                                                                key={`milestone-${attachment.id}`}
                                                                                                className='flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100/90 p-4 md:flex-row md:items-center md:justify-between'
                                                                                        >
                                                                                                <div className='space-y-1 text-sm text-base-content/80'>
                                                                                                        <p className='font-semibold text-base-content'>{getAttachmentLabel(attachment)}</p>
                                                                                                        <p className='text-xs text-base-content/60'>
                                                                                                                {authorLabel && <span className='font-medium text-base-content'>{authorLabel}</span>}
                                                                                                                {createdAt && <span className='ml-1'>· {formatDateTime(createdAt)}</span>}
                                                                                                        </p>
                                                                                                        {(sizeLabel || typeLabel) && (
                                                                                                                <p className='text-xs text-base-content/60'>
                                                                                                                        {typeLabel && <span>{typeLabel}</span>}
                                                                                                                        {sizeLabel && <span className='ml-1'>({sizeLabel})</span>}
                                                                                                                </p>
                                                                                                        )}
                                                                                                        {submissionMessage && (
                                                                                                                <p className='text-xs italic text-base-content/60'>
                                                                                                                        “{truncate(submissionMessage)}”
                                                                                                                </p>
                                                                                                        )}
                                                                                                </div>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-outline btn-sm'
                                                                                                        onClick={() => addAttachment(attachment, 'milestone')}
                                                                                                        disabled={disableAddButtons}
                                                                                                >
                                                                                                        <Plus className='mr-1 size-4' /> Thêm vào chứng cứ
                                                                                                </button>
                                                                                        </div>
                                                                                )
                                                                        })
                                                                ) : (
                                                                        <p className='text-sm text-base-content/60'>Chưa có tệp nào từ milestone.</p>
                                                                )}
                                                        </div>
                                                )}

                                                {activeTab === 'chat' && (
                                                        <div className='space-y-3'>
                                                                {sourcesError ? (
                                                                        <div className='flex flex-wrap items-center gap-2 text-sm text-error'>
                                                                                Không thể tải danh sách tệp.
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-ghost btn-xs text-error underline'
                                                                                        onClick={() => evidenceSourcesQuery.refetch()}
                                                                                        disabled={evidenceSourcesQuery.isFetching}
                                                                                >
                                                                                        Thử lại
                                                                                </button>
                                                                        </div>
                                                                ) : evidenceSourcesQuery.isLoading ? (
                                                                        <div className='flex items-center gap-2 text-sm text-base-content/70'>
                                                                                <Loader2 className='size-4 animate-spin' /> Đang tải danh sách tệp…
                                                                        </div>
                                                                ) : chatAttachments.length ? (
                                                                        chatAttachments.map(attachment => {
                                                                                const sizeLabel = formatFileSize(attachment.size)
                                                                                const typeLabel = formatFileType({
                                                                                        mimeType: attachment.mimeType,
                                                                                        extension: extractFileExtension(attachment.name)
                                                                                })
                                                                                const messageBody = attachment.message?.body
                                                                                const createdAt = attachment.createdAt || attachment.message?.sentAt
                                                                                const authorLabel = getParticipantName(attachment.message ?? null, currentUserId)

                                                                                return (
                                                                                        <div
                                                                                                key={`chat-${attachment.id}`}
                                                                                                className='flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100/90 p-4 md:flex-row md:items-center md:justify-between'
                                                                                        >
                                                                                                <div className='space-y-1 text-sm text-base-content/80'>
                                                                                                        <p className='font-semibold text-base-content'>{getAttachmentLabel(attachment)}</p>
                                                                                                        <p className='text-xs text-base-content/60'>
                                                                                                                {authorLabel && <span className='font-medium text-base-content'>{authorLabel}</span>}
                                                                                                                {createdAt && <span className='ml-1'>· {formatDateTime(createdAt)}</span>}
                                                                                                        </p>
                                                                                                        {(sizeLabel || typeLabel) && (
                                                                                                                <p className='text-xs text-base-content/60'>
                                                                                                                        {typeLabel && <span>{typeLabel}</span>}
                                                                                                                        {sizeLabel && <span className='ml-1'>({sizeLabel})</span>}
                                                                                                                </p>
                                                                                                        )}
                                                                                                        {messageBody && (
                                                                                                                <p className='text-xs italic text-base-content/60'>
                                                                                                                        “{truncate(messageBody)}”
                                                                                                                </p>
                                                                                                        )}
                                                                                                </div>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-outline btn-sm'
                                                                                                        onClick={() => addAttachment(attachment, 'chat')}
                                                                                                        disabled={disableAddButtons}
                                                                                                >
                                                                                                        <Plus className='mr-1 size-4' /> Thêm vào chứng cứ
                                                                                                </button>
                                                                                        </div>
                                                                                )
                                                                        })
                                                                ) : (
                                                                        <p className='text-sm text-base-content/60'>Chưa có tệp nào từ cuộc trò chuyện.</p>
                                                                )}
                                                        </div>
                                                )}
                                        </div>

                                        {globalError && (
                                                <div className='rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error'>
                                                        {globalError}
                                                </div>
                                        )}
                                </div>

                                <div className='flex justify-end'>
                                        <button type='submit' className='btn btn-primary' disabled={disableSubmit}>
                                                {isSubmitting ? 'Đang gửi…' : 'Gửi chứng cứ'}
                                        </button>
                                </div>
                        </form>
                </div>
        )
}
