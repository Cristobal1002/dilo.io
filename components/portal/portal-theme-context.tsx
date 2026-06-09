'use client'

import { createContext, useContext } from 'react'

export const PortalThemeContext = createContext({ isDark: true })

export function usePortalTheme() {
  return useContext(PortalThemeContext)
}
