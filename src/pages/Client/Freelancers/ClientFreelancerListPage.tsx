import { type MouseEvent, useCallback, useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AsyncSelect from 'react-select/async'
import Select, { type SingleValue, type MultiValue, type StylesConfig, type ActionMeta } from 'react-select'
import countryList from 'react-select-country-list'
import {
	Bookmark,
	BookmarkCheck,
	Filter,
	Loader2,
	MapPin,
	Search,
	Sparkles,
	Star,
	BriefcaseBusiness,
	Wallet,
	ArrowRight,
	Clock,
	CircleDollarSign,
	Languages,
	Layers,
	BadgeCheck,
	CalendarDays,
	Gauge
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
	listClientFreelancers,
	saveClientFreelancer,
	unsaveClientFreelancer,
	type ClientFreelancerFilterInput
} from '~/apis/client-freelancer.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { routes } from '~/config/routes'
import {
        formatCurrency,
        formatLabel,
        formatMemberSince,
        formatNumberValue,
        formatProficiency,
        getFreelancerId,
        getFreelancerInitials,
        normalizeFreelancer,
        type NormalizedFreelancer
} from './utils'
import type { ClientFreelancerListItem, PaginatedClientFreelancerResponse } from '~/types/client-freelancer'

const PAGE_SIZE = 9
const SEARCH_DEBOUNCE = 400
const FILTER_DEBOUNCE = 300

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
	country: Option | null,
	savedOnly: boolean
): ClientFreelancerFilterInput => ({
	page,
	limit: PAGE_SIZE,
	search: search.trim() || undefined,
	specialtyId: specialty?.value,
	skillIds: skills.map(skill => skill.value),
	country: country?.value,
	saved: savedOnly || undefined
})

export default function ClientFreelancerListPage() {
	const [page, setPage] = useState(1)
	const [search, setSearch] = useState('')
	const [selectedSpecialty, setSelectedSpecialty] = useState<Option | null>(null)
	const [selectedSkills, setSelectedSkills] = useState<Option[]>([])
	const [selectedCountry, setSelectedCountry] = useState<Option | null>(null)
	const [showSavedOnly, setShowSavedOnly] = useState(false)

	const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE)
	const debouncedSpecialty = useDebounce(selectedSpecialty, FILTER_DEBOUNCE)
	const debouncedSkills = useDebounce(selectedSkills, FILTER_DEBOUNCE)
	const debouncedCountry = useDebounce(selectedCountry, FILTER_DEBOUNCE)
	const debouncedSavedOnly = useDebounce(showSavedOnly, FILTER_DEBOUNCE)

	const filters = useMemo(
		() =>
			buildFilters(page, debouncedSearch, debouncedSpecialty, debouncedSkills, debouncedCountry, debouncedSavedOnly),
		[page, debouncedSearch, debouncedSpecialty, debouncedSkills, debouncedCountry, debouncedSavedOnly]
	)

	const queryKey = useMemo(() => ['client-freelancers', filters], [filters])

	const queryClient = useQueryClient()

        const { data, isLoading, isFetching, isError, error } = useQuery<PaginatedClientFreelancerResponse>({
                queryKey,
                queryFn: () => listClientFreelancers(filters),
                placeholderData: keepPreviousData
        })

	const toggleSaveMutation = useMutation({
		mutationFn: async ({ id, isSaved }: { id: string; isSaved?: boolean }) => {
			if (isSaved) {
				await unsaveClientFreelancer(id)
				return { id, isSaved: false }
			}

			await saveClientFreelancer(id)
			return { id, isSaved: true }
		},
		onSuccess: async ({ id, isSaved }) => {
			queryClient.setQueriesData<PaginatedClientFreelancerResponse>({ queryKey: ['client-freelancers'] }, previous => {
				if (!previous?.data) return previous
				const updatedData = previous.data.map(item => {
					if (!item) return item
					const itemId = getFreelancerId(item)
					if (itemId === id) {
						return { ...item, isSaved, saved: isSaved }
					}
					return item
				})

				return { ...previous, data: updatedData }
			})

			await queryClient.invalidateQueries({ queryKey: ['client-freelancers'] })
		}
	})

	const freelancers = useMemo(() => (data?.data ?? []) as ClientFreelancerListItem[], [data?.data])

	const normalizedFreelancers = useMemo(() => {
		return freelancers
			.map(item => normalizeFreelancer(item))
			.filter((item): item is NormalizedFreelancer => Boolean(item))
	}, [freelancers])

	const hasExplicitTotal = typeof data?.total === 'number'
	const fallbackTotal = (page - 1) * PAGE_SIZE + normalizedFreelancers.length
	const total = hasExplicitTotal ? data?.total ?? 0 : fallbackTotal
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
				response.data
					?.map(skill => createOption({ id: skill.id, name: skill.name }))
					?.filter((option): option is Option => Boolean(option)) ?? []
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
				response.data
					?.map(specialty => createOption({ id: specialty.id, name: specialty.name }))
					?.filter((option): option is Option => Boolean(option)) ?? []
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
		setShowSavedOnly(false)
		setPage(1)
	}

        const handleSpecialtyChange = (option: SingleValue<Option>, _meta: ActionMeta<Option>) => {
                setSelectedSpecialty(option ?? null)
                setPage(1)
        }

        const handleSkillChange = (option: MultiValue<Option>, _meta: ActionMeta<Option>) => {
                setSelectedSkills([...option])
                setPage(1)
        }

        const handleCountryChange = (option: SingleValue<Option>, _meta: ActionMeta<Option>) => {
                setSelectedCountry(option ?? null)
                setPage(1)
        }

	const renderSkeletonCard = (index: number) => (
		<div key={`freelancer-skeleton-${index}`} className='rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm'>
			<div className='flex flex-col gap-6 md:flex-row md:justify-between'>
				<div className='flex items-center gap-4'>
					<div className='h-16 w-16 rounded-2xl bg-base-200' />
					<div className='space-y-3'>
						<div className='h-4 w-40 rounded-full bg-base-200/80' />
						<div className='h-3 w-32 rounded-full bg-base-200/70' />
						<div className='flex flex-wrap gap-2'>
							<div className='h-3 w-20 rounded-full bg-base-200/60' />
							<div className='h-3 w-24 rounded-full bg-base-200/50' />
							<div className='h-3 w-24 rounded-full bg-base-200/40' />
						</div>
					</div>
				</div>
				<div className='grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3'>
					{Array.from({ length: 6 }).map((_, statIndex) => (
						<div
							key={`freelancer-skeleton-stat-${index}-${statIndex}`}
							className='flex items-center gap-3 rounded-2xl bg-base-200/60 px-4 py-3'>
							<div className='h-9 w-9 rounded-xl bg-base-200' />
							<div className='space-y-2'>
								<div className='h-3 w-20 rounded-full bg-base-200/70' />
								<div className='h-3 w-24 rounded-full bg-base-200/50' />
							</div>
						</div>
					))}
				</div>
			</div>
			<div className='mt-4 h-3 w-full rounded-full bg-base-200/60' />
			<div className='mt-4 flex flex-wrap gap-2'>
				{Array.from({ length: 6 }).map((_, chipIndex) => (
					<div
						key={`freelancer-skeleton-specialty-${index}-${chipIndex}`}
						className='h-6 w-24 rounded-full bg-base-200/50'
					/>
				))}
			</div>
			<div className='mt-4 flex flex-wrap gap-2'>
				{Array.from({ length: 6 }).map((_, chipIndex) => (
					<div
						key={`freelancer-skeleton-language-${index}-${chipIndex}`}
						className='h-6 w-20 rounded-full bg-base-200/40'
					/>
				))}
			</div>
			<div className='mt-5 flex justify-end border-t border-base-200 pt-4'>
				<div className='h-8 w-32 rounded-full bg-base-200/60' />
			</div>
		</div>
	)

	return (
		<div className='mx-auto w-full max-w-6xl px-4 py-8 lg:px-0'>
			<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold text-base-content'>Discover freelancers</h1>
					<p className='text-sm text-base-content/70'>
						Browse, compare, and connect with talent that fits your project.
					</p>
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
                                                <AsyncSelect<Option, false>
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
                                                <AsyncSelect<Option, true>
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
                                                <Select<Option, false>
                                                        isClearable
                                                        value={selectedCountry}
                                                        onChange={handleCountryChange}
                                                        options={countryOptions}
							placeholder='Select country…'
							styles={selectStyles}
							classNamePrefix='freelancer-select'
						/>
					</label>
					<div className='flex flex-col text-sm text-base-content'>
						<span className='mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
							<Bookmark className='size-3 text-primary' /> Saved
						</span>
						<label className='flex items-center justify-between gap-3 rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm text-base-content/80 shadow-sm'>
							<span>Show saved freelancers only</span>
							<input
								type='checkbox'
								className='toggle toggle-sm'
								checked={showSavedOnly}
								onChange={event => {
									setShowSavedOnly(event.target.checked)
									setPage(1)
								}}
							/>
						</label>
					</div>
				</div>
				<div className='mt-4 flex flex-col gap-2 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between'>
					<span>
						Active filters: {selectedSpecialty ? 1 : 0} specialty, {selectedSkills.length} skills,{' '}
						{selectedCountry ? 1 : 0} location, saved {showSavedOnly ? 'on' : 'off'}
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
						{(error as Error)?.message || 'Something went wrong while fetching freelancers. Please try again later.'}
					</p>
				</div>
			) : (
				<div className='mt-6 space-y-4'>
					{isLoading ? (
						Array.from({ length: PAGE_SIZE }).map((_, index) => renderSkeletonCard(index))
					) : normalizedFreelancers.length > 0 ? (
						normalizedFreelancers.map(freelancer => {
							const hourlyRateDisplay = formatCurrency(freelancer.hourlyRateAmount, freelancer.hourlyRateCurrency)
							const totalEarnedDisplay = formatCurrency(freelancer.totalEarned, freelancer.hourlyRateCurrency)
							const ratingDisplay = freelancer.rating ? `${freelancer.rating.toFixed(1)} / 5` : undefined
							const jobSuccessDisplay = freelancer.jobSuccess !== undefined ? `${freelancer.jobSuccess}%` : undefined
							const completedJobsDisplay =
								freelancer.completedJobs !== undefined
									? `${formatNumberValue(freelancer.completedJobs)} jobs`
									: undefined
							const totalHoursDisplay =
								freelancer.totalHoursWorked !== undefined
									? `${formatNumberValue(freelancer.totalHoursWorked)} hrs billed`
									: undefined
							const weeklyCapacityDisplay =
								freelancer.availableHoursPerWeek !== undefined
									? `${formatNumberValue(freelancer.availableHoursPerWeek)} hrs/week`
									: undefined
							const availabilityDisplay = formatLabel(freelancer.availability)
							const memberSinceDisplay = formatMemberSince(freelancer.memberSince)

							const initials = getFreelancerInitials(freelancer.name)

							const stats: Array<{
								key: string
								label: string
								value: string
								icon: ReactNode
							}> = []

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

							if (ratingDisplay) {
								stats.push({
									key: 'rating',
									label: 'Rating',
									value: ratingDisplay,
									icon: <Star className='size-4 fill-amber-400 text-amber-400' />
								})
							}

							if (completedJobsDisplay) {
								stats.push({
									key: 'completed-jobs',
									label: 'Completed jobs',
									value: completedJobsDisplay,
									icon: <BriefcaseBusiness className='size-4 text-secondary' />
								})
							}

							if (totalHoursDisplay) {
								stats.push({
									key: 'hours-billed',
									label: 'Hours billed',
									value: totalHoursDisplay,
									icon: <Clock className='size-4 text-primary' />
								})
							}

							if (weeklyCapacityDisplay) {
								stats.push({
									key: 'weekly-capacity',
									label: 'Weekly capacity',
									value: weeklyCapacityDisplay,
									icon: <Gauge className='size-4 text-sky-500' />
								})
							}

							const chipSections: Array<{
								key: string
								label: string
								icon: ReactNode
								items: string[]
								limit: number
								badgeClass: string
							}> = []

							if (freelancer.specialties.length > 0) {
								chipSections.push({
									key: 'specialties',
									label: 'Specialties',
									icon: <Sparkles className='size-3 text-secondary' />,
									items: freelancer.specialties,
									limit: 4,
									badgeClass: 'badge badge-soft badge-xs rounded-full bg-secondary/10 text-secondary leading-tight'
								})
							}

							if (freelancer.categories.length > 0) {
								chipSections.push({
									key: 'categories',
									label: 'Categories',
									icon: <Layers className='size-3 text-purple-500' />,
									items: freelancer.categories,
									limit: 4,
									badgeClass: 'badge badge-outline badge-xs rounded-full text-base-content/70 leading-tight'
								})
							}

							if (freelancer.skills.length > 0) {
								chipSections.push({
									key: 'skills',
									label: 'Top skills',
									icon: <BadgeCheck className='size-3 text-primary' />,
									items: freelancer.skills,
									limit: 5,
									badgeClass: 'badge badge-soft badge-xs rounded-full bg-primary/10 text-primary leading-tight'
								})
							}

							if (freelancer.languages.length > 0) {
								chipSections.push({
									key: 'languages',
									label: 'Languages',
									icon: <Languages className='size-3 text-emerald-600' />,
									items: freelancer.languages.map(language => {
										const proficiencyLabel = formatProficiency(language.proficiency)
										return proficiencyLabel ? `${language.name} · ${proficiencyLabel}` : language.name
									}),
									limit: 4,
									badgeClass: 'badge badge-soft badge-xs rounded-full bg-emerald-50 text-emerald-600 leading-tight'
								})
							}

							const isTogglingSave = toggleSaveMutation.isPending && toggleSaveMutation.variables?.id === freelancer.id
							const SaveIcon = isTogglingSave ? Loader2 : freelancer.isSaved ? BookmarkCheck : Bookmark

                                                        return (
                                                                <Link
                                                                        key={freelancer.id}
                                                                        to={routes.comons.freelancerProfile(freelancer.id)}
                                                                        className='group relative block overflow-hidden rounded-3xl border border-base-200 bg-base-100 p-6 shadow-md transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg'>
                                                                        <span
                                                                                className='pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0'
                                                                                aria-hidden='true'
                                                                        />
                                                                        <div className='flex flex-col gap-6'>
                                                                                <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
											<div className='flex flex-1 items-start gap-4'>
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
														<h3 className='text-lg font-semibold text-base-content transition group-hover:text-primary'>
															{freelancer.name}
														</h3>
														{freelancer.title && <p className='text-sm text-base-content/70'>{freelancer.title}</p>}
													</div>
													{freelancer.bio && (
														<p className='line-clamp-2 text-sm text-base-content/70'>{freelancer.bio}</p>
													)}
													<div className='flex flex-wrap items-center gap-2 text-xs text-base-content/60'>
														{freelancer.location && (
															<span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
																<MapPin className='size-3 text-primary' /> {freelancer.location}
															</span>
														)}
														{freelancer.experienceLevel && (
															<span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
																<BriefcaseBusiness className='size-3 text-secondary' />{' '}
																{formatLabel(freelancer.experienceLevel)}
															</span>
														)}
														{availabilityDisplay && (
															<span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
																<BadgeCheck className='size-3 text-emerald-500' /> {availabilityDisplay}
															</span>
														)}
														{memberSinceDisplay && (
															<span className='inline-flex items-center gap-1 rounded-full bg-base-200 px-3 py-1'>
																<CalendarDays className='size-3 text-base-content/70' /> Member since{' '}
																{memberSinceDisplay}
															</span>
														)}
													</div>
												</div>
											</div>

                                                                                        <div className='flex w-full flex-col gap-3 lg:max-w-xl'>
                                                                                                <div className='flex justify-end'>
                                                                                                        <button
                                                                                                                type='button'
                                                                                                                className={`btn btn-outline btn-sm gap-2 transition ${
                                                                                                                        freelancer.isSaved
                                                                                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                                                                                : 'text-base-content/70'
                                                                                                                }`}
														aria-pressed={freelancer.isSaved}
														disabled={isTogglingSave}
														onClick={(event: MouseEvent<HTMLButtonElement>) => {
															event.preventDefault()
															event.stopPropagation()
															toggleSaveMutation.mutate({
																id: freelancer.id,
																isSaved: freelancer.isSaved
															})
														}}>
														<SaveIcon className={`size-4 ${isTogglingSave ? 'animate-spin' : ''}`} />
														{freelancer.isSaved ? 'Saved' : 'Save'}
													</button>
												</div>
                                                                                                {stats.length > 0 && (
                                                                                                        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                                                                                                                {stats.map(stat => (
                                                                                                                        <div
                                                                                                                                key={`${freelancer.id}-${stat.key}`}
                                                                                                                                className='rounded-2xl border border-base-200/70 bg-base-100/90 px-4 py-3 text-xs text-base-content/70 shadow-sm transition group-hover:border-primary/40'>
                                                                                                                                <span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
                                                                                                                                        {stat.icon}
                                                                                                                                        {stat.label}
                                                                                                                                </span>
                                                                                                                                <p className='mt-1 text-sm font-medium text-base-content'>{stat.value}</p>
                                                                                                                        </div>
                                                                                                                ))}
                                                                                                        </div>
                                                                                                )}

                                                                                                <div className='flex items-center justify-end text-sm font-semibold text-primary'>
                                                                                                        <span className='flex items-center gap-2 transition group-hover:translate-x-1'>
                                                                                                                View profile <ArrowRight className='size-4' />
                                                                                                        </span>
                                                                                                </div>
											</div>
										</div>

										{chipSections.length > 0 && (
											<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
												{chipSections.map(section => {
													const displayedItems = section.items.slice(0, section.limit)
													const remaining = section.items.length - displayedItems.length

													return (
                                                                                                                <div
                                                                                                                        key={`${freelancer.id}-${section.key}`}
                                                                                                                        className='rounded-2xl border border-base-200/60 bg-base-200/40 px-4 py-3 text-xs text-base-content/70 shadow-sm'>
															<span className='flex items-center gap-2 font-semibold uppercase tracking-wide text-base-content/60'>
																{section.icon} {section.label}
															</span>
															<div className='mt-2 flex flex-wrap gap-1.5'>
																{displayedItems.map(item => (
																	<span key={`${freelancer.id}-${section.key}-${item}`} className={section.badgeClass}>
																		{item}
																	</span>
																))}
																{remaining > 0 && (
																	<span className='badge badge-outline badge-xs rounded-full text-base-content/60 leading-tight'>
																		+{remaining} more
																	</span>
																)}
															</div>
														</div>
													)
												})}
											</div>
										)}
									</div>
								</Link>
							)
						})
					) : (
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
						disabled={page === 1 || isLoading}>
						Previous
					</button>
					<span className='rounded-full border border-base-200 px-3 py-1 text-xs font-medium text-base-content/80'>
						Page {page}
					</span>
					<button
						type='button'
						className='btn btn-ghost btn-sm'
						onClick={() => setPage(prev => (nextDisabled ? prev : prev + 1))}
						disabled={nextDisabled || isLoading}>
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
