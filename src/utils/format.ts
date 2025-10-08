const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatFileSize(value?: number | null, fractionDigits = 1): string | undefined {
        if (value === undefined || value === null || Number.isNaN(value)) return undefined
        if (value === 0) return '0 B'
        const absolute = Math.abs(value)
        const exponent = Math.max(
                0,
                Math.min(
                        Math.floor(Math.log10(absolute) / Math.log10(1024)),
                        FILE_SIZE_UNITS.length - 1
                )
        )
        const size = absolute / 1024 ** exponent
        return `${size.toFixed(exponent === 0 ? 0 : fractionDigits)} ${FILE_SIZE_UNITS[exponent]}`
}

export function extractFileExtension(name?: string | null): string | undefined {
        if (!name) return undefined
        const sanitized = name.trim()
        if (!sanitized) return undefined
        const withoutQuery = sanitized.split(/[?#]/)[0] ?? ''
        const lastDot = withoutQuery.lastIndexOf('.')
        if (lastDot === -1 || lastDot === withoutQuery.length - 1) return undefined
        const extension = withoutQuery.slice(lastDot + 1).trim()
        if (!extension) return undefined
        return extension.toUpperCase()
}

export function formatFileType({
        mimeType,
        extension
}: {
        mimeType?: string | null
        extension?: string | null
}): string | undefined {
        const ext = extension ? extension.toUpperCase() : undefined
        if (ext) return ext
        if (!mimeType) return undefined
        const [type, subtype] = mimeType.split('/')
        if (!subtype) return mimeType.toUpperCase()
        const normalizedSubtype = subtype.toLowerCase()
        if (normalizedSubtype.includes('wordprocessingml') || normalizedSubtype.includes('msword')) {
                return 'DOCX'
        }
        if (normalizedSubtype.includes('spreadsheetml') || normalizedSubtype.includes('excel')) {
                return 'XLSX'
        }
        if (normalizedSubtype.includes('powerpoint')) {
                return 'PPTX'
        }
        if (normalizedSubtype.includes('pdf')) {
                return 'PDF'
        }
        if (normalizedSubtype.includes('zip')) {
                return 'ZIP'
        }
        if (normalizedSubtype.includes('json')) {
                return 'JSON'
        }
        if (normalizedSubtype.includes('xml')) {
                return 'XML'
        }
        if (normalizedSubtype.includes('plain')) {
                return type.toUpperCase()
        }
        return normalizedSubtype.toUpperCase()
}

export function formatDateTime(
        value?: string | number | Date | null,
        options?: Intl.DateTimeFormatOptions
): string | undefined {
        if (value === undefined || value === null) return undefined
        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toLocaleString(undefined, options ?? { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatCurrency(
        amount?: number | null,
        currency?: string | null,
        options?: Intl.NumberFormatOptions
): string | undefined {
        if (amount === undefined || amount === null || Number.isNaN(amount)) return undefined
        const normalizedCurrency = currency?.toUpperCase() || 'USD'
        try {
                return new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: normalizedCurrency,
                        maximumFractionDigits: 2,
                        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
                        ...options
                }).format(amount)
        } catch (error) {
                console.warn('Unable to format currency', { amount, currency, error })
                return `${amount.toLocaleString()} ${normalizedCurrency}`
        }
}
