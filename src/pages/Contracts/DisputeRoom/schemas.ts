import { z } from 'zod'

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
        identityPaymentKey: OptionalShortTextSchema
})

export type ConfirmArbitrationFeeFormValues = z.input<typeof ConfirmArbitrationFeeSchema>
export type ConfirmArbitrationFeeFormOutput = z.infer<typeof ConfirmArbitrationFeeSchema>
