import { type Stripe, type StripeElement } from '@stripe/stripe-js'
import BillingForm, { type Form as CardForm } from './PaymentMethodForm'
import { routes } from '~/config/routes'
import { usePaymentMethods } from '~/hooks/api/usePaymentMethod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPaymentDetail } from '~/apis/payment-method.api'

const EditPaymentMethod = () => {
	const navigate = useNavigate()
	const { id } = useParams<{ id: string }>()
	const { updatePaymentMethod } = usePaymentMethods()
	const { data, isLoading } = useQuery({
		queryKey: ['payment-method', id],
		enabled: !!id,
		queryFn: () => getPaymentDetail(id!)
	})
	async function onSave(form: Partial<CardForm>, stripe: Stripe | null, elements: StripeElement | null) {
		if (!stripe || !elements) return
		await updatePaymentMethod({
			cardId: id ?? '',
			data: {
				firstName: form.firstName,
				lastName: form.lastName,
				billingCountry: form.country,
				billingCity: form.city,
				billingLine1: form.line1,
				billingLine2: form.line2,
				billingPostal: form.postal
			}
		})
		navigate(routes.me.setting.payment.list, {})
		// bạn có thể điều hướng về trang “Billing & payments” sau khi thêm thành công
	}
	return (
		<div className='max-w-5xl'>
			<h2 className='text-3xl font-semibold mb-1'>Billing & payments</h2>
			<p className='text-sm opacity-70 mb-6'>Add a billing method</p>

			<div className='card bg-base-100 shadow-xl'>
				<div className='card-body'>
					{isLoading ? <div className='skeleton h-[35vh] w-full'></div> : <BillingForm onSave={onSave} data={data} />}
				</div>
			</div>
		</div>
	)
}

export default EditPaymentMethod
