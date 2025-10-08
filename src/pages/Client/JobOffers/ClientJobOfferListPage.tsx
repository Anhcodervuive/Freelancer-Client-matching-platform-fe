import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { CalendarClock, FileEdit, Loader2, Search, UserCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { listClientJobOffers, updateClientJobOffer, withdrawClientJobOffer } from '~/apis/job-offer.api'
import JobOfferCard from '~/components/job-offers/JobOfferCard'
import JobOfferForm, { type JobOfferFormValues } from '~/components/job-offers/JobOfferForm'
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

const allowedWithdrawStatuses: JobOffer['status'][] = ['DRAFT', 'SENT']

const createOfferDefaults = {
        currency: 'USD',
        fixedPrice: undefined,
        sendNow: true
} satisfies Partial<JobOfferFormValues>

type OfferDialogState = {
        mode: 'create' | 'edit'
        offer?: JobOffer | null
        defaults?: Partial<JobOfferFormValues>
}

const initialDialogState: OfferDialogState = {
        mode: 'create',
        offer: null,
        defaults: createOfferDefaults
}

const withdrawReasonOptions = [
        { value: 'HIRED_ELSEWHERE', label: 'Đã thuê freelancer khác' },
        { value: 'SCOPE_CHANGED', label: 'Phạm vi công việc đã thay đổi' },
        { value: 'BUDGET_ISSUES', label: 'Ngân sách không còn phù hợp' },
        { value: 'PROJECT_ON_HOLD', label: 'Dự án tạm hoãn hoặc hủy' },
        { value: 'OTHER', label: 'Lý do khác' }
] as const

type WithdrawReasonValue = (typeof withdrawReasonOptions)[number]['value']

type WithdrawDialogState = {
        isOpen: boolean
        offer: JobOffer | null
        selectedReason: WithdrawReasonValue | ''
        otherReason: string
        error?: string
}

const initialWithdrawState: WithdrawDialogState = {
        isOpen: false,
        offer: null,
        selectedReason: '',
        otherReason: '',
        error: undefined
}

const shouldShowSendToggle = (offer?: JobOffer | null) => {
        if (!offer) return true
        return offer.status === 'DRAFT'
}

const transformFormValuesToPayload = (
        values: JobOfferFormValues,
        offer?: JobOffer | null
) => {
        const startDate = values.startDate
                ? new Date(values.startDate).toISOString()
                : offer?.startDate
                ? null
                : undefined
        const endDate = values.endDate
                ? new Date(values.endDate).toISOString()
                : offer?.endDate
                ? null
                : undefined
        const expireAt = values.expireAt
                ? new Date(values.expireAt).toISOString()
                : offer?.expireAt
                ? null
                : undefined

        return {
                title: values.title,
                message: values.message ?? null,
                currency: values.currency,
                fixedPrice: values.fixedPrice,
                startDate,
                endDate,
                expireAt,
                sendNow: values.sendNow
        }
}

const ClientJobOfferListPage = () => {
        const [page, setPage] = useState(1)
        const [dialogState, setDialogState] = useState<OfferDialogState>(initialDialogState)
        const [withdrawDialog, setWithdrawDialog] = useState<WithdrawDialogState>(initialWithdrawState)
        const [selectedStatus, setSelectedStatus] = useState<JobOfferStatusFilterValue>('ALL')
        const [sortBy, setSortBy] = useState<JobOfferSortValue>('newest')
        const [includeExpired, setIncludeExpired] = useState(false)
        const [searchTerm, setSearchTerm] = useState('')
        const debouncedSearch = useDebounce(searchTerm, 400)
        const queryClient = useQueryClient()

        useEffect(() => {
                setPage(1)
        }, [selectedStatus, includeExpired, sortBy, debouncedSearch])

        const queryFilters = useMemo(() => {
                const trimmedSearch = debouncedSearch.trim()
                return {
                        page,
                        limit: JOB_OFFER_PAGE_SIZE,
                        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
                        includeExpired: includeExpired ? true : undefined,
                        sortBy,
                        search: trimmedSearch ? trimmedSearch : undefined
                }
        }, [page, selectedStatus, includeExpired, sortBy, debouncedSearch])

        const offerQuery = useQuery({
                queryKey: ['client-job-offers', queryFilters],
                queryFn: () => listClientJobOffers(queryFilters),
                keepPreviousData: true
        })

        const offers = useMemo(() => offerQuery.data?.data ?? [], [offerQuery.data?.data])
        const total = offerQuery.data?.total ?? 0
        const limit = offerQuery.data?.limit ?? JOB_OFFER_PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const statusCounts = useMemo(() => computeJobOfferStatusCounts(offers), [offers])

        const updateMutation = useMutation({
                mutationFn: async (values: JobOfferFormValues) => {
                        const { offer } = dialogState
                        if (!offer) throw new Error('Missing offer reference')
                        const payload = transformFormValuesToPayload(values, offer)
                        return updateClientJobOffer(offer.id, payload)
                },
                onSuccess: async () => {
                        toast.success('Cập nhật offer thành công')
                        setDialogState(initialDialogState)
                        await queryClient.invalidateQueries({ queryKey: ['client-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể cập nhật offer'
                        toast.error(message)
                }
        })

        const withdrawMutation = useMutation({
                mutationFn: async ({ offerId, reason }: { offerId: string; reason: string }) =>
                        withdrawClientJobOffer(offerId, { withdrawReason: reason }),
                onSuccess: async () => {
                        toast.success('Đã rút offer')
                        setWithdrawDialog(initialWithdrawState)
                        await queryClient.invalidateQueries({ queryKey: ['client-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể rút offer'
                        setWithdrawDialog(prev => ({ ...prev, error: message }))
                        toast.error(message)
                }
        })

        const handleEditOffer = (offer: JobOffer) => {
                const defaults: Partial<JobOfferFormValues> = {
                        title: offer.title,
                        message: offer.message ?? undefined,
                        currency: offer.currency ?? createOfferDefaults.currency,
                        fixedPrice: offer.fixedPrice,
                        startDate: offer.startDate ?? undefined,
                        endDate: offer.endDate ?? undefined,
                        expireAt: offer.expireAt ?? undefined,
                        sendNow: offer.status === 'DRAFT' ? true : false
                }
                setDialogState({ mode: 'edit', offer, defaults })
        }

        const handleCloseDialog = () => {
                setDialogState(initialDialogState)
        }

        const openWithdrawDialog = (offer: JobOffer) => {
                setWithdrawDialog({
                        ...initialWithdrawState,
                        isOpen: true,
                        offer
                })
        }

        const handleWithdraw = (offer: JobOffer) => {
                if (withdrawMutation.isPending) return
                openWithdrawDialog(offer)
        }

        const handleCloseWithdrawDialog = () => {
                if (withdrawMutation.isPending) return
                setWithdrawDialog(initialWithdrawState)
        }

        const handleConfirmWithdraw = () => {
                if (withdrawMutation.isPending) return
                const { offer, selectedReason, otherReason } = withdrawDialog
                if (!offer) return

                const option = withdrawReasonOptions.find(item => item.value === selectedReason)

                let finalReason = ''
                if (option) {
                        if (option.value === 'OTHER') {
                                finalReason = otherReason.trim()
                        } else {
                                finalReason = option.label
                        }
                }

                if (!finalReason) {
                        setWithdrawDialog(prev => ({
                                ...prev,
                                error: 'Vui lòng chọn hoặc nhập lý do rút offer'
                        }))
                        return
                }

                withdrawMutation.mutate({ offerId: offer.id, reason: finalReason })
        }

        const isDialogOpen = dialogState.mode === 'edit' && Boolean(dialogState.offer)
        const activeOffer = dialogState.offer ?? null
        const isWithdrawDialogOpen = withdrawDialog.isOpen && Boolean(withdrawDialog.offer)

        const renderOfferCard = (offer: JobOffer) => {
                const canWithdraw = allowedWithdrawStatuses.includes(offer.status)

                return (
                        <JobOfferCard
                                key={offer.id}
                                offer={offer}
                                actions={
                                        <>
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-outline gap-2'
                                                        onClick={() => handleEditOffer(offer)}
                                                >
                                                        <FileEdit className='size-4' /> Chỉnh sửa
                                                </button>
                                                {canWithdraw ? (
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-outline btn-error gap-2'
                                                                onClick={() => handleWithdraw(offer)}
                                                                disabled={withdrawMutation.isPending}
                                                        >
                                                                <XCircle className='size-4' /> Rút offer
                                                        </button>
                                                ) : null}
                                        </>
                                }
                        />
                )
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-semibold text-base-content'>Job offers</h1>
                                        <p className='text-sm text-base-content/70'>Theo dõi và quản lý các offer bạn đã gửi tới freelancer.</p>
                                </div>
                                <Link to={routes.me.client.jobs.list} className='btn btn-outline btn-sm gap-2'>
                                        <UserCircle className='size-4' /> Quay lại job posts
                                </Link>
                        </div>

                        <div className='mt-6 grid gap-4 md:grid-cols-3'>
                                {Object.entries(JOB_OFFER_STATUS_META).map(([status, meta]) => {
                                        const count = statusCounts.get(status as JobOffer['status']) ?? 0
                                        return (
                                                <div
                                                        key={status}
                                                        className='rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'
                                                >
                                                        <div className='flex items-center gap-3'>
                                                                <div className='flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                                                                        <CalendarClock className='size-5' />
                                                                </div>
                                                                <div>
                                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                {meta.label}
                                                                        </p>
                                                                        <p className='text-xl font-semibold text-base-content'>{count}</p>
                                                                </div>
                                                        </div>
                                                        <p className='mt-2 text-xs text-base-content/60'>{meta.description}</p>
                                                </div>
                                        )
                                })}
                        </div>

                        <div className='mt-6 rounded-3xl border border-base-200 bg-base-100 p-4 shadow-sm'>
                                <div className='grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
                                        <label className='input input-bordered flex items-center gap-2'>
                                                <Search className='size-4 text-base-content/50' />
                                                <input
                                                        type='search'
                                                        className='grow'
                                                        value={searchTerm}
                                                        onChange={event => setSearchTerm(event.target.value)}
                                                        placeholder='Tìm kiếm theo tiêu đề hoặc freelancer...'
                                                        aria-label='Tìm kiếm offer'
                                                />
                                        </label>
                                        <div className='form-control'>
                                                <label className='label' htmlFor='job-offer-status-filter'>
                                                        <span className='label-text text-sm font-semibold text-base-content/70'>Trạng thái</span>
                                                </label>
                                                <select
                                                        id='job-offer-status-filter'
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
                                                <label className='label' htmlFor='job-offer-sort'>
                                                        <span className='label-text text-sm font-semibold text-base-content/70'>Sắp xếp</span>
                                                </label>
                                                <select
                                                        id='job-offer-sort'
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

                        <div className='mt-6 space-y-4'>
                                {offerQuery.isLoading ? (
                                        <div className='flex min-h-[200px] items-center justify-center rounded-3xl border border-base-200 bg-base-100'>
                                                <div className='flex items-center gap-3 text-base-content/70'>
                                                        <Loader2 className='size-5 animate-spin text-primary' />
                                                        Đang tải danh sách offer…
                                                </div>
                                        </div>
                                ) : null}

                                {offerQuery.isError ? (
                                        <div className='rounded-3xl border border-error/30 bg-error/10 px-6 py-4 text-sm text-error'>
                                                Không thể tải danh sách offer. Vui lòng thử lại sau.
                                        </div>
                                ) : null}

                                {!offerQuery.isLoading && offers.length === 0 ? (
                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70'>
                                                <p className='text-lg font-medium text-base-content'>Chưa có offer nào</p>
                                                <p className='mt-2'>Hãy mở các proposal và chọn “Hire” để tạo job offer đầu tiên.</p>
                                        </div>
                                ) : null}

                                <div className='space-y-4'>
                                        {offers.map(offer => renderOfferCard(offer))}
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

                        <dialog className={`modal ${isDialogOpen ? 'modal-open' : ''}`}>
                                <div className='modal-box max-w-2xl'>
                                        {activeOffer ? (
                                                <JobOfferForm
                                                        mode='edit'
                                                        defaultValues={dialogState.defaults}
                                                        showSendNowToggle={shouldShowSendToggle(activeOffer)}
                                                        submitLabel={updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                                                        isSubmitting={updateMutation.isPending}
                                                        onCancel={handleCloseDialog}
                                                        onSubmit={values => updateMutation.mutate(values)}
                                                        title='Chỉnh sửa job offer'
                                                        description={`Cập nhật điều khoản trước khi gửi tới ${formatFreelancerName(activeOffer)}.`}
                                                />
                                        ) : null}
                                </div>
                                <form method='dialog' className='modal-backdrop'>
                                        <button type='submit' onClick={handleCloseDialog} aria-label='Đóng chỉnh sửa offer'>close</button>
                                </form>
                        </dialog>

                        <dialog className={`modal ${isWithdrawDialogOpen ? 'modal-open' : ''}`}>
                                <div className='modal-box max-w-lg'>
                                        <h3 className='text-lg font-semibold text-base-content'>Rút job offer</h3>
                                        <p className='mt-1 text-sm text-base-content/70'>Vui lòng chọn lý do để chúng tôi cải thiện trải nghiệm tuyển dụng.</p>

                                        {withdrawDialog.offer ? (
                                                <div className='mt-4 rounded-2xl border border-base-200 bg-base-200/60 px-4 py-3 text-sm text-base-content/80'>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Đang rút offer</p>
                                                        <p className='mt-1 font-semibold text-base-content'>{withdrawDialog.offer.title}</p>
                                                </div>
                                        ) : null}

                                        <div className='mt-4 space-y-3'>
                                                {withdrawReasonOptions.map(option => {
                                                        const checked = withdrawDialog.selectedReason === option.value
                                                        return (
                                                                <label
                                                                        key={option.value}
                                                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                                                                                checked
                                                                                        ? 'border-error bg-error/5 text-error'
                                                                                        : 'border-base-200 bg-base-200/50 text-base-content/80 hover:border-error/40'
                                                                        }`}
                                                                >
                                                                        <input
                                                                                type='radio'
                                                                                name='withdraw-reason'
                                                                                className='radio radio-sm mt-1'
                                                                                value={option.value}
                                                                                checked={checked}
                                                                                onChange={() =>
                                                                                        setWithdrawDialog(prev => ({
                                                                                                ...prev,
                                                                                                selectedReason: option.value,
                                                                                                otherReason:
                                                                                                        option.value === 'OTHER'
                                                                                                                ? prev.otherReason
                                                                                                                : '',
                                                                                                error: undefined
                                                                                        }))
                                                                                }
                                                                        />
                                                                        <span>{option.label}</span>
                                                                </label>
                                                        )
                                                })}
                                        </div>

                                        {withdrawDialog.selectedReason === 'OTHER' ? (
                                                <div className='mt-3'>
                                                        <label className='text-xs font-semibold uppercase tracking-wide text-base-content/60' htmlFor='withdraw-other-reason'>Lý do cụ thể</label>
                                                        <textarea
                                                                id='withdraw-other-reason'
                                                                className='textarea textarea-bordered mt-2 w-full text-sm'
                                                                rows={3}
                                                                value={withdrawDialog.otherReason}
                                                                onChange={event =>
                                                                        setWithdrawDialog(prev => ({
                                                                                ...prev,
                                                                                otherReason: event.target.value,
                                                                                error: undefined
                                                                        }))
                                                                }
                                                                placeholder='Nhập lý do rút offer'
                                                        />
                                                </div>
                                        ) : null}

                                        {withdrawDialog.error ? (
                                                <p className='mt-3 text-sm text-error'>{withdrawDialog.error}</p>
                                        ) : null}

                                        <div className='mt-6 flex justify-end gap-2'>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost btn-sm'
                                                        onClick={handleCloseWithdrawDialog}
                                                        disabled={withdrawMutation.isPending}
                                                >
                                                        Hủy
                                                </button>
                                                <button
                                                        type='button'
                                                        className='btn btn-error btn-sm gap-2'
                                                        onClick={handleConfirmWithdraw}
                                                        disabled={withdrawMutation.isPending}
                                                >
                                                        {withdrawMutation.isPending ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <XCircle className='size-4' />
                                                        )}
                                                        {withdrawMutation.isPending ? 'Đang xử lý…' : 'Xác nhận rút' }
                                                </button>
                                        </div>
                                </div>
                                <form method='dialog' className='modal-backdrop'>
                                        <button
                                                type='submit'
                                                onClick={handleCloseWithdrawDialog}
                                                aria-label='Đóng hộp thoại rút offer'
                                        >
                                                close
                                        </button>
                                </form>
                        </dialog>
                </div>
        )
}

export default ClientJobOfferListPage
