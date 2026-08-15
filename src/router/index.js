import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'
import { navigationItems } from '../config/navigation'
import { useMainStore } from '../stores'
import { useAuthStore } from '../stores/auth'

const childRoutes = navigationItems.map(({ path, name, title, icon, module, resources, adminOnly, component }) => ({
  path,
  name,
  component,
  meta: { title, icon, module, resources, adminOnly }
}))

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: childRoutes
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const firstAllowedRoute = (authStore) => {
  const item = navigationItems.find(item => {
    if (item.hiddenInMenu) return false
    if (item.adminOnly && !authStore.isAdmin) return false
    return authStore.hasAnyPermission(item.resources || [item.module], 'view')
  })
  return item?.route || '/profile'
}

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const mainStore = useMainStore()

  await authStore.initialize()

  if (to.meta.public) {
    return authStore.isAuthenticated ? firstAllowedRoute(authStore) : true
  }

  if (!authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (!mainStore._remoteReady) {
    try {
      await mainStore.loadFromBackend()
    } catch (error) {
      console.error('局域网后端数据加载失败:', error)
    }
  }

  if (to.meta.adminOnly && !authStore.isAdmin) {
    return firstAllowedRoute(authStore)
  }

  if (to.meta.resources?.length && !authStore.hasAnyPermission(to.meta.resources, 'view')) {
    return firstAllowedRoute(authStore)
  }

  if (!to.meta.resources?.length && to.meta.module && !authStore.hasPermission(to.meta.module, 'view')) {
    return firstAllowedRoute(authStore)
  }

  return true
})

export default router 
