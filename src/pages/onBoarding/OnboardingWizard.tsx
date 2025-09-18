import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAllCategories } from '~/apis/admin/category.api'
import { getSpecialties } from '~/apis/admin/specialty.api'
import { searchSkills } from '~/apis/admin/skkill.api'
import {
	setFreelancerCategoryAndSpecialty,
	setFreelancerSkills,
	updateFreelancerProfileAPI
} from '~/apis/freelancerProfile.api'
import { updateRole } from '~/apis/profile.api'
import { routes } from '~/config/routes'
import { useFreelancerEducation } from '~/hooks/api/useFreelancerEducation'
import { useProfileLanguages } from '~/hooks/api/useFreelancerLanguages'
import { selectCurrentUser, siginGoogle, updateProfileAPI as updateProfileReduxAPI } from '~/redux/user/userSlice'
import type { AppDispatch } from '~/redux/store'
import { Role } from '~/types'
import { CategorySpecialtyStep } from './components/CategorySpecialtyStep'
import { EducationStep } from './components/EducationStep'
import { LanguagesStep, type LanguagesFormValues } from './components/LanguagesStep'
import { LocationStep, type LocationFormValues } from './components/LocationStep'
import { OverviewStep } from './components/OverviewStep'
import { RoleStep } from './components/RoleStep'
import { SkillsStep } from './components/SkillsStep'
import { TitleStep } from './components/TitleStep'
import { WizardFooter, WizardProgress } from './components/WizardLayout'
import { WIZARD_STEPS, type WizardStep } from './constants'

type CategoryOption = { id: string; name: string }
type SpecialtyOption = { id: string; name: string; categoryId: string }
type SkillOption = { id: string; name: string }

const queryKeys = {
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
} as const

const STEP_LABELS: Record<WizardStep, string> = {
        role: 'Chọn vai trò',
        'cat-spec': 'Lĩnh vực & chuyên môn',
        skills: 'Kỹ năng',
        title: 'Tiêu đề nổi bật',
        education: 'Học vấn',
        languages: 'Ngôn ngữ',
        overview: 'Giới thiệu bản thân',
        location: 'Thông tin liên hệ'
}


function useListCategories(keyword: string) {
	return useQuery({
		queryKey: queryKeys.categories(keyword),
		queryFn: () => getAllCategories({ page: 1, limit: 15, search: keyword })
	})
}

function useListSpecialties(categoryIds: string[], keyword: string) {
	return useQuery({
		queryKey: queryKeys.specialties(categoryIds, keyword),
		queryFn: () => getSpecialties({ page: 1, limit: 15, categoryId: categoryIds, search: keyword }),
		enabled: categoryIds.length > 0
	})
}

function useListSkills(categoryIds: string[], specialtyIds: string[], keyword: string) {
	return useQuery({
		queryKey: queryKeys.skills(categoryIds, specialtyIds, keyword),
		queryFn: () =>
			searchSkills({ search: keyword, categoryIds: categoryIds.join(','), specialtyIds: specialtyIds.join(',') }),
		enabled: categoryIds.length > 0,
		staleTime: 60_000
	})
}

function useWizardMutations(userId?: string) {
	const queryClient = useQueryClient()
	const dispatch = useDispatch<AppDispatch>()

	const setRoleMutation = useMutation({
		mutationFn: async (role: Role) => {
			await updateRole(role)
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.me })
		}
	})

	const setCategorySpecialtyMutation = useMutation({
		mutationFn: async (payload: { categoryIds: string[]; specialtyIds: string[] }) =>
			setFreelancerCategoryAndSpecialty(payload)
	})

	const setSkillsMutation = useMutation({
		mutationFn: async (payload: { skillIds: string[] }) => setFreelancerSkills(payload)
	})

	const setTitleMutation = useMutation({
		mutationFn: async (title: string) => updateFreelancerProfileAPI({ title }, userId)
	})

	const setOverviewMutation = useMutation({
		mutationFn: async (overview: string) => updateFreelancerProfileAPI({ bio: overview }, userId)
	})

	const updateLocation = async (values: LocationFormValues) => {
		await dispatch(
			updateProfileReduxAPI({
				country: values.country,
				city: values.city,
				district: values.district,
				address: values.address,
				phoneNumber: values.phoneNumber
			})
		)
	}

	return {
		setRoleMutation,
		setCategorySpecialtyMutation,
		setSkillsMutation,
		setTitleMutation,
		setOverviewMutation,
		updateLocation
	}
}

export default function OnboardingWizard() {
	const navigate = useNavigate()
	const location = useLocation()
	const dispatch = useDispatch<AppDispatch>()
	const queryClient = useQueryClient()
	const user = useSelector(selectCurrentUser)

	useEffect(() => {
		if (!location.search) return
		const params = new URLSearchParams(location.search)
		const userParams = Object.fromEntries(params.entries())
		if (userParams.id) {
			dispatch(siginGoogle(userParams))
		}
	}, [dispatch, location.search])

	const [stepIndex, setStepIndex] = useState(0)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [role, setRole] = useState<Role | undefined>(undefined)
	const [categoryIds, setCategoryIds] = useState<string[]>([])
	const [specialtyIds, setSpecialtyIds] = useState<string[]>([])
	const [skillIds, setSkillIds] = useState<string[]>([])
	const [title, setTitle] = useState('')
        const [overview, setOverview] = useState('')
        const [languages, setLanguages] = useState<LanguagesFormValues | undefined>()
	const [categoryKeyword, setCategoryKeyword] = useState('')
	const [specialtyKeyword, setSpecialtyKeyword] = useState('')
	const [skillKeyword, setSkillKeyword] = useState('')

	const locationSubmitRef = useRef<(() => Promise<void>) | null>(null)

	const steps = useMemo(() => (role === Role.freelancer ? WIZARD_STEPS : (['role'] as WizardStep[])), [role])
	const currentStep = steps[stepIndex]
	const totalSteps = steps.length

	const {
		setRoleMutation,
		setCategorySpecialtyMutation,
		setSkillsMutation,
		setTitleMutation,
		setOverviewMutation,
		updateLocation
	} = useWizardMutations(user?.id)
	const {
		listQ: profileLanguagesQuery,
		addOne: addProfileLanguage,
		removeOne: removeProfileLanguage
	} = useProfileLanguages(user?.id)
	const profileLanguages = useMemo(() => profileLanguagesQuery.data ?? [], [profileLanguagesQuery.data])
	const { createMutation: createEducationMutation, deleteMutation: deleteEducationMutation } = useFreelancerEducation(
		user?.id
	)

        const { data: categoryResponse } = useListCategories(categoryKeyword)
        const { data: specialtyResponse } = useListSpecialties(categoryIds, specialtyKeyword)
        const { data: skillsResponse } = useListSkills(categoryIds, specialtyIds, skillKeyword)

        const categories = useMemo(
                () => (categoryResponse?.data ?? []) as CategoryOption[],
                [categoryResponse?.data]
        )
        const specialties = useMemo(
                () => (specialtyResponse?.data ?? []) as SpecialtyOption[],
                [specialtyResponse?.data]
        )
        const skills = useMemo(
                () =>
                        ((skillsResponse?.data ?? []).map(item => ({
                                id: item.id,
                                name: item.name
                        })) as SkillOption[]),
                [skillsResponse?.data]
        )

	const canGoBack = stepIndex > 0

	const canProceed = useMemo(() => {
		if (!currentStep) return false
		if (currentStep === 'role') return Boolean(role)
		if (currentStep === 'cat-spec') return categoryIds.length > 0
		if (currentStep === 'languages') return (languages?.languages?.length ?? 0) > 0
		return true
	}, [currentStep, role, categoryIds, languages])

	const goBack = useCallback(() => {
		setStepIndex(index => Math.max(0, index - 1))
	}, [])

	const goNextStep = useCallback(() => {
		setStepIndex(index => Math.min(index + 1, steps.length - 1))
	}, [steps.length])

	const handleLocationRegister = useCallback((handler: () => Promise<void>) => {
		locationSubmitRef.current = handler
	}, [])

	const completeOnboarding = useCallback(() => {
		navigate(routes.me.setting.contactInfo)
	}, [navigate])

	const handleNext = useCallback(async () => {
		if (!currentStep || isSubmitting) return

		if (currentStep === 'role') {
			if (!role) return
			setIsSubmitting(true)
			try {
				await setRoleMutation.mutateAsync(role)
				if (role === Role.client) {
					navigate(routes.comons.home)
					return
				}
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'cat-spec') {
			setIsSubmitting(true)
			try {
				await setCategorySpecialtyMutation.mutateAsync({ categoryIds, specialtyIds })
				await queryClient.invalidateQueries({ queryKey: queryKeys.skills(categoryIds, specialtyIds, skillKeyword) })
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'skills') {
			setIsSubmitting(true)
			try {
				await setSkillsMutation.mutateAsync({ skillIds })
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'title') {
			if (!title.trim()) {
				goNextStep()
				return
			}
			setIsSubmitting(true)
			try {
				await setTitleMutation.mutateAsync(title.trim())
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'languages') {
			if (!languages || languages.languages.length === 0) {
				goNextStep()
				return
			}
			setIsSubmitting(true)
			try {
				const uniqueLanguages = languages.languages.filter(
					(language, index, array) => array.findIndex(item => item.languageCode === language.languageCode) === index
				)
				const beforeMap = new Map(profileLanguages.map(language => [language.languageCode, language.proficiency]))
				const afterMap = new Map(uniqueLanguages.map(language => [language.languageCode, language.proficiency]))

				const ops: Promise<unknown>[] = []

				for (const [code, proficiency] of afterMap) {
					const old = beforeMap.get(code)
					if (!old || old !== proficiency) {
						ops.push(addProfileLanguage.mutateAsync({ languageCode: code, proficiency }))
					}
				}

				for (const [code] of beforeMap) {
					if (!afterMap.has(code)) {
						ops.push(removeProfileLanguage.mutateAsync(code))
					}
				}

				await Promise.all(ops)
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'overview') {
			if (!overview.trim()) {
				goNextStep()
				return
			}
			setIsSubmitting(true)
			try {
				await setOverviewMutation.mutateAsync(overview.trim())
				goNextStep()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		if (currentStep === 'location') {
			if (!locationSubmitRef.current) return
			setIsSubmitting(true)
			try {
				await locationSubmitRef.current()
				completeOnboarding()
			} finally {
				setIsSubmitting(false)
			}
			return
		}

		goNextStep()
	}, [
		currentStep,
		isSubmitting,
		role,
		setRoleMutation,
		navigate,
		setCategorySpecialtyMutation,
		categoryIds,
		specialtyIds,
		queryClient,
		skillKeyword,
		setSkillsMutation,
		skillIds,
		title,
		setTitleMutation,
		languages,
		addProfileLanguage,
		overview,
		setOverviewMutation,
		locationSubmitRef,
		completeOnboarding,
		goNextStep,
		profileLanguages,
		removeProfileLanguage
	])

        const stepContent = useMemo(() => {
                if (!currentStep) return null

                if (currentStep === 'role') {
                        return (
                                <RoleStep
                                        value={role}
                                        onChange={(nextRole: Role) => {
                                                if (nextRole === Role.client || nextRole === Role.freelancer) {
                                                        setRole(nextRole)
                                                }
                                        }}
                                />
                        )
                }

                if (role !== Role.freelancer) return null

                if (currentStep === 'cat-spec') {
                        return (
                                <CategorySpecialtyStep
                                        categories={categories}
                                        specialties={specialties}
                                        categoryIds={categoryIds}
                                        specialtyIds={specialtyIds}
                                        onCategoryChange={ids => {
                                                setCategoryIds(ids)
                                                setSpecialtyIds(previous =>
                                                        previous.filter(id =>
                                                                specialties.find(item => item.id === id && ids.includes(item.categoryId))
                                                        )
                                                )
                                        }}
                                        onSpecialtyChange={setSpecialtyIds}
                                        searchKeyword={{
                                                category: categoryKeyword,
                                                onCategoryChange: setCategoryKeyword,
                                                specialty: specialtyKeyword,
                                                onSpecialtyChange: setSpecialtyKeyword
                                        }}
                                />
                        )
                }

                if (currentStep === 'skills') {
                        return (
                                <SkillsStep
                                        options={skills}
                                        picked={skillIds}
                                        onChange={setSkillIds}
                                        keyword={skillKeyword}
                                        onKeywordChange={setSkillKeyword}
                                />
                        )
                }

                if (currentStep === 'title') {
                        return <TitleStep value={title} onChange={setTitle} />
                }

                if (currentStep === 'education') {
                        return <EducationStep onCreate={createEducationMutation} onDelete={deleteEducationMutation} />
                }

                if (currentStep === 'languages') {
                        return <LanguagesStep onChange={setLanguages} />
                }

                if (currentStep === 'overview') {
                        return <OverviewStep value={overview} onChange={setOverview} />
                }

                if (currentStep === 'location') {
                        return (
                                <LocationStep
                                        onSubmit={async values => {
                                                await updateLocation(values)
                                        }}
                                        registerSubmit={handleLocationRegister}
                                />
                        )
                }

                return null
        }, [
                currentStep,
                role,
                categories,
                specialties,
                categoryIds,
                specialtyIds,
                categoryKeyword,
                specialtyKeyword,
                skills,
                skillIds,
                skillKeyword,
                title,
                createEducationMutation,
                deleteEducationMutation,
                overview,
                updateLocation,
                handleLocationRegister
        ])

        return (

                <div className='min-h-screen bg-base-200 py-12'>
                        <div className='mx-auto flex max-w-6xl flex-col gap-12 px-6'>
                                <div className='space-y-3 text-center text-base-content lg:text-left'>
                                        <h1 className='text-4xl font-bold'>Hoàn thiện hồ sơ của bạn</h1>
                                        <p className='text-base-content/70'>Chỉ còn vài bước đơn giản để hồ sơ trở nên nổi bật trước nhà tuyển dụng.</p>
                                </div>

                                <div className='grid gap-10 lg:grid-cols-[320px,1fr] lg:items-start'>
                                        <aside className='space-y-8 rounded-3xl bg-base-100/80 p-8 shadow-lg backdrop-blur'>
                                                <div className='flex items-start gap-3 rounded-2xl bg-primary/10 p-4 text-left text-sm text-primary'>
                                                        <ShieldCheck className='mt-0.5 size-5 shrink-0' />
                                                        <span>Hoàn thiện hồ sơ để nhận được nhiều cơ hội việc làm phù hợp hơn.</span>
                                                </div>

                                                <WizardProgress currentIndex={stepIndex} total={totalSteps} />

                                                <ul className='space-y-3 text-left text-sm'>
                                                        {steps.map((step, index) => {
                                                                const isActive = step === currentStep
                                                                const isCompleted = index < stepIndex
                                                                const badgeClass = isActive
                                                                        ? 'bg-primary text-primary-content'
                                                                        : isCompleted
                                                                                ? 'bg-primary/20 text-primary'
                                                                                : 'bg-base-200 text-base-content/70'

                                                                return (
                                                                        <li
                                                                                key={step}
                                                                                className='flex items-center justify-between gap-3 rounded-2xl border border-base-200/60 bg-base-100/70 px-4 py-3 shadow-sm'
                                                                        >
                                                                                <div className='flex items-center gap-3'>
                                                                                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${badgeClass}`}>
                                                                                                {index + 1}
                                                                                        </span>
                                                                                        <span className='font-medium text-base-content'>{STEP_LABELS[step]}</span>
                                                                                </div>
                                                                                {isCompleted ? (
                                                                                        <span className='text-xs font-medium text-primary'>Đã xong</span>
                                                                                ) : null}
                                                                        </li>
                                                                )
                                                        })}
                                                </ul>
                                        </aside>

                                        <section className='flex min-h-[640px] flex-col gap-8 rounded-3xl bg-base-100 p-10 shadow-2xl'>
                                                <div key={currentStep} className='flex-1 space-y-8'>
                                                        {stepContent}
                                                </div>

                                                {isSubmitting ? (
                                                        <div className='flex items-center gap-2 text-sm text-primary'>
                                                                <Loader2 className='size-4 animate-spin' /> Đang lưu dữ liệu...
                                                        </div>
                                                ) : null}

                                                <WizardFooter
                                                        canPrev={canGoBack && !isSubmitting}
                                                        canNext={canProceed && !isSubmitting}
                                                        onPrev={goBack}
                                                        onNext={handleNext}
                                                        nextLabel={
                                                                currentStep === 'skills'
                                                                        ? 'Tiếp tục: Tiêu đề'
                                                                        : currentStep === 'location'
                                                                                ? 'Hoàn tất'
                                                                                : undefined
                                                        }
                                                />
                                        </section>
                                </div>
                        </div>
                </div>

        )
}
