import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AsyncSelect from 'react-select/async'
import Select, { type SingleValue, type MultiValue, type StylesConfig } from 'react-select'
import countryList from 'react-select-country-list'
import {
        Filter,
        Loader2,
        MapPin,
        Search,
        Sparkles,
        Star,
        BriefcaseBusiness,
        Wallet,
        ArrowRight,
        Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { listClientFreelancers, type ClientFreelancerFilterInput } from '~/apis/client-freelancer.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { routes } from '~/config/routes'
import {
        formatCurrency,
        getFreelancerInitials,
        normalizeFreelancer,
        type NormalizedFreelancer
} from './utils'
import type { ClientFreelancerListItem, PaginatedClientFreelancerResponse } from '~/types/client-freelancer'

const PAGE_SIZE = 9

type Option = { value: string; label: string }

type AsyncOptionLoader = (_inputValue: string) => Promise<Option[]>

const selectStyles: StylesConfig<Option, boolean> = {
        control: (base, state) => ({
                ...base,
                borderRadius: '1rem',
                borderColor: state.isFocused ? 'rgba(59,130,246,0.6)' : 'rgba(226,232,240,1)',
                boxShadow: 'none',
                backgroundColor: 'rgba(255,255,255,0.9)',
                paddingLeft: '0.25rem',
                minHeight: '2.5rem',
                '&:hover': {
                        borderColor: 'rgba(59,130,246,0.9)'
                }
        }),
        valueContainer: base => ({
                ...base,
                padding: '0 0.5rem'
        }),
        multiValue: base => ({
                ...base,
                borderRadius: '999px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                color: '#1d4ed8'
        }),
        multiValueLabel: base => ({
                ...base,
                fontSize: '0.8rem',
                color: '#1d4ed8'
        }),
        multiValueRemove: base => ({
                ...base,
                color: '#1d4ed8',
                ':hover': {
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        color: '#1d4ed8'
                }
        }),
        menu: base => ({
                ...base,
                borderRadius: '1rem',
                overflow: 'hidden',
                zIndex: 30
        })
}

const createOption = (item: { id?: string; name?: string }): Option | null => {
        if (!item?.id || !item?.name) return null
        return { value: item.id, label: item.name }
}

const buildFilters = (
        page: number,
        search: string,
        specialty: Option | null,
        skills: Option[],
        country: Option | null
): ClientFreelancerFilterInput => ({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        specialtyId: specialty?.value,
        skillIds: skills.map(skill => skill.value),
        country: country?.value
})

export default function ClientFreelancerListPage() {
        const [page, setPage] = useState(1)
        const [search, setSearch] = useState('')
        const [selectedSpecialty, setSelectedSpecialty] = useState<Option | null>(null)
        const [selectedSkills, setSelectedSkills] = useState<Option[]>([])
        const [selectedCountry, setSelectedCountry] = useState<Option | null>(null)

        const debouncedSearch = useDebounce(search, 400)

        const filters = useMemo(
                () => buildFilters(page, debouncedSearch, selectedSpecialty, selectedSkills, selectedCountry),
                [page, debouncedSearch, selectedSpecialty, selectedSkills, selectedCountry]
        )

        const queryKey = useMemo(
                () => ['client-freelancers', filters],
                [filters]
        )

        const { data, isLoading, isFetching, isError, error } = useQuery<PaginatedClientFreelancerResponse>({
                queryKey,
                queryFn: () => listClientFreelancers(filters),
                keepPreviousData: true
        })

        const freelancers = useMemo(
                () => (data?.data ?? []) as ClientFreelancerListItem[],
                [data?.data]
        )

        const normalizedFreelancers = useMemo(() => {
                return freelancers
                        .map(item => normalizeFreelancer(item))
                        .filter((item): item is NormalizedFreelancer => Boolean(item))
        }, [freelancers])

        const hasExplicitTotal = typeof data?.total === 'number'
        const fallbackTotal = (page - 1) * PAGE_SIZE + normalizedFreelancers.length
        const total = hasExplicitTotal ? (data?.total ?? 0) : fallbackTotal
        const hasResults = normalizedFreelancers.length > 0
        const startItem = hasResults ? (page - 1) * PAGE_SIZE + 1 : 0
        const endItem = hasResults ? (page - 1) * PAGE_SIZE + normalizedFreelancers.length : 0
        const totalPages = hasExplicitTotal
                ? Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
                : normalizedFreelancers.length < PAGE_SIZE
                  ? Math.max(1, page)
                  : page + 1
        const nextDisabled = hasExplicitTotal ? page >= totalPages : normalizedFreelancers.length < PAGE_SIZE

        const loadSkillOptions = useCallback<AsyncOptionLoader>(async inputValue => {
                try {
                        const response = await searchSkills({ search: inputValue, page: 1, limit: 15, onlyActive: true })
                        return (
                                response.data?.map(skill => createOption({ id: skill.id, name: skill.name }))?.filter(
                                        (option): option is Option => Boolean(option)
                                ) ?? []
                        )
                } catch (err) {
                        console.error('Failed to fetch skills', err)
                        return []
                }
        }, [])

        const loadSpecialtyOptions = useCallback<AsyncOptionLoader>(async inputValue => {
                try {
                        const response = await getSpecialties({ page: 1, limit: 15, search: inputValue })
                        return (
                                response.data?.map(specialty => createOption({ id: specialty.id, name: specialty.name }))?.filter(
                                        (option): option is Option => Boolean(option)
                                ) ?? []
                        )
                } catch (err) {
                        console.error('Failed to fetch specialties', err)
                        return []
                }
        }, [])

        const countryOptions = useMemo<Option[]>(() => {
                return countryList()
                        .getData()
                        .map(country => ({ value: country.value, label: country.label }))
        }, [])

        const resetFilters = () => {
                setSelectedSpecialty(null)
                setSelectedSkills([])
                setSelectedCountry(null)
                setSearch('')
                setPage(1)
        }

        const handleSpecialtyChange = (option: SingleValue<Option>) => {
                setSelectedSpecialty(option ?? null)
                setPage(1)
        }

        const handleSkillChange = (option: MultiValue<Option>) => {
                setSelectedSkills(option as Option[])
                setPage(1)
        }

        const handleCountryChange = (option: SingleValue<Option>) => {
                setSelectedCountry(option ?? null)
                setPage(1)
        }

        const renderSkeletonCard = (index: number) => (
                <div key={`freelancer-skeleton-${index}`} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                <div className='flex items-center gap-4'>
                                        <div className='h-16 w-16 rounded-2xl bg-base-200' />
                                        <div className='space-y-2'>
                                                <div className='h-4 w-40 rounded-full bg-base-200/80' />
                                                <div className='h-3 w-28 rounded-full bg-base-200/70' />
                                                <div className='h-3 w-24 rounded-full bg-base-200/60' />
                                        </div>
                                </div>
                                <div className='flex flex-col items-start gap-2 md:items-end'>
                                        <div className='h-4 w-24 rounded-full bg-base-200/70' />
                                        <div className='h-3 w-28 rounded-full bg-base-200/60' />
                                        <div className='h-3 w-20 rounded-full bg-base-200/50' />
                                </div>
                        </div>
                        <div className='mt-4 flex flex-wrap gap-2'>
                                <div className='h-6 w-20 rounded-full bg-base-200/70' />
                                <div className='h-6 w-16 rounded-full bg-base-200/60' />
                                <div className='h-6 w-24 rounded-full bg-base-200/50' />
                        </div>
                        <div className='mt-4 h-3 w-full rounded-full bg-base-200/60' />
                        <div className='mt-4 flex items-center justify-between border-t border-base-200 pt-4'>
                                <div className='flex gap-2'>
                                        <div className='h-6 w-28 rounded-full bg-base-200/60' />
                                        <div className='h-6 w-24 rounded-full bg-base-200/50' />
                                </div>
                                <div className='h-8 w-28 rounded-full bg-base-200/60' />
                        </div>
                </div>
        )

        return (
                <div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-semibold text-base-content'>Discover freelancers</h1>
                                        <p className='text-sm text-base-content/70'>Browse, compare, and connect with talent that fits your project.</p>
                                </div>
                                <div className='flex items-center gap-2 rounded-full border border-base-200 bg-base-100 px-4 py-2 text-sm text-base-content/70 shadow-sm'>
                                        <Filter className='size-4 text-primary' />
                                        {isFetching && !isLoading ? (
                                                <span className='flex items-center gap-2 text-primary'>
                                                        <Loader2 className='size-4 animate-spin' /> Refreshing…
                                                </span>
                                        ) : (
                                                <span>
                                                        Showing {startItem}-{endItem} of {total}
                                                </span>
                                        )}
                                </div>
                        </div>

                        <div className='mt-6 rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
                                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Search className='size-3' /> Search
                                                </span>
                                                <div className='input input-bordered flex items-center gap-2'>
                                                        <Search className='size-4 text-base-content/60' />
                                                        <input
                                                                value={search}
                                                                onChange={event => {
                                                                        setSearch(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                                placeholder='Name, skill, keyword…'
                                                                className='grow'
                                                        />
                                                </div>
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Sparkles className='size-3' /> Specialty
                                                </span>
                                                <AsyncSelect
                                                        cacheOptions
                                                        defaultOptions
                                                        value={selectedSpecialty}
                                                        loadOptions={loadSpecialtyOptions}
                                                        onChange={handleSpecialtyChange}
                                                        placeholder='Search specialty…'
                                                        styles={selectStyles}
                                                        classNamePrefix='freelancer-select'
                                                />
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content md:col-span-2 xl:col-span-1'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <Sparkles className='size-3 text-secondary' /> Skills
                                                </span>
                                                <AsyncSelect
                                                        isMulti
                                                        cacheOptions
                                                        defaultOptions
                                                        value={selectedSkills}
                                                        loadOptions={loadSkillOptions}
                                                        onChange={handleSkillChange}
                                                        placeholder='Search skills…'
                                                        styles={selectStyles}
                                                        classNamePrefix='freelancer-select'
                                                />
                                        </label>
                                        <label className='flex flex-col text-sm text-base-content'>
                                                <span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                        <MapPin className='size-3 text-rose-500' /> Location
                                                </span>
                                                <Select
                                                        isClearable
                                                        value={selectedCountry}
                                                        onChange={handleCountryChange}
                                                        options={countryOptions}
                                                        placeholder='Select country…'
                                                        styles={selectStyles}
                                                        classNamePrefix='freelancer-select'
                                                />
                                        </label>
                                </div>
                                <div className='mt-4 flex flex-col gap-2 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between'>
                                        <span>
                                                Active filters: {selectedSpecialty ? 1 : 0} specialty, {selectedSkills.length} skills, {selectedCountry ? 1 : 0} location
                                        </span>
                                        <button type='button' onClick={resetFilters} className='btn btn-ghost btn-sm gap-2'>
                                                Reset filters
                                        </button>
                                </div>
                        </div>

                        {isError ? (
                                <div className='mt-6 rounded-3xl border border-error/30 bg-error/5 p-6 text-sm text-error shadow-sm'>
                                        <h2 className='text-base font-semibold'>Unable to load freelancers</h2>
                                        <p className='mt-2'>
                                                {(error as Error)?.message ||
                                                        'Something went wrong while fetching freelancers. Please try again later.'}
                                        </p>
                                </div>
                        ) : (
                                <div className='mt-6 space-y-4'>
                                        {isLoading
                                                ? Array.from({ length: PAGE_SIZE }).map((_, index) => renderSkeletonCard(index))
                                                : normalizedFreelancers.length > 0
                                                  ? normalizedFreelancers.map(freelancer => {
                                                                const hourlyRateDisplay = formatCurrency(
                                                                        freelancer.hourlyRateAmount,
                                                                        freelancer.hourlyRateCurrency
                                                                )
                                                                const totalEarnedDisplay = formatCurrency(
                                                                        freelancer.totalEarned,
                                                                        freelancer.hourlyRateCurrency
                                                                )
                                                                const ratingDisplay = freelancer.rating
                                                                        ? `${freelancer.rating.toFixed(1)} / 5`
                                                                        : undefined
                                                                const jobSuccessDisplay =
                                                                        freelancer.jobSuccess !== undefined
                                                                                ? `${freelancer.jobSuccess}%`
                                                                                : undefined

                                                                const initials = getFreelancerInitials(freelancer.name)

                                                                return (
                                                                        <Link
                                                                                key={freelancer.id}
                                                                                to={routes.comons.freelancerProfile(freelancer.id)}
                                                                                className='group block rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm transition hover:border-primary/50'
                                                                        >
                                                                                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                                                                        <div className='flex items-center gap-4'>
                                                                                                <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-lg font-semibold text-primary'>
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
                                                                                                <div>
                                                                                                        <h3 className='text-lg font-semibold text-base-content transition group-hover:text-primary'>
                                                                                                                {freelancer.name}
                                                                                                        </h3>
                                                                                                        {freelancer.title && (
                                                                                                                <p className='text-sm text-base-content/70'>{freelancer.title}</p>
                                                                                                        )}
                                                                                                        <div className='mt-2 flex flex-wrap items-center gap-2 text-xs text-base-content/60'>
                                                                                                                {freelancer.location && (
                                                                                                                        <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1'>
                                                                                                                                <MapPin className='size-3 text-primary' /> {freelancer.location}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                                {freelancer.experienceLevel && (
                                                                                                                        <span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1'>
                                                                                                                                <BriefcaseBusiness className='size-3 text-secondary' /> {freelancer.experienceLevel}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                </div>
                                                                                        </div>
                                                                                        <div className='flex flex-col items-start gap-1 text-sm text-base-content/70 md:items-end'>
                                                                                                {hourlyRateDisplay && (
                                                                                                        <span className='font-semibold text-base-content'>{hourlyRateDisplay}</span>
                                                                                                )}
                                                                                                {jobSuccessDisplay && <span>Job success: {jobSuccessDisplay}</span>}
                                                                                                {ratingDisplay && (
                                                                                                        <span className='flex items-center gap-1 text-amber-600'>
                                                                                                                <Star className='size-4 fill-amber-400 text-amber-400' /> {ratingDisplay}
                                                                                                        </span>
                                                                                                )}
                                                                                                {totalEarnedDisplay && (
                                                                                                        <span className='flex items-center gap-1 text-emerald-600'>
                                                                                                                <Wallet className='size-4 text-emerald-500' /> {totalEarnedDisplay} earned
                                                                                                        </span>
                                                                                                )}
                                                                                        </div>
                                                                                </div>

                                                                                {freelancer.bio && (
                                                                                        <p className='mt-3 line-clamp-2 text-sm text-base-content/70'>{freelancer.bio}</p>
                                                                                )}

                                                                                {freelancer.skills.length > 0 && (
                                                                                        <div className='mt-4 flex flex-wrap gap-2'>
                                                                                                {freelancer.skills.slice(0, 5).map(skill => (
                                                                                                        <span
                                                                                                                key={`${freelancer.id}-${skill}`}
                                                                                                                className='badge badge-soft badge-sm rounded-full bg-primary/10 text-primary'
                                                                                                        >
                                                                                                                {skill}
                                                                                                        </span>
                                                                                                ))}
                                                                                                {freelancer.skills.length > 5 && (
                                                                                                        <span className='badge badge-outline badge-sm rounded-full text-base-content/70'>
                                                                                                                +{freelancer.skills.length - 5} more
                                                                                                        </span>
                                                                                                )}
                                                                                        </div>
                                                                                )}

                                                                                <div className='mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4 text-sm text-base-content/70'>
                                                                                        <div className='flex flex-wrap items-center gap-3'>
                                                                                                {freelancer.completedJobs !== undefined && (
                                                                                                        <span className='flex items-center gap-2'>
                                                                                                                <BriefcaseBusiness className='size-4 text-secondary' /> {freelancer.completedJobs} jobs
                                                                                                        </span>
                                                                                                )}
                                                                                                {freelancer.totalHoursWorked !== undefined && (
                                                                                                        <span className='flex items-center gap-2'>
                                                                                                                <Clock className='size-4 text-primary' /> {freelancer.totalHoursWorked} hours billed
                                                                                                        </span>
                                                                                                )}
                                                                                        </div>
                                                                                        <span className='flex items-center gap-2 text-primary transition group-hover:translate-x-1'>
                                                                                                View profile <ArrowRight className='size-4' />
                                                                                        </span>
                                                                                </div>
                                                                        </Link>
                                                                )
                                                        })
                                                  : (
                                                          <div className='rounded-3xl border border-dashed border-base-300 bg-base-100 px-8 py-16 text-center text-sm text-base-content/70 shadow-sm'>
                                                                  <p className='text-lg font-medium text-base-content'>No freelancers found</p>
                                                                  <p className='mt-2'>Adjust your filters or broaden your search to see more profiles.</p>
                                                          </div>
                                                    )}
                                </div>
                        )}

                        <div className='mt-6 flex flex-col items-center justify-between gap-3 border-t border-base-200 pt-6 text-sm text-base-content/70 md:flex-row'>
                                <div>
                                        Showing {startItem}-{endItem} of {total} freelancers
                                </div>
                                <div className='flex items-center gap-2'>
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-sm'
                                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
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
                                                onClick={() => setPage(prev => (nextDisabled ? prev : prev + 1))}
                                                disabled={nextDisabled || isLoading}
                                        >
                                                Next
                                        </button>
                                </div>
                        </div>

                        {isFetching ? (
                                <div className='pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-base-200 bg-base-100 px-4 py-2 text-xs text-base-content/70 shadow-lg'>
                                        <span className='flex items-center gap-2'>
                                                <Loader2 className='size-4 animate-spin text-primary' /> Updating results…
                                        </span>
                                </div>
                        ) : null}
                </div>
        )
}
