import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { CalendarClock, ChevronRight, Clock3, FileText, Loader2, Search, Users } from 'lucide-react'

import { listContracts } from '~/apis/contract.api'
import { getContractStatusMeta } from '~/constants/contract'
import { routes } from '~/config/routes'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Contract } from '~/types/contract'
import { Role } from '~/types/user'
import { formatDateTime } from '~/utils/format'
import {
        extractLanguageLabels,
        extractSkillNames,
        getBudgetDisplay,
        getParticipantLocation,
        getParticipantName
} from './utils'

const CONTRACT_PAGE_SIZE = 6

type ViewerRole = 'client' | 'freelancer' | 'all'

type ContractCardProps = {
        contract: Contract
        viewerRole: ViewerRole
}

const ClientContractCard = ({ contract }: { contract: Contract }) => {
        const title = contract.title?.trim() || contract.jobPost?.title || 'Untitled contract'
        const statusMeta = getContractStatusMeta(contract.status)
        const freelancerName =
                getParticipantName(contract.freelancer.profile, undefined) || 'Freelancer'
        const freelancerLocation = getParticipantLocation(contract.freelancer.profile)
        const startDate = formatDateTime(contract.startDate || contract.offer?.startDate || contract.acceptedAt, {
                dateStyle: 'medium'
        })
        const updatedAt = formatDateTime(contract.updatedAt || contract.createdAt)
        const budget = getBudgetDisplay(contract)
        const skills = extractSkillNames(contract).slice(0, 6)

        return (
                <Link
                        to={routes.contracts.detail(contract.id)}
                        className='group flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_35px_90px_rgba(59,130,246,0.12)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                >
                        <div className='space-y-6'>
                                <div className='flex flex-wrap items-start gap-3'>
                                        <div className='flex-1 space-y-1'>
                                                <h3 className='text-lg font-semibold text-slate-900 transition group-hover:text-primary'>
                                                        {title}
                                                </h3>
                                                <p className='text-sm text-slate-500'>Last updated {updatedAt ?? '—'}</p>
                                        </div>
                                        <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badge} ${statusMeta.text}`}
                                        >
                                                <span className='size-2 rounded-full bg-current'></span>
                                                {statusMeta.label}
                                        </span>
                                </div>

                                <div className='rounded-2xl border border-white/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner shadow-white/20'>
                                        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Your freelancer</p>
                                        <div className='mt-3 flex items-start gap-3'>
                                                <Users className='mt-0.5 size-5 text-secondary' />
                                                <div className='space-y-1'>
                                                        <p className='text-base font-semibold text-slate-900'>{freelancerName}</p>
                                                        <p className='text-xs text-slate-500'>{freelancerLocation ?? 'Location not provided'}</p>
                                                        {contract.freelancer.title && (
                                                                <p>
                                                                        Specialty:{' '}
                                                                        <span className='font-medium text-slate-800'>{contract.freelancer.title}</span>
                                                                </p>
                                                        )}
                                                </div>
                                        </div>
                                </div>

                                <div className='grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-500 shadow-inner shadow-white/20 md:grid-cols-2'>
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Progress</p>
                                                {startDate && (
                                                        <span className='inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-primary'>
                                                                <CalendarClock className='size-3.5' /> Start {startDate}
                                                        </span>
                                                )}
                                                <p>Milestones, files, and payments are managed directly in the workroom.</p>
                                        </div>
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Budget</p>
                                                {budget && (
                                                        <span className='inline-flex items-center gap-2 rounded-full border border-secondary/15 bg-secondary/5 px-3 py-1 text-secondary'>
                                                                <Clock3 className='size-3.5' /> {budget}
                                                        </span>
                                                )}
                                                <p>Review and release payments when each milestone is completed.</p>
                                        </div>
                                </div>

                                {skills.length > 0 && (
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Key skills</p>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                        {skills.map(skill => (
                                                                <span
                                                                        key={skill}
                                                                        className='rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm'
                                                                >
                                                                        {skill}
                                                                </span>
                                                        ))}
                                                </div>
                                        </div>
                                )}
                        </div>

                        <div className='mt-6 flex items-center justify-between text-sm font-medium text-primary'>
                                <span className='inline-flex items-center gap-2'>
                                        Open workroom
                                        <ChevronRight className='size-4 transition group-hover:translate-x-1' />
                                </span>
                                <span className='text-xs font-medium text-slate-400'>Manage this contract</span>
                        </div>
                </Link>
        )
}

const FreelancerContractCard = ({ contract }: { contract: Contract }) => {
        const title = contract.title?.trim() || contract.jobPost?.title || 'Untitled contract'
        const statusMeta = getContractStatusMeta(contract.status)
        const clientName =
                getParticipantName(contract.client.profile, contract.client.companyName) || 'Client'
        const clientLocation = getParticipantLocation(contract.client.profile)
        const updatedAt = formatDateTime(contract.updatedAt || contract.createdAt)
        const startDate = formatDateTime(contract.startDate || contract.offer?.startDate || contract.acceptedAt, {
                dateStyle: 'medium'
        })
        const languages = extractLanguageLabels(contract).slice(0, 3)
        const budget = getBudgetDisplay(contract)
        const jobTitle = contract.jobPost?.title ?? contract.jobPost?.specialty?.name ?? undefined

        return (
                <Link
                        to={routes.contracts.detail(contract.id)}
                        className='group flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-secondary/30 hover:shadow-[0_35px_90px_rgba(14,165,233,0.12)] focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:ring-offset-2 focus:ring-offset-white'
                >
                        <div className='space-y-6'>
                                <div className='flex flex-wrap items-start gap-3'>
                                        <div className='flex-1 space-y-1'>
                                                <h3 className='text-lg font-semibold text-slate-900 transition group-hover:text-secondary'>
                                                        {title}
                                                </h3>
                                                <p className='text-sm text-slate-500'>Last updated {updatedAt ?? '—'}</p>
                                        </div>
                                        <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badge} ${statusMeta.text}`}
                                        >
                                                <span className='size-2 rounded-full bg-current'></span>
                                                {statusMeta.label}
                                        </span>
                                </div>

                                <div className='rounded-2xl border border-white/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner shadow-white/20'>
                                        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Your client</p>
                                        <div className='mt-3 flex items-start gap-3'>
                                                <Users className='mt-0.5 size-5 text-primary' />
                                                <div className='space-y-1'>
                                                        <p className='text-base font-semibold text-slate-900'>{clientName}</p>
                                                        <p className='text-xs text-slate-500'>{clientLocation ?? 'Location not provided'}</p>
                                                        {contract.client.companyName && (
                                                                <p>
                                                                        Company:{' '}
                                                                        <span className='font-medium text-slate-800'>{contract.client.companyName}</span>
                                                                </p>
                                                        )}
                                                </div>
                                        </div>
                                </div>

                                <div className='grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-500 shadow-inner shadow-white/20 md:grid-cols-2'>
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Job information</p>
                                                {jobTitle && <p className='text-sm font-medium text-slate-800'>{jobTitle}</p>}
                                                {languages.length > 0 && (
                                                        <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600'>
                                                                <FileText className='size-3.5' /> Languages: {languages.join(', ')}
                                                        </span>
                                                )}
                                        </div>
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>Timeline</p>
                                                {startDate && (
                                                        <span className='inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-primary'>
                                                                <CalendarClock className='size-3.5' /> Start {startDate}
                                                        </span>
                                                )}
                                                {budget && (
                                                        <span className='inline-flex items-center gap-2 rounded-full border border-secondary/15 bg-secondary/5 px-3 py-1 text-secondary'>
                                                                <Clock3 className='size-3.5' /> {budget}
                                                        </span>
                                                )}
                                                <p>Track milestones and submit deliverables directly in the workroom.</p>
                                        </div>
                                </div>
                        </div>

                        <div className='mt-6 flex items-center justify-between text-sm font-medium text-secondary'>
                                <span className='inline-flex items-center gap-2'>
                                        Open workroom
                                        <ChevronRight className='size-4 transition group-hover:translate-x-1' />
                                </span>
                                <span className='text-xs font-medium text-slate-400'>View contract details</span>
                        </div>
                </Link>
        )
}

const CombinedContractCard = ({ contract }: { contract: Contract }) => {
        const title = contract.title?.trim() || contract.jobPost?.title || 'Untitled contract'
        const statusMeta = getContractStatusMeta(contract.status)
        const clientName =
                getParticipantName(contract.client.profile, contract.client.companyName) || 'Client'
        const freelancerName =
                getParticipantName(contract.freelancer.profile, undefined) || 'Freelancer'
        const clientLocation = getParticipantLocation(contract.client.profile)
        const freelancerLocation = getParticipantLocation(contract.freelancer.profile)
        const updatedAt = formatDateTime(contract.updatedAt || contract.createdAt)
        const startDate = formatDateTime(contract.startDate || contract.offer?.startDate || contract.acceptedAt, {
                dateStyle: 'medium'
        })
        const skills = extractSkillNames(contract).slice(0, 5)
        const languages = extractLanguageLabels(contract).slice(0, 3)
        const budget = getBudgetDisplay(contract)

        return (
                <Link
                        to={routes.contracts.detail(contract.id)}
                        className='group flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_35px_90px_rgba(59,130,246,0.12)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                >
                        <div className='space-y-5'>
                                <div className='flex flex-wrap items-start gap-3'>
                                        <div className='flex-1 space-y-1'>
                                                <h3 className='text-lg font-semibold text-slate-900 transition group-hover:text-primary'>
                                                        {title}
                                                </h3>
                                                <p className='text-sm text-slate-500'>
                                                        Last updated {updatedAt ?? '—'}
                                                </p>
                                        </div>
                                        <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badge} ${statusMeta.text}`}
                                        >
                                                <span className='size-2 rounded-full bg-current'></span>
                                                {statusMeta.label}
                                        </span>
                                </div>

                                <div className='grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600 shadow-inner shadow-white/20'>
                                        <div className='grid gap-3 md:grid-cols-2'>
                                                <div className='space-y-1'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Client</p>
                                                        <div className='flex items-start gap-2'>
                                                                <Users className='mt-0.5 size-4 text-primary' />
                                                                <div>
                                                                        <p className='font-semibold text-slate-800'>{clientName}</p>
                                                                        <p className='text-xs text-slate-500'>{clientLocation ?? 'Location unknown'}</p>
                                                                </div>
                                                        </div>
                                                </div>
                                                <div className='space-y-1'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Freelancer</p>
                                                        <div className='flex items-start gap-2'>
                                                                <Users className='mt-0.5 size-4 text-secondary' />
                                                                <div>
                                                                        <p className='font-semibold text-slate-800'>{freelancerName}</p>
                                                                        <p className='text-xs text-slate-500'>
                                                                                {freelancerLocation ?? 'Location unknown'}
                                                                        </p>
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                                                {startDate && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-primary'>
                                                                <CalendarClock className='size-3.5' /> Start {startDate}
                                                        </span>
                                                )}
                                                {budget && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-secondary'>
                                                                <Clock3 className='size-3.5' /> {budget}
                                                        </span>
                                                )}
                                                {languages.length > 0 && (
                                                        <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600'>
                                                                <FileText className='size-3.5' /> Languages: {languages.join(', ')}
                                                        </span>
                                                )}
                                        </div>
                                </div>

                                {skills.length > 0 && (
                                        <div className='flex flex-wrap items-center gap-2'>
                                                {skills.map(skill => (
                                                        <span
                                                                key={skill}
                                                                className='rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm'
                                                        >
                                                                {skill}
                                                        </span>
                                                ))}
                                        </div>
                                )}
                        </div>

                        <div className='mt-6 flex items-center justify-between text-sm font-medium text-primary'>
                                <span className='inline-flex items-center gap-2'>
                                        View details
                                        <ChevronRight className='size-4 transition group-hover:translate-x-1' />
                                </span>
                                <span className='text-xs font-medium text-slate-400'>Click to open the workroom</span>
                        </div>
                </Link>
        )
}

const ContractCard = ({ contract, viewerRole }: ContractCardProps) => {
        if (viewerRole === 'client') {
                return <ClientContractCard contract={contract} />
        }

        if (viewerRole === 'freelancer') {
                return <FreelancerContractCard contract={contract} />
        }

        return <CombinedContractCard contract={contract} />
}

const EmptyState = ({ viewerRole }: { viewerRole: ViewerRole }) => {
        const copy = {
                client: {
                        title: 'You have no contracts with freelancers yet',
                        body: 'Create a new contract or send an offer to a freelancer to start collaborating in the workroom.'
                },
                freelancer: {
                        title: "You haven't received any contracts",
                        body: 'When a client sends an offer and you accept it, the contract will show up here so you can track progress.'
                },
                all: {
                        title: 'No contracts available',
                        body: 'When you receive or create contracts, they will appear here so you can manage milestones, files, and payments.'
                }
        } satisfies Record<ViewerRole, { title: string; body: string }>

        const { title, body } = copy[viewerRole]

        return (
                <div className='flex flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500 shadow-inner shadow-white/40'>
                        <div className='rounded-full bg-primary/10 p-4 text-primary'>
                                <FileText className='size-8' />
                        </div>
                        <div className='space-y-2'>
                                <h3 className='text-xl font-semibold text-slate-800'>{title}</h3>
                                <p className='max-w-md text-sm text-slate-500'>{body}</p>
                        </div>
                </div>
        )
}

const ContractListPage = () => {
        const currentUser = useSelector(selectCurrentUser)
        const viewerRole: ViewerRole = currentUser?.role === Role.CLIENT ? 'client' : currentUser?.role === Role.FREELANCER ? 'freelancer' : 'all'
        const [page, setPage] = useState(1)
        const [searchTerm, setSearchTerm] = useState('')
        const debouncedSearch = useDebounce(searchTerm, 400)

        useEffect(() => {
                setPage(1)
        }, [viewerRole, debouncedSearch])

        const queryFilters = useMemo(() => {
                const trimmedSearch = debouncedSearch.trim()
                return {
                        page,
                        limit: CONTRACT_PAGE_SIZE,
                        role: viewerRole === 'all' ? undefined : viewerRole,
                        search: trimmedSearch ? trimmedSearch : undefined
                }
        }, [page, viewerRole, debouncedSearch])

        const heroCopy = {
                client: {
                        badge: 'Client workroom',
                        title: 'Manage your contracts and freelancers',
                        description:
                                'Track progress, milestones, and payments for each contract with freelancers in one place.'
                },
                freelancer: {
                        badge: 'Freelancer workroom',
                        title: 'Follow work and deliverables for clients',
                        description:
                                'Keep up with timelines, requirements, and communication to keep each contract on track.'
                },
                all: {
                        badge: 'Workroom',
                        title: 'Manage contracts & collaboration Upwork-style',
                        description:
                                'Track contracts, milestones, and collaboration activity across your workrooms.'
                }
        } satisfies Record<ViewerRole, { badge: string; title: string; description: string }>

        const heroStatsCopy = {
                client: {
                        primaryLabel: 'Contracts with freelancers',
                        secondaryLabel: 'Recent activity',
                        secondaryDescription: 'Track milestones, deliverables, and payments to freelancers.'
                },
                freelancer: {
                        primaryLabel: 'Contracts with clients',
                        secondaryLabel: 'Recent activity',
                        secondaryDescription: 'Keep delivery timelines, milestone updates, and client responses on track.'
                },
                all: {
                        primaryLabel: 'Open contracts',
                        secondaryLabel: 'Latest updates',
                        secondaryDescription: 'Follow the newest milestones and activities across your contracts.'
                }
        } satisfies Record<ViewerRole, { primaryLabel: string; secondaryLabel: string; secondaryDescription: string }>

        const heroStats = heroStatsCopy[viewerRole]

        const { data, isFetching, isLoading, isError, refetch } = useQuery({
                queryKey: ['contracts', queryFilters],
                queryFn: () => listContracts(queryFilters),
                keepPreviousData: true
        })

        const contracts = data?.data ?? []
        const total = data?.total ?? 0
        const limit = data?.limit ?? CONTRACT_PAGE_SIZE
        const totalPages = Math.max(1, Math.ceil(total / limit))
        const from = contracts.length ? (page - 1) * limit + 1 : 0
        const to = contracts.length ? from + contracts.length - 1 : 0

        return (
                <div className='space-y-10'>
                        <section className='rounded-[38px] border border-white/60 bg-gradient-to-br from-primary/10 via-white to-secondary/20 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] md:p-12'>
                                <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
                                        <div className='space-y-4'>
                                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary'>
                                                        {heroCopy[viewerRole].badge}
                                                </span>
                                                <h1 className='text-3xl font-bold text-slate-900 md:text-4xl'>{heroCopy[viewerRole].title}</h1>
                                                <p className='max-w-2xl text-sm text-slate-600 md:text-base'>{heroCopy[viewerRole].description}</p>
                                        </div>
                                        <div className='grid gap-3 rounded-3xl border border-white/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner shadow-white/30'>
                                                <div className='flex items-center gap-3'>
                                                        <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary'>
                                                                <Users className='size-5' />
                                                        </div>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>{heroStats.primaryLabel}</p>
                                                                <p className='text-lg font-semibold text-slate-900'>{total}</p>
                                                        </div>
                                                </div>
                                                <div className='flex items-center gap-3'>
                                                        <div className='flex size-12 items-center justify-center rounded-2xl border border-secondary/10 bg-secondary/10 text-secondary'>
                                                                <CalendarClock className='size-5' />
                                                        </div>
                                                        <div>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>{heroStats.secondaryLabel}</p>
                                                                <p className='text-sm text-slate-600'>{heroStats.secondaryDescription}</p>
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        <section className='space-y-6 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] md:p-8'>
                                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                        <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-inner shadow-white/30'>
                                                <span className='rounded-xl bg-white/90 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm md:text-sm'>
                                                        {viewerRole === 'client'
                                                                ? 'Viewing as client'
                                                                : viewerRole === 'freelancer'
                                                                        ? 'Viewing as freelancer'
                                                                        : 'Explore your workroom'}
                                                </span>
                                        </div>

                                        <label className='relative flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-inner shadow-white/20 focus-within:border-primary/50 focus-within:text-primary'>
                                                <Search className='size-4 shrink-0' />
                                                <input
                                                        value={searchTerm}
                                                        onChange={event => setSearchTerm(event.target.value)}
                                                        placeholder='Search by contract title, freelancer, or client'
                                                        className='w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none'
                                                />
                                        </label>
                                </div>

                                {isError && (
                                        <div className='rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-600'>
                                                Cannot load contracts. <button className='font-semibold underline' onClick={() => refetch()}>Try again</button>
                                        </div>
                                )}

                                <div className='grid gap-6 md:grid-cols-2'>
                                        {isLoading && (
                                                <div className='col-span-full flex justify-center py-12 text-slate-500'>
                                                        <Loader2 className='size-6 animate-spin' />
                                                </div>
                                        )}

                                        {!isLoading && !contracts.length && <EmptyState viewerRole={viewerRole} />}

                                        {contracts.map(contract => (
                                                <ContractCard key={contract.id} contract={contract} viewerRole={viewerRole} />
                                        ))}
                                </div>

                                {isFetching && !isLoading && (
                                        <div className='flex items-center gap-2 text-sm text-slate-500'>
                                                <Loader2 className='size-4 animate-spin' />
                                                Updating data...
                                        </div>
                                )}

                                {contracts.length > 0 && (
                                        <div className='flex flex-col gap-4 border-t border-white/70 pt-4 md:flex-row md:items-center md:justify-between'>
                                                <p className='text-sm text-slate-500'>
                                                        Showing <span className='font-semibold text-slate-700'>{from}</span> -{' '}
                                                        <span className='font-semibold text-slate-700'>{to}</span> of{' '}
                                                        <span className='font-semibold text-slate-700'>{total}</span> contracts
                                                </p>
                                                <div className='flex items-center gap-3'>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                                disabled={page === 1}
                                                                className='inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 hover:text-primary'
                                                        >
                                                                Previous
                                                        </button>
                                                        <span className='text-sm font-semibold text-slate-500'>Trang {page}/{totalPages}</span>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                                                disabled={page === totalPages}
                                                                className='inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/30 hover:text-primary'
                                                        >
                                                                  Next
                                                        </button>
                                                </div>
                                        </div>
                                )}
                        </section>
                </div>
        )
}

export default ContractListPage
