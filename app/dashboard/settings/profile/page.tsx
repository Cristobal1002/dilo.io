import { redirect } from 'next/navigation'

/** La configuración de perfil vive en `/dashboard/account`. */
export default function SettingsProfileRedirectPage() {
  redirect('/dashboard/account')
}
