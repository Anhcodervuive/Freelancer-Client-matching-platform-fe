import { z } from 'zod'

const parseBoolean = (value: unknown) => {
        if (value === undefined || value === null) return undefined
        if (typeof value === 'boolean') return value
        const normalized = String(value).trim().toLowerCase()
        if (['true', '1', 'yes'].includes(normalized)) return true
        if (['false', '0', 'no'].includes(normalized)) return false
        return undefined
}

const coerceDate = (value: unknown) => {
        if (value === undefined || value === null || value instanceof Date) return value
        if (typeof value === 'string' && value.trim() === '') return undefined
        const parsed = new Date(value as string | number)
        return Number.isNaN(parsed.getTime()) ? value : parsed
}

const CurrencySchema = z
        .string()
        .trim()
        .min(3, 'Currency phải có tối thiểu 3 ký tự')
        .max(3, 'Currency phải có tối đa 3 ký tự')

const MessageSchema = z
        .string()
        .trim()
        .max(5000, 'Tin nhắn quá dài')

export const JOB_OFFER_STATUSES = [
        'DRAFT',
        'SENT',
        'WITHDRAWN',
        'ACCEPTED',
        'DECLINED',
        'EXPIRED'
] as const

export type JobOfferStatus = (typeof JOB_OFFER_STATUSES)[number]

const OfferStatusParamSchema = z.preprocess(value => {
        if (typeof value === 'string') {
                return value.toUpperCase()
        }
        return value
}, z.enum(JOB_OFFER_STATUSES))

export const CreateJobOfferSchema = z
        .object({
                jobId: z.string().min(1).optional(),
                freelancerId: z.string().min(1),
                proposalId: z.string().min(1).optional(),
                invitationId: z.string().min(1).optional(),
                title: z.string().trim().min(1).max(255),
                message: MessageSchema.optional(),
                currency: CurrencySchema,
                fixedPrice: z.coerce.number().positive('Giá phải lớn hơn 0'),
                startDate: z.preprocess(coerceDate, z.date().optional()),
                endDate: z.preprocess(coerceDate, z.date().optional()),
                expireAt: z.preprocess(coerceDate, z.date().optional()),
                sendNow: z.preprocess(parseBoolean, z.boolean().optional()).optional()
        })
        .superRefine((data, ctx) => {
                if (!data.jobId && !data.proposalId && !data.invitationId) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Cần cung cấp jobId hoặc proposalId hoặc invitationId',
                                path: ['jobId']
                        })
                }

                if (data.expireAt && data.expireAt.getTime() <= Date.now()) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt phải ở tương lai',
                                path: ['expireAt']
                        })
                }

                if (data.startDate && data.endDate && data.startDate > data.endDate) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước endDate',
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

export type CreateJobOfferInput = z.infer<typeof CreateJobOfferSchema>

const ClientUpdatableStatuses: JobOfferStatus[] = ['DRAFT', 'SENT', 'WITHDRAWN']

export const UpdateJobOfferSchema = z
        .object({
                jobId: z.union([z.string().min(1), z.null()]).optional(),
                freelancerId: z.string().min(1).optional(),
                proposalId: z.union([z.string().min(1), z.null()]).optional(),
                invitationId: z.union([z.string().min(1), z.null()]).optional(),
                title: z.string().trim().min(1).max(255).optional(),
                message: z.union([MessageSchema, z.null()]).optional(),
                currency: CurrencySchema.optional(),
                fixedPrice: z.coerce.number().positive('Giá phải lớn hơn 0').optional(),
                startDate: z.preprocess(coerceDate, z.date().nullable().optional()),
                endDate: z.preprocess(coerceDate, z.date().nullable().optional()),
                expireAt: z.preprocess(coerceDate, z.date().nullable().optional()),
                status: z.enum(JOB_OFFER_STATUSES).optional(),
                sendNow: z.preprocess(parseBoolean, z.boolean().optional()).optional()
        })
        .superRefine((data, ctx) => {
                if (data.status && !ClientUpdatableStatuses.includes(data.status)) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Trạng thái không hợp lệ',
                                path: ['status']
                        })
                }

                if (data.sendNow && data.status && data.status !== 'SENT') {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'sendNow chỉ áp dụng khi status là SENT',
                                path: ['sendNow']
                        })
                }

                if (data.expireAt && !(data.expireAt instanceof Date) && data.expireAt !== null) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt không hợp lệ',
                                path: ['expireAt']
                        })
                }

                if (data.expireAt instanceof Date && data.expireAt.getTime() <= Date.now()) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'expireAt phải ở tương lai',
                                path: ['expireAt']
                        })
                }

                if (data.endDate && !(data.endDate instanceof Date) && data.endDate !== null) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'endDate không hợp lệ',
                                path: ['endDate']
                        })
                }

                if (
                        data.startDate instanceof Date &&
                        data.endDate instanceof Date &&
                        data.startDate > data.endDate
                ) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'startDate phải trước endDate',
                                path: ['startDate']
                        })
                }

                if (
                        data.endDate instanceof Date &&
                        data.expireAt instanceof Date &&
                        data.endDate < data.expireAt
                ) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Hạn chấp nhận không thể sau ngày kết thúc dự kiến',
                                path: ['expireAt']
                        })
                }
        })

export type UpdateJobOfferInput = z.infer<typeof UpdateJobOfferSchema>

export const JobOfferFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        jobId: z.string().min(1).optional(),
        freelancerId: z.string().min(1).optional(),
        status: OfferStatusParamSchema.optional(),
        search: z.string().trim().min(1).optional(),
        includeExpired: z.preprocess(parseBoolean, z.boolean().optional()).optional(),
        sortBy: z.enum(['newest', 'oldest', 'price-high', 'price-low']).optional()
})

export type JobOfferFilterInput = z.infer<typeof JobOfferFilterSchema>

export const FreelancerJobOfferFilterSchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        jobId: z.string().min(1).optional(),
        status: OfferStatusParamSchema.optional(),
        statuses: z
                .preprocess(value => {
                        if (Array.isArray(value)) {
                                return value.map(item =>
                                        typeof item === 'string' ? item.trim().toUpperCase() : item
                                )
                        }
                        if (typeof value === 'string' && value.length > 0) {
                                return value
                                        .split(',')
                                        .map(item => item.trim())
                                        .filter(item => item.length > 0)
                                        .map(item => item.toUpperCase())
                        }
                        return value
                }, z.array(z.enum(JOB_OFFER_STATUSES)).optional())
                .optional(),
        includeExpired: z.preprocess(parseBoolean, z.boolean().optional()).optional(),
        search: z.string().trim().min(1).optional(),
        sortBy: z.enum(['newest', 'oldest', 'price-high', 'price-low']).optional()
})

export type FreelancerJobOfferFilterInput = z.infer<typeof FreelancerJobOfferFilterSchema>

export const RespondJobOfferSchema = z.object({
        action: z.enum(['ACCEPT', 'DECLINE'])
})

export type RespondJobOfferInput = z.infer<typeof RespondJobOfferSchema>
export type JobOfferRespondAction = RespondJobOfferInput['action']

export type JobOffer = {
        id: string
        jobId?: string | null
        freelancerId: string
        proposalId?: string | null
        invitationId?: string | null
        title: string
        message?: string | null
        currency: string
        fixedPrice: number
        startDate?: string | null
        endDate?: string | null
        expireAt?: string | null
        status: JobOfferStatus
        sendNow?: boolean | null
        createdAt?: string | null
        updatedAt?: string | null
        freelancer?: {
                id?: string | null
                name?: string | null
                avatar?: string | null
                email?: string | null
        } | null
        job?: {
                id: string
                title?: string | null
        } | null
        contractId?: string | null
}

export type PaginatedJobOfferResponse = {
        data: JobOffer[]
        total: number
        page: number
        limit: number
}

export const JOB_OFFER_STATUS_META: Record<
        JobOfferStatus,
        { label: string; badgeClass: string; description: string }
> = {
        DRAFT: {
                label: 'Draft',
                badgeClass: 'badge-ghost text-base-content/60',
                description: 'Offer is saved as draft and not sent to the freelancer yet.'
        },
        SENT: {
                label: 'Sent',
                badgeClass: 'badge-info/20 text-info',
                description:
                        'Offer đã được gửi. Freelancer cần chấp nhận trước hạn để bắt đầu hợp tác.'
        },
        WITHDRAWN: {
                label: 'Withdrawn',
                badgeClass: 'badge-ghost text-base-content/50',
                description: 'Offer has been withdrawn by the client.'
        },
        ACCEPTED: {
                label: 'Accepted',
                badgeClass: 'badge-success/20 text-success',
                description: 'Offer accepted by the freelancer. Contract can begin soon.'
        },
        DECLINED: {
                label: 'Declined',
                badgeClass: 'badge-error/20 text-error',
                description: 'Offer was declined by the freelancer.'
        },
        EXPIRED: {
                label: 'Expired',
                badgeClass: 'badge-warning/20 text-warning',
                description: 'Freelancer không chấp nhận trước hạn nên offer đã hết hiệu lực.'
        }
}

export const formatJobOfferCurrency = (amount?: number | null, currency?: string | null) => {
        if (amount == null || !Number.isFinite(amount)) return undefined
        if (!currency) return amount.toLocaleString()
        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency,
                        maximumFractionDigits: 0
                }).format(amount)
        } catch {
                return `${amount.toLocaleString()} ${currency}`
        }
}

export const formatJobOfferDateTime = (value?: string | null) => {
        if (!value) return undefined
        try {
                return new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                }).format(new Date(value))
        } catch {
                return undefined
        }
}

export const formatJobOfferDate = (value?: string | null) => {
        if (!value) return undefined
        try {
                return new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'medium'
                }).format(new Date(value))
        } catch {
                return undefined
        }
}
