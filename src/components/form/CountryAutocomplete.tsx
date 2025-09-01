/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import Select, { components, type StylesConfig } from 'react-select'
import countryList from 'react-select-country-list'
import ReactCountryFlag from 'react-country-flag'

export type CountryOption = { value: string; label: string }
export type CountrySelectProps = {
	value?: CountryOption | null
	onChange?: (_opt: CountryOption | null) => void
	placeholder?: string
	className?: string
	name?: string // hidden input (ISO code) for HTML forms
	isDisabled?: boolean
}

// --- Custom Option with flag -------------------------------------------------
const Option = (props: any) => {
	const { data } = props
	return (
		<components.Option {...props}>
			<div className='flex items-center gap-2'>
				<ReactCountryFlag
					svg
					countryCode={data.value}
					style={{ fontSize: '1.1rem', lineHeight: 1 }}
					aria-label={data.value}
				/>
				<span className='truncate'>{data.label}</span>
				<span className='opacity-60 ml-auto text-xs'>{data.value}</span>
			</div>
		</components.Option>
	)
}

// --- SingleValue with flag ---------------------------------------------------
const SingleValue = (props: any) => {
	const { data } = props
	return (
		<components.SingleValue {...props}>
			<div className='flex items-center gap-2'>
				<ReactCountryFlag svg countryCode={data.value} style={{ fontSize: '1.1rem' }} />
				<span>{data.label}</span>
			</div>
		</components.SingleValue>
	)
}

// --- React-Select styles (subtle, modern) -----------------------------------
const styles: StylesConfig<CountryOption, false> = {
	control: (base, state) => ({
		...base,
		minHeight: 44,
		borderRadius: 12,
		borderColor: state.isFocused ? 'oklch(82% 0.189 84.429)' : 'oklch(92% 0.004 286.32)',
		boxShadow: state.isFocused ? '0 0 0 2px oklch(82% 0.189 84.429 / 0.25)' : 'none',
		paddingLeft: 6,
		backgroundColor: 'oklch(98% 0 0)',
		':hover': { borderColor: 'oklch(82% 0.189 84.429)' }
	}),
	valueContainer: base => ({ ...base, padding: '0 12px' }),
	input: base => ({ ...base, margin: 0 }),
	placeholder: base => ({ ...base, color: 'oklch(21% 0.006 285.885 / 0.6)' }),
	option: (base, state) => ({
		...base,
		paddingTop: 8,
		paddingBottom: 8,
		backgroundColor: state.isFocused ? 'oklch(96% 0.001 286.375)' : 'transparent',
		color: 'oklch(21% 0.006 285.885)'
	}),
	menu: base => ({
		...base,
		borderRadius: 12,
		overflow: 'hidden',
		boxShadow: '0 8px 28px rgba(0,0,0,.08)'
	})
}

export default function CountrySelect({
	value,
	onChange,
	placeholder = 'Chọn quốc gia…',
	className = '',
	name,
	isDisabled
}: CountrySelectProps) {
	const options = useMemo(() => countryList().getData(), [])
	return (
		<div className={`form-control w-full ${className}`}>
			{name && <input type='hidden' name={name} value={value?.value ?? ''} readOnly />}
			<Select
				instanceId='country-select'
				isDisabled={isDisabled}
				options={options}
				value={value ?? null}
				onChange={opt => onChange?.(opt as CountryOption)}
				placeholder={placeholder}
				styles={styles}
				components={{ Option, SingleValue, IndicatorSeparator: () => null }}
				classNamePrefix='rs-country'
			/>
		</div>
	)
}
