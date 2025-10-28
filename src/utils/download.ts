export const extractFileNameFromContentDisposition = (header?: string | null): string | undefined => {
        if (!header) return undefined
        const normalized = header.trim()
        if (!normalized) return undefined

        const filenameStarMatch = normalized.match(/filename\*\s*=\s*([^;]+)/i)
        if (filenameStarMatch) {
                const rawValue = filenameStarMatch[1]?.trim()
                if (rawValue) {
                        const withoutQuotes = rawValue.replace(/^['"]|['"]$/g, '')
                        const parts = withoutQuotes.split("''", 2)
                        if (parts.length === 2) {
                                const encoded = parts[1]
                                try {
                                        return decodeURIComponent(encoded)
                                } catch {
                                        return encoded
                                }
                        }
                        try {
                                return decodeURIComponent(withoutQuotes)
                        } catch {
                                return withoutQuotes
                        }
                }
        }

        const filenameMatch = normalized.match(/filename\s*=\s*([^;]+)/i)
        if (filenameMatch) {
                const rawValue = filenameMatch[1]?.trim()
                if (rawValue) {
                        return rawValue.replace(/^['"]|['"]$/g, '')
                }
        }

        return undefined
}

export const downloadBlob = (blob: Blob, fileName: string) => {
        if (typeof window === 'undefined') return
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = fileName
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
}
