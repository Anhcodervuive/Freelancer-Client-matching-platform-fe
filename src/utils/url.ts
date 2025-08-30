// utils/url.ts
export function parseLinkLabel(raw: string, max = 28) {
	try {
		const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
		const host = u.hostname.replace(/^www\./, '')
		const path = u.pathname.replace(/\/$/, '')
		const label = (host + path).slice(0, max) + ((host + path).length > max ? '…' : '')
		return { href: u.toString(), host, label, full: u.toString() }
	} catch {
		return { href: raw, host: raw, label: raw, full: raw }
	}
}
