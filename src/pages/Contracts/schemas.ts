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
