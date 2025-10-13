import { loadStripe, type Stripe } from '@stripe/stripe-js'

import env from '~/config/environment'

let stripePromise: Promise<Stripe | null> | null = null

const ensureStripePromise = () => {
        if (!stripePromise) {
                if (!env.STRIPE.PUBLIC_KEY) {
                        stripePromise = Promise.resolve(null)
                        return
                }

                stripePromise = loadStripe(env.STRIPE.PUBLIC_KEY)
        }
}

export const getStripe = async (): Promise<Stripe> => {
        ensureStripePromise()
        const stripe = await stripePromise

        if (!stripe) {
                throw new Error('Không thể khởi tạo Stripe. Vui lòng thử lại sau.')
        }

        return stripe
}

export const getStripePromise = () => {
        ensureStripePromise()
        return stripePromise
}

