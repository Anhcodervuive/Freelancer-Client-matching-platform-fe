import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
        ArrowRight,
        BadgeCheck,
        BriefcaseBusiness,
        CheckCircle2,
        CircleDollarSign,
        Clock,
        Loader2,
        MapPin,
        Send,
        Sparkles,
        Star,
        Timer,
        Undo2,
        Wallet,
        XCircle
} from 'lucide-react'
import { toast } from 'react-toastify'

import {
        listClientFreelancers,
        type ClientFreelancerFilterInput
} from '~/apis/client-freelancer.api'
import { createJobInvitation } from '~/apis/job-invitation.api'
import { routes } from '~/config/routes'
import {
        formatCurrency,
        formatLabel,
        formatMemberSince,
        formatNumberValue,
        formatProficiency,
        getFreelancerInitials,
        normalizeFreelancer,
        type NormalizedFreelancer
} from '~/pages/Client/Freelancers/utils'
import type {
        ClientFreelancerListItem,
        PaginatedClientFreelancerResponse
} from '~/types/client-freelancer'
import type { CreateJobInvitationInput, JobInvitation } from '~/types/job-invitation'
import type { JobPostDetail } from '~/types/job-post'
import { formatDateTime } from '~/utils/format'
import { normalizeSkillIds, normalizeSkills } from '~/utils/jobPost'
import InviteFreelancerDialog, { type InvitationFormValues } from './InviteFreelancerDialog'

const PAGE_SIZE = 6

type Props = {
        job: JobPostDetail
        isActive: boolean
}

const createSkillKey = (values: string[]): string => values.filter(Boolean).join('|')

const buildFilters = (
        page: number,
        specialtyId?: string,
        skillIds?: string[]
): ClientFreelancerFilterInput => {
        const filters: ClientFreelancerFilterInput = {
                page,
                limit: PAGE_SIZE
        }

        if (specialtyId) {
                filters.specialtyId = specialtyId
        }

        if (skillIds && skillIds.length > 0) {
                filters.skillIds = skillIds
        }

        return filters
}

const toBadgeItems = (values: string[], limit: number) => {
        const displayed = values.slice(0, limit)
        const remaining = Math.max(0, values.length - displayed.length)
        return { displayed, remaining }
}

const renderSkeletonCard = (index: number) => (
        <div
                key={`invite-skeleton-${index}`}
                className='animate-pulse rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'
        >
                <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                        <div className='flex flex-1 items-start gap-4'>
                                <div className='h-14 w-14 rounded-2xl bg-base-200' />
                                <div className='space-y-3'>
                                        <div className='h-5 w-40 rounded-full bg-base-200' />
                                        <div className='h-4 w-56 rounded-full bg-base-200' />
                                        <div className='h-4 w-72 rounded-full bg-base-200' />
                                </div>
                        </div>
                        <div className='grid w-full gap-3 lg:w-72 lg:grid-cols-2'>
                                <div className='h-16 rounded-2xl bg-base-200' />
                                <div className='h-16 rounded-2xl bg-base-200' />
                                <div className='h-16 rounded-2xl bg-base-200 lg:col-span-2' />
                        </div>
                </div>
        </div>
)

const matchStats = (
        freelancer: NormalizedFreelancer
): Array<{ key: string; label: string; value: string; icon: JSX.Element }> => {
        const stats: Array<{ key: string; label: string; value: string; icon: JSX.Element }> = []
        const hourlyRateDisplay = formatCurrency(
                freelancer.hourlyRateAmount,
                freelancer.hourlyRateCurrency
        )
        const totalEarnedDisplay = formatCurrency(freelancer.totalEarned, freelancer.hourlyRateCurrency)
        const jobSuccessDisplay =
                freelancer.jobSuccess !== undefined ? `${freelancer.jobSuccess}%` : undefined
        const ratingDisplay =
                freelancer.rating !== undefined ? `${freelancer.rating.toFixed(1)} / 5` : undefined
        const totalHoursDisplay =
                freelancer.totalHoursWorked !== undefined
                        ? `${formatNumberValue(freelancer.totalHoursWorked)} hrs`
                        : undefined

        if (hourlyRateDisplay) {
                stats.push({
                        key: 'hourly-rate',
                        label: 'Hourly rate',
                        value: hourlyRateDisplay,
                        icon: <CircleDollarSign className='size-4 text-primary' />
                })
        }

        if (totalEarnedDisplay) {
                stats.push({
                        key: 'total-earned',
                        label: 'Total earned',
                        value: totalEarnedDisplay,
                        icon: <Wallet className='size-4 text-emerald-500' />
                })
        }

        if (jobSuccessDisplay) {
                stats.push({
                        key: 'job-success',
                        label: 'Job success',
                        value: jobSuccessDisplay,
                        icon: <BadgeCheck className='size-4 text-emerald-500' />
                })
        }

        if (totalHoursDisplay) {
                stats.push({
                        key: 'hours-worked',
                        label: 'Hours billed',
                        value: totalHoursDisplay,
                        icon: <BriefcaseBusiness className='size-4 text-secondary' />
                })
        }

        if (ratingDisplay) {
                stats.push({
                        key: 'rating',
                        label: 'Rating',
                        value: ratingDisplay,
                        icon: <Star className='size-4 fill-amber-400 text-amber-400' />
                })
        }

        return stats
}

const invitationStatusMeta = (status?: string) => {
        if (!status) return undefined
        const normalized = status.toUpperCase()

        switch (normalized) {
                case 'ACCEPTED':
                        return {
                                label: 'Accepted',
                                className: 'border-success/60 bg-success/10 text-success',
                                icon: <CheckCircle2 className='size-4 text-success' />
                        }
                case 'DECLINED':
                        return {
                                label: 'Declined',
                                className: 'border-error/50 bg-error/10 text-error',
                                icon: <XCircle className='size-4 text-error' />
                        }
                case 'EXPIRED':
                        return {
                                label: 'Expired',
                                className: 'border-warning/50 bg-warning/10 text-warning',
                                icon: <Timer className='size-4 text-warning' />
                        }
                case 'WITHDRAWN':
                        return {
                                label: 'Withdrawn',
                                className: 'border-base-300 bg-base-200/70 text-base-content/70',
                                icon: <Undo2 className='size-4 text-base-content/70' />
                        }
                case 'PENDING':
                default:
                        return {
                                label: normalized === 'PENDING' ? 'Awaiting response' : status,
                                className: 'border-primary/50 bg-primary/5 text-primary',
                                icon: <Clock className='size-4 text-primary' />
                        }
        }
}

type InvitationState = Record<string, { status: string; invitation?: JobInvitation }>

export function InviteFreelancersTab({ job, isActive }: Props) {
        const [page, setPage] = useState(1)
        const [selectedFreelancer, setSelectedFreelancer] = useState<NormalizedFreelancer | null>(null)
        const [isInviteDialogOpen, setInviteDialogOpen] = useState(false)
        const [invitationState, setInvitationState] = useState<InvitationState>({})
        const queryClient = useQueryClient()

        const inviteMutation = useMutation<
                JobInvitation,
                Error,
                InvitationFormValues & { freelancerId: string }
        >({
                mutationFn: async ({ freelancerId, message, expiresAt }) => {
                        const trimmedMessage = message?.trim()
                        const expiresDate = expiresAt ? new Date(expiresAt) : undefined

                        const payload: CreateJobInvitationInput = {
                                jobId: job.id,
                                freelancerId,
                                message: trimmedMessage && trimmedMessage.length > 0 ? trimmedMessage : undefined,
                                expiresAt: expiresDate ? expiresDate.toISOString() : undefined
                        }

                        return createJobInvitation(payload)
                },
                onError: error => {
                        const message = error instanceof Error
                                ? error.message
                                : 'Failed to send invitation. Please try again.'
                        toast.error(message)
                },
                onSuccess: () => {
                        queryClient.invalidateQueries({
                                queryKey: ['job-post', job.id, 'matching-freelancers']
                        })
                }
        })

        const openInviteDialog = (freelancer: NormalizedFreelancer) => {
                setSelectedFreelancer(freelancer)
                setInviteDialogOpen(true)
        }

        const closeInviteDialog = () => {
                if (inviteMutation.isPending) return
                setInviteDialogOpen(false)
                setSelectedFreelancer(null)
        }

        const handleSubmitInvitation = async (values: InvitationFormValues) => {
                if (!selectedFreelancer) return
                try {
                        const invitation = await inviteMutation.mutateAsync({
                                ...values,
                                freelancerId: selectedFreelancer.id
                        })
                        setInvitationState(previous => ({
                                ...previous,
                                [selectedFreelancer.id]: {
                                        status: invitation.status ?? 'PENDING',
                                        invitation
                                }
                        }))
                        toast.success(`Invitation sent to ${selectedFreelancer.name}`)
                        setInviteDialogOpen(false)
                        setSelectedFreelancer(null)
                } catch {
                        // error toast handled in mutation onError
                }
        }

        const normalizedSkillNames = useMemo(() => normalizeSkills(job.skills), [job.skills])
        const normalizedSkillIdentifiers = useMemo(() => normalizeSkillIds(job.skills), [job.skills])

        const combinedSkillIds = useMemo(() => {
                const unique = new Set<string>()
                normalizedSkillIdentifiers.required.forEach(id => id && unique.add(id))
                normalizedSkillIdentifiers.preferred.forEach(id => id && unique.add(id))
                return Array.from(unique)
        }, [normalizedSkillIdentifiers])

        const skillFilterKey = useMemo(
                () => createSkillKey(combinedSkillIds),
                [combinedSkillIds]
        )

        useEffect(() => {
                setPage(1)
        }, [job.id, job.specialty?.id, skillFilterKey])

        const filters = useMemo(
                () => buildFilters(page, job.specialty?.id, combinedSkillIds),
                [page, job.specialty?.id, combinedSkillIds]
        )

        const {
                data,
                isLoading,
                isFetching,
                isError,
                error
        } = useQuery<PaginatedClientFreelancerResponse>({
                queryKey: ['job-post', job.id, 'matching-freelancers', filters],
                queryFn: () => listClientFreelancers(filters),
                enabled: isActive,
                keepPreviousData: true,
                staleTime: 1000 * 60 * 5
        })

        const freelancers = useMemo(
                () => (data?.data ?? []) as ClientFreelancerListItem[],
                [data?.data]
        )

        const normalizedFreelancers = useMemo(
                () =>
                        freelancers
                                .map(item => normalizeFreelancer(item))
                                .filter((item): item is NormalizedFreelancer => Boolean(item)),
                [freelancers]
        )

        const hasExplicitTotal = typeof data?.total === 'number'
        const total = hasExplicitTotal
                ? data?.total ?? 0
                : (page - 1) * PAGE_SIZE + normalizedFreelancers.length
        const hasNext = hasExplicitTotal
                ? page * PAGE_SIZE < (data?.total ?? 0)
                : normalizedFreelancers.length === PAGE_SIZE
        const startItem = normalizedFreelancers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
        const endItem = normalizedFreelancers.length > 0
                ? (page - 1) * PAGE_SIZE + normalizedFreelancers.length
                : 0

        return (
                <div className='space-y-6'>
                        <section className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                        <div>
                                                <h2 className='text-xl font-semibold text-base-content'>Invite freelancers</h2>
                                                <p className='mt-1 text-sm text-base-content/70'>
                                                        We used your job speciality and skills to surface freelancers who might be
                                                        a great fit. Adjust the search from the freelancer marketplace at any time.
                                                </p>
                                        </div>
                                        <Link
                                                to={routes.client.freelancers.list}
                                                className='btn btn-outline btn-sm gap-2 self-start'
                                        >
                                                Browse all freelancers
                                                <ArrowRight className='size-4' />
                                        </Link>
                                </div>

                                <div className='mt-4 flex flex-wrap gap-2 text-xs text-base-content/70'>
                                        {job.specialty?.name ? (
                                                <span className='badge badge-soft rounded-full bg-secondary/10 text-secondary'>
                                                        Specialty: {job.specialty?.category?.name ?? 'General'} · {job.specialty.name}
                                                </span>
                                        ) : null}
                                        {normalizedSkillNames.required.map(skill => (
                                                <span
                                                        key={`required-skill-${skill}`}
                                                        className='badge badge-soft rounded-full bg-primary/10 text-primary'
                                                >
                                                        Must-have: {skill}
                                                </span>
                                        ))}
                                        {normalizedSkillNames.preferred.map(skill => (
                                                <span
                                                        key={`preferred-skill-${skill}`}
                                                        className='badge badge-outline rounded-full text-base-content/60'
                                                >
                                                        Nice-to-have: {skill}
                                                </span>
                                        ))}
                                        {normalizedSkillNames.required.length === 0 &&
                                        normalizedSkillNames.preferred.length === 0 ? (
                                                <span className='badge badge-outline rounded-full text-base-content/60'>
                                                        No specific skills were provided for this job.
                                                </span>
                                        ) : null}
                                </div>
                        </section>

                        {isError ? (
                                <div className='rounded-3xl border border-error/30 bg-error/5 p-6 text-sm text-error shadow-sm'>
                                        <h3 className='text-base font-semibold'>Unable to load matching freelancers</h3>
                                        <p className='mt-2'>
                                                {(error as Error)?.message ||
                                                        'Something went wrong while fetching freelancer suggestions. Please try again later.'}
                                        </p>
                                </div>
                        ) : (
                                <div className='space-y-4'>
                                        {isLoading && normalizedFreelancers.length === 0
                                                ? Array.from({ length: PAGE_SIZE }).map((_, index) =>
                                                          renderSkeletonCard(index)
                                                  )
                                                : null}

                                        {!isLoading && normalizedFreelancers.length === 0 ? (
                                                <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70 shadow-sm'>
                                                        <p className='text-lg font-medium text-base-content'>No matching freelancers yet</p>
                                                        <p className='mt-2'>
                                                                Try broadening the skill requirements or search the freelancer marketplace manually.
                                                        </p>
                                                </div>
                                        ) : null}

                                        {normalizedFreelancers.map(freelancer => {
                                                const stats = matchStats(freelancer)
                                                const availabilityDisplay = formatLabel(freelancer.availability)
                                                const memberSinceDisplay = formatMemberSince(freelancer.memberSince)
                                                const completedJobsDisplay =
                                                        freelancer.completedJobs !== undefined
                                                                ? `${formatNumberValue(freelancer.completedJobs)} jobs`
                                                                : undefined
                                                const weeklyCapacityDisplay =
                                                        freelancer.availableHoursPerWeek !== undefined
                                                                ? `${formatNumberValue(freelancer.availableHoursPerWeek)} hrs/week`
                                                                : undefined

                                                const specialtyBadges = toBadgeItems(freelancer.specialties, 3)
                                                const skillBadges = toBadgeItems(freelancer.skills, 5)
                                                const languageBadges = toBadgeItems(
                                                        freelancer.languages.map(language => {
                                                                const proficiency = formatProficiency(language.proficiency)
                                                                return proficiency ? `${language.name} · ${proficiency}` : language.name
                                                        }),
                                                        4
                                                )

                                                const initials = getFreelancerInitials(freelancer.name)
                                                const storedInvitation = invitationState[freelancer.id]
                                                const remoteInvitation =
                                                        freelancer.latestInvitation?.jobId === job.id
                                                                ? freelancer.latestInvitation
                                                                : undefined
                                                const invitationStatus = storedInvitation?.status ?? remoteInvitation?.status
                                                const invitationMetaInfo = invitationStatusMeta(invitationStatus)
                                                const invitationDetails = storedInvitation?.invitation ?? remoteInvitation
                                                const sentAtLabel = invitationDetails
                                                        ? 'createdAt' in invitationDetails
                                                                ? invitationDetails.createdAt
                                                                : remoteInvitation?.sentAt
                                                        : remoteInvitation?.sentAt
                                                const respondedAtLabel = invitationDetails
                                                        ? 'respondedAt' in invitationDetails
                                                                ? invitationDetails.respondedAt
                                                                : remoteInvitation?.respondedAt
                                                        : remoteInvitation?.respondedAt
                                                const expiresAtLabel = invitationDetails
                                                        ? 'expiresAt' in invitationDetails
                                                                ? invitationDetails.expiresAt
                                                                : remoteInvitation?.expiresAt
                                                        : remoteInvitation?.expiresAt
                                                const isPendingInvitation =
                                                        (invitationStatus ?? '').toUpperCase() === 'PENDING'
                                                const isInvitingCurrent =
                                                        inviteMutation.isPending && selectedFreelancer?.id === freelancer.id
                                                const inviteButtonLabel = invitationStatus
                                                        ? isPendingInvitation
                                                                ? 'Invitation pending'
                                                                : 'Send new invite'
                                                        : 'Invite to job'

                                                return (
                                                        <article
                                                                key={freelancer.id}
                                                                className='relative overflow-hidden rounded-3xl border border-base-200 bg-base-100 p-6 shadow-md transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg'
                                                        >
                                                                <span
                                                                        className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0'
                                                                        aria-hidden='true'
                                                                />
                                                                <div className='flex flex-col gap-6'>
                                                                        <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
                                                                                <div className='flex flex-1 gap-4'>
                                                                                        <div className='relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-lg font-semibold text-primary shadow-inner'>
                                                                                                {freelancer.avatar ? (
                                                                                                        <img
                                                                                                                src={freelancer.avatar}
                                                                                                                alt={freelancer.name}
                                                                                                                className='h-full w-full rounded-2xl object-cover'
                                                                                                        />
                                                                                                ) : (
                                                                                                        <span>{initials}</span>
                                                                                                )}
                                                                                        </div>
                                                                                        <div className='space-y-3'>
                                                                                                <div>
                                                                                                        <h3 className='text-lg font-semibold text-base-content'>{freelancer.name}</h3>
                                                                                                        {freelancer.title ? (
                                                                                                                <p className='text-sm text-base-content/70'>{freelancer.title}</p>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                                {freelancer.bio ? (
                                                                                                        <p className='line-clamp-2 text-sm leading-relaxed text-base-content/70'>{freelancer.bio}</p>
                                                                                                ) : null}
                                                                                                <div className='flex flex-wrap items-center gap-2 text-xs text-base-content/60'>
                                                                                                        {freelancer.location ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        <MapPin className='size-3 text-primary' />
                                                                                                                        {freelancer.location}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                        {freelancer.experienceLevel ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        <Sparkles className='size-3 text-secondary' />
                                                                                                                        {formatLabel(freelancer.experienceLevel)}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                        {availabilityDisplay ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        <BadgeCheck className='size-3 text-emerald-500' />
                                                                                                                        {availabilityDisplay}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                        {memberSinceDisplay ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        Member since {memberSinceDisplay}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                        {weeklyCapacityDisplay ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        {weeklyCapacityDisplay}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                        {completedJobsDisplay ? (
                                                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
                                                                                                                        {completedJobsDisplay}
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                </div>
                                                                                <div className='flex w-full flex-col gap-3 lg:w-80'>
                                                                                        {invitationMetaInfo ? (
                                                                                                <div className={`rounded-2xl border px-4 py-3 text-xs shadow-sm ${invitationMetaInfo.className}`}>
                                                                                                        <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                {invitationMetaInfo.icon}
                                                                                                                Invitation status
                                                                                                        </span>
                                                                                                        <p className='mt-1 text-sm font-semibold text-base-content'>
                                                                                                                {invitationMetaInfo.label}
                                                                                                        </p>
                                                                                                        <div className='mt-1 space-y-1 text-[11px] text-base-content/60'>
                                                                                                                {sentAtLabel ? (
                                                                                                                        <p>
                                                                                                                                Sent {formatDateTime(sentAtLabel, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                                                                        </p>
                                                                                                                ) : null}
                                                                                                                {respondedAtLabel ? (
                                                                                                                        <p>
                                                                                                                                Responded {formatDateTime(respondedAtLabel, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                                                                        </p>
                                                                                                                ) : null}
                                                                                                                {expiresAtLabel ? (
                                                                                                                        <p>
                                                                                                                                Expires {formatDateTime(expiresAtLabel, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                                                                        </p>
                                                                                                                ) : null}
                                                                                                        </div>
                                                                                                </div>
                                                                                        ) : null}
                                                                                        {stats.length > 0 ? (
                                                                                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                                                                                        {stats.map(stat => (
                                                                                                                <div
                                                                                                                        key={`${freelancer.id}-${stat.key}`}
                                                                                                                        className='rounded-2xl border border-base-200/80 bg-base-100/90 px-4 py-3 text-xs text-base-content/70 shadow-sm'
                                                                                                                >
                                                                                                                        <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                                {stat.icon}
                                                                                                                                {stat.label}
                                                                                                                        </span>
                                                                                                                        <p className='mt-1 text-sm font-medium text-base-content'>{stat.value}</p>
                                                                                                                </div>
                                                                                                        ))}
                                                                                                </div>
                                                                                        ) : null}
                                                                                        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-primary btn-sm gap-2'
                                                                                                        onClick={() => openInviteDialog(freelancer)}
                                                                                                        disabled={inviteMutation.isPending || isPendingInvitation}
                                                                                                >
                                                                                                        {isInvitingCurrent ? (
                                                                                                                <Loader2 className='size-4 animate-spin' />
                                                                                                        ) : (
                                                                                                                <Send className='size-4' />
                                                                                                        )}
                                                                                                        {inviteButtonLabel}
                                                                                                </button>
                                                                                                <Link
                                                                                                        to={routes.comons.freelancerProfile(freelancer.id)}
                                                                                                        className='btn btn-ghost btn-sm gap-2'
                                                                                                >
                                                                                                        View profile
                                                                                                        <ArrowRight className='size-4' />
                                                                                                </Link>
                                                                                        </div>
                                                                                </div>
                                                                        </div>

                                                                        <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                                                                                {specialtyBadges.displayed.length > 0 ? (
                                                                                        <div className='rounded-2xl border border-base-200/60 bg-base-200/40 px-4 py-3 text-xs text-base-content/70 shadow-sm'>
                                                                                                <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        <Sparkles className='size-3 text-secondary' /> Specialties
                                                                                                </span>
                                                                                                <div className='mt-2 flex flex-wrap gap-1.5'>
                                                                                                        {specialtyBadges.displayed.map(item => (
                                                                                                                <span
                                                                                                                        key={`${freelancer.id}-specialty-${item}`}
                                                                                                                        className='badge badge-soft badge-xs rounded-full bg-secondary/10 text-secondary leading-tight'
                                                                                                                >
                                                                                                                        {item}
                                                                                                                </span>
                                                                                                        ))}
                                                                                                        {specialtyBadges.remaining > 0 ? (
                                                                                                                <span className='badge badge-outline badge-xs rounded-full text-base-content/60 leading-tight'>
                                                                                                                        +{specialtyBadges.remaining} more
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                ) : null}
                                                                                {skillBadges.displayed.length > 0 ? (
                                                                                        <div className='rounded-2xl border border-base-200/60 bg-base-200/40 px-4 py-3 text-xs text-base-content/70 shadow-sm'>
                                                                                                <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        <BadgeCheck className='size-3 text-primary' /> Top skills
                                                                                                </span>
                                                                                                <div className='mt-2 flex flex-wrap gap-1.5'>
                                                                                                        {skillBadges.displayed.map(item => (
                                                                                                                <span
                                                                                                                        key={`${freelancer.id}-skill-${item}`}
                                                                                                                        className='badge badge-soft badge-xs rounded-full bg-primary/10 text-primary leading-tight'
                                                                                                                >
                                                                                                                        {item}
                                                                                                                </span>
                                                                                                        ))}
                                                                                                        {skillBadges.remaining > 0 ? (
                                                                                                                <span className='badge badge-outline badge-xs rounded-full text-base-content/60 leading-tight'>
                                                                                                                        +{skillBadges.remaining} more
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                ) : null}
                                                                                {languageBadges.displayed.length > 0 ? (
                                                                                        <div className='rounded-2xl border border-base-200/60 bg-base-200/40 px-4 py-3 text-xs text-base-content/70 shadow-sm'>
                                                                                                <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                        Languages
                                                                                                </span>
                                                                                                <div className='mt-2 flex flex-wrap gap-1.5'>
                                                                                                        {languageBadges.displayed.map(item => (
                                                                                                                <span
                                                                                                                        key={`${freelancer.id}-language-${item}`}
                                                                                                                        className='badge badge-soft badge-xs rounded-full bg-emerald-50 text-emerald-600 leading-tight'
                                                                                                                >
                                                                                                                        {item}
                                                                                                                </span>
                                                                                                        ))}
                                                                                                        {languageBadges.remaining > 0 ? (
                                                                                                                <span className='badge badge-outline badge-xs rounded-full text-base-content/60 leading-tight'>
                                                                                                                        +{languageBadges.remaining} more
                                                                                                                </span>
                                                                                                        ) : null}
                                                                                                </div>
                                                                                        </div>
                                                                                ) : null}
                                                                        </div>
                                                                </div>
                                                        </article>
                                                )
                                        })}
                                </div>
                        )}

                        {normalizedFreelancers.length > 0 ? (
                                <div className='flex flex-col items-center justify-between gap-3 border-t border-base-200 pt-6 text-sm text-base-content/70 md:flex-row'>
                                        <div>
                                                Showing {startItem}-{endItem} of {total} freelancers
                                        </div>
                                        <div className='flex items-center gap-2'>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost btn-sm'
                                                        onClick={() => setPage(current => Math.max(1, current - 1))}
                                                        disabled={page === 1 || isLoading}
                                                >
                                                        Previous
                                                </button>
                                                <span className='rounded-full border border-base-200 px-3 py-1 text-xs font-medium text-base-content/80'>
                                                        Page {page}
                                                </span>
                                                <button
                                                        type='button'
                                                        className='btn btn-ghost btn-sm'
                                                        onClick={() => setPage(current => (hasNext ? current + 1 : current))}
                                                        disabled={!hasNext || isLoading}
                                                >
                                                        Next
                                                </button>
                                        </div>
                                </div>
                        ) : null}

                        {isFetching ? (
                                <div className='pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-base-200 bg-base-100 px-4 py-2 text-xs text-base-content/70 shadow-lg'>
                                        <span className='flex items-center gap-2'>
                                                <Loader2 className='size-4 animate-spin text-primary' /> Updating suggestions…
                                        </span>
                                </div>
                        ) : null}
                        <InviteFreelancerDialog
                                open={isInviteDialogOpen}
                                job={job}
                                freelancer={selectedFreelancer}
                                isSubmitting={inviteMutation.isPending}
                                onSubmit={handleSubmitInvitation}
                                onClose={closeInviteDialog}
                        />
                </div>
        )
}

export default InviteFreelancersTab
