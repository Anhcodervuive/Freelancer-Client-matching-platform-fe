const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js'

let chartJsLoadingPromise: Promise<unknown> | null = null

export const loadChartJs = () => {
        if (typeof window === 'undefined') {
                return Promise.reject(new Error('Chart.js requires a browser environment.'))
        }

        if (window.Chart) {
                return Promise.resolve(window.Chart)
        }

        if (!chartJsLoadingPromise) {
                chartJsLoadingPromise = new Promise((resolve, reject) => {
                        const script = document.createElement('script')
                        script.src = CHART_JS_CDN
                        script.async = true
                        script.onload = () => {
                                if (window.Chart) {
                                        resolve(window.Chart)
                                } else {
                                        chartJsLoadingPromise = null
                                        reject(new Error('Chart.js failed to initialise.'))
                                }
                        }
                        script.onerror = () => {
                                chartJsLoadingPromise = null
                                reject(new Error('Unable to load the Chart.js library.'))
                        }
                        document.head.appendChild(script)
                })
        }

        return chartJsLoadingPromise
}

export const withAlpha = (hex: string, alpha: number) => {
        const sanitized = hex.replace('#', '')
        if (sanitized.length !== 6) {
                return hex
        }

        const r = Number.parseInt(sanitized.slice(0, 2), 16)
        const g = Number.parseInt(sanitized.slice(2, 4), 16)
        const b = Number.parseInt(sanitized.slice(4, 6), 16)

        return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

declare global {
        interface Window {
                Chart?: any
        }
}
