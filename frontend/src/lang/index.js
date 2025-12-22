import translations from './translations.json'

const LANGUAGE = import.meta.env.VITE_LANGUAGE || 'en'

const strings = translations[LANGUAGE] || translations['en']

export function t(key, params = {}) {
  const keys = key.split('.')
  let value = strings
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      console.warn(`Translation missing: ${key}`)
      return key
    }
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation is not a string: ${key}`)
    return key
  }
  
  return value.replace(/\{(\w+)\}/g, (match, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : match
  })
}

export const currentLanguage = LANGUAGE

export const availableLanguages = Object.keys(translations)