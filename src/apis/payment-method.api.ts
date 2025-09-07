import type { PaymentMethod } from '~/types/payment-method'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const baseUrl = 'payment-method'

export const getAllPaymentMethod = async () => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}`)
	return response.data
}

export const addPaymentMethod = async (input: { paymentMethodId: string; makeDefault: boolean }) => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/`, input)
	return response.data
}

export const getPaymentDetail = async (pmId: string) => {
	const response = await authorizeAxiosInstance.get(`${baseUrl}/${pmId}`)
	return response.data
}

export const updatePaymentMethod = async (cardId: string, data: Partial<PaymentMethod>) => {
	const response = await authorizeAxiosInstance.put(`${baseUrl}/${cardId}`, data)
	return response.data
}

export const setUpBillingIntent = async () => {
	const response = await authorizeAxiosInstance.post(`${baseUrl}/setup-intent`)
	return response.data
}

export const setPaymentMethodDefault = async (paymentMethodId: string) => {
	const response = await authorizeAxiosInstance.put(`${baseUrl}/${paymentMethodId}/default`)
	return response.data
}

export const removePaymentMethod = async (paymentMethodId: string) => {
	const response = await authorizeAxiosInstance.delete(`${baseUrl}/${paymentMethodId}`)
	return response.data
}
