import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useMainStore } from './stores'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.directive('permission', {
  mounted(el, binding) {
    const authStore = useAuthStore(pinia)
    const value = binding.value || {}
    const module = value.module || value[0]
    const action = value.action || value[1] || 'view'
    const mode = value.mode || 'disable'
    const allowed = module ? authStore.hasPermission(module, action) : true

    if (allowed) return
    if (mode === 'hide') {
      el.dataset.permissionHidden = 'true'
      el.style.display = 'none'
      return
    }
    el.dataset.permissionDisabled = 'true'
    el.setAttribute('disabled', 'disabled')
    el.classList.add('is-disabled')
    el.style.pointerEvents = 'none'
  },
  updated(el, binding) {
    const authStore = useAuthStore(pinia)
    const value = binding.value || {}
    const module = value.module || value[0]
    const action = value.action || value[1] || 'view'
    const mode = value.mode || 'disable'
    const allowed = module ? authStore.hasPermission(module, action) : true

    if (el.dataset.permissionHidden === 'true') {
      el.style.display = ''
      delete el.dataset.permissionHidden
    }
    if (el.dataset.permissionDisabled === 'true') {
      el.style.pointerEvents = ''
      el.removeAttribute('disabled')
      el.classList.remove('is-disabled')
      delete el.dataset.permissionDisabled
    }

    if (!allowed && mode === 'hide') {
      el.dataset.permissionHidden = 'true'
      el.style.display = 'none'
    } else if (!allowed) {
      el.dataset.permissionDisabled = 'true'
      el.setAttribute('disabled', 'disabled')
      el.classList.add('is-disabled')
      el.style.pointerEvents = 'none'
    }
  }
})

const mainStore = useMainStore(pinia)
mainStore.loadFromLocalStorage()

app.mount('#app') 
