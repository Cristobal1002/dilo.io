'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AccountProfilePanel } from '@/components/account/account-profile-panel'
import { OrganizationPanel } from '@/components/account/organization-panel'
import { TeamPanel } from '@/components/account/team-panel'
import PlanPageClient from '@/app/dashboard/settings/plan/plan-page-client'
import { dashboardPageClass } from '@/lib/dashboard-page-layout'
import { pillTabActiveClass, pillTabBaseClass, pillTabInactiveClass } from '@/lib/pill-tab-styles'
import { cn } from '@/lib/utils'

export type AccountTab = 'profile' | 'organization' | 'team' | 'plan'

const TAB_LABELS: Record<AccountTab, string> = {
  profile: 'Perfil',
  organization: 'Organización',
  team: 'Equipo',
  plan: 'Plan y uso',
}

function isAccountTab(value: string | null): value is AccountTab {
  return value === 'profile' || value === 'organization' || value === 'team' || value === 'plan'
}

export function AccountPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [orgRole, setOrgRole] = useState<string | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setOrgRole(typeof res.data.role === 'string' ? res.data.role : null)
        }
      })
      .finally(() => setMeLoaded(true))
  }, [])

  const canManageIntegrations = orgRole === 'owner' || orgRole === 'admin'
  const canManageBilling = orgRole === 'owner'

  const visibleTabs = useMemo(() => {
    const tabs: AccountTab[] = ['profile', 'team']
    if (canManageIntegrations) tabs.splice(1, 0, 'organization')
    if (canManageBilling) tabs.push('plan')
    return tabs
  }, [canManageIntegrations, canManageBilling])

  const activeTab: AccountTab = useMemo(() => {
    if (isAccountTab(tabParam) && visibleTabs.includes(tabParam)) return tabParam
    return 'profile'
  }, [tabParam, visibleTabs])

  useEffect(() => {
    if (!meLoaded) return
    if (tabParam && isAccountTab(tabParam) && !visibleTabs.includes(tabParam)) {
      router.replace('/dashboard/account')
    }
  }, [meLoaded, tabParam, visibleTabs, router])

  const setTab = useCallback(
    (tab: AccountTab) => {
      const href = tab === 'profile' ? '/dashboard/account' : `/dashboard/account?tab=${tab}`
      router.push(href)
    },
    [router],
  )

  return (
    <div className={dashboardPageClass}>
      <div className="mb-5 border-b border-[#9C77F5]/12 pb-5 dark:border-[#2A2F3F]">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil, workspace, equipo y plan.
        </p>

        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Secciones de cuenta"
        >
          <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Sección</span>
          <div className="inline-flex flex-wrap items-center gap-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setTab(tab)}
                className={cn(
                  pillTabBaseClass,
                  activeTab === tab ? pillTabActiveClass : pillTabInactiveClass,
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {!meLoaded ? (
          <div className="h-40 animate-pulse rounded-xl bg-[#E5E7EB] dark:bg-[#2A2F3F]" />
        ) : activeTab === 'profile' ? (
          <AccountProfilePanel />
        ) : activeTab === 'organization' ? (
          <OrganizationPanel canEdit={canManageIntegrations} />
        ) : activeTab === 'team' ? (
          <TeamPanel />
        ) : canManageBilling ? (
          <PlanPageClient />
        ) : null}
      </div>
    </div>
  )
}
