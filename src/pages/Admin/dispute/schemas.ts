import { z } from 'zod'

export const AdminRequestArbitrationFeesSchema = z.object({
        deadlineDays: z
                .coerce.number({ invalid_type_error: 'Số ngày không hợp lệ.' })
                .int('Số ngày phải là số nguyên.')
                .min(1, 'Tối thiểu 1 ngày.')
                .max(14, 'Tối đa 14 ngày.')
})

export type AdminRequestArbitrationFeesFormOutput = z.infer<typeof AdminRequestArbitrationFeesSchema>
