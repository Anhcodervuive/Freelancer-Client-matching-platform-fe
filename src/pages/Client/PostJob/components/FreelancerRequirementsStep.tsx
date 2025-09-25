import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Filter, Sparkles } from 'lucide-react'
import { getAllCategories } from '~/apis/admin/category.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import type { Category } from '~/types/Category'
import type { Specialty } from '~/types/specialty'
import type { SkillLite } from '~/types/skill'
import type { ListResponse } from '~/types/api.response'
import { JOB_EXPERIENCE_LEVELS } from '~/constants/job'
import type { JobPostFormValues } from '../schema'
import { SkillSelector } from './SkillSelector'
import { LanguageRequirements } from './LanguageRequirements'
import { ScreeningQuestions } from './ScreeningQuestions'
import { LocationPreferences } from './LocationPreferences'

type FreelancerRequirementsStepProps = { hidden?: boolean }

const queryKeys = {
	categories: (search: string) => ['job-post', 'categories', search],
	specialties: (categoryId: string, search: string) => ['job-post', 'specialties', categoryId, search],
	skills: (categoryId: string, specialtyId: string) => ['job-post', 'skills', categoryId, specialtyId]
} as const

export function FreelancerRequirementsStep({ hidden }: FreelancerRequirementsStepProps) {
	const {
		register,
		watch,
		setValue,
		formState: { errors }
	} = useFormContext<JobPostFormValues>()
	const categoryId = watch('categoryId')
	const specialtyId = watch('specialtyId')
	const requiredSkills = watch('skills.required') ?? []
	const preferredSkills = watch('skills.preferred') ?? []
	const [categorySearch, setCategorySearch] = useState('')
	const [specialtySearch, setSpecialtySearch] = useState('')

	const { data: categoryResponse } = useQuery({
		queryKey: queryKeys.categories(categorySearch),
		queryFn: () => getAllCategories({ page: 1, limit: 30, search: categorySearch })
	})

	const categories = useMemo(
		() => (categoryResponse as ListResponse<Category> | undefined)?.data ?? [],
		[categoryResponse]
	)

	const { data: specialtyResponse } = useQuery({
		queryKey: queryKeys.specialties(categoryId, specialtySearch),
		enabled: Boolean(categoryId),
		queryFn: () =>
			getSpecialties({
				page: 1,
				limit: 30,
				search: specialtySearch,
				categoryId
			})
	})

	const specialties = useMemo(
		() => (specialtyResponse as ListResponse<Specialty> | undefined)?.data ?? [],
		[specialtyResponse]
	)

	const { data: skillsResponse } = useQuery({
		queryKey: queryKeys.skills(categoryId, specialtyId),
		enabled: Boolean(categoryId) && Boolean(specialtyId),
		queryFn: () =>
			searchSkills({
				search: '',
				page: 1,
				limit: 10,
				categoryIds: categoryId,
				specialtyIds: specialtyId
			})
	})

	const skillOptions = useMemo(
		() =>
			((skillsResponse as ListResponse<SkillLite> | undefined)?.data ?? []).map(skill => ({
				id: skill.id,
				name: skill.name
			})),
		[skillsResponse]
	)

	const selectCategory = (id: string) => {
		setValue('categoryId', id, { shouldDirty: true, shouldValidate: true })
		setValue('specialtyId', '', { shouldDirty: true })
		setValue('skills', { required: [], preferred: [] }, { shouldDirty: true })
	}

	const selectSpecialty = (id: string) => {
		setValue('specialtyId', id, { shouldDirty: true, shouldValidate: true })
		setValue('skills', { required: [], preferred: [] }, { shouldDirty: true })
	}

	const updateSkills = (type: 'required' | 'preferred', ids: string[]) => {
		setValue(`skills.${type}`, ids, { shouldDirty: true })
	}

	return (
		<section className={`rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm ${hidden ? 'hidden' : ''}`}>
			<div className='mb-6 flex flex-col gap-2'>
				<span className='text-xs font-semibold uppercase tracking-wide text-primary'>Step 2</span>
				<h2 className='text-2xl font-semibold text-base-content'>Define the ideal freelancer</h2>
				<p className='text-base-content/70 text-sm'>
					Narrow down the talent pool by sharing industry, skills, and experience expectations.
				</p>
			</div>

			<div className='space-y-8'>
				<div className='grid gap-6 lg:grid-cols-2'>
					<div>
						<div className='mb-3 flex items-center justify-between gap-2'>
							<div>
								<label className='block text-sm font-medium text-base-content'>Job category</label>
								<p className='text-xs text-base-content/60'>Choose the primary discipline for this project.</p>
							</div>
							<div className='flex items-center gap-2 text-xs text-base-content/60'>
								<Filter className='size-4' />
								{categories.length} results
							</div>
						</div>
						<input
							value={categorySearch}
							onChange={event => setCategorySearch(event.target.value)}
							placeholder='Search categories'
							className='input input-bordered mb-3 w-full'
						/>
						<div className='max-h-60 space-y-2 overflow-y-auto pr-1'>
							{categories.map(category => {
								const active = category.id === categoryId
								return (
									<button
										key={category.id}
										type='button'
										onClick={() => selectCategory(category.id)}
										className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
											active ? 'border-primary bg-primary/10 text-primary' : 'border-base-200 hover:border-primary/40'
										}`}>
										<span className='font-medium'>{category.name}</span>
										{active ? <Sparkles className='size-4 text-primary' /> : null}
									</button>
								)
							})}
							{categories.length === 0 ? (
								<p className='rounded-xl border border-dashed border-base-300 p-4 text-center text-sm text-base-content/60'>
									No categories found. Try a different keyword.
								</p>
							) : null}
						</div>
						{errors.categoryId ? <p className='mt-2 text-xs text-error'>{errors.categoryId.message}</p> : null}
					</div>
					<div>
						<div className='mb-3 flex items-center justify-between gap-2'>
							<div>
								<label className='block text-sm font-medium text-base-content'>Specialty</label>
								<p className='text-xs text-base-content/60'>Drill down into the specific niche or service.</p>
							</div>
							<div className='flex items-center gap-2 text-xs text-base-content/60'>
								<Briefcase className='size-4' />
								{specialties.length} results
							</div>
						</div>
						<input
							value={specialtySearch}
							onChange={event => setSpecialtySearch(event.target.value)}
							placeholder='Search specialties'
							className='input input-bordered mb-3 w-full'
							disabled={!categoryId}
						/>
						<div className='max-h-60 space-y-2 overflow-y-auto pr-1'>
							{specialties.map(specialty => {
								const active = specialty.id === specialtyId
								return (
									<button
										key={specialty.id}
										type='button'
										onClick={() => selectSpecialty(specialty.id)}
										className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
											active ? 'border-primary bg-primary/10 text-primary' : 'border-base-200 hover:border-primary/40'
										}`}>
										<span className='font-medium'>{specialty.name}</span>
										{active ? <Sparkles className='size-4 text-primary' /> : null}
									</button>
								)
							})}
							{categoryId && specialties.length === 0 ? (
								<p className='rounded-xl border border-dashed border-base-300 p-4 text-center text-sm text-base-content/60'>
									No specialties found for this category yet.
								</p>
							) : null}
							{!categoryId ? (
								<p className='rounded-xl border border-dashed border-base-300 p-4 text-center text-sm text-base-content/60'>
									Select a category first to see specialties.
								</p>
							) : null}
						</div>
						{errors.specialtyId ? <p className='mt-2 text-xs text-error'>{errors.specialtyId.message}</p> : null}
					</div>
				</div>

				<div className='grid gap-6 lg:grid-cols-2'>
					<SkillSelector
						title='Mandatory skills'
						description='These skills are required to work on your project.'
						placeholder='Search required skills'
						options={skillOptions}
						selected={requiredSkills}
						onChange={ids => updateSkills('required', ids)}
						disabled={!specialtyId}
					/>
					<SkillSelector
						title='Nice-to-have skills'
						description='Optional extras that will give applicants an advantage.'
						placeholder='Search preferred skills'
						options={skillOptions}
						selected={preferredSkills}
						onChange={ids => updateSkills('preferred', ids)}
						disabled={!specialtyId}
						tone='secondary'
					/>
				</div>

				<div>
					<label className='mb-3 block text-sm font-medium text-base-content'>Experience level</label>
					<div className='grid gap-3 md:grid-cols-3'>
						{JOB_EXPERIENCE_LEVELS.map(level => {
							const active = watch('experienceLevel') === level.value
							return (
								<label
									key={level.value}
									className={`cursor-pointer rounded-2xl border p-4 transition ${
										active ? 'border-primary bg-primary/10 text-primary' : 'border-base-200 hover:border-primary/40'
									}`}>
									<input
										type='radio'
										className='hidden'
										value={level.value}
										{...register('experienceLevel', { required: true })}
									/>
									<div className='text-sm font-semibold'>{level.label}</div>
									<p className='mt-2 text-xs text-base-content/70'>{level.description}</p>
								</label>
							)
						})}
					</div>
				</div>

				<div className='space-y-6'>
					<LanguageRequirements />
					<LocationPreferences />
					<ScreeningQuestions />
				</div>
			</div>
		</section>
	)
}
