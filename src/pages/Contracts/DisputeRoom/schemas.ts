import { z } from 'zod'

import { ArbitrationEvidenceSourceType } from '~/types/dispute'

const MoneyFieldSchema = z.preprocess(value => {
        if (typeof value === 'number') {
                return value
        }

        if (typeof value === 'string') {
                const normalized = value.replace(/,/g, '').trim()
                if (!normalized) {
                        return 0
                }

                const parsed = Number(normalized)
                return Number.isFinite(parsed) ? parsed : NaN
        }

        return value
}, z.number({ invalid_type_error: 'Số tiền không hợp lệ' }).min(0, 'Số tiền không được âm'))

const OptionalTextSchema = z
        .string()
        .max(2000, 'Tối đa 2000 ký tự')
        .optional()
        .transform(value => {
                if (typeof value !== 'string') {
                        return undefined
                }

                const trimmed = value.trim()
                return trimmed.length > 0 ? trimmed : undefined
        })

const OptionalShortTextSchema = z
        .string()
        .max(255, 'Tối đa 255 ký tự')
        .optional()
        .transform(value => {
                if (typeof value !== 'string') {
                        return undefined
                }

                const trimmed = value.trim()
                return trimmed.length > 0 ? trimmed : undefined
        })

export const OpenDisputeSchema = z
        .object({
                proposedRelease: MoneyFieldSchema,
                proposedRefund: MoneyFieldSchema,
                note: OptionalTextSchema,
                message: OptionalTextSchema
        })
        .superRefine((data, ctx) => {
                const total = (data.proposedRelease ?? 0) + (data.proposedRefund ?? 0)
                if (total <= 0) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['proposedRelease'],
                                message: 'Vui lòng nhập ít nhất một số tiền lớn hơn 0'
                        })
                }
        })

export type OpenDisputeFormValues = z.input<typeof OpenDisputeSchema>
export type OpenDisputeFormOutput = z.infer<typeof OpenDisputeSchema>

export const DisputeNegotiationSchema = z
        .object({
                releaseAmount: MoneyFieldSchema,
                refundAmount: MoneyFieldSchema,
                message: OptionalTextSchema
        })
        .superRefine((data, ctx) => {
                const total = (data.releaseAmount ?? 0) + (data.refundAmount ?? 0)
                if (total <= 0) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['releaseAmount'],
                                message: 'Đề xuất cần phân bổ ít nhất một phần của quỹ'
                        })
                }
        })

export type DisputeNegotiationFormValues = z.input<typeof DisputeNegotiationSchema>
export type DisputeNegotiationFormOutput = z.infer<typeof DisputeNegotiationSchema>

export const RejectNegotiationSchema = z.object({
        responseMessage: z
                .string({ required_error: 'Vui lòng giải thích lý do từ chối đề xuất.' })
                .trim()
                .min(1, 'Vui lòng giải thích lý do từ chối đề xuất.')
                .max(2000, 'Phản hồi tối đa 2000 ký tự.')
})

export type RejectNegotiationFormValues = z.input<typeof RejectNegotiationSchema>

export const ConfirmArbitrationFeeSchema = z.object({
        paymentMethodRefId: z
                .string({ required_error: 'Vui lòng chọn phương thức thanh toán.' })
                .trim()
                .min(1, 'Vui lòng chọn phương thức thanh toán.'),
        idempotencyKey: OptionalShortTextSchema
})

export type ConfirmArbitrationFeeFormValues = z.input<typeof ConfirmArbitrationFeeSchema>
export type ConfirmArbitrationFeeFormOutput = z.infer<typeof ConfirmArbitrationFeeSchema>

const OptionalLongTextSchema = z
        .string()
        .max(5000, 'Tối đa 5000 ký tự')
        .optional()
        .transform(value => {
                if (typeof value !== 'string') {
                        return undefined
                }

                const trimmed = value.trim()
                return trimmed.length > 0 ? trimmed : undefined
        })

export const FinalEvidenceItemSchema = z
        .object({
                label: OptionalShortTextSchema,
                description: OptionalLongTextSchema,
                sourceType: z.nativeEnum(ArbitrationEvidenceSourceType),
                sourceId: OptionalShortTextSchema,
                url: z
                        .string()
                        .trim()
                        .url('Đường dẫn không hợp lệ')
                        .max(2048, 'Đường dẫn tối đa 2048 ký tự')
                        .optional(),
                assetId: OptionalShortTextSchema
        })
        .superRefine((item, ctx) => {
                const requireSourceId =
                        item.sourceType === ArbitrationEvidenceSourceType.MILESTONE_ATTACHMENT ||
                        item.sourceType === ArbitrationEvidenceSourceType.CHAT_ATTACHMENT
                const requireAssetId = item.sourceType === ArbitrationEvidenceSourceType.ASSET
                const requireUrl = item.sourceType === ArbitrationEvidenceSourceType.EXTERNAL_URL

                if (requireSourceId && !item.sourceId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'sourceId là bắt buộc với loại chứng cứ đã chọn',
                                path: ['sourceId']
                        })
                }

                if (requireAssetId && !item.assetId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'assetId là bắt buộc với loại chứng cứ đã chọn',
                                path: ['assetId']
                        })
                }

                if (requireUrl && !item.url) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'url là bắt buộc với loại chứng cứ đã chọn',
                                path: ['url']
                        })
                }

                if (!requireSourceId && !requireAssetId && !requireUrl) {
                        if (!item.assetId && !item.sourceId && !item.url) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'Cần cung cấp ít nhất một nguồn tham chiếu cho chứng cứ',
                                        path: ['sourceId']
                                })
                        }
                }
        })

export const SubmitFinalEvidenceSchema = z
        .object({
                statement: OptionalLongTextSchema,
                noAdditionalEvidence: z.boolean().optional(),
                items: z.array(FinalEvidenceItemSchema).max(50, 'Tối đa 50 chứng cứ').optional()
        })
        .superRefine((data, ctx) => {
                const hasStatement = Boolean(data.statement && data.statement.length > 0)
                const hasItems = Boolean(data.items && data.items.length > 0)
                const markedNone = Boolean(data.noAdditionalEvidence)

                if (!hasStatement && !hasItems && !markedNone) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Cần cung cấp luận điểm, danh sách chứng cứ hoặc đánh dấu không có chứng cứ mới'
                        })
                }

                if (markedNone && hasItems) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Không thể vừa đánh dấu không có chứng cứ mới vừa gửi danh sách chứng cứ',
                                path: ['items']
                        })
                }
        })

export type SubmitFinalEvidenceFormValues = z.input<typeof SubmitFinalEvidenceSchema>
export type SubmitFinalEvidenceFormOutput = z.infer<typeof SubmitFinalEvidenceSchema>
