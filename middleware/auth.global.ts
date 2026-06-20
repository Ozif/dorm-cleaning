interface CurrentUser {
  memberId: number
  dormId: number
  email: string
  name: string
  isAdmin: boolean
}

const PUBLIC_PATHS = new Set(['/login', '/register'])
const ADMIN_PATH_PREFIXES = ['/config', '/members', '/cron', '/admin']

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_PATHS.has(to.path)) {
    return
  }

  const currentUser = useState<CurrentUser | null>('current-user', () => null)

  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const user = await $fetch<CurrentUser>('/api/auth/me', { headers })
    currentUser.value = user

    const requiresAdmin = ADMIN_PATH_PREFIXES.some(prefix => to.path.startsWith(prefix))
    if (requiresAdmin && !user.isAdmin) {
      return navigateTo('/')
    }
  } catch {
    currentUser.value = null
    return navigateTo('/login')
  }
})
