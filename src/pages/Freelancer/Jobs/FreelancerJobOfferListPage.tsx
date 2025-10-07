import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { CalendarClock, FileEdit, Loader2, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react'

import {
        listFreelancerJobOffers,
        respondFreelancerJobOffer,
        updateFreelancerJobOffer
} from '~/apis/job-offer.api'
import JobOfferForm, { type JobOfferFormValues } from '~/components/job-offers/JobOfferForm'
import type { JobOffer, JobOfferStatus } from '~/types/job-offer'
import {
        JOB_OFFER_STATUS_META,
        formatJobOfferCurrency,
        formatJobOfferDate,
        formatJobOfferDateTime
} from '~/types/job-offer'

const PAGE_SIZE = 6

const editableStatuses: JobOfferStatus[] = ['SENT']
const actionableStatuses: JobOfferStatus[] = ['SENT']

type OfferDialogState = {
        open: boolean
        offer: JobOffer | null
        defaults?: Partial<JobOfferFormValues>
}

const initialDialogState: OfferDialogState = { open: false, offer: null, defaults: undefined }

const computeStatusCounts = (offers: JobOffer[]) => {
        const counts = new Map<JobOfferStatus, number>()
        offers.forEach(offer => {
                counts.set(offer.status, (counts.get(offer.status) ?? 0) + 1)
        })
        return counts
}

const transformValuesToPayload = (values: JobOfferFormValues, offer?: JobOffer | null) => {
        const startDate = values.startDate
                ? new Date(values.startDate).toISOString()
                : offer?.startDate
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
                expireAt
        }
}

const FreelancerJobOfferListPage = () => {
        const [page, setPage] = useState(1)
        const [dialogState, setDialogState] = useState<OfferDialogState>(initialDialogState)
        const queryClient = useQueryClient()

        const offerQuery = useQuery({
                queryKey: ['freelancer-job-offers', { page, limit: PAGE_SIZE }],
                queryFn: () => listFreelancerJobOffers({ page, limit: PAGE_SIZE }),
                keepPreviousData: true
        })

        const offers = useMemo(() => offerQuery.data?.data ?? [], [offerQuery.data?.data])
        const total = offerQuery.data?.total ?? 0
        const limit = offerQuery.data?.limit ?? PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const statusCounts = useMemo(() => computeStatusCounts(offers), [offers])

        const updateMutation = useMutation({
                mutationFn: async (values: JobOfferFormValues) => {
                        if (!dialogState.offer) throw new Error('Missing offer reference')
                        const payload = transformValuesToPayload(values, dialogState.offer)
                        return updateFreelancerJobOffer(dialogState.offer.id, payload)
                },
                onSuccess: async () => {
                        toast.success('Đã cập nhật offer')
                        setDialogState(initialDialogState)
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể cập nhật offer'
                        toast.error(message)
                }
        })

        const respondMutation = useMutation({
                mutationFn: async ({ offer, status }: { offer: JobOffer; status: JobOfferStatus }) => {
                        return respondFreelancerJobOffer(offer.id, status)
                },
                onSuccess: async (_, variables) => {
                        const status = variables.status
                        if (status === 'ACCEPTED') {
                                toast.success('Bạn đã chấp nhận offer thành công')
                        } else if (status === 'DECLINED') {
                                toast.success('Bạn đã từ chối offer')
                        } else {
                                toast.success('Đã cập nhật phản hồi')
                        }
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể phản hồi offer'
                        toast.error(message)
                }
        })

        const handleEdit = (offer: JobOffer) => {
                const defaults: Partial<JobOfferFormValues> = {
                        title: offer.title,
                        message: offer.message ?? undefined,
                        currency: offer.currency,
                        fixedPrice: offer.fixedPrice,
                        startDate: offer.startDate ?? undefined,
                        expireAt: offer.expireAt ?? undefined
                }
                setDialogState({ open: true, offer, defaults })
        }

        const handleCloseDialog = () => {
                setDialogState(initialDialogState)
        }

        const handleRespond = (offer: JobOffer, status: JobOfferStatus) => {
                if (respondMutation.isPending) return
                respondMutation.mutate({ offer, status })
        }

        const renderOfferCard = (offer: JobOffer) => {
                const jobTitle = offer.job?.title ?? 'Công việc không xác định'
                const statusMeta = JOB_OFFER_STATUS_META[offer.status]
                const priceLabel = formatJobOfferCurrency(offer.fixedPrice, offer.currency)
                const startDateLabel = formatJobOfferDate(offer.startDate)
                const expireAtLabel = formatJobOfferDateTime(offer.expireAt)
                const canEdit = editableStatuses.includes(offer.status)
                const canRespond = actionableStatuses.includes(offer.status)

                return (
                        <div key={offer.id} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                        <div className='space-y-1'>
                                                <p className='text-sm font-semibold text-base-content'>{offer.title}</p>
                                                <p className='text-sm text-base-content/70'>Từ job: {jobTitle}</p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        </div>
                                </div>

                                <div className='mt-4 grid gap-3 md:grid-cols-3'>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ngân sách</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {priceLabel ?? 'Chưa xác định'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ngày bắt đầu</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {startDateLabel ?? 'Chưa có'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Hạn phản hồi</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {expireAtLabel ?? 'Không đặt'}
                                                </p>
                                        </div>
                                </div>

                                {offer.message ? (
                                        <div className='mt-4 rounded-2xl border border-base-200 bg-base-200/60 p-4 text-sm text-base-content/80'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Ghi chú từ client</p>
                                                <p className='mt-2 whitespace-pre-line leading-relaxed'>{offer.message}</p>
                                        </div>
                                ) : null}

                                <div className='mt-4 flex flex-wrap gap-2'>
                                        {canEdit ? (
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-outline gap-2'
                                                        onClick={() => handleEdit(offer)}
                                                >
                                                        <FileEdit className='size-4' /> Điều chỉnh điều khoản
                                                </button>
                                        ) : null}
                                        {canRespond ? (
                                                <>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-success gap-2'
                                                                disabled={respondMutation.isPending}
                                                                onClick={() => handleRespond(offer, 'ACCEPTED')}
                                                        >
                                                                {respondMutation.isPending ? (
                                                                        <Loader2 className='size-4 animate-spin' />
                                                                ) : (
                                                                        <ThumbsUp className='size-4' />
                                                                )}
                                                                {respondMutation.isPending ? 'Đang xử lý…' : 'Chấp nhận offer'}
                                                        </button>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-outline btn-error gap-2'
                                                                disabled={respondMutation.isPending}
                                                                onClick={() => handleRespond(offer, 'DECLINED')}
                                                        >
                                                                <ThumbsDown className='size-4' /> Từ chối
                                                        </button>
                                                </>
                                        ) : null}
                                        {offer.status === 'ACCEPTED' ? (
                                                <div className='rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success'>
                                                        <ShieldCheck className='mr-1 inline size-4' /> Bạn đã chấp nhận offer này
                                                </div>
                                        ) : null}
                                </div>
                        </div>
                )
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-2'>
                                <h1 className='text-2xl font-semibold text-base-content'>Job offers từ khách hàng</h1>
                                <p className='text-sm text-base-content/70'>Xem lại điều khoản, đề xuất điều chỉnh và phản hồi để bắt đầu hợp tác.</p>
                        </div>

                        <div className='mt-6 grid gap-4 md:grid-cols-3'>
                                {Object.entries(JOB_OFFER_STATUS_META).map(([status, meta]) => {
                                        const count = statusCounts.get(status as JobOfferStatus) ?? 0
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

                        <div className='mt-6 space-y-4'>
                                {offerQuery.isLoading ? (
                                        <div className='flex min-h-[200px] items-center justify-center rounded-3xl border border-base-200 bg-base-100'>
                                                <div className='flex items-center gap-3 text-base-content/70'>
                                                        <Loader2 className='size-5 animate-spin text-primary' /> Đang tải danh sách offer…
                                                </div>
                                        </div>
                                ) : null}

                                {offerQuery.isError ? (
                                        <div className='rounded-3xl border border-error/30 bg-error/10 px-6 py-4 text-sm text-error'>
                                                Không thể tải offer. Vui lòng thử lại sau.
                                        </div>
                                ) : null}

                                {!offerQuery.isLoading && offers.length === 0 ? (
                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70'>
                                                <p className='text-lg font-medium text-base-content'>Chưa có offer nào</p>
                                                <p className='mt-2'>Khi khách hàng gửi offer, bạn có thể xem và phản hồi ngay tại đây.</p>
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

                        <dialog className={`modal ${dialogState.open ? 'modal-open' : ''}`}>
                                <div className='modal-box max-w-2xl'>
                                        {dialogState.offer ? (
                                                <JobOfferForm
                                                        mode='edit'
                                                        defaultValues={dialogState.defaults}
                                                        onCancel={handleCloseDialog}
                                                        onSubmit={values => updateMutation.mutate(values)}
                                                        submitLabel={updateMutation.isPending ? 'Đang lưu…' : 'Lưu điều chỉnh'}
                                                        isSubmitting={updateMutation.isPending}
                                                        showSendNowToggle={false}
                                                        title='Điều chỉnh điều khoản'
                                                        description='Đề xuất thay đổi để thống nhất lịch bắt đầu hoặc nội dung công việc.'
                                                />
                                        ) : null}
                                </div>
                                <form method='dialog' className='modal-backdrop'>
                                        <button type='submit' onClick={handleCloseDialog} aria-label='Đóng điều chỉnh offer'>close</button>
                                </form>
                        </dialog>
                </div>
        )
}

export default FreelancerJobOfferListPage
