import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

const faqItemSchema = z.object({
  q: z.string().min(1).max(500),
  a: z.string().min(1).max(5000),
})

export const BlogFrontmatterSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(200),
  date: z
    .string()
    .min(1)
    .transform((s) => new Date(s))
    .refine((d) => !Number.isNaN(d.getTime()), 'Invalid date'),
  canonical: z.string().url().optional(),
  draft: z.boolean().optional().default(false),
  /** Preguntas frecuentes → JSON-LD FAQPage (opcional, por post). */
  faq: z.array(faqItemSchema).optional(),
})

export type BlogFrontmatter = z.infer<typeof BlogFrontmatterSchema>

export type BlogPost = {
  slug: string
  frontmatter: BlogFrontmatter
  content: string
}

export async function listBlogSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
      .map((e) => e.name.replace(/\.mdx$/, ''))
      .filter(Boolean)
      .sort()
  } catch {
    return []
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  const full = path.join(BLOG_DIR, `${slug}.mdx`)
  let raw: string
  try {
    raw = await fs.readFile(full, 'utf8')
  } catch {
    return null
  }

  const parsed = matter(raw)
  const fm = BlogFrontmatterSchema.safeParse(parsed.data)
  if (!fm.success) return null

  return {
    slug,
    frontmatter: fm.data,
    content: parsed.content.trim(),
  }
}

export async function listBlogPosts(): Promise<Array<Omit<BlogPost, 'content'>>> {
  const slugs = await listBlogSlugs()
  const posts = await Promise.all(slugs.map(async (slug) => getBlogPost(slug)))
  return posts
    .filter((p): p is BlogPost => p !== null && p.frontmatter.draft !== true)
    .map(({ content: _c, ...rest }) => rest)
    .sort((a, b) => b.frontmatter.date.getTime() - a.frontmatter.date.getTime())
}

