import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { z } from 'zod'
import { LANGUAGE_OPTIONS } from '~/constants/language'
import { useProfileLanguages } from '~/hooks/api/useFreelancerLanguages'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { WizardStepHeader } from './WizardLayout'

const languagesSchema = z.object({
  languages: z
    .array(
      z.object({
        languageCode: z.string(),
        proficiency: z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']),
      }),
    )
    .min(1),
})

export type LanguagesFormValues = z.infer<typeof languagesSchema>

export function LanguagesStep({ onChange }: { onChange: (_value: LanguagesFormValues) => void }) {
  const user = useSelector(selectCurrentUser)
  const { listQ } = useProfileLanguages(user?.id)

  const form = useForm<LanguagesFormValues>({
    resolver: zodResolver(languagesSchema),
    defaultValues: { languages: listQ.data?.length ? listQ.data : [{ languageCode: 'vi', proficiency: 'BASIC' }] },
  })

  const { fields, append, remove } = useFieldArray({ name: 'languages', control: form.control })

  const currentValues = form.watch('languages')

  useEffect(() => {
    if (!currentValues) return
    onChange({ languages: currentValues })
  }, [currentValues, onChange])

  return (
    <div>
      <WizardStepHeader
        title='Bạn sử dụng được những ngôn ngữ nào?'
        subtitle='Chọn ngôn ngữ và mức độ thành thạo để khách hàng dễ dàng trao đổi với bạn.'
      />

      <div className='space-y-3'>
        {fields.map((field, index) => (
          <div key={field.id} className='rounded-2xl border border-base-200 p-4'>
            <div className='grid gap-4 sm:grid-cols-[1fr_1fr_auto]'>
              <Controller
                control={form.control}
                name={`languages.${index}.languageCode` as const}
                render={({ field }) => (
                  <select className='select select-bordered' {...field}>
                    {LANGUAGE_OPTIONS.map(language => (
                      <option key={language.value} value={language.value}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              <Controller
                control={form.control}
                name={`languages.${index}.proficiency` as const}
                render={({ field }) => (
                  <select className='select select-bordered' {...field}>
                    <option value='BASIC'>Cơ bản</option>
                    <option value='CONVERSATIONAL'>Giao tiếp</option>
                    <option value='FLUENT'>Thông thạo</option>
                    <option value='NATIVE'>Bản ngữ</option>
                  </select>
                )}
              />
              <button
                type='button'
                className='btn btn-ghost text-error'
                onClick={() => (fields.length > 1 ? remove(index) : undefined)}
              >
                <Trash2 className='size-4' />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type='button'
        className='btn btn-outline mt-4 gap-2'
        onClick={() =>
          append({
            languageCode: 'vi',
            proficiency: 'BASIC',
          })
        }
      >
        <Plus className='size-4' /> Thêm ngôn ngữ
      </button>
    </div>
  )
}
