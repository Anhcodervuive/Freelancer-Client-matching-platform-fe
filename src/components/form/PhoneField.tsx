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
				<span className='label-text'>Phone number</span>
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
				inputClassName='input w-full !h-12'
				countrySelectorStyleProps={{
					className: 'ri-country',
					buttonContentWrapperClassName: 'gap-2',
					buttonStyle: { height: '48px', padding: '10px' },
					dropdownStyleProps: {
						className: 'bg-base-100 rounded-xl border border-base-300 shadow-md border-r-0'
					},
					flagClassName: 'rounded-[3px]',
					dropdownArrowStyle: { color: 'currentColor' }
				}}
			/>
			<span className='text-xs text-base-content/70 mt-1'>
				Lưu ở dạng E.164 (ví dụ: +84901234567) để backend dễ xử lý.
			</span>
		</div>
	)
}
