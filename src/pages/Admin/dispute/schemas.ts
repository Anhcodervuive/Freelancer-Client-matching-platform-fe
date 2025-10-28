import { z } from 'zod'

export const AdminRequestArbitrationFeesSchema = z.object({
        deadlineDays: z.coerce
                .number({ invalid_type_error: 'Số ngày không hợp lệ.' })
                .int('Số ngày phải là số nguyên.')
                .min(1, 'Tối thiểu 1 ngày.')
                .max(14, 'Tối đa 14 ngày.')
})

export type AdminRequestArbitrationFeesFormOutput = z.infer<typeof AdminRequestArbitrationFeesSchema>

export const AdminLockDisputeFormSchema = z.object({
        note: z
                .string({ invalid_type_error: 'Ghi chú không hợp lệ.' })
                .trim()
                .max(2000, 'Tối đa 2000 ký tự.')
                .optional()
})

export type AdminLockDisputeFormOutput = z.infer<typeof AdminLockDisputeFormSchema>

export const AdminGenerateArbitrationDossierFormSchema = z.object({
        notes: z
                .string({ invalid_type_error: 'Ghi chú không hợp lệ.' })
                .trim()
                .max(5000, 'Tối đa 5000 ký tự.')
                .optional(),
        finalize: z.boolean().optional()
})

export type AdminGenerateArbitrationDossierFormOutput = z.infer<
        typeof AdminGenerateArbitrationDossierFormSchema
>
