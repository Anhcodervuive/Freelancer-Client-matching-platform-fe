import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CircleDollarSign, ShieldCheck, Sparkles } from 'lucide-react'

import { routes } from '~/config/routes'
import type { JobOffer } from '~/types/job-offer'
import {
        formatJobOfferCurrency,
        formatJobOfferDate,
        formatJobOfferDateTime,
        JOB_OFFER_STATUS_META
} from '~/types/job-offer'

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

type JobOfferCardProps = {
        offer: JobOffer
        actions?: ReactNode
}

const JobOfferCard = ({ offer, actions }: JobOfferCardProps) => {
        const freelancerName = formatFreelancerName(offer)
        const avatarUrl = getFreelancerAvatar(offer)
        const avatarFallback = getFreelancerInitials(offer)
        const statusMeta = JOB_OFFER_STATUS_META[offer.status]
        const priceLabel = formatJobOfferCurrency(offer.fixedPrice, offer.currency)
        const startDateLabel = formatJobOfferDate(offer.startDate)
        const endDateLabel = formatJobOfferDate(offer.endDate)
        const expireAtLabel = formatJobOfferDateTime(offer.expireAt)
        const profileLink = getFreelancerProfileLink(offer)

        return (
                <div className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
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
                                                <p className='text-sm font-semibold text-base-content'>{offer.title}</p>
                                                <p className='text-sm text-base-content/70'>Offer tới {freelancerName}</p>
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
                                                {startDateLabel ?? 'Chưa có'}
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

                        {offer.status === 'WITHDRAWN' && offer.withdrawReason ? (
                                <div className='mt-4 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm text-error'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-error/80'>Lý do rút offer</p>
                                        <p className='mt-2 whitespace-pre-line leading-relaxed text-error/90'>{offer.withdrawReason}</p>
                                </div>
                        ) : null}

                        <div className='mt-4 flex flex-wrap gap-2'>
                                {actions}
                                {offer.contractId ? (
                                        <div className='rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success'>
                                                <ShieldCheck className='mr-1 inline size-4' /> Đã tạo hợp đồng
                                        </div>
                                ) : null}
                        </div>
                </div>
        )
}

export default JobOfferCard
