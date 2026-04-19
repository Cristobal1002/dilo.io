'use client'

import { UserProfile } from '@clerk/nextjs'

export default function DashboardAccountPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-2 py-6 md:px-4">
      <h1 className="mb-6 text-lg font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Mi cuenta</h1>
      <div className="flex justify-center [&_.cl-rootBox]:w-full [&_.cl-card]:shadow-md [&_.cl-card]:rounded-2xl [&_.cl-card]:border [&_.cl-card]:border-[#E5E7EB] dark:[&_.cl-card]:border-[#2A2F3F]">
        <UserProfile routing="path" path="/dashboard/account" />
      </div>
    </div>
  )
}
