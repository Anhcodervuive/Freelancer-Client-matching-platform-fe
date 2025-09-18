import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { z } from 'zod'
import type { FreelancerEducation } from '~/types/profile'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { useFreelancerEducation } from '~/hooks/api/useFreelancerEducation'
import { WizardStepHeader } from './WizardLayout'

const educationSchema = z.object({
  id: z.string().optional(),
  schoolName: z.string().min(2, 'Tên trường tối thiểu 2 ký tự'),
  degreeTitle: z.string().min(2, 'Vui lòng nhập học vị'),
  fieldOfStudy: z.string().min(1, 'Vui lòng nhập chuyên ngành'),
  startYear: z.number(),
  endYear: z.number(),
})

export type EducationFormValues = z.infer<typeof educationSchema>

interface EducationStepProps {
  onCreate: { mutateAsync: (_value: EducationFormValues) => Promise<unknown> }
  onDelete: { mutateAsync: (_id: string) => Promise<unknown> }
}

export function EducationStep({ onCreate, onDelete }: EducationStepProps) {
  const user = useSelector(selectCurrentUser)
  const { listQuery } = useFreelancerEducation(user?.id)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      schoolName: '',
      degreeTitle: '',
      fieldOfStudy: '',
      startYear: new Date().getFullYear() - 4,
      endYear: new Date().getFullYear(),
    },
  })

  const handleAdd = handleSubmit(async values => {
    setIsSubmitting(true)
    try {
      await onCreate.mutateAsync(values)
      reset()
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div>
      <WizardStepHeader
        title='Học vấn của bạn'
        subtitle='Khách hàng sẽ tin tưởng hơn khi thấy quá trình học tập và chứng chỉ của bạn.'
      />
      <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <div className='space-y-4 rounded-2xl border border-base-200 p-5'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='sm:col-span-2'>
              <label className='text-sm font-medium'>Trường / Viện đào tạo</label>
              <input className='input input-bordered mt-1 w-full' {...register('schoolName')} />
              {errors.schoolName ? (
                <p className='mt-1 text-xs text-error'>{errors.schoolName.message}</p>
              ) : null}
            </div>
            <div>
              <label className='text-sm font-medium'>Học vị</label>
              <input className='input input-bordered mt-1 w-full' {...register('degreeTitle')} />
              {errors.degreeTitle ? (
                <p className='mt-1 text-xs text-error'>{errors.degreeTitle.message}</p>
              ) : null}
            </div>
            <div>
              <label className='text-sm font-medium'>Chuyên ngành</label>
              <input className='input input-bordered mt-1 w-full' {...register('fieldOfStudy')} />
              {errors.fieldOfStudy ? (
                <p className='mt-1 text-xs text-error'>{errors.fieldOfStudy.message}</p>
              ) : null}
            </div>
            <div>
              <label className='text-sm font-medium'>Năm bắt đầu</label>
              <input
                type='number'
                className='input input-bordered mt-1 w-full'
                value={watch('startYear')}
                onChange={event => setValue('startYear', Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>
            <div>
              <label className='text-sm font-medium'>Năm kết thúc</label>
              <input
                type='number'
                className='input input-bordered mt-1 w-full'
                value={watch('endYear')}
                onChange={event => setValue('endYear', Number.parseInt(event.target.value, 10) || 0)}
              />
            </div>
          </div>
          <button type='button' className='btn btn-primary w-full sm:w-auto' onClick={handleAdd} disabled={isSubmitting}>
            {isSubmitting ? <span className='loading loading-spinner loading-sm' /> : 'Thêm học vấn'}
          </button>
        </div>

        <div className='space-y-3'>
          {listQuery.data?.length ? (
            listQuery.data.map((item: FreelancerEducation) => (
              <article key={item.id} className='rounded-2xl border border-base-200 p-4 shadow-sm'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='font-semibold'>{item.schoolName}</h3>
                    <p className='text-sm text-base-content/70'>
                      {item.degreeTitle} • {item.fieldOfStudy}
                    </p>
                    <p className='mt-1 text-xs text-base-content/50'>
                      {item.startYear} - {item.endYear}
                    </p>
                  </div>
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm text-error'
                    onClick={async () => {
                      if (!item.id) return
                      await onDelete.mutateAsync(item.id)
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/70'>
              Bạn chưa thêm thông tin học vấn nào.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
