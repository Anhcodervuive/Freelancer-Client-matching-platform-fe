import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AsyncSelect from 'react-select/async'
import Select, { type SingleValue, type MultiValue, type StylesConfig } from 'react-select'
import countryList from 'react-select-country-list'
import { Filter, Loader2, MapPin, Search, Sparkles, Star, BriefcaseBusiness, Wallet, ArrowRight } from 'lucide-react'
import { listClientFreelancers, type ClientFreelancerFilterInput } from '~/apis/client-freelancer.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { routes } from '~/config/routes'
import { Link } from 'react-router-dom'
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
                minHeight: '2.75rem',
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
                fontSize: '0.85rem',
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
                <div
                        key={`freelancer-skeleton-${index}`}
                        className='flex h-full flex-col rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm shadow-primary/5'
                >
                        <div className='flex items-start gap-4'>
                                <div className='h-16 w-16 rounded-2xl bg-base-200/60' />
                                <div className='flex-1 space-y-2'>
                                        <div className='h-4 w-3/4 rounded-full bg-base-200/80' />
                                        <div className='h-3 w-1/2 rounded-full bg-base-200/70' />
                                        <div className='h-3 w-1/3 rounded-full bg-base-200/60' />
                                </div>
                        </div>
                        <div className='mt-4 space-y-2'>
                                <div className='h-3 w-full rounded-full bg-base-200/60' />
                                <div className='h-3 w-2/3 rounded-full bg-base-200/50' />
                        </div>
                        <div className='mt-6 flex gap-2'>
                                <div className='h-6 w-16 rounded-full bg-base-200/60' />
                                <div className='h-6 w-12 rounded-full bg-base-200/50' />
                                <div className='h-6 w-20 rounded-full bg-base-200/40' />
                        </div>
                        <div className='mt-6 flex items-center justify-between'>
                                <div className='h-3 w-24 rounded-full bg-base-200/60' />
                                <div className='h-9 w-28 rounded-full bg-base-200/50' />
                        </div>
                </div>
        )

        return (
                <div className='mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-0'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
                                <div>
                                        <p className='text-sm font-semibold uppercase tracking-[0.45em] text-primary/70'>Freelancers</p>
                                        <h1 className='mt-2 text-3xl font-bold text-base-content md:text-4xl'>Find the perfect talent</h1>
                                        <p className='mt-2 max-w-2xl text-sm text-base-content/70'>
                                                Explore curated profiles, filter by specialty, skills, and location to connect with
                                                freelancers that match your project requirements.
                                        </p>
                                </div>
                                <div className='inline-flex items-center gap-2 rounded-2xl border border-base-200 bg-white/80 px-4 py-2 text-sm text-base-content/70 shadow-sm'>
                                        <Filter className='size-4 text-primary/80' />
                                        {isFetching && !isLoading ? (
                                                <>
                                                        <Loader2 className='size-4 animate-spin text-primary' />
                                                        <span>Updating results…</span>
                                                </>
                                        ) : (
                                                <span>
                                                        Showing {startItem}-{endItem} of {total}
                                                </span>
                                        )}
                                </div>
                        </div>

                        <div className='mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]'>
                                <aside className='space-y-6'>
                                        <div className='rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-primary/5 backdrop-blur'>
                                                <div className='flex items-center justify-between'>
                                                        <h2 className='text-lg font-semibold text-base-content'>Filters</h2>
                                                        <button
                                                                type='button'
                                                                onClick={resetFilters}
                                                                className='text-sm font-medium text-primary transition hover:text-primary/80'
                                                        >
                                                                Reset
                                                        </button>
                                                </div>

                                                <div className='mt-5 space-y-5 text-sm text-base-content/80'>
                                                        <label className='space-y-2'>
                                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-base-content/60'>
                                                                        <Search className='size-3' /> Search
                                                                </span>
                                                                <div className='relative'>
                                                                        <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/40' />
                                                                        <input
                                                                                value={search}
                                                                                onChange={event => {
                                                                                        setSearch(event.target.value)
                                                                                        setPage(1)
                                                                                }}
                                                                                placeholder='Name, skill, keyword…'
                                                                                className='w-full rounded-2xl border border-base-200 bg-white/70 py-2.5 pl-10 pr-3 text-sm shadow-inner shadow-white/30 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                                        />
                                                                </div>
                                                        </label>

                                                        <label className='space-y-2'>
                                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-base-content/60'>
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

                                                        <label className='space-y-2'>
                                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-base-content/60'>
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

                                                        <label className='space-y-2'>
                                                                <span className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-base-content/60'>
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
                                        </div>
                                </aside>

                                <section className='space-y-6'>
                                        {isError ? (
                                                <div className='rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-rose-600 shadow-inner shadow-rose-100'>
                                                        <h2 className='text-lg font-semibold'>Unable to load freelancers</h2>
                                                        <p className='mt-1 text-sm'>
                                                                {(error as Error)?.message ||
                                                                        'Something went wrong while fetching freelancers. Please try again later.'}
                                                        </p>
                                                </div>
                                        ) : (
                                                <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
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
                                                                                                to={routes.client.freelancers.detail(freelancer.id)}
                                                                                                className='group flex h-full flex-col rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(59,130,246,0.2)]'
                                                                                        >
                                                                                                <div className='flex items-start gap-4'>
                                                                                                        <div className='relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/20 text-lg font-semibold text-primary shadow-inner shadow-primary/10'>
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
                                                                                                        <div className='flex flex-1 flex-col gap-1'>
                                                                                                                <h3 className='text-lg font-semibold text-base-content transition group-hover:text-primary'>
                                                                                                                        {freelancer.name}
                                                                                                                </h3>
                                                                                                                {freelancer.title && (
                                                                                                                        <p className='text-sm text-base-content/70'>{freelancer.title}</p>
                                                                                                                )}
                                                                                                                <div className='flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-base-content/50'>
                                                                                                                        {freelancer.location && (
                                                                                                                                <span className='inline-flex items-center gap-1'>
                                                                                                                                        <MapPin className='size-3 text-primary' />
                                                                                                                                        {freelancer.location}
                                                                                                                                </span>
                                                                                                                        )}
                                                                                                                        {freelancer.experienceLevel && (
                                                                                                                                <span className='inline-flex items-center gap-1'>
                                                                                                                                        <BriefcaseBusiness className='size-3 text-secondary' />
                                                                                                                                        {freelancer.experienceLevel}
                                                                                                                                </span>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                        <div className='text-right text-sm text-base-content/70'>
                                                                                                                {hourlyRateDisplay && (
                                                                                                                        <p className='text-base font-semibold text-primary'>{hourlyRateDisplay}/hr</p>
                                                                                                                )}
                                                                                                                {jobSuccessDisplay && (
                                                                                                                        <p className='mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700'>
                                                                                                                                <Star className='size-3 fill-emerald-500 text-emerald-500' />
                                                                                                                                {jobSuccessDisplay} Job Success
                                                                                                                        </p>
                                                                                                                )}
                                                                                                        </div>
                                                                                                </div>

                                                                                                {freelancer.bio && (
                                                                                                        <p className='mt-4 line-clamp-3 text-sm leading-relaxed text-base-content/70'>
                                                                                                                {freelancer.bio}
                                                                                                        </p>
                                                                                                )}

                                                                                                {freelancer.skills.length > 0 && (
                                                                                                        <div className='mt-4 flex flex-wrap gap-2'>
                                                                                                                {freelancer.skills.slice(0, 4).map(skill => (
                                                                                                                        <span
                                                                                                                                key={`${freelancer.id}-${skill}`}
                                                                                                                                className='inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary'
                                                                                                                        >
                                                                                                                                {skill}
                                                                                                                        </span>
                                                                                                                ))}
                                                                                                                {freelancer.skills.length > 4 && (
                                                                                                                        <span className='inline-flex items-center rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70'>
                                                                                                                                +{freelancer.skills.length - 4} more
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                )}

                                                                                                <div className='mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-base-content/60'>
                                                                                                        <div className='flex flex-wrap items-center gap-4'>
                                                                                                                {totalEarnedDisplay && (
                                                                                                                        <span className='inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600'>
                                                                                                                                <Wallet className='size-3 text-emerald-500' /> {totalEarnedDisplay} earned
                                                                                                                        </span>
                                                                                                                )}
                                                                                                                {ratingDisplay && (
                                                                                                                        <span className='inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600'>
                                                                                                                                <Star className='size-3 fill-amber-400 text-amber-400' /> {ratingDisplay}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                                {freelancer.completedJobs !== undefined && (
                                                                                                                        <span className='inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-600'>
                                                                                                                                {freelancer.completedJobs} jobs completed
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                        <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary transition group-hover:bg-primary group-hover:text-white'>
                                                                                                                View profile <ArrowRight className='size-4 transition group-hover:translate-x-1' />
                                                                                                        </span>
                                                                                                </div>
                                                                                        </Link>
                                                                                )
                                                                        })
                                                                  : (
                                                                          <div className='col-span-full rounded-3xl border border-dashed border-base-200 bg-white/70 p-10 text-center shadow-inner shadow-white/40'>
                                                                                  <h3 className='text-lg font-semibold text-base-content'>No freelancers found</h3>
                                                                                  <p className='mt-2 text-sm text-base-content/60'>
                                                                                          Try adjusting your filters or expand the search criteria to discover more talent.
                                                                                  </p>
                                                                          </div>
                                                                    )}
                                                </div>
                                        )}

                                        <div className='flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/90 p-4 text-sm text-base-content/70 shadow-sm shadow-primary/5 sm:flex-row sm:items-center sm:justify-between'>
                                                <p>
                                                        Showing {startItem}-{endItem} of {total} freelancers
                                                </p>
                                                <div className='flex items-center gap-3'>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                                disabled={page === 1 || isLoading}
                                                                className='inline-flex items-center gap-2 rounded-full border border-base-200 px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary hover:text-primary'
                                                        >
                                                                Previous
                                                        </button>
                                                        <span className='font-semibold text-base-content'>Page {page}</span>
                                                        <button
                                                                type='button'
                                                                onClick={() => setPage(prev => (nextDisabled ? prev : prev + 1))}
                                                                disabled={nextDisabled || isLoading}
                                                                className='inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 font-medium text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                                                        >
                                                                Next
                                                        </button>
                                                </div>
                                        </div>
                                </section>
                        </div>
                </div>
        )
}
