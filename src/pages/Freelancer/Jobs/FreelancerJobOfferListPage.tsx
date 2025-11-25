import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { CalendarClock, Loader2, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react'

import { listFreelancerJobOffers, respondFreelancerJobOffer } from '~/apis/job-offer.api'
import type { JobOffer, JobOfferRespondAction, JobOfferStatus } from '~/types/job-offer'
import {
        JOB_OFFER_STATUS_META,
        formatJobOfferCurrency,
        formatJobOfferDate,
        formatJobOfferDateTime
} from '~/types/job-offer'

const PAGE_SIZE = 6

const actionableStatuses: JobOfferStatus[] = ['SENT']

const computeStatusCounts = (offers: JobOffer[]) => {
        const counts = new Map<JobOfferStatus, number>()
        offers.forEach(offer => {
                counts.set(offer.status, (counts.get(offer.status) ?? 0) + 1)
        })
        return counts
}

const FreelancerJobOfferListPage = () => {
        const [page, setPage] = useState(1)
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

        const respondMutation = useMutation({
                mutationFn: async ({ offer, action }: { offer: JobOffer; action: JobOfferRespondAction }) => {
                        return respondFreelancerJobOffer(offer.id, action)
                },
                onSuccess: async (_, variables) => {
                        const action = variables.action
                        if (action === 'ACCEPT') {
                                toast.success('You accepted the offer successfully')
                        } else if (action === 'DECLINE') {
                                toast.success('You declined the offer')
                        } else {
                                toast.success('Response updated')
                        }
                        await queryClient.invalidateQueries({ queryKey: ['freelancer-job-offers'] })
                },
                onError: error => {
                        const message = error instanceof Error ? error.message : 'Unable to respond to the offer'
                        toast.error(message)
                }
        })

        const handleRespond = (offer: JobOffer, action: JobOfferRespondAction) => {
                if (respondMutation.isPending) return
                respondMutation.mutate({ offer, action })
        }

        const renderOfferCard = (offer: JobOffer) => {
                const jobTitle = offer.job?.title ?? 'Unknown job'
                const statusMeta = JOB_OFFER_STATUS_META[offer.status]
                const priceLabel = formatJobOfferCurrency(offer.fixedPrice, offer.currency)
                const startDateLabel = formatJobOfferDate(offer.startDate)
                const endDateLabel = formatJobOfferDate(offer.endDate)
                const expireAtLabel = formatJobOfferDateTime(offer.expireAt)
                const canRespond = actionableStatuses.includes(offer.status)

                return (
                        <div key={offer.id} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                        <div className='space-y-1'>
                                                <p className='text-sm font-semibold text-base-content'>{offer.title}</p>
                                                <p className='text-sm text-base-content/70'>From job: {jobTitle}</p>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        </div>
                                </div>

                                <div className='mt-4 grid gap-3 md:grid-cols-3'>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Budget</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {priceLabel ?? 'Not specified yet'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Start date</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {startDateLabel ?? 'Not set'}
                                                </p>
                                        </div>
                                        <div className='rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>End date</p>
                                                <p className='mt-2 text-base font-semibold text-base-content'>
                                                        {endDateLabel ?? 'Not set'}
                                                </p>
                                        </div>
                                </div>

                                <div className='mt-3 rounded-2xl border border-base-200 bg-base-200/60 p-4'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Offer acceptance deadline</p>
                                        <p className='mt-2 text-base font-semibold text-base-content'>
                                                {expireAtLabel ?? 'Not specified'}
                                        </p>
                                        <p className='mt-1 text-xs text-base-content/60'>Accept before the deadline to start working with the client.</p>
                                </div>

                                {offer.message ? (
                                        <div className='mt-4 rounded-2xl border border-base-200 bg-base-200/60 p-4 text-sm text-base-content/80'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Notes from client</p>
                                                <p className='mt-2 whitespace-pre-line leading-relaxed'>{offer.message}</p>
                                        </div>
                                ) : null}

                                {offer.status === 'WITHDRAWN' && offer.withdrawReason ? (
                                        <div className='mt-4 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-error'>
                                                <p className='text-xs font-semibold uppercase tracking-wide text-error/80'>Reason client withdrew the offer</p>
                                                <p className='mt-2 whitespace-pre-line leading-relaxed text-error/90'>
                                                        {offer.withdrawReason}
                                                </p>
                                        </div>
                                ) : null}

                                <div className='mt-4 flex flex-wrap gap-2'>
                                        {canRespond ? (
                                                <>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-success gap-2'
                                                                disabled={respondMutation.isPending}
                                                                onClick={() => handleRespond(offer, 'ACCEPT')}
                                                        >
                                                                {respondMutation.isPending ? (
                                                                        <Loader2 className='size-4 animate-spin' />
                                                                ) : (
                                                                        <ThumbsUp className='size-4' />
                                                                )}
                                                                {respondMutation.isPending ? 'Processing…' : 'Accept offer'}
                                                        </button>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm btn-outline btn-error gap-2'
                                                                disabled={respondMutation.isPending}
                                                                onClick={() => handleRespond(offer, 'DECLINE')}
                                                        >
                                                                <ThumbsDown className='size-4' /> Decline
                                                        </button>
                                                </>
                                        ) : null}
                                        {offer.status === 'ACCEPTED' ? (
                                                <div className='rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success'>
                                                        <ShieldCheck className='mr-1 inline size-4' /> You accepted this offer
                                                </div>
                                        ) : null}
                                </div>
                        </div>
                )
        }

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-2'>
                                <h1 className='text-2xl font-semibold text-base-content'>Job offers from clients</h1>
                                <p className='text-sm text-base-content/70'>Review offer details and respond to start working.</p>
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
                                                        <Loader2 className='size-5 animate-spin text-primary' /> Loading offers…
                                                </div>
                                        </div>
                                ) : null}

                                {offerQuery.isError ? (
                                        <div className='rounded-3xl border border-error/30 bg-error/10 px-6 py-4 text-sm text-error'>
                                                Unable to load offers. Please try again later.
                                        </div>
                                ) : null}

                                {!offerQuery.isLoading && offers.length === 0 ? (
                                        <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70'>
                                                <p className='text-lg font-medium text-base-content'>No offers available</p>
                                                <p className='mt-2'>When clients send offers, you can view and respond here immediately.</p>
                                        </div>
                                ) : null}

                                <div className='space-y-4'>
                                        {offers.map(offer => renderOfferCard(offer))}
                                </div>

                                {totalPages > 1 ? (
                                        <div className='flex items-center justify-between rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm'>
                                                <span className='text-base-content/60'>Page {page} / {totalPages}</span>
                                                <div className='flex gap-2'>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page <= 1 || offerQuery.isLoading}
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                        >
                                                                Previous
                                                        </button>
                                                        <button
                                                                type='button'
                                                                className='btn btn-sm'
                                                                disabled={page >= totalPages || offerQuery.isLoading}
                                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                        >
                                                                Next
                                                        </button>
                                                </div>
                                        </div>
                                ) : null}
                        </div>
                </div>
        )
}

export default FreelancerJobOfferListPage
