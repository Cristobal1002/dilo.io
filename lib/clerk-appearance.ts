/**
 * Apariencia compartida de Clerk (`SignIn` / `SignUp`) alineada con marca Dilo.
 * Respeta `dark` en `<html>` vía variables y `baseTheme` implícito del tema del usuario.
 */
export const diloClerkAppearance = {
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
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
    card: 'border-0 shadow-sm ring-1 ring-[#E5E7EB]/90 bg-white dark:bg-[#1A1D29] dark:ring-[#2A2F3F]/90',
    footerItem: 'hidden',
    headerTitle: 'text-lg font-semibold tracking-tight text-[#1A1A1A] dark:text-[#F8F9FB]',
    headerSubtitle: 'text-sm text-[#6B7280] dark:text-[#9CA3AF]',
    socialButtonsBlockButton:
      'border border-[#E5E7EB] bg-white text-[#374151] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#E5E7EB]',
    dividerLine: 'bg-[#E5E7EB] dark:bg-[#2A2F3F]',
    formFieldLabel: 'text-[#374151] dark:text-[#D1D5DB]',
    formFieldInput:
      'rounded-xl border-[#E5E7EB] bg-white text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]',
    formFieldInputShowPasswordButton: 'text-[#9C77F5]',
    formButtonPrimary:
      'rounded-xl font-semibold shadow-md shadow-[#9C77F5]/20 !bg-linear-to-br !from-[#9C77F5] !to-[#7B5BD4] hover:!opacity-95',
    footerActionLink: 'text-[#9C77F5] font-semibold hover:text-[#6B4DD4] dark:text-[#C4B5FD]',
    footerActionText: 'text-[#6B7280] dark:text-[#9CA3AF]',
    identityPreviewText: 'text-[#1A1A1A] dark:text-[#F8F9FB]',
    identityPreviewEditButton: 'text-[#9C77F5]',
  },
} as const
