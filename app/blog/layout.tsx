import { BlogShell } from '@/components/blog/blog-shell'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogShell>{children}</BlogShell>
}
