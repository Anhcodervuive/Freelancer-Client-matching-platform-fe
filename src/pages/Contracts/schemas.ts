import { z } from 'zod'
import { ContractClosureType } from '~/types/contract'

const coerceDate = (value: unknown) => {
        if (value === undefined || value === null || value instanceof Date) return value
        if (typeof value === 'string' && value.trim() === '') return undefined
        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const sanitizeOptionalText = (value: unknown) => {
        if (typeof value !== 'string') return value
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : undefined
}

const CurrencySchema = z
        .string()
        .trim()
        .min(3, 'Currency phải có tối thiểu 3 ký tự')
        .max(3, 'Currency phải có tối đa 3 ký tự')

export const CreateContractMilestoneSchema = z
        .object({
                title: z
                        .string()
                        .trim()
                        .min(1, 'Vui lòng nhập tiêu đề milestone')
                        .max(255, 'Tiêu đề tối đa 255 ký tự'),
                amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
                currency: CurrencySchema,
                startDate: z.preprocess(coerceDate, z.date().nullable().optional()),
                endDate: z.preprocess(coerceDate, z.date().nullable().optional())
        })
        .superRefine((data, ctx) => {
                if (data.startDate && data.endDate && data.startDate > data.endDate) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước hoặc bằng endDate',
                                path: ['startDate']
                        })
                }

                if (data.endDate && !(data.endDate instanceof Date)) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'endDate không hợp lệ',
                                path: ['endDate']
                        })
                }
        })

export type CreateContractMilestoneFormValues = z.infer<typeof CreateContractMilestoneSchema>

export const SubmitMilestoneWorkSchema = z.object({
        message: z
                .string()
                .trim()
                .min(1, 'Vui lòng mô tả kết quả bàn giao milestone'),
        note: z
                .string()
                .trim()
                .max(2000, 'Ghi chú tối đa 2000 ký tự')
                .optional()
})

export type SubmitMilestoneWorkFormValues = z.infer<typeof SubmitMilestoneWorkSchema>

const ReviewRatingSchema = z
        .coerce
        .number()
        .int({ message: 'Điểm đánh giá phải là số nguyên' })
        .min(1, 'Điểm đánh giá tối thiểu là 1')
        .max(5, 'Điểm đánh giá tối đa là 5')

export const ApproveMilestoneSubmissionSchema = z.object({
        reviewNote: z
                .string()
                .trim()
                .max(2000, 'Ghi chú tối đa 2000 ký tự')
                .optional(),
        reviewRating: ReviewRatingSchema
})

export type ApproveMilestoneSubmissionFormValues = z.infer<typeof ApproveMilestoneSubmissionSchema>

export const DeclineMilestoneSubmissionSchema = z.object({
        reviewNote: z
                .string()
                .trim()
                .min(1, 'Vui lòng mô tả yêu cầu chỉnh sửa')
                .max(2000, 'Lý do tối đa 2000 ký tự'),
        reviewRating: ReviewRatingSchema.optional()
})

export type DeclineMilestoneSubmissionFormValues = z.infer<typeof DeclineMilestoneSubmissionSchema>

export const PayMilestoneSchema = z.object({
        paymentMethodId: z
                .string()
                .trim()
                .min(1, 'Vui lòng chọn phương thức thanh toán'),
        idempotencyKey: z
                .string()
                .trim()
                .min(1, 'Idempotency key không hợp lệ')
                .max(255, 'Idempotency key tối đa 255 ký tự')
                .optional(),
        note: z
                .string()
                .trim()
                .max(2000, 'Ghi chú tối đa 2000 ký tự')
                .optional()
})

export type PayMilestoneFormValues = z.infer<typeof PayMilestoneSchema>

export const CancelMilestoneSchema = z.object({
        reason: z.preprocess(
                sanitizeOptionalText,
                z
                        .string()
                        .min(1, 'Vui lòng chia sẻ lý do hủy milestone')
                        .max(2000, 'Lý do hủy tối đa 2000 ký tự')
                        .optional()
        )
})

export type CancelMilestoneFormValues = z.infer<typeof CancelMilestoneSchema>

export const RespondMilestoneCancellationSchema = z.object({
        action: z.enum(['accept', 'decline']),
        reason: z.preprocess(
                sanitizeOptionalText,
                z
                        .string()
                        .min(1, 'Vui lòng mô tả lý do phản hồi')
                        .max(2000, 'Lý do tối đa 2000 ký tự')
                        .optional()
        ),
        idempotencyKey: z
                .string()
                .trim()
                .min(1, 'Idempotency key không hợp lệ')
                .max(255, 'Idempotency key tối đa 255 ký tự')
                .optional()
})

export type RespondMilestoneCancellationFormValues = z.infer<
        typeof RespondMilestoneCancellationSchema
>

export const EndContractSchema = z
        .object({
                closureType: z.nativeEnum(ContractClosureType, {
                        errorMap: () => ({
                                message: 'Vui lòng chọn cách kết thúc hợp đồng'
                        })
                }),
                closureReasonOptionId: z.preprocess(
                        sanitizeOptionalText,
                        z
                                .string()
                                .trim()
                                .min(1, 'Vui lòng chọn lý do kết thúc hợp đồng')
                                .optional()
                ),
                closureReason: z.preprocess(
                        sanitizeOptionalText,
                        z
                                .string()
                                .min(10, 'Lý do kết thúc hợp đồng tối thiểu 10 ký tự')
                                .max(2000, 'Lý do kết thúc hợp đồng tối đa 2000 ký tự')
                                .optional()
                )
        })
        .superRefine((data, ctx) => {
                const hasOption = Boolean(data.closureReasonOptionId)
                const hasReason = typeof data.closureReason === 'string' && data.closureReason.trim().length > 0

                if (data.closureType === ContractClosureType.CANCELLED && !hasOption && !hasReason) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Vui lòng chọn hoặc nhập lý do kết thúc hợp đồng',
                                path: ['closureReason']
                        })
                }
        })

export type EndContractFormValues = z.infer<typeof EndContractSchema>

export const SubmitContractFeedbackSchema = z.object({
        rating: ReviewRatingSchema,
        comment: z.preprocess(
                sanitizeOptionalText,
                z
                        .string()
                        .min(10, 'Đánh giá tối thiểu 10 ký tự')
                        .max(2000, 'Đánh giá tối đa 2000 ký tự')
                        .optional()
        ),
        wouldHireAgain: z.boolean().optional()
})

export type SubmitContractFeedbackFormValues = z.infer<typeof SubmitContractFeedbackSchema>
