import type { DisputePayment } from '~/types/dispute'

const SUCCESS_STATUSES = new Set([
        'SUCCEEDED',
        'SUCCESS',
        'COMPLETED',
        'COMPLETE',
        'PAID',
        'SETTLED'
])

const PAYER_ID_KEYS = [
        'payerId',
        'payer_id',
        'userId',
        'user_id',
        'accountId',
        'account_id',
        'profileId',
        'profile_id',
        'customerId',
        'customer_id'
]

const REFERENCE_KEYS = [
        'reference',
        'referenceId',
        'reference_id',
        'referenceCode',
        'reference_code',
        'receipt',
        'receiptNumber',
        'receipt_number',
        'transactionReference',
        'transaction_reference'
]

const IDENTITY_KEYS = [
        'identityPaymentKey',
        'identity_payment_key',
        'identityKey',
        'identity_key',
        'idempotencyKey',
        'idempotency_key'
]

const toRecord = (value: unknown): Record<string, unknown> | null => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null
        }
        return value as Record<string, unknown>
}

const pickString = (value: unknown): string | undefined => {
        if (typeof value === 'string') {
                const trimmed = value.trim()
                return trimmed.length ? trimmed : undefined
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
                return String(value)
        }

        return undefined
}

export const isDisputePaymentStatusSuccessful = (status?: string | null): boolean => {
        if (!status) {
                return false
        }
        const normalized = status.trim().toUpperCase()
        return SUCCESS_STATUSES.has(normalized)
}

export const isDisputePaymentSuccessful = (payment?: DisputePayment | null): boolean =>
        Boolean(payment && isDisputePaymentStatusSuccessful(payment.status))

export const getDisputePaymentPayerId = (payment?: DisputePayment | null): string | undefined => {
        if (!payment) {
                return undefined
        }

        const direct = pickString(payment.payerId)
        if (direct) {
                return direct
        }

        const paymentRecord = toRecord(payment)

        for (const key of PAYER_ID_KEYS) {
                const value = pickString(paymentRecord?.[key])
                if (value) {
                        return value
                }
        }

        const payerRecord = toRecord(payment.payer)
        if (payerRecord) {
                for (const key of ['id', ...PAYER_ID_KEYS]) {
                        const value = pickString(payerRecord[key])
                        if (value) {
                                return value
                        }
                }
        }

        const metadataRecord = toRecord(payment.metadata)
        if (metadataRecord) {
                for (const key of PAYER_ID_KEYS) {
                        const value = pickString(metadataRecord[key])
                        if (value) {
                                return value
                        }
                }
        }

        return undefined
}

const pickFromKeys = (record: Record<string, unknown> | null, keys: string[]): string | undefined => {
        if (!record) {
                return undefined
        }

        for (const key of keys) {
                const value = pickString(record[key])
                if (value) {
                        return value
                }
        }

        return undefined
}

export const getDisputePaymentReference = (payment?: DisputePayment | null): string | undefined => {
        if (!payment) {
                return undefined
        }

        const paymentRecord = toRecord(payment)
        const direct = pickFromKeys(paymentRecord, REFERENCE_KEYS)
        if (direct) {
                return direct
        }

        const metadataRecord = toRecord(payment.metadata)
        return pickFromKeys(metadataRecord, REFERENCE_KEYS)
}

export const getDisputePaymentIdentityKey = (payment?: DisputePayment | null): string | undefined => {
        if (!payment) {
                return undefined
        }

        const paymentRecord = toRecord(payment)
        const direct = pickFromKeys(paymentRecord, IDENTITY_KEYS)
        if (direct) {
                return direct
        }

        const metadataRecord = toRecord(payment.metadata)
        return pickFromKeys(metadataRecord, IDENTITY_KEYS)
}

export const humanizeDisputePaymentStatus = (status?: string | null): string => {
        if (!status) {
                return 'Không rõ'
        }

        const trimmed = status.trim()
        if (!trimmed) {
                return 'Không rõ'
        }

        return trimmed
                .toLowerCase()
                .split(/[_\s-]+/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ')
}
