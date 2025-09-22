import countryList from 'react-select-country-list'

export type CountryOption = { value: string; label: string }

// Supported Stripe Connect countries. Keep in sync with https://stripe.com/docs/connect/supported-countries
export const STRIPE_SUPPORTED_COUNTRY_CODES = [
        'AE',
        'AT',
        'AU',
        'BE',
        'BG',
        'CA',
        'CH',
        'CY',
        'CZ',
        'DE',
        'DK',
        'EE',
        'ES',
        'FI',
        'FR',
        'GB',
        'GR',
        'HK',
        'HR',
        'HU',
        'IE',
        'IT',
        'JP',
        'LI',
        'LT',
        'LU',
        'LV',
        'MT',
        'MX',
        'NL',
        'NO',
        'NZ',
        'PL',
        'PT',
        'RO',
        'SE',
        'SG',
        'SI',
        'SK',
        'US'
] as const

const supportedCountrySet = new Set(STRIPE_SUPPORTED_COUNTRY_CODES)
const allCountries = countryList().getData()

export const stripeSupportedCountryOptions: CountryOption[] = allCountries
        .filter(option => supportedCountrySet.has(option.value))
        .map(option => ({ value: option.value, label: option.label }))

export const getCountryOptionByCode = (code?: string): CountryOption | null => {
        if (!code) return null
        const match = allCountries.find(option => option.value === code)
        return match ? { value: match.value, label: match.label } : null
}
