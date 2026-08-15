import { defineStore } from 'pinia'
import { authApi, profileApi, tokenStorage } from '../services/api'

let refreshTimer = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    permissions: {},
    token: tokenStorage.getToken(),
    csrfToken: tokenStorage.getCsrfToken(),
    expiresAt: tokenStorage.getExpiresAt(),
    initialized: false,
    loading: false,
    serverInfo: null
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => Boolean(state.user?.is_admin),
    displayName: (state) => state.user?.real_name || state.user?.username || '未登录',
    hasPermission: (state) => (module, action = 'view') => {
      if (state.user?.is_admin) return true
      return Boolean(state.permissions?.[module]?.[action])
    },
    hasAnyPermission: (state) => (modules = [], action = 'view') => {
      if (state.user?.is_admin) return true
      if (!Array.isArray(modules) || modules.length === 0) return true
      return modules.some(module => Boolean(state.permissions?.[module]?.[action]))
    }
  },

  actions: {
    applySession(session) {
      tokenStorage.saveSession(session)
      this.token = session.access_token
      this.csrfToken = session.csrf_token
      this.expiresAt = session.expires_at
      this.user = session.user
      this.permissions = session.permissions || session.user?.permissions || {}
      this.initialized = true
      this.scheduleRefresh()
    },

    clearSession() {
      window.clearTimeout(refreshTimer)
      refreshTimer = null
      tokenStorage.clearSession()
      this.token = ''
      this.csrfToken = ''
      this.expiresAt = 0
      this.user = null
      this.permissions = {}
      this.initialized = true
    },

    async initialize() {
      if (this.initialized) return
      this.token = tokenStorage.getToken()
      this.csrfToken = tokenStorage.getCsrfToken()
      this.expiresAt = tokenStorage.getExpiresAt()

      if (!this.token) {
        this.initialized = true
        return
      }

      try {
        const user = await authApi.me()
        this.user = user
        this.permissions = user.permissions || {}
        this.scheduleRefresh()
      } catch (error) {
        this.clearSession()
      } finally {
        this.initialized = true
      }
    },

    async loadServerInfo() {
      try {
        this.serverInfo = await authApi.serverInfo()
      } catch {
        this.serverInfo = null
      }
      return this.serverInfo
    },

    async login(payload) {
      this.loading = true
      try {
        const session = await authApi.login(payload)
        this.applySession(session)
        return session
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      const session = await authApi.refresh()
      this.applySession(session)
      return session
    },

    scheduleRefresh() {
      window.clearTimeout(refreshTimer)
      refreshTimer = null
      if (!this.expiresAt) return

      const refreshIn = Math.max(this.expiresAt * 1000 - Date.now() - 60 * 1000, 30 * 1000)
      refreshTimer = window.setTimeout(async () => {
        try {
          await this.refresh()
        } catch {
          this.clearSession()
        }
      }, refreshIn)
    },

    async logout() {
      try {
        if (this.token) await authApi.logout()
      } finally {
        this.clearSession()
      }
    },

    async updateProfile(payload) {
      const user = await profileApi.updateProfile(payload)
      this.user = user
      this.permissions = user.permissions || this.permissions
      return user
    },

    async changePassword(payload) {
      return profileApi.changePassword(payload)
    }
  }
})
