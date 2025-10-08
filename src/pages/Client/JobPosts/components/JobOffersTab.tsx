import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, Sparkles } from 'lucide-react'

import { listClientJobOffers } from '~/apis/job-offer.api'
import JobOfferCard from '~/components/job-offers/JobOfferCard'
import {
        JOB_OFFER_PAGE_SIZE,
        jobOfferSortOptions,
        jobOfferStatusFilterOptions,
        type JobOfferSortValue,
        type JobOfferStatusFilterValue
} from '~/components/job-offers/constants'
import { computeJobOfferStatusCounts } from '~/components/job-offers/utils'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { JobOffer } from '~/types/job-offer'
import { JOB_OFFER_STATUS_META } from '~/types/job-offer'
import type { JobPostDetail } from '~/types/job-post'

const statusMetaEntries = Object.entries(JOB_OFFER_STATUS_META)

type Props = {
        job: JobPostDetail
        isActive: boolean
}

const JobOffersTab = ({ job, isActive }: Props) => {
        const [page, setPage] = useState(1)
        const [selectedStatus, setSelectedStatus] = useState<JobOfferStatusFilterValue>('ALL')
        const [sortBy, setSortBy] = useState<JobOfferSortValue>('newest')
        const [includeExpired, setIncludeExpired] = useState(false)
        const [searchTerm, setSearchTerm] = useState('')
        const debouncedSearch = useDebounce(searchTerm, 400)

        useEffect(() => {
                setPage(1)
        }, [selectedStatus, includeExpired, sortBy, debouncedSearch])

        const filters = useMemo(() => {
                const trimmedSearch = debouncedSearch.trim()
                return {
                        page,
                        limit: JOB_OFFER_PAGE_SIZE,
                        jobId: job.id,
                        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
                        includeExpired: includeExpired ? true : undefined,
                        sortBy,
                        search: trimmedSearch ? trimmedSearch : undefined
                }
        }, [page, job.id, selectedStatus, includeExpired, sortBy, debouncedSearch])

        const offerQuery = useQuery({
                queryKey: ['client-job-offers', 'job', job.id, filters],
                queryFn: () => listClientJobOffers(filters),
                enabled: isActive,
                keepPreviousData: true
        })

        const offers = useMemo(() => offerQuery.data?.data ?? [], [offerQuery.data?.data])
        const total = offerQuery.data?.total ?? 0
        const limit = offerQuery.data?.limit ?? JOB_OFFER_PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const statusCounts = useMemo(() => computeJobOfferStatusCounts(offers), [offers])

        return (
                <div className='space-y-5'>
                        <div className='flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm md:flex-row md:items-center md:justify-between'>
                                <div>
                                        <h2 className='text-xl font-semibold text-base-content'>Job offers cho công việc này</h2>
                                        <p className='text-sm text-base-content/70'>Xem nhanh các offer đã gửi tới freelancer từ job post này.</p>
                                </div>
                                <Link to={routes.me.client.offers.list} className='btn btn-outline btn-sm gap-2'>
                                        <Sparkles className='size-4' /> Quản lý tất cả offer
                                </Link>
                        </div>

                        <div className='grid gap-4 md:grid-cols-3'>
                                {statusMetaEntries.map(([status, meta]) => {
                                        const count = statusCounts.get(status as JobOffer['status']) ?? 0
                                        return (
                                                <div key={status} className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                                        <div className='flex items-center justify-between'>
                                                                <div>
                                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                {meta.label}
                                                                        </p>
                                                                        <p className='text-xs text-base-content/60'>{meta.description}</p>
                                                                </div>
                                                                <span className='text-2xl font-semibold text-base-content'>{count}</span>
                                                        </div>
                                                </div>
                                        )
                                })}
                        </div>

                        <div className='rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                <div className='grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
                                        <label className='input input-bordered flex items-center gap-2'>
                                                <Search className='size-4 text-base-content/50' />
                                                <input
                                                        type='search'
                                                        className='grow'
                                                        value={searchTerm}
                                                        onChange={event => setSearchTerm(event.target.value)}
                                                        placeholder='Tìm kiếm offer theo tiêu đề hoặc freelancer'
                                                        aria-label='Tìm kiếm offer theo tiêu đề hoặc freelancer'
                                                />
                                        </label>
                                        <div className='form-control'>
                                                <label className='label' htmlFor='job-detail-offer-status'>
                                                        <span className='label-text text-sm font-semibold text-base-content/70'>Trạng thái</span>
                                                </label>
                                                <select
                                                        id='job-detail-offer-status'
                                                        className='select select-bordered select-sm'
                                                        value={selectedStatus}
                                                        onChange={event =>
                                                                setSelectedStatus(event.target.value as JobOfferStatusFilterValue)
                                                        }
                                                >
                                                        {jobOfferStatusFilterOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </div>
                                        <div className='form-control'>
                                                <label className='label' htmlFor='job-detail-offer-sort'>
                                                        <span className='label-text text-sm font-semibold text-base-content/70'>Sắp xếp</span>
                                                </label>
                                                <select
                                                        id='job-detail-offer-sort'
                                                        className='select select-bordered select-sm'
                                                        value={sortBy}
                                                        onChange={event => setSortBy(event.target.value as JobOfferSortValue)}
                                                >
                                                        {jobOfferSortOptions.map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </option>
                                                        ))}
                                                </select>
                                        </div>
                                        <div className='form-control'>
                                                <label className='label'>
                                                        <span className='label-text text-sm font-semibold text-base-content/70'>Tùy chọn</span>
                                                </label>
                                                <label className='flex items-center gap-3 rounded-2xl border border-base-200 bg-base-200/60 px-3 py-2 text-sm'>
                                                        <input
                                                                type='checkbox'
                                                                className='checkbox checkbox-sm'
                                                                checked={includeExpired}
                                                                onChange={event => setIncludeExpired(event.target.checked)}
                                                        />
                                                        <span className='text-sm text-base-content/80'>Bao gồm offer đã hết hạn</span>
                                                </label>
                                        </div>
                                </div>
                        </div>

                        <div className='space-y-4'>
                                {offerQuery.isLoading ? (
                                        <div className='flex min-h-[200px] items-center justify-center rounded-2xl border border-base-200 bg-base-100'>
                                                <div className='flex items-center gap-3 text-base-content/70'>
                                                        <Loader2 className='size-5 animate-spin text-primary' />
                                                        Đang tải danh sách offer…
                                                </div>
                                        </div>
                                ) : null}

                                {offerQuery.isError ? (
                                        <div className='rounded-2xl border border-error/30 bg-error/10 px-6 py-4 text-sm text-error'>
                                                Không thể tải danh sách offer. Vui lòng thử lại sau.
                                        </div>
                                ) : null}

                                {!offerQuery.isLoading && offers.length === 0 ? (
                                        <div className='rounded-2xl border border-dashed border-base-300 bg-base-100 px-8 py-14 text-center text-sm text-base-content/70'>
                                                <p className='text-lg font-medium text-base-content'>Chưa có offer nào cho công việc này</p>
                                                <p className='mt-2'>Hãy gửi offer tới freelancer từ trang proposal hoặc mời freelancer mới.</p>
                                        </div>
                                ) : null}

                                <div className='space-y-4'>
                                        {offers.map(offer => (
                                                <JobOfferCard key={offer.id} offer={offer} />
                                        ))}
                                </div>

                                {totalPages > 1 ? (
                                        <div className='flex items-center justify-between rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm'>
                                                <span className='text-base-content/60'>Trang {page} / {totalPages}</span>
                                                <div className='flex gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page <= 1 || offerQuery.isLoading}
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                        >
                                                                Trước
                                                        </button>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page >= totalPages || offerQuery.isLoading}
                                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                        >
                                                                Sau
                                                        </button>
                                                </div>
                                        </div>
                                ) : null}
                        </div>
                </div>
        )
}

export default JobOffersTab
