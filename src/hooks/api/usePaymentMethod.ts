import { CardElement, CardNumberElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'react-toastify'
import {
	addPaymentMethod,
	getAllPaymentMethod,
	removePaymentMethod,
	setPaymentMethodDefault,
	setUpBillingIntent,
	updatePaymentMethod
} from '~/apis/payment-method.api'
import type { PaymentMethod } from '~/types/payment-method'

export function usePaymentMethods() {
	const qc = useQueryClient()
	const stripe = useStripe()
	const elements = useElements()

	/** ===== List ===== */
	const listQuery = useQuery({
		queryKey: ['payment-methods'],
		queryFn: () => getAllPaymentMethod()
	})

	const primary = useMemo(() => listQuery.data?.find((i: PaymentMethod) => i.isDefault) ?? null, [listQuery.data])

	/** ===== Add card (SetupIntent + CardElement + attach + save DB) ===== */
	const addPaymentMethodMutation = useMutation({
		mutationFn: async ({ makeDefault, input }: { makeDefault: boolean; input: Partial<PaymentMethod> }) => {
			if (!stripe || !elements) throw new Error('Stripe not ready')
			// 1) create setup intent
			const si = await setUpBillingIntent()
			const clientSecret: string | undefined = si.clientSecret
			if (!clientSecret) throw new Error('Missing client secret')

			// 2) confirm with CardElement + billing_details
			const numberEl = elements.getElement(CardNumberElement) // lấy phần tử số thẻ
			// (fallback nếu bạn vẫn dùng modal cũ):
			const legacyEl = elements.getElement(CardElement)

			const cardEl = numberEl ?? legacyEl
			if (!cardEl) throw new Error('Card number element not found')

			const { billingCity, billingCountry, billingLine1, billingLine2, billingPostal, firstName, lastName } = input
			const res = await stripe.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardEl,
					billing_details: {
						name: `${firstName} ${lastName}`.trim(),
						address: {
							country: billingCountry,
							city: billingCity,
							line1: billingLine1,
							line2: billingLine2 || undefined,
							postal_code: billingPostal || undefined
						}
					}
				}
			})
			if (res.error) throw new Error(res.error.message ?? 'Failed to confirm card setup')

			const paymentMethodId = res.setupIntent?.payment_method
			if (!paymentMethodId || typeof paymentMethodId !== 'string') {
				throw new Error('Missing payment method id')
			}

			// 3) attach + persist
			await addPaymentMethod({
				paymentMethodId,
				makeDefault
			})
			return { paymentMethodId }
		},
		onSuccess: () => {
			toast.success('Create successfully!')
			qc.invalidateQueries({ queryKey: ['payment-methods'] })
		}
	})

	const updatePaymentMethodMutation = useMutation({
		mutationFn: async ({ cardId, data }: { cardId: string; data: Partial<PaymentMethod> }) => {
			return await updatePaymentMethod(cardId, data)
		},
		onSuccess: (_updated, { cardId }) => {
			toast.success('Update successfully!')
			qc.invalidateQueries({ queryKey: ['payment-methods'] })
			qc.invalidateQueries({ queryKey: ['payment-method', cardId] })
		}
	})

	/** ===== Set default ===== */
	const setDefaultMutation = useMutation({
		mutationFn: async (id: string) => setPaymentMethodDefault(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] })
	})

	/** ===== Remove ===== */
	const removeMutation = useMutation({
		mutationFn: async (id: string) => removePaymentMethod(id),
		onSuccess: () => {
			toast.success('remove payment method successfully!')
			qc.invalidateQueries({ queryKey: ['payment-methods'] })
		}
	})

	return {
		// data
		methods: listQuery.data ?? [],
		primary,
		isLoading: listQuery.isLoading,
		isFetching: listQuery.isFetching,
		error: listQuery.error as unknown as Error | null,
		refetch: listQuery.refetch,

		// actions
		addPaymentMethod: addPaymentMethodMutation.mutateAsync,
		adding: addPaymentMethodMutation.isPending,
		addError: addPaymentMethodMutation.error as unknown as Error | null,

		updatePaymentMethod: updatePaymentMethodMutation.mutateAsync,
		updatingPaymentMethod: updatePaymentMethodMutation.isPending,
		updatePaymentMethodError: updatePaymentMethodMutation.error,

		setDefault: setDefaultMutation.mutateAsync,
		settingDefault: setDefaultMutation.isPending,

		remove: removeMutation.mutateAsync,
		removing: removeMutation.isPending
	}
}
