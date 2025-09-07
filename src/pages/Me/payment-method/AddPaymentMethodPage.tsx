// src/pages/settings/AddBillingMethodPage.tsx

import { type Stripe, type StripeElement } from '@stripe/stripe-js'
import BillingForm, { type Form as CardForm } from './PaymentMethodForm'

import { useNavigate } from 'react-router-dom'
import { usePaymentMethods } from '~/hooks/api/usePaymentMethod'
import { routes } from '~/config/routes'

export default function AddBillingMethodPage() {
	const navigate = useNavigate()
	const { addPaymentMethod } = usePaymentMethods()

	async function onSave(form: Partial<CardForm>, stripe: Stripe | null, elements: StripeElement | null) {
		if (!stripe || !elements) return
		await addPaymentMethod({
			input: {
				firstName: form.firstName,
				lastName: form.lastName,
				billingCountry: form.country,
				billingCity: form.city,
				billingLine1: form.line1,
				billingLine2: form.line2 || '',
				billingPostal: form.postal || ''
			},
			makeDefault: form.makeDefault || false
		})
		navigate(routes.me.setting.payment.list)
		// bạn có thể điều hướng về trang “Billing & payments” sau khi thêm thành công
	}
	return (
		<div className='max-w-5xl'>
			<h2 className='text-3xl font-semibold mb-1'>Billing & payments</h2>
			<p className='text-sm opacity-70 mb-6'>Add a billing method</p>

			<div className='card bg-base-100 shadow-xl'>
				<div className='card-body'>
					<BillingForm onSave={onSave} />
				</div>
			</div>
		</div>
	)
}
