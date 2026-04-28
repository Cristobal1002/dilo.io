import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/robots.txt',
  '/sitemap.xml',
  '/f/(.*)',               // flows públicos — el usuario final no necesita login
  '/api/f/(.*)',          // API de flows públicos
  '/api/track/(.*)',      // tracking de aperturas y clics — sin auth (pixels + redirects)
  '/onboarding',          // accesible para usuarios autenticados sin perfil completo
  '/api/onboarding',
  '/api/webhooks/(.*)',   // webhooks — sin sesión de usuario
  '/discovery(.*)',
  '/privacy',             // política de privacidad — pública
  '/terms',               // términos de servicio — públicos
  '/blog(.*)',            // blog — contenido público (índice y posts)
  '/vs-involve-me',       // comparativa SEO pública
  '/casos(.*)',           // casos de uso — páginas públicas (ej. /casos/consultores, /casos/agencias)
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
