import { z } from 'zod'
import {
        JobDurationCommitmentSchema,
        JobExperienceLevelSchema,
        JobLocationTypeSchema,
        JobPaymentModeSchema,
        JobStatusSchema,
        JobVisibilitySchema
} from '~/constants/job'
import { PROFICIENCY_OPTIONS } from '~/constants/language'

const preprocessBudget = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
                const trimmed = value.trim()
                if (!trimmed) return undefined
                const parsed = Number(trimmed)
                return Number.isNaN(parsed) ? value : parsed
        }
        return value
}

const nullableBudgetSchema = z
        .preprocess(preprocessBudget, z.union([z.number().nonnegative(), z.null()]).optional())
        .refine(
                value => value === undefined || value === null || Number.isFinite(value as number),
                'Budget amount must be a valid number'
        )

const languageRequirementSchema = z.object({
        languageCode: z
                .string()
                .min(2)
                .max(10)
                .transform(value => value.toLowerCase()),
        proficiency: z
                .enum(PROFICIENCY_OPTIONS.map(option => option.value) as [string, ...string[]])
                .default('CONVERSATIONAL')
})

const screeningQuestionSchema = z.object({
        question: z.string().min(5, 'Question should be at least 5 characters').max(500),
        isRequired: z.boolean().default(true)
})

const jobPostSkillsSchema = z.object({
        required: z.array(z.string().min(1)).max(50),
        preferred: z.array(z.string().min(1)).max(50)
})

const locationEntrySchema = z.object({
        code: z.string().min(1),
        label: z.string().min(1)
})

export const jobPostFormSchema = z.object({
        categoryId: z.string().min(1, 'Please select a job category'),
        specialtyId: z.string().min(1, 'Please select a specialty'),
        title: z.string().min(5, 'Title must have at least 5 characters').max(255),
        description: z.string().min(20, 'Tell freelancers more about the work you need'),
        customTerms: z
                .object({
                        deliverables: z.string().max(2000).optional(),
                        additionalNotes: z.string().max(2000).optional()
                })
                .partial()
                .optional(),
        paymentMode: JobPaymentModeSchema,
        budgetAmount: nullableBudgetSchema,
        budgetCurrency: z.string().trim().length(3).optional(),
        duration: JobDurationCommitmentSchema.optional(),
        experienceLevel: JobExperienceLevelSchema,
        locationType: JobLocationTypeSchema.optional(),
        preferredLocations: z.array(locationEntrySchema).max(20).default([]),
        visibility: JobVisibilitySchema.optional(),
        status: JobStatusSchema.optional(),
        languages: z.array(languageRequirementSchema).default([]),
        skills: jobPostSkillsSchema.default({ required: [], preferred: [] }),
        screeningQuestions: z.array(screeningQuestionSchema).max(20).default([]),
        attachments: z.array(z.string().min(1)).max(20).optional()
})

export type JobPostFormValues = z.infer<typeof jobPostFormSchema>
