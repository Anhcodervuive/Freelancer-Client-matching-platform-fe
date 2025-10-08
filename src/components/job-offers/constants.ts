import { JOB_OFFER_STATUS_META, type JobOfferStatus } from '~/types/job-offer'

export const JOB_OFFER_PAGE_SIZE = 6 as const

export const jobOfferSortOptions = [
        { value: 'newest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'price-high', label: 'Giá cao nhất' },
        { value: 'price-low', label: 'Giá thấp nhất' }
] as const

export type JobOfferSortValue = (typeof jobOfferSortOptions)[number]['value']

export type JobOfferStatusFilterValue = 'ALL' | JobOfferStatus

export const jobOfferStatusFilterOptions: Array<{
        value: JobOfferStatusFilterValue
        label: string
}> = [
        { value: 'ALL', label: 'Tất cả trạng thái' },
        ...Object.entries(JOB_OFFER_STATUS_META).map(([status, meta]) => ({
                value: status as JobOfferStatus,
                label: meta.label
        }))
]
