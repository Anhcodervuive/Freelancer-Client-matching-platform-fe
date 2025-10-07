import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
        CalendarClock,
        CircleDollarSign,
        FileEdit,
        Loader2,
        ShieldCheck,
        Sparkles,
        UserCircle,
        XCircle
} from 'lucide-react'

import { listClientJobOffers, updateClientJobOffer, withdrawClientJobOffer } from '~/apis/job-offer.api'
import JobOfferForm, { type JobOfferFormValues } from '~/components/job-offers/JobOfferForm'
import { routes } from '~/config/routes'
import type { JobOffer } from '~/types/job-offer'
import {
        JOB_OFFER_STATUS_META,
        formatJobOfferCurrency,
        formatJobOfferDate,
        formatJobOfferDateTime
} from '~/types/job-offer'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 6

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

const computeStatusCounts = (offers: JobOffer[]) => {
        const counts = new Map<JobOffer['status'], number>()
        offers.forEach(offer => {
                const status = offer.status
                counts.set(status, (counts.get(status) ?? 0) + 1)
        })
        return counts
}

const formatFreelancerName = (offer: JobOffer) => {
        const name = offer.freelancer?.name?.trim()
        if (name) return name
        const email = offer.freelancer?.email?.trim()
        if (email) return email
        return 'Freelancer'
}

const getFreelancerAvatar = (offer: JobOffer) => offer.freelancer?.avatar ?? null

const getFreelancerInitials = (offer: JobOffer) => {
        const name = formatFreelancerName(offer)
        const parts = name
                .split(' ')
                .map(part => part.trim())
                .filter(Boolean)
        if (parts.length === 0) return 'FR'
        if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
        return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

const getFreelancerProfileLink = (offer: JobOffer) => {
        const id = offer.freelancer?.id
        if (!id) return undefined
        return routes.comons.freelancerProfile(String(id))
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
        const queryClient = useQueryClient()

        const offerQuery = useQuery({
                queryKey: ['client-job-offers', { page, limit: PAGE_SIZE }],
                queryFn: () => listClientJobOffers({ page, limit: PAGE_SIZE }),
                keepPreviousData: true
        })

        const offers = useMemo(() => offerQuery.data?.data ?? [], [offerQuery.data?.data])
        const total = offerQuery.data?.total ?? 0
        const limit = offerQuery.data?.limit ?? PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const statusCounts = useMemo(() => computeStatusCounts(offers), [offers])

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
                mutationFn: async (offer: JobOffer) => withdrawClientJobOffer(offer.id),
                onSuccess: async () => {
                        toast.success('Đã rút offer')
                        await queryClient.invalidateQueries({ queryKey: ['client-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Không thể rút offer'
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

        const handleWithdraw = (offer: JobOffer) => {
                if (withdrawMutation.isPending) return
                withdrawMutation.mutate(offer)
        }

        const isDialogOpen = dialogState.mode === 'edit' && Boolean(dialogState.offer)
        const activeOffer = dialogState.offer ?? null

        const renderOfferCard = (offer: JobOffer) => {
                const freelancerName = formatFreelancerName(offer)
                const avatarUrl = getFreelancerAvatar(offer)
                const avatarFallback = getFreelancerInitials(offer)
                const statusMeta = JOB_OFFER_STATUS_META[offer.status]
                const priceLabel = formatJobOfferCurrency(offer.fixedPrice, offer.currency)
                const startDateLabel = formatJobOfferDate(offer.startDate)
                const endDateLabel = formatJobOfferDate(offer.endDate)
                const expireAtLabel = formatJobOfferDateTime(offer.expireAt)
                const profileLink = getFreelancerProfileLink(offer)
                const canWithdraw = allowedWithdrawStatuses.includes(offer.status)

                return (
                        <div key={offer.id} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                                        <div className='flex flex-1 items-start gap-3'>
                                                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                                                        {avatarUrl ? (
                                                                <img
                                                                        src={avatarUrl}
                                                                        alt={freelancerName}
                                                                        className='h-full w-full rounded-2xl object-cover'
                                                                />
                                                        ) : (
                                                                <span className='text-sm font-semibold'>{avatarFallback}</span>
                                                        )}
                                                </div>
                                                <div className='space-y-1'>
                                                        <p className='text-sm font-semibold text-base-content'>
                                                                {offer.title}
                                                        </p>
                                                        <p className='text-sm text-base-content/70'>
                                                                Offer tới {freelancerName}
                                                        </p>
                                                        {profileLink ? (
                                                                <Link className='link text-xs text-primary' to={profileLink}>
                                                                        Xem hồ sơ freelancer
                                                                </Link>
                                                        ) : null}
                                                </div>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        </div>
                                </div>

                                <div className='mt-4 grid gap-3 md:grid-cols-3'>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <CircleDollarSign className='size-4 text-primary/70' /> Tổng ngân sách
                                                </div>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {priceLabel ?? 'Chưa xác định'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <CalendarClock className='size-4 text-primary/70' /> Ngày bắt đầu
                                                </div>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {startDateLabel ?? 'Chưa có' }
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <CalendarClock className='size-4 text-primary/70' /> Ngày kết thúc
                                                </div>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {endDateLabel ?? 'Chưa có'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Sparkles className='size-4 text-primary/70' /> Hạn chấp nhận offer
                                                </div>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {expireAtLabel ?? 'Không đặt'}
                                                </p>
                                        </div>
                                </div>

                                {offer.message ? (
                                        <div className='mt-4 rounded-2xl border border-base-200 bg-base-200/60 p-4 text-sm text-base-content/80'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Lời nhắn</p>
                                                <p className='mt-2 whitespace-pre-line leading-relaxed'>{offer.message}</p>
                                        </div>
                                ) : null}

                                <div className='mt-4 flex flex-wrap gap-2'>
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
                                                        {withdrawMutation.isPending ? (
                                                                <Loader2 className='size-4 animate-spin' />
                                                        ) : (
                                                                <XCircle className='size-4' />
                                                        )}
                                                        {withdrawMutation.isPending ? 'Đang xử lý…' : 'Rút offer'}
                                                </button>
                                        ) : null}
                                        {offer.contractId ? (
                                                <div className='rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success'>
                                                        <ShieldCheck className='mr-1 inline size-4' /> Đã tạo hợp đồng
                                                </div>
                                        ) : null}
                                </div>
                        </div>
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
                </div>
        )
}

export default ClientJobOfferListPage
