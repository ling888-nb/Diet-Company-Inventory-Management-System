import { computed, onBeforeUnmount, onMounted } from 'vue'
import { serverApi } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { buildAccessInfo } from '../utils/networkAccess'

export const useServerAccessInfo = ({ poll = true, interval = 15000 } = {}) => {
  const authStore = useAuthStore()
  let serverInfoTimer = null

  const accessInfo = computed(() => buildAccessInfo(authStore.serverInfo))

  const refreshServerInfo = () => authStore.loadServerInfo()

  const downloadStartScript = () => {
    window.open(serverApi.startScriptUrl(), '_blank')
  }

  onMounted(() => {
    refreshServerInfo()
    if (poll) {
      serverInfoTimer = window.setInterval(refreshServerInfo, interval)
    }
  })

  onBeforeUnmount(() => {
    window.clearInterval(serverInfoTimer)
  })

  return {
    accessInfo,
    refreshServerInfo,
    downloadStartScript
  }
}
