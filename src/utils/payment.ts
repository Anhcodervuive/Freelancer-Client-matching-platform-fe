import { isAxiosError } from 'axios'

const PAYMENT_RESPONSE_KEYS = [
        'status',
        'paymentStatus',
        'payment_status',
        'requiresAction',
        'requires_action',
        'clientSecret',
        'client_secret',
        'idempotencyKey',
        'idemKey',
        'idempotency_key',
        'paymentIntentId',
        'payment_intent_id',
        'payment_intent'
] as const

type PaymentResponseRecord = Record<string, unknown>

const toRecord = (value: unknown): PaymentResponseRecord | null => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null
        }

        return value as PaymentResponseRecord
}

const pickStringFromRecord = (record: PaymentResponseRecord | null, keys: readonly string[]) => {
        if (!record) {
                return undefined
        }

        for (const key of keys) {
                const value = record[key]
                if (typeof value === 'string' && value.trim()) {
                        return value.trim()
                }
        }

        return undefined
}

const findPaymentResponse = (
        payload: unknown,
        visited = new Set<PaymentResponseRecord>()
): PaymentResponseRecord | null => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                return null
        }

        const record = payload as PaymentResponseRecord

        if (visited.has(record)) {
                return null
        }

        visited.add(record)

        if (PAYMENT_RESPONSE_KEYS.some(key => key in record)) {
                return record
        }

        for (const value of Object.values(record)) {
                const nested = findPaymentResponse(value, visited)
                if (nested) {
                        return nested
                }
        }

        return null
}

export type PaymentMeta = {
        status?: string
        clientSecret?: string
        idempotencyKey?: string
        paymentIntentId?: string
        requiresAction: boolean
}

export const extractPaymentMeta = (payload?: unknown | null): PaymentMeta => {
        const fallback: PaymentMeta = {
                status: undefined,
                clientSecret: undefined,
                idempotencyKey: undefined,
                paymentIntentId: undefined,
                requiresAction: false
        }

        if (!payload || typeof payload !== 'object') {
                return fallback
        }

        const container = findPaymentResponse(payload) ?? (payload as PaymentResponseRecord)
        const status = pickStringFromRecord(container, ['status', 'paymentStatus', 'payment_status'])
        const clientSecret = pickStringFromRecord(container, ['clientSecret', 'client_secret'])
        const idempotencyKey = pickStringFromRecord(container, ['idempotencyKey', 'idemKey', 'idempotency_key'])
        const paymentIntentId = pickStringFromRecord(container, [
                'paymentIntentId',
                'payment_intent_id',
                'payment_intent'
        ])
        const requiresAction =
                container.requiresAction === true ||
                container['requires_action'] === true ||
                (typeof status === 'string' && status.toUpperCase() === 'REQUIRES_ACTION')

        return {
                status,
                clientSecret,
                idempotencyKey,
                paymentIntentId,
                requiresAction
        }
}

const extractMessageFromAxiosError = (error: unknown): string | undefined => {
        if (!isAxiosError(error)) {
                return undefined
        }

        const data = error.response?.data

        if (typeof data === 'string') {
                const trimmed = data.trim()
                return trimmed || undefined
        }

        const record = toRecord(data)

        if (record) {
                const candidates = ['message', 'error', 'detail', 'title'] as const

                for (const key of candidates) {
                        const value = record[key]

                        if (typeof value === 'string' && value.trim()) {
                                return value.trim()
                        }
                }
        }

        return error.message
}

export const extractPaymentErrorMessage = (error: unknown): string | undefined => {
        const messageFromAxios = extractMessageFromAxiosError(error)
        if (messageFromAxios) {
                return messageFromAxios
        }

        if (error instanceof Error) {
                return error.message
        }

        if (typeof error === 'string') {
                const trimmed = error.trim()
                return trimmed || undefined
        }

        return undefined
}
