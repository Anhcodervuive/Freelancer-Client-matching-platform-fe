import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Outlet } from 'react-router-dom'
import env from '~/config/environment'
import SettingLayout from '~/layouts/SettingLayout'

const PaymentMethodWrapper = () => {
	const stripePromise = loadStripe(env.STRIPE.PUBLIC_KEY!)
	return (
		<div>
			<SettingLayout>
				<Elements stripe={stripePromise}>
					<Outlet />
				</Elements>
			</SettingLayout>
		</div>
	)
}

export default PaymentMethodWrapper
