import { randomBytes } from 'crypto'
import { publicAppBaseUrl } from '@/lib/outreach'

export function newSupportApprovalToken(): string {
  return randomBytes(20).toString('base64url')
}

export function supportApprovalReviewUrl(token: string): string {
  return `${publicAppBaseUrl()}/support/review/${encodeURIComponent(token)}`
}
