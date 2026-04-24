'use client'

import { PhoneInput } from 'react-international-phone'
import type { CountryIso2 } from 'react-international-phone'
import 'react-international-phone/style.css'
import { formatPhoneNumberIntl, isValidPhoneNumber } from '@/lib/phone-e164'
import { cn } from '@/lib/utils'

export { formatPhoneNumberIntl, isValidPhoneNumber }

export type DiloPhoneFieldVariant =
  | 'light'
  | 'landing'
  | 'onboarding'
  | 'discovery'
  | 'publicFlow'
  | 'dashboard'

type Props = {
  id?: string
  value: string
  onChange: (e164: string) => void
  /** ISO2 (p. ej. `co` o `CO`). */
  defaultCountry?: CountryIso2 | string
  disabled?: boolean
  placeholder?: string
  className?: string
  variant?: DiloPhoneFieldVariant
  autoFocus?: boolean
  'aria-invalid'?: boolean
}

function toIso2(country?: string): CountryIso2 {
  if (!country?.trim()) return 'co'
  return country.trim().toLowerCase() as CountryIso2
}

function variantClasses(variant: DiloPhoneFieldVariant): string {
  switch (variant) {
    case 'light':
      return 'mordecai-phone-input--light'
    case 'landing':
      return cn('mordecai-phone-input--light', 'mordecai-phone-input--landing')
    case 'onboarding':
      return 'mordecai-phone-input--onboarding'
    case 'discovery':
      return 'mordecai-phone-input--discovery'
    case 'publicFlow':
      return 'mordecai-phone-input--publicFlow'
    case 'dashboard':
      return cn('mordecai-phone-input--light', 'mordecai-phone-input--dashboard')
  }
}

/**
 * Teléfono en E.164 (+código país) con selector de país (react-international-phone, estilo Mordecai).
 */
export function DiloPhoneField({
  id,
  value,
  onChange,
  defaultCountry = 'co',
  disabled,
  placeholder,
  className,
  variant = 'light',
  autoFocus,
  'aria-invalid': ariaInvalid,
}: Props) {
  return (
    <div
      className={cn(
        'mordecai-phone-input-wrapper w-full',
        variantClasses(variant),
        ariaInvalid && 'mordecai-phone-input-error',
        className,
      )}
    >
      <PhoneInput
        defaultCountry={toIso2(defaultCountry)}
        value={value}
        onChange={(phone) => onChange(phone ?? '')}
        forceDialCode
        preferredCountries={['co', 'mx', 'es', 'ar', 'cl', 'pe', 'ec', 'us', 've']}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputProps={{
          id,
          autoComplete: 'tel',
          'aria-invalid': ariaInvalid === true ? true : undefined,
        }}
      />
    </div>
  )
}
