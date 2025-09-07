// src/pages/settings/BillingForm.tsx
import { useEffect, useMemo, useState } from 'react'
import { CardNumberElement, CardExpiryElement, CardCvcElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { usePaymentMethods } from '~/hooks/api/usePaymentMethod'
import { CreditCard, Lock } from 'lucide-react'
import CountrySelect, { type CountryOption } from '~/components/form/CountryAutocomplete'
import type { Stripe } from '@stripe/stripe-js'
import type { PaymentMethod } from '~/types/payment-method'
import countryList from 'react-select-country-list'

export type Form = {
	firstName: string
	lastName: string
	country: string
	city: string
	line1: string
	line2?: string
	postal?: string
	last4?: string
	brand?: string | null
	makeDefault: boolean
}

type Props = {
	data?: Partial<PaymentMethod>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSave: (_var: Form, _stripe: Stripe | null, _element: any) => void
}

export default function BillingForm({ data, onSave }: Props) {
	const stripe = useStripe()
	const elements = useElements()

	const { adding, addError, updatingPaymentMethod, updatePaymentMethodError } = usePaymentMethods()
	const loading = adding || updatingPaymentMethod
	// upwork-like radio (card/paypal). paypal disabled
	const [method, setMethod] = useState<'card' | 'paypal'>('card')

	// brand detect (visa/mastercard/amex/…)
	const [brand, setBrand] = useState<string | null>(null)
	const brandBadge = useMemo(() => {
		switch ((brand || '').toLowerCase()) {
			case 'visa':
				return <span className='text-blue-600 font-bold text-xs'>VISA</span>
			case 'mastercard':
				return (
					<div className='flex items-center gap-1'>
						<div className='w-3 h-3 rounded-full bg-red-600 opacity-90' />
						<div className='w-3 h-3 rounded-full bg-yellow-500 opacity-90 -ml-2' />
					</div>
				)
			case 'amex':
				return <span className='text-cyan-600 font-bold text-xs'>AMEX</span>
			case 'discover':
				return <span className='text-orange-600 font-semibold text-xs'>DISC</span>
			default:
				return <CreditCard className='w-4 h-4 text-gray-400' />
		}
	}, [brand])

	const [form, setForm] = useState<Form>({
		firstName: data?.firstName ?? '',
		lastName: data?.lastName ?? '',
		country: data?.billingCountry ?? '',
		brand: data?.brand ?? '',
		city: data?.billingCity ?? '',
		line1: data?.billingLine1 ?? '',
		line2: data?.billingLine2 ?? '',
		postal: data?.billingPostal ?? '',
		makeDefault: true
	})

	// mount Elements only when page visible (avoid focus bugs)
	const [mount, setMount] = useState(false)
	const [countryVal, setCountryVal] = useState<CountryOption | null>(
		data?.billingCountry
			? countryList()
					.getData()
					.find(v => v.value === data?.billingCountry)!
			: null
	)
	useEffect(() => {
		const id = requestAnimationFrame(() => setMount(true))
		return () => cancelAnimationFrame(id)
	}, [])

	const elStyle = { base: { fontSize: '16px' } } as const
	const elBox = 'border rounded-lg px-3 py-3 bg-base-100 focus-within:ring focus-within:ring-primary/20'

	return (
		<div className='space-y-6'>
			{/* method selector row */}
			<div className='flex items-start md:items-center justify-between flex-col md:flex-row gap-3'>
				<div className='space-y-3'>
					<label className='flex items-center gap-3 cursor-pointer'>
						<input type='radio' className='radio' checked={method === 'card'} onChange={() => setMethod('card')} />
						<span>
							<span className='font-medium'>Payment card</span>{' '}
							<span className='opacity-60'>Visa, Mastercard, American Express, Discover, Diners</span>
						</span>
					</label>
					<label className='flex items-center gap-3 cursor-not-allowed opacity-60'>
						<input type='radio' className='radio' disabled />
						<span>PayPal (coming soon)</span>
					</label>
				</div>

				<button className='btn' onClick={() => history.back()}>
					Cancel
				</button>
			</div>

			<hr className='my' />

			{method === 'card' && (
				<div className='grid grid-cols-1 gap-6'>
					{/* Card number w/ brand */}
					{!data ? (
						<>
							<div>
								<div className='mb-1 font-medium'>Card number</div>
								<div className={`flex items-center justify-between ${elBox}`}>
									<div className='flex-1'>
										{mount && (
											<CardNumberElement
												options={{ style: elStyle /*, disableLink: true as any*/ }}
												onChange={e => setBrand(e.brand)}
											/>
										)}
									</div>
									<div className='ml-3'>{brandBadge}</div>
								</div>
							</div>

							{/* Expiry / CVC */}
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<div className='mb-1 font-medium'>Expiration date</div>
									<div className={elBox}>{mount && <CardExpiryElement options={{ style: elStyle }} />}</div>
								</div>
								<div>
									<div className='mb-1 font-medium'>Security code</div>
									<div className={elBox}>{mount && <CardCvcElement options={{ style: elStyle }} />}</div>
								</div>
							</div>
						</>
					) : (
						<div>
							<h4>Card infomation</h4>
							<p className='font-light'>
								{data.brand ?? 'Card'} ending in {data.last4}
							</p>
						</div>
					)}

					{/* Name */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<label className='form-control'>
							<span className='label-text mb-1'>First name</span>
							<input
								className='input input-bordered w-full'
								value={form.firstName}
								onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
							/>
						</label>
						<label className='form-control'>
							<span className='label-text mb-1'>Last name</span>
							<input
								className='input input-bordered w-full'
								value={form.lastName}
								onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
							/>
						</label>
					</div>

					{/* Billing address */}
					<div>
						<h4 className='font-medium mb-2'>Billing address</h4>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<label className='form-coltrol'>
								<span className='label-text mb-1'>Country</span>
								<CountrySelect value={countryVal} onChange={value => setCountryVal(value)} className='mb-4' />
							</label>
							<label className='form-control'>
								<span className='label-text mb-1'>City</span>
								<input
									className='input input-bordered w-full'
									value={form.city}
									onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
								/>
							</label>
						</div>

						<label className='form-control mt-4'>
							<span className='label-text mb-1'>Address line 1</span>
							<input
								className='input input-bordered w-full'
								value={form.line1}
								onChange={e => setForm(f => ({ ...f, line1: e.target.value }))}
							/>
						</label>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-4'>
							<label className='form-control'>
								<span className='label-text mb-1'>Address line 2 (optional)</span>
								<input
									className='input input-bordered w-full'
									value={form.line2}
									onChange={e => setForm(f => ({ ...f, line2: e.target.value }))}
								/>
							</label>
							<label className='form-control'>
								<span className='label-text mb-1'>Postal code (optional)</span>
								<input
									className='input input-bordered w-full'
									value={form.postal}
									onChange={e => setForm(f => ({ ...f, postal: e.target.value }))}
								/>
							</label>
						</div>

						<label className='label cursor-pointer justify-start gap-3 mt-4'>
							<input
								type='checkbox'
								className='checkbox'
								checked={form.makeDefault}
								onChange={e => setForm(f => ({ ...f, makeDefault: e.target.checked }))}
							/>
							<span className='label-text'>Set as default payment method</span>
						</label>
					</div>

					{/* Secure note + actions */}
					<div className='flex items-center justify-between flex-col md:flex-row gap-3 pt-2'>
						<div className='flex items-center gap-2 opacity-70'>
							<Lock className='w-4 h-4' />
							<span>Securely stored</span>
						</div>
						<div className='flex gap-3'>
							<button className='btn' onClick={() => history.back()}>
								Cancel
							</button>
							<button
								className='btn btn-primary'
								disabled={loading}
								onClick={() => {
									onSave({ ...form, country: countryVal?.value || '', brand: brand }, stripe, elements)
								}}>
								{loading ? <span className='loading loading-spinner' /> : 'Save'}
							</button>
						</div>
					</div>

					{addError && (
						<div className='alert alert-error mt-2'>
							<span>{addError.message}</span>
						</div>
					)}
					{updatePaymentMethodError && (
						<div className='alert alert-error mt-2'>
							<span>{updatePaymentMethodError.message}</span>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
