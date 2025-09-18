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
  updateFreelancerProfileAPI,
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
    q,
  ],
} as const

function useListCategories(keyword: string) {
  return useQuery({
    queryKey: queryKeys.categories(keyword),
    queryFn: () => getAllCategories({ page: 1, limit: 15, search: keyword }),
  })
}

function useListSpecialties(categoryIds: string[], keyword: string) {
  return useQuery({
    queryKey: queryKeys.specialties(categoryIds, keyword),
    queryFn: () => getSpecialties({ page: 1, limit: 15, categoryId: categoryIds, search: keyword }),
    enabled: categoryIds.length > 0,
  })
}

function useListSkills(categoryIds: string[], specialtyIds: string[], keyword: string) {
  return useQuery({
    queryKey: queryKeys.skills(categoryIds, specialtyIds, keyword),
    queryFn: () =>
      searchSkills({ search: keyword, categoryIds: categoryIds.join(','), specialtyIds: specialtyIds.join(',') }),
    enabled: categoryIds.length > 0,
    staleTime: 60_000,
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
    },
  })

  const setCategorySpecialtyMutation = useMutation({
    mutationFn: async (payload: { categoryIds: string[]; specialtyIds: string[] }) =>
      setFreelancerCategoryAndSpecialty(payload),
  })

  const setSkillsMutation = useMutation({
    mutationFn: async (payload: { skillIds: string[] }) => setFreelancerSkills(payload),
  })

  const setTitleMutation = useMutation({
    mutationFn: async (title: string) => updateFreelancerProfileAPI({ title }, userId),
  })

  const setOverviewMutation = useMutation({
    mutationFn: async (overview: string) => updateFreelancerProfileAPI({ bio: overview }, userId),
  })

  const updateLocation = async (values: LocationFormValues) => {
    await dispatch(
      updateProfileReduxAPI({
        country: values.country,
        city: values.city,
        district: values.district,
        address: values.address,
        phoneNumber: values.phoneNumber,
      }),
    )
  }

  return {
    setRoleMutation,
    setCategorySpecialtyMutation,
    setSkillsMutation,
    setTitleMutation,
    setOverviewMutation,
    updateLocation,
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
    updateLocation,
  } = useWizardMutations(user?.id)
  const { addOne: addProfileLanguage } = useProfileLanguages(user?.id)
  const { createMutation: createEducationMutation, deleteMutation: deleteEducationMutation } = useFreelancerEducation(user?.id)

  const { data: categoryResponse } = useListCategories(categoryKeyword)
  const { data: specialtyResponse } = useListSpecialties(categoryIds, specialtyKeyword)
  const { data: skillsResponse } = useListSkills(categoryIds, specialtyIds, skillKeyword)

  const categories = (categoryResponse?.data ?? []) as CategoryOption[]
  const specialties = (specialtyResponse?.data ?? []) as SpecialtyOption[]
  const skills = (skillsResponse?.data ?? []).map(item => ({ id: item.id, name: item.name })) as SkillOption[]

  const canGoBack = stepIndex > 0

  const canProceed = useMemo(() => {
    if (!currentStep) return false
    if (currentStep === 'role') return Boolean(role)
    if (currentStep === 'cat-spec') return categoryIds.length > 0
    if (currentStep === 'skills') return skillIds.length > 0
    if (currentStep === 'languages') return (languages?.languages?.length ?? 0) > 0
    return true
  }, [currentStep, role, categoryIds, skillIds, languages])

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
          (language, index, array) =>
            array.findIndex(item => item.languageCode === language.languageCode) === index,
        )
        await Promise.all(
          uniqueLanguages.map(language =>
            addProfileLanguage.mutateAsync({ languageCode: language.languageCode, proficiency: language.proficiency }),
          ),
        )
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
  ])

  return (
    <div className='mx-auto max-w-4xl space-y-6 p-6'>
      <div className='flex items-center gap-2 rounded-2xl bg-base-200/60 px-4 py-3 text-sm text-base-content/80'>
        <ShieldCheck className='size-4 shrink-0 text-primary' />
        <span>Hoàn thiện hồ sơ để nhận được nhiều cơ hội việc làm phù hợp hơn.</span>
      </div>

      <WizardProgress currentIndex={stepIndex} total={totalSteps} />

      <div className='card bg-base-100 shadow-xl'>
        <div className='card-body'>
          {currentStep === 'role' ? (
            <RoleStep
              value={role}
              onChange={(nextRole: Role) => {
                if (nextRole === Role.client || nextRole === Role.freelancer) {
                  setRole(nextRole)
                }
              }}
            />
          ) : null}

          {role === Role.freelancer && currentStep === 'cat-spec' ? (
            <CategorySpecialtyStep
              categories={categories}
              specialties={specialties}
              categoryIds={categoryIds}
              specialtyIds={specialtyIds}
              onCategoryChange={ids => {
                setCategoryIds(ids)
                setSpecialtyIds(previous =>
                  previous.filter(id => specialties.find(item => item.id === id && ids.includes(item.categoryId))),
                )
              }}
              onSpecialtyChange={setSpecialtyIds}
              searchKeyword={{
                category: categoryKeyword,
                onCategoryChange: setCategoryKeyword,
                specialty: specialtyKeyword,
                onSpecialtyChange: setSpecialtyKeyword,
              }}
            />
          ) : null}

          {role === Role.freelancer && currentStep === 'skills' ? (
            <SkillsStep
              options={skills}
              picked={skillIds}
              onChange={setSkillIds}
              keyword={skillKeyword}
              onKeywordChange={setSkillKeyword}
            />
          ) : null}

          {role === Role.freelancer && currentStep === 'title' ? <TitleStep value={title} onChange={setTitle} /> : null}

          {role === Role.freelancer && currentStep === 'education' ? (
            <EducationStep onCreate={createEducationMutation} onDelete={deleteEducationMutation} />
          ) : null}

          {role === Role.freelancer && currentStep === 'languages' ? <LanguagesStep onChange={setLanguages} /> : null}

          {role === Role.freelancer && currentStep === 'overview' ? <OverviewStep value={overview} onChange={setOverview} /> : null}

          {role === Role.freelancer && currentStep === 'location' ? (
            <LocationStep
              onSubmit={async values => {
                await updateLocation(values)
              }}
              registerSubmit={handleLocationRegister}
            />
          ) : null}

          {isSubmitting ? (
            <div className='mt-4 flex items-center gap-2 text-sm text-primary'>
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
        </div>
      </div>
    </div>
  )
}
