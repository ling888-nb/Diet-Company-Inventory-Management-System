import axios from 'axios'

const TOKEN_KEY = 'lan-inventory-token'
const CSRF_KEY = 'lan-inventory-csrf'
const EXPIRES_KEY = 'lan-inventory-token-expires'

const resolveApiBaseUrl = () => {
  const configured = import.meta.env?.VITE_API_BASE_URL
  if (configured) return configured.replace(/\/$/, '')

  if (typeof window === 'undefined') return '/api'

  const { protocol, hostname, port } = window.location
  if (port === '8080' || !port) return '/api'
  return `${protocol}//${hostname}:8080/api`
}

export const apiBaseUrl = resolveApiBaseUrl()

export const tokenStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
  },
  getCsrfToken() {
    return localStorage.getItem(CSRF_KEY) || ''
  },
  getExpiresAt() {
    return Number(localStorage.getItem(EXPIRES_KEY) || 0)
  },
  saveSession({ access_token: token, csrf_token: csrfToken, expires_at: expiresAt }) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (csrfToken) localStorage.setItem(CSRF_KEY, csrfToken)
    if (expiresAt) localStorage.setItem(EXPIRES_KEY, String(expiresAt))
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CSRF_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  }
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const method = String(config.method || 'get').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = tokenStorage.getCsrfToken()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }

  return config
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      tokenStorage.clearSession()
    }
    return Promise.reject(error)
  }
)

export const getApiErrorMessage = (error, fallback = '操作失败') => {
  return error?.response?.data?.detail || error?.message || fallback
}

export const authApi = {
  login(payload) {
    return apiClient.post('/auth/login', payload).then(response => response.data)
  },
  me() {
    return apiClient.get('/auth/me').then(response => response.data)
  },
  refresh() {
    return apiClient.post('/auth/refresh').then(response => response.data)
  },
  logout() {
    return apiClient.post('/auth/logout').then(response => response.data)
  },
  serverInfo() {
    return apiClient.get('/health').then(response => response.data)
  }
}

export const serverApi = {
  startScriptUrl() {
    return `${apiBaseUrl}/server/start-script`
  }
}

export const dataApi = {
  snapshot() {
    return apiClient.get('/data/snapshot').then(response => response.data)
  },
  restoreSnapshot(data) {
    return apiClient.put('/data/snapshot', { data }).then(response => response.data)
  },
  create(collection, data) {
    return apiClient.post(`/data/${collection}`, { id: data.id, data }).then(response => response.data.item)
  },
  update(collection, id, data) {
    return apiClient.put(`/data/${collection}/${encodeURIComponent(id)}`, { id, data }).then(response => response.data.item)
  },
  remove(collection, id) {
    return apiClient.delete(`/data/${collection}/${encodeURIComponent(id)}`).then(response => response.data)
  },
  updateSettings(settings) {
    return apiClient.put('/settings', settings).then(response => response.data.systemSettings)
  }
}

export const adminApi = {
  permissionModules() {
    return apiClient.get('/permissions/modules').then(response => response.data)
  },
  listUsers() {
    return apiClient.get('/admin/users').then(response => response.data.items)
  },
  createUser(payload) {
    return apiClient.post('/admin/users', payload).then(response => response.data)
  },
  updateUser(id, payload) {
    return apiClient.put(`/admin/users/${id}`, payload).then(response => response.data.item)
  },
  deleteUser(id) {
    return apiClient.delete(`/admin/users/${id}`).then(response => response.data)
  },
  resetPassword(id, password) {
    return apiClient.post(`/admin/users/${id}/reset-password`, { password }).then(response => response.data)
  },
  listRoles() {
    return apiClient.get('/admin/roles').then(response => response.data.items)
  },
  createRole(payload) {
    return apiClient.post('/admin/roles', payload).then(response => response.data)
  },
  updateRole(id, payload) {
    return apiClient.put(`/admin/roles/${id}`, payload).then(response => response.data)
  },
  deleteRole(id) {
    return apiClient.delete(`/admin/roles/${id}`).then(response => response.data)
  },
  listAuditLogs(params) {
    return apiClient.get('/admin/audit-logs', { params }).then(response => response.data.items)
  },
  exportAuditLogs(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
    const suffix = query.toString()
    return `${apiBaseUrl}/admin/audit-logs/export${suffix ? `?${suffix}` : ''}`
  },
  databaseBackupUrl() {
    return `${apiBaseUrl}/admin/backup/database`
  },
  restoreDatabase(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/admin/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(response => response.data)
  }
}

export const profileApi = {
  updateProfile(payload) {
    return apiClient.put('/profile', payload).then(response => response.data.item)
  },
  changePassword(payload) {
    return apiClient.put('/profile/password', payload).then(response => response.data)
  }
}

export const downloadWithAuth = async (url, fileName) => {
  const response = await axios.get(url, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${tokenStorage.getToken()}`
    }
  })
  const blobUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName || ''
  link.click()
  URL.revokeObjectURL(blobUrl)
}
