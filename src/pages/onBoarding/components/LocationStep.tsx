import { zodResolver } from '@hookform/resolvers/zod'
import countryList from 'react-select-country-list'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import type { CountryOption } from '~/components/form/CountryAutocomplete'
import CountrySelect from '~/components/form/CountryAutocomplete'
import PhoneField from '~/components/form/PhoneField'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { z } from 'zod'
import { WizardStepHeader } from './WizardLayout'

const locationSchema = z.object({
  country: z.string(),
  city: z.string().min(2),
  district: z.string().min(2),
  address: z.string().min(2),
  phoneNumber: z.string().min(3),
})

export type LocationFormValues = z.infer<typeof locationSchema>

interface LocationStepProps {
  onSubmit: (_values: LocationFormValues) => Promise<void>
  registerSubmit: (_handler: () => Promise<void>) => void
}

export function LocationStep({ onSubmit, registerSubmit }: LocationStepProps) {
  const profile = useSelector(selectCurrentUser)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      country: profile?.country ?? '',
      city: profile?.city ?? '',
      district: profile?.district ?? '',
      address: profile?.address ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
    },
  })

  const countries = useMemo(() => countryList().getData(), [])
  const [countryOption, setCountryOption] = useState<CountryOption | null>(() => {
    if (!profile?.country) return null
    return countries.find(item => item.label === profile.country) ?? null
  })

  const submit = useCallback(async () => {
    const handler = handleSubmit(async values => {
      await onSubmit({ ...values, country: countryOption?.label ?? values.country })
    })

    await handler()
  }, [handleSubmit, onSubmit, countryOption])

  useEffect(() => {
    registerSubmit(submit)
  }, [registerSubmit, submit])

  return (
    <div>
      <WizardStepHeader
        title='Thông tin liên hệ'
        subtitle='Hoàn thiện thông tin cuối cùng để chúng tôi đề xuất công việc phù hợp khu vực của bạn.'
      />
      <div className='grid gap-4 md:grid-cols-2'>
        <input type='hidden' {...register('country')} />
        <CountrySelect
          value={countryOption}
          onChange={option => {
            setCountryOption(option)
            setValue('country', option?.label ?? '')
          }}
        />
        {errors.country ? <p className='text-xs text-error md:col-span-2'>{errors.country.message}</p> : null}
        <div>
          <input className='input input-bordered w-full' placeholder='Thành phố' {...register('city')} />
          {errors.city ? <p className='mt-1 text-xs text-error'>{errors.city.message}</p> : null}
        </div>
        <div>
          <input className='input input-bordered w-full' placeholder='Quận / Huyện' {...register('district')} />
          {errors.district ? <p className='mt-1 text-xs text-error'>{errors.district.message}</p> : null}
        </div>
        <div className='md:col-span-2'>
          <input className='input input-bordered w-full' placeholder='Địa chỉ cụ thể' {...register('address')} />
          {errors.address ? <p className='mt-1 text-xs text-error'>{errors.address.message}</p> : null}
        </div>
        <div>
          <PhoneField value={watch('phoneNumber')} onChange={value => setValue('phoneNumber', value)} />
          {errors.phoneNumber ? <p className='mt-1 text-xs text-error'>{errors.phoneNumber.message}</p> : null}
        </div>
      </div>
      <p className='mt-4 text-xs text-base-content/70'>Nhấn “Hoàn tất” để lưu và xem lại hồ sơ của bạn.</p>
    </div>
  )
}
