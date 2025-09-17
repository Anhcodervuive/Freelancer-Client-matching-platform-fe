import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck, User, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllCategories } from '~/apis/admin/category.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import type { Role } from '~/types'
import { updateRole } from '~/apis/profile.api'
import {
	setFreelancerCategoryAndSpecialty,
	setFreelancerSkills,
	updateFreelancerProfileAPI
} from '~/apis/freelancerProfile.api'
import { useDispatch, useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { LANGUAGE_OPTIONS } from '~/constants/language'
import type { FreelancerEducation } from '~/types/profile'
import type { CountryOption } from '~/components/form/CountryAutocomplete'
import CountrySelect from '~/components/form/CountryAutocomplete'
import PhoneField from '~/components/form/PhoneField'
import type { AppDispatch } from '~/redux/store'
import { updateProfileAPI as updateProfileReduxAPI } from '~/redux/user/userSlice'
import { useFreelancerEducation } from '~/hooks/api/useFreelancerEducation'
import { useProfileLanguages } from '~/hooks/api/useFreelancerLanguages'
import countryList from 'react-select-country-list'
import { useNavigate } from 'react-router-dom'
import { routes } from '~/config/routes'

/**
 * Onboarding Wizard (DaisyUI + TailwindCSS + TanStack Query)
 * - Step 0: Choose role (Client / Freelancer)
 * - Step 1: Choose Categories + Specialties (multi, one submit)
 * - Step 2: Choose Skills (max 15)
 * - Step 3: Professional Title
 * - Step 4: Education (minimal add/edit)
 * - Step 5: Languages
 * - Step 6: Overview/Bio
 * - Step 7: Location & Photo
 *
 * Replace endpoint paths below to match your API (they follow the routes we discussed).
 */

// --------------------------
// Config
// --------------------------
const LIMITS = {
	maxCategories: 2,
	maxSpecialties: 6,
	maxSkills: 15
}

// --------------------------
// Steps
// --------------------------
const FREELANCER_STEPS = [
	'role',
	'cat-spec',
	'skills',
	'title',
	'education',
	'languages',
	'overview',
	'location'
] as const

type FreelancerStep = (typeof FREELANCER_STEPS)[number]

// --------------------------
// Zod Schemas
// --------------------------

const EducationItemSchema = z.object({
	id: z.string().optional(),
	schoolName: z.string().min(2),
	degreeTitle: z.string().min(2),
	fieldOfStudy: z.string().min(1),
	startYear: z.number(),
	endYear: z.number()
})
const LanguagesSchema = z.object({
	languages: z
		.array(z.object({ languageCode: z.string(), proficiency: z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']) }))
		.min(1)
})
const LocationSchema = z.object({
	country: z.string(),
	city: z.string().min(2),
	dsitrict: z.string().min(2),
	address: z.string().min(2),
	phoneNumber: z.string().min(3)
})

// --------------------------
// Helpers
// --------------------------
function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<div className='mb-6'>
			<h2 className='text-2xl font-semibold mb-1'>{title}</h2>
			{subtitle ? <p className='text-base-content/70 text-sm'>{subtitle}</p> : null}
		</div>
	)
}

function ProgressDots({ currentIndex, total }: { currentIndex: number; total: number }) {
	return (
		<div className='flex items-center gap-2 mb-6'>
			{Array.from({ length: total }).map((_, i) => (
				<div
					key={i}
					className={`h-1.5 rounded-full transition-all ${i <= currentIndex ? 'bg-primary w-10' : 'bg-base-300 w-6'}`}
				/>
			))}
		</div>
	)
}

function FooterNav({
	canPrev,
	canNext,
	onPrev,
	onNext,
	nextLabel
}: {
	canPrev: boolean
	canNext: boolean
	onPrev: () => void
	onNext: () => void
	nextLabel?: string
}) {
	return (
		<div className='mt-8 flex justify-between'>
			<button className='btn' disabled={!canPrev} onClick={onPrev}>
				<ChevronLeft className='size-4' /> Back
			</button>
			<button className='btn btn-primary' disabled={!canNext} onClick={onNext}>
				{nextLabel ?? 'Next'} <ChevronRight className='size-4' />
			</button>
		</div>
	)
}

function OptionGrid<T extends { id: string; name: string }>({
	items,
	value,
	setValue,
	max,
	disabledIds,
	twoCols = false
}: {
	items: T[]
	value: string[]
	setValue: (_ids: string[]) => void
	max: number
	disabledIds?: Set<string>
	twoCols?: boolean
}) {
	const toggle = (id: string) => {
		if (disabledIds && disabledIds.has(id)) return
		const has = value.includes(id)
		if (has) setValue(value.filter(x => x !== id))
		else if (value.length < max) setValue([...value, id])
	}

	return (
		<div className={`grid gap-3 ${twoCols ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
			{items.map(it => (
				<button
					key={it.id}
					type='button'
					onClick={() => toggle(it.id)}
					className={`btn justify-between ${value.includes(it.id) ? 'btn-primary' : 'btn-outline'} ${
						disabledIds?.has(it.id) ? 'btn-disabled' : ''
					}`}>
					<span className='truncate text-left'>{it.name}</span>
					{value.includes(it.id) ? <Check className='size-4' /> : null}
				</button>
			))}
		</div>
	)
}

// --------------------------
// Query + Mutation hooks (replace paths if needed)
// --------------------------
const qk = {
	me: ['me'],
	categories: (q: string) => ['taxonomy', 'categories', q],
	specialties: (categoryIds: string[], q: string) => ['taxonomy', 'specialties', [...categoryIds], q],
	skills: (categoryIds: string[], specialtyIds: string[], q: string) => [
		'taxonomy',
		'skills',
		[...categoryIds],
		[...specialtyIds],
		q
	]
}

function useListCategories(q: string) {
	return useQuery({
		queryKey: qk.categories(q),
		queryFn: () => getAllCategories({ page: 1, limit: 15, search: q })
	})
}

function useListSpecialties(categoryIds: string[], q: string) {
	return useQuery({
		queryKey: qk.specialties(categoryIds, q),
		queryFn: () => getSpecialties({ page: 1, limit: 15, categoryId: categoryIds, search: q }),
		enabled: true
	})
}

function useListSkills(categoryIds: string[], specialtyIds: string[], q: string) {
	return useQuery({
		queryKey: qk.skills(categoryIds, specialtyIds, q),
		queryFn: () =>
			searchSkills({ search: q, categoryIds: categoryIds.join(','), specialtyIds: specialtyIds.join(',') }),
		enabled: categoryIds.length > 0,
		staleTime: 60_000
	})
}

function useMutations(userId?: string) {
	const qc = useQueryClient()
	const dispatch: AppDispatch = useDispatch()
	const setRole = useMutation({
		mutationFn: async (role: Role) => {
			await updateRole(role)
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: qk.me })
	})
	const setCatSpec = useMutation({
		mutationFn: async (payload: { categoryIds: string[]; specialtyIds: string[] }) =>
			setFreelancerCategoryAndSpecialty(payload)
	})
	const setSkills = useMutation({
		mutationFn: async (payload: { skillIds: string[] }) => setFreelancerSkills(payload)
	})
	const setTitle = useMutation({
		mutationFn: async (title: string) => updateFreelancerProfileAPI({ title }, userId)
	})
	const setOverview = useMutation({
		mutationFn: async (overview: string) =>
			updateFreelancerProfileAPI(
				{
					bio: overview
				},
				userId
			)
	})
	const setLocation = async (v: z.infer<typeof LocationSchema>) => {
		dispatch(
			updateProfileReduxAPI({
				country: v.country,
				city: v.city,
				district: v.dsitrict,
				address: v.address,
				phoneNumber: v.phoneNumber
			})
		)
	}

	return {
		setRole,
		setCatSpec,
		setSkills,
		setTitle,
		setOverview,
		setLocation
	}
}

// --------------------------
// Main Component
// --------------------------
export default function OnboardingWizard() {
	const qc = useQueryClient()
	const navigate = useNavigate()
	const user = useSelector(selectCurrentUser)
	const [activeStepIndex, setActiveStepIndex] = useState(0)
	const [loading, setLoading] = useState(false)

	const [role, setRoleLocal] = useState<'CLIENT' | 'FREELANCER' | undefined>()
	const [categoryIds, setCategoryIds] = useState<string[]>([])
	const [specialtyIds, setSpecialtyIds] = useState<string[]>([])
	const [skillIds, setSkillIds] = useState<string[]>([])
	const [titleLocal, setTitleLocal] = useState('')
	const [localLanguages, setLocalLanguages] = useState<z.infer<typeof LanguagesSchema>>()
	const [overviewLocal, setLocalOverview] = useState('')

	const stepKey = (role === 'FREELANCER' ? FREELANCER_STEPS : ['role'])[activeStepIndex] as FreelancerStep
	const totalSteps = role === 'FREELANCER' ? FREELANCER_STEPS.length : 1

	const canPrev = activeStepIndex > 0
	const canNext = useMemo(() => {
		if (stepKey === 'role') return !!role
		if (stepKey === 'cat-spec') return categoryIds.length > 0
		if (stepKey === 'skills') return skillIds.length > 0
		return true
		return true
	}, [stepKey, role, categoryIds, skillIds])

	const { setRole, setCatSpec, setSkills, setTitle, setOverview, setLocation } = useMutations(user?.id)
	const { addOne: addOneProfileLanguage } = useProfileLanguages(user?.id)
	const { createMutation: createFreelancerEduMutation, deleteMutation: deleteFreelancerEduMutation } =
		useFreelancerEducation(user?.id)

	// Options queries
	const [qCat, setQCat] = useState('')
	const [qSpec, setQSpec] = useState('')
	const [qSkill, setQSkill] = useState('')

	const { data: categoryOptions = { data: [] } } = useListCategories(qCat)
	const { data: specialtyOptions = { data: [] } } = useListSpecialties(categoryIds, qSpec)
	const { data: skillOptions = { data: [] } } = useListSkills(categoryIds, specialtyIds, qSkill)

	const goPrev = () => setActiveStepIndex(i => Math.max(0, i - 1))
	const goNext = async () => {
		if (stepKey === 'role') {
			if (!role) return
			setLoading(true)
			try {
				await setRole.mutateAsync(role as Role)
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}

		if (stepKey === 'cat-spec') {
			setLoading(true)
			try {
				await setCatSpec.mutateAsync({ categoryIds, specialtyIds })
				await qc.invalidateQueries({ queryKey: qk.skills(categoryIds, specialtyIds, qSkill) })
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}

		if (stepKey === 'skills') {
			setLoading(true)
			try {
				await setSkills.mutateAsync({ skillIds })
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}
		if (stepKey === 'title') {
			if (!titleLocal) {
				setActiveStepIndex(i => i + 1)
				return
			}
			setLoading(true)
			try {
				await setTitle.mutateAsync(titleLocal)
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}

		if (stepKey === 'languages') {
			if (localLanguages?.languages.length === 0) {
				setActiveStepIndex(i => i + 1)
				return
			}
			setLoading(true)
			try {
				if (localLanguages?.languages) {
					const promises = localLanguages.languages.map(language =>
						addOneProfileLanguage.mutateAsync({
							languageCode: language.languageCode,
							proficiency: language.proficiency
						})
					)
					await Promise.all(promises)
				}
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}

		if (stepKey === 'overview') {
			if (!titleLocal) {
				setActiveStepIndex(i => i + 1)
				return
			}
			setLoading(true)
			try {
				await setOverview.mutateAsync(overviewLocal)
				setActiveStepIndex(i => i + 1)
			} finally {
				setLoading(false)
			}
			return
		}

		if (activeStepIndex > FREELANCER_STEPS.length) {
			navigate(routes.me.setting.contactInfo)
			return
		}

		setActiveStepIndex(i => i + 1)
	}

	return (
		<div className='max-w-4xl mx-auto p-6'>
			<div className='mb-4 flex items-center gap-2 text-sm'>
				<ShieldCheck className='size-4' />
				<span>Complete your profile to get better job matches.</span>
			</div>

			<ProgressDots currentIndex={activeStepIndex} total={totalSteps} />

			<div className='card bg-base-100 shadow-xl'>
				<div className='card-body'>
					{stepKey === 'role' && <RoleStep role={role} setRole={(r: Role) => setRoleLocal(r)} />}

					{role === 'FREELANCER' && stepKey === 'cat-spec' && (
						<CatSpecStep
							categoryOptions={categoryOptions?.data}
							specialtyOptions={specialtyOptions?.data?.filter(
								s => categoryIds.length === 0 || categoryIds.includes(s.categoryId)
							)}
							categoryIds={categoryIds}
							specialtyIds={specialtyIds}
							setCategoryIds={ids => {
								setCategoryIds(ids)
								setSpecialtyIds(prev =>
									prev.filter(sp => specialtyOptions?.data?.find(s => s.id === sp && ids.includes(s.categoryId)))
								)
							}}
							setSpecialtyIds={setSpecialtyIds}
							searchControls={{ qCat, setQCat, qSpec, setQSpec }}
						/>
					)}

					{role === 'FREELANCER' && stepKey === 'skills' && (
						<SkillsStep
							options={skillOptions.data.map(skill => ({ id: skill.id, name: skill.name }))}
							picked={skillIds}
							setPicked={setSkillIds}
							q={qSkill}
							setQ={setQSkill}
						/>
					)}

					{role === 'FREELANCER' && stepKey === 'title' && (
						<TitleStep title={titleLocal} setTitle={(title: string) => setTitleLocal(title)} />
					)}

					{role === 'FREELANCER' && stepKey === 'education' && (
						<EducationStep
							onDone={() => setActiveStepIndex(i => i + 1)}
							addMut={createFreelancerEduMutation}
							delMut={deleteFreelancerEduMutation}
						/>
					)}

					{role === 'FREELANCER' && stepKey === 'languages' && (
						<LanguagesStep onChange={(languages: z.infer<typeof LanguagesSchema>) => setLocalLanguages(languages)} />
					)}

					{role === 'FREELANCER' && stepKey === 'overview' && (
						<OverviewStep overview={overviewLocal} setOverview={(o: string) => setLocalOverview(o)} />
					)}

					{role === 'FREELANCER' && stepKey === 'location' && (
						<LocationStep
							onDone={() => {
								/* finish */
							}}
							mutate={setLocation}
						/>
					)}

					<div className='flex items-center gap-3 mt-6'>{loading && <Loader2 className='size-5 animate-spin' />}</div>

					<FooterNav
						canPrev={canPrev}
						canNext={canNext && !loading}
						onPrev={goPrev}
						onNext={goNext}
						nextLabel={stepKey === 'skills' ? 'Next, your title' : undefined}
					/>
				</div>
			</div>
		</div>
	)
}

// --------------------------
// Step: Role
// --------------------------
function RoleStep({ role, setRole }: { role: 'CLIENT' | 'FREELANCER' | undefined; setRole: (_r: Role) => void }) {
	return (
		<div>
			<StepHeader
				title='Welcome! First, choose your role'
				subtitle='You can hire as a client or work as a freelancer.'
			/>
			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<button
					type='button'
					onClick={() => setRole('CLIENT' as Role)}
					className={`card border hover:shadow-lg transition ${
						role === 'CLIENT' ? 'border-primary' : 'border-base-300'
					}`}>
					<div className='card-body'>
						<div className='flex items-center gap-3 mb-1'>
							<Users className='size-5' />
							<h3 className='font-semibold'>Client</h3>
						</div>
						<p className='text-sm text-base-content/70'>
							Post jobs and hire freelancers. You can complete your profile later.
						</p>
					</div>
				</button>
				<button
					type='button'
					onClick={() => setRole('FREELANCER' as Role)}
					className={`card border hover:shadow-lg transition ${
						role === 'FREELANCER' ? 'border-primary' : 'border-base-300'
					}`}>
					<div className='card-body'>
						<div className='flex items-center gap-3 mb-1'>
							<User className='size-5' />
							<h3 className='font-semibold'>Freelancer</h3>
						</div>
						<p className='text-sm text-base-content/70'>Create a profile to win work. We'll guide you step by step.</p>
					</div>
				</button>
			</div>
		</div>
	)
}

// --------------------------
// Step: Category + Specialty
// --------------------------
function CatSpecStep({
	categoryOptions,
	specialtyOptions,
	categoryIds,
	specialtyIds,
	setCategoryIds,
	setSpecialtyIds,
	searchControls
}: {
	categoryOptions: { id: string; name: string }[]
	specialtyOptions: { id: string; name: string; categoryId: string }[]
	categoryIds: string[]
	specialtyIds: string[]
	setCategoryIds: (_ids: string[]) => void
	setSpecialtyIds: (_ids: string[]) => void
	searchControls: { qCat: string; setQCat: (_s: string) => void; qSpec: string; setQSpec: (_s: string) => void }
}) {
	const { qCat, setQCat, qSpec, setQSpec } = searchControls
	return (
		<div>
			<StepHeader
				title='Great, what kind of work are you here to do?'
				subtitle={`Select up to ${LIMITS.maxCategories} categories, then pick specialties (up to ${LIMITS.maxSpecialties}).`}
			/>

			<div className='grid md:grid-cols-2 gap-8'>
				<div>
					<div className='flex items-center gap-2 mb-2'>
						<span className='font-medium'>Select categories</span>
					</div>
					<label className='input input-bordered flex items-center gap-2 mb-3'>
						<Search className='size-4 opacity-70' />
						<input
							value={qCat}
							onChange={e => setQCat(e.target.value)}
							className='grow'
							placeholder='Search categories'
						/>
					</label>
					<OptionGrid
						items={categoryOptions}
						value={categoryIds}
						setValue={setCategoryIds}
						max={LIMITS.maxCategories}
						twoCols
					/>
				</div>
				<div>
					<div className='flex items-center gap-2 mb-2'>
						<span className='font-medium'>Now, select specialties</span>
					</div>
					<label className='input input-bordered flex items-center gap-2 mb-3'>
						<Search className='size-4 opacity-70' />
						<input
							value={qSpec}
							onChange={e => setQSpec(e.target.value)}
							className='grow'
							placeholder='Search specialties'
						/>
					</label>
					<OptionGrid
						items={specialtyOptions}
						value={specialtyIds}
						setValue={setSpecialtyIds}
						max={LIMITS.maxSpecialties}
						twoCols
					/>
				</div>
			</div>

			<div className='mt-4 text-xs text-base-content/70'>You can change these choices later.</div>
		</div>
	)
}

// --------------------------
// Step: Skills
// --------------------------
function SkillsStep({
	options,
	picked,
	setPicked,
	q,
	setQ
}: {
	options: { id: string; name: string }[]
	picked: string[]
	setPicked: (_ids: string[]) => void
	q: string
	setQ: (_s: string) => void
}) {
	const filtered = useMemo(() => options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())), [q, options])
	return (
		<div>
			<StepHeader
				title='Nearly there! What work are you here to do?'
				subtitle={`Add up to ${LIMITS.maxSkills} skills. These improve job recommendations.`}
			/>

			<label className='input input-bordered flex items-center gap-2 mb-4'>
				<Search className='size-4 opacity-70' />
				<input value={q} onChange={e => setQ(e.target.value)} className='grow' placeholder='Enter skills here' />
				<span className='text-xs text-base-content/70'>
					{picked.length}/{LIMITS.maxSkills}
				</span>
			</label>

			<div className='flex flex-wrap gap-2 mb-4'>
				{picked.map(id => {
					const it = options.find(o => o.id === id)
					if (!it) return null
					return (
						<span key={id} className='badge badge-primary gap-1'>
							{it.name}
							<button className='ml-1' onClick={() => setPicked(picked.filter(x => x !== id))}>
								✕
							</button>
						</span>
					)
				})}
			</div>

			<div className='grid sm:grid-cols-2 md:grid-cols-3 gap-2'>
				{filtered.map(it => (
					<button
						key={it.id}
						type='button'
						className={`btn btn-sm ${picked.includes(it.id) ? 'btn-primary' : 'btn-outline'}`}
						onClick={() => {
							if (picked.includes(it.id)) setPicked(picked.filter(x => x !== it.id))
							else if (picked.length < LIMITS.maxSkills) setPicked([...picked, it.id])
						}}>
						{it.name}
					</button>
				))}
			</div>
		</div>
	)
}

// --------------------------
// Step: Title
// --------------------------
function TitleStep({ title, setTitle }: { title: string; setTitle: (_title: string) => void }) {
	return (
		<form>
			<StepHeader title='Got it. Now, add a title to tell the world what you do.' />
			<input
				className='input input-bordered w-full'
				placeholder='e.g., Website & mobile development'
				value={title}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
			/>
		</form>
	)
}

// --------------------------
// Step: Education (minimal CRUD inline)
// --------------------------
function EducationStep({
	addMut,
	delMut
}: {
	onDone: () => void
	addMut: { mutateAsync: (_v: z.infer<typeof EducationItemSchema>) => Promise<unknown> }
	delMut: { mutateAsync: (_id: string) => Promise<unknown> }
}) {
	const user = useSelector(selectCurrentUser)
	const [isAdd, setIsAdd] = useState(false)
	const { listQuery } = useFreelancerEducation(user?.id)
	const form = useForm<z.infer<typeof EducationItemSchema>>({
		resolver: zodResolver(EducationItemSchema),
		defaultValues: { schoolName: '', degreeTitle: '', startYear: 2021, endYear: 2025, fieldOfStudy: '' }
	})

	const addItem = form.handleSubmit(async v => {
		addMut
			.mutateAsync({
				...v
			})
			.then(() => setIsAdd(true))
			.finally(() => setIsAdd(false))
	})
	return (
		<div>
			<StepHeader title='Clients like to know what you know – add your education here.' />
			<div className='grid md:grid-cols-2 gap-4'>
				<div className='space-y-3'>
					<input
						className='input input-bordered w-full'
						placeholder='School / University'
						{...form.register('schoolName')}
					/>
					<input
						className='input input-bordered w-full'
						placeholder='Degree (e.g., Engineer)'
						{...form.register('degreeTitle')}
					/>
					<input
						className='input input-bordered w-full'
						placeholder='Degree (e.g., Engineer)'
						{...form.register('fieldOfStudy')}
					/>
					<div className='grid grid-cols-2 gap-3'>
						<input
							className='input input-bordered'
							placeholder='Start'
							type='number'
							value={form.watch('startYear')}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								form.setValue('startYear', Number.parseInt(e.target.value))
							}
						/>
						<input
							className='input input-bordered'
							placeholder='End'
							type='number'
							value={form.watch('endYear')}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								form.setValue('endYear', Number.parseInt(e.target.value))
							}
						/>
					</div>
					<button className='btn btn-outline' onClick={addItem} type='button' disabled={isAdd}>
						{isAdd ? <span className='loading loading-spinner loading-md'></span> : 'Add'}
					</button>
				</div>
				<div className='space-y-3'>
					{listQuery.data?.map((it: FreelancerEducation, idx: number) => (
						<div key={idx} className='card border border-base-300'>
							<div className='card-body py-3'>
								<div className='font-medium'>{it.schoolName}</div>
								<div className='text-sm text-base-content/70'>
									{it.degreeTitle} {it.fieldOfStudy} {it.startYear}-{it.endYear}
								</div>
								<div className='mt-2'>
									<button
										className='btn btn-sm btn-error'
										onClick={async () => {
											await delMut.mutateAsync(it.id!)
										}}>
										Delete
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

// --------------------------
// Step: Languages
// --------------------------

function LanguagesStep({ onChange }: { onChange: (_language: z.infer<typeof LanguagesSchema>) => void }) {
	const user = useSelector(selectCurrentUser)
	const { listQ } = useProfileLanguages(user?.id)
	const form = useForm<z.infer<typeof LanguagesSchema>>({
		resolver: zodResolver(LanguagesSchema),
		defaultValues: { languages: listQ.data ?? [] }
	})

	const add = () => {
		form.setValue('languages', [...form.getValues('languages'), { languageCode: 'vi', proficiency: 'BASIC' as const }])
		onChange({ languages: [...form.getValues('languages'), { languageCode: 'vi', proficiency: 'BASIC' as const }] })
	}

	return (
		<div>
			<StepHeader title='Looking good. Next, tell us which languages you speak.' />
			<div className='space-y-3'>
				{form.watch('languages').map((_row, i) => (
					<div key={i} className='grid grid-cols-2 gap-3'>
						<Controller
							control={form.control}
							name={`languages.${i}.languageCode` as const}
							render={({ field }) => (
								<select className='select select-bordered' {...field}>
									{LANGUAGE_OPTIONS.map(l => (
										<option key={l.value} value={l.value}>
											{l.name}
										</option>
									))}
								</select>
							)}
						/>
						<Controller
							control={form.control}
							name={`languages.${i}.languageCode` as const}
							render={({ field }) => (
								<select className='select select-bordered' {...field}>
									<option value='BASIC'>Basic</option>
									<option value='CONVERSATIONAL'>Conversational</option>
									<option value='FLUENT'>Fluent</option>
									<option value='NATIVE'>Native</option>
								</select>
							)}
						/>
					</div>
				))}
			</div>
			<div className='mt-3 flex gap-2'>
				<button className='btn btn-outline' type='button' onClick={add}>
					Add a language
				</button>
			</div>
		</div>
	)
}

// --------------------------
// Step: Overview
// --------------------------
function OverviewStep({ overview, setOverview }: { overview: string; setOverview: (_o: string) => void }) {
	return (
		<form>
			<StepHeader title='Great. Now write a bio to tell the world about yourself.' />
			<textarea
				className='textarea textarea-bordered w-full min-h-40'
				placeholder='Enter your top skills, experiences, and interests (min 100 chars)'
				value={overview}
				onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOverview(e.target.value)}
			/>
		</form>
	)
}

// --------------------------
// Step: Location & Photo
// --------------------------
function LocationStep({ onDone }: { onDone: () => void; mutate: ReturnType<typeof useMutations>['setLocation'] }) {
	const data = useSelector(selectCurrentUser)
	const { register, handleSubmit, watch, setValue } = useForm<z.infer<typeof LocationSchema>>({
		resolver: zodResolver(LocationSchema),
		defaultValues: {
			country: data?.country ?? '',
			city: data?.city ?? '',
			address: data?.address ?? '',
			phoneNumber: data?.phoneNumber ?? ''
		}
	})
	const dispatch: AppDispatch = useDispatch()
	const [countryVal, setCountryVal] = useState<CountryOption | null>(
		data?.country
			? countryList()
					.getData()
					.find(v => v.label === data.country!)!
			: null
	)
	const onSubmit = handleSubmit(async v => {
		dispatch(
			updateProfileReduxAPI({
				...v,
				country: countryVal?.label
			})
		)

		onDone()
	})
	return (
		<form onSubmit={onSubmit}>
			<StepHeader title='A few last details, then you can check and publish your profile.' />
			<div className='grid md:grid-cols-2 gap-4'>
				<CountrySelect value={countryVal} onChange={value => setCountryVal(value)} />
				<input className='input input-bordered w-full' placeholder='City' {...register('city')} />
				<input className='input input-bordered w-full' placeholder='Dsitrict' {...register('dsitrict')} />
				<input className='input input-bordered w-full' placeholder='Street address' {...register('address')} />
				<PhoneField value={watch('phoneNumber')} onChange={(v: string) => setValue('phoneNumber', v)} />
			</div>
			<div className='mt-6 flex gap-2'>
				<button className='btn btn-primary' type='submit'>
					Review your profile
				</button>
			</div>
		</form>
	)
}
