/**
 * Apariencia compartida de Clerk (`SignIn` / `SignUp`) alineada con marca Dilo.
 * Respeta `dark` en `<html>` vía variables y `baseTheme` implícito del tema del usuario.
 */
export const diloClerkAppearance = {
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
    // Oculta "Secured by Clerk" y el banner naranja de "Development mode"
    footerPages: 'hidden' as const,
  },
  variables: {
    colorPrimary: '#9C77F5',
    colorSuccess: '#00d4b0',
    colorDanger: '#DC2626',
    colorText: '#1A1A1A',
    colorTextSecondary: '#6B7280',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#1A1A1A',
    borderRadius: '12px',
    fontFamily: 'var(--font-dilo-sans), ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    header: 'pb-0 gap-1',
    // Sombra dual manejada vía CSS directo en auth-page-shell.tsx
    card: 'border-0 bg-white ring-1 ring-[#9C77F5]/10 dark:bg-[#1A1D29] dark:ring-[#9C77F5]/12',
    // footerPages = contenedor de "Secured by Clerk" + "Development mode"
    // footerItem = ítems individuales dentro de ese contenedor
    footerPages: 'hidden',
    footerItem: 'hidden',
    headerTitle: 'text-lg font-semibold tracking-tight text-[#1A1A1A] dark:text-[#F8F9FB]',
    headerSubtitle: 'text-sm text-[#6B7280] dark:text-[#9CA3AF]',
    socialButtonsBlockButton:
      'border border-[#E5E7EB] bg-white text-[#374151] shadow-sm transition-shadow hover:shadow-md hover:border-[#9C77F5]/30 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#E5E7EB] dark:hover:border-[#9C77F5]/25',
    // Líneas del separador "o"
    dividerLine: 'bg-[#E5E7EB] dark:bg-[#2A2F3F]',
    // Texto del separador (la "o") — sin bullet, centrado, pequeño
    dividerText: 'text-[#9CA3AF] text-xs font-normal dark:text-[#6B7280]',
    formFieldLabel: 'text-sm font-medium text-[#374151] dark:text-[#D1D5DB]',
    formFieldInput:
      'rounded-xl border-[#E5E7EB] bg-white text-[#1A1A1A] transition-shadow focus:shadow-md focus:shadow-[#9C77F5]/10 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]',
    formFieldInputShowPasswordButton: 'text-[#9C77F5]',
    formButtonPrimary:
      'rounded-xl font-semibold shadow-lg shadow-[#9C77F5]/25 !bg-linear-to-br !from-[#9C77F5] !to-[#7B5BD4] hover:!opacity-95 hover:!shadow-xl hover:!shadow-[#9C77F5]/30 transition-all',
    footerActionLink: 'text-[#9C77F5] font-semibold hover:text-[#6B4DD4] dark:text-[#C4B5FD]',
    footerActionText: 'text-[#6B7280] dark:text-[#9CA3AF]',
    identityPreviewText: 'text-[#1A1A1A] dark:text-[#F8F9FB]',
    identityPreviewEditButton: 'text-[#9C77F5]',
  },
} as const
