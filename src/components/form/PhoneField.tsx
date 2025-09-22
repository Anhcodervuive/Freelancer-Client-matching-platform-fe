import { useState } from 'react'
import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css' // có thể override bằng Tailwind

export default function PhoneField({
	value,
	onChange,
	disabled
}: {
	value?: string
	onChange?: (_v: string) => void
	disabled?: boolean
}) {
	const [phone, setPhone] = useState(value ?? '')

        return (
                <div className='form-control'>
                        <label className='label pb-1'>
                                <span className='label-text text-sm font-medium text-slate-600'>Phone number</span>
                        </label>

                        <PhoneInput
                                defaultCountry='vn'
                                value={phone}
                                onChange={v => {
                                        setPhone(v)
                                        onChange?.(v)
                                }}
                                disabled={disabled}
                                // tinh chỉnh class để giống DaisyUI input
                                inputClassName='input input-bordered input-sm md:input-md w-full !h-10 md:!h-11 rounded-xl border-white/60 bg-white/70 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                countrySelectorStyleProps={{
                                        className: 'ri-country',
                                        buttonContentWrapperClassName: 'gap-2',
                                        buttonStyle: { height: '40px', padding: '8px 10px' },
                                        dropdownStyleProps: {
                                                className: 'bg-base-100 rounded-xl border border-base-300 shadow-md border-r-0'
                                        },
                                        flagClassName: 'rounded-[3px]',
                                        dropdownArrowStyle: { color: 'currentColor' }
                                }}
                        />
                        <span className='mt-1 text-xs text-slate-400'>Lưu ở dạng E.164 (ví dụ: +84901234567) để backend dễ xử lý.</span>
                </div>
        )
}
