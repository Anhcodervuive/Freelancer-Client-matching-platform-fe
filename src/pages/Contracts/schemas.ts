import { z } from 'zod'

export const CreateContractMilestoneSchema = z.object({
        title: z
                .string()
                .trim()
                .min(1, 'Vui lòng nhập tiêu đề milestone')
                .max(255, 'Tiêu đề tối đa 255 ký tự'),
        amount: z.coerce.number().positive('Số tiền phải lớn hơn 0')
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

export const ApproveMilestoneSubmissionSchema = z.object({
        note: z
                .string()
                .trim()
                .max(2000, 'Ghi chú tối đa 2000 ký tự')
                .optional()
})

export type ApproveMilestoneSubmissionFormValues = z.infer<typeof ApproveMilestoneSubmissionSchema>

export const DeclineMilestoneSubmissionSchema = z.object({
        reason: z
                .string()
                .trim()
                .min(1, 'Vui lòng mô tả yêu cầu chỉnh sửa')
                .max(2000, 'Lý do tối đa 2000 ký tự')
})

export type DeclineMilestoneSubmissionFormValues = z.infer<typeof DeclineMilestoneSubmissionSchema>

export const PayMilestoneSchema = z.object({
        paymentMethodId: z
                .string()
                .trim()
                .min(1, 'Vui lòng chọn phương thức thanh toán'),
        note: z
                .string()
                .trim()
                .max(2000, 'Ghi chú tối đa 2000 ký tự')
                .optional()
})

export type PayMilestoneFormValues = z.infer<typeof PayMilestoneSchema>
