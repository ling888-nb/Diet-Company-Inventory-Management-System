<template>
  <div class="login-page" :class="{ 'login-page--server': accessInfo.isServerClient }">
    <section class="login-visual">
      <div class="brand">
        <div class="brand-mark">{{ accessInfo.isServerClient ? 'SV' : 'DT' }}</div>
        <div>
          <h1>{{ companyName }}</h1>
          <p>{{ accessInfo.isServerClient ? '服务器本机控制台' : '局域网本地进销存系统' }}</p>
        </div>
      </div>

      <div v-if="accessInfo.isServerClient" class="server-badge">
        <el-icon><Monitor /></el-icon>
        <span>当前设备是服务器</span>
      </div>

      <div class="status-strip">
        <div>
          <span>后端状态</span>
          <strong>{{ accessInfo.backendOk ? '正常运行' : '未连接' }}</strong>
        </div>
        <div>
          <span>其他设备登录地址</span>
          <strong>{{ accessInfo.lanAddress }}</strong>
        </div>
        <div v-if="accessInfo.isServerClient">
          <span>连接设备</span>
          <strong>{{ accessInfo.activeDeviceCount }} 台</strong>
        </div>
        <div v-if="accessInfo.isServerClient">
          <span>远程设备</span>
          <strong>{{ accessInfo.remoteDeviceCount }} 台</strong>
        </div>
      </div>
    </section>

    <section class="login-panel">
      <div class="panel-heading">
        <h2>{{ accessInfo.isServerClient ? '服务器登录控制台' : '登录系统' }}</h2>
        <p>{{ accessInfo.isServerClient ? '可查看后端状态、连接设备和一键启动脚本' : '账号权限会实时从服务器校验' }}</p>
      </div>

      <div v-if="accessInfo.isServerClient" class="server-console-card">
        <div class="console-row">
          <span>后端服务</span>
          <el-tag :type="accessInfo.backendOk ? 'success' : 'danger'">
            {{ accessInfo.backendOk ? '正常' : '异常' }}
          </el-tag>
        </div>
        <div class="console-row">
          <span>已连接设备</span>
          <strong>{{ accessInfo.activeDeviceCount }} 台</strong>
        </div>
        <div class="console-row">
          <span>一键启动脚本</span>
          <el-button size="small" type="primary" @click="downloadStartScript">
            下载脚本
          </el-button>
        </div>
        <small>如果后端已关闭，网页无法直接启动它；请在服务器电脑双击 start_lan_system.bat。</small>
      </div>

      <div class="lan-login-card">
        <span>同一 WiFi / 局域网内登录地址</span>
        <strong>{{ accessInfo.lanAddress }}</strong>
        <small>把这个网址发给其他电脑或手机，用浏览器打开即可登录。</small>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" size="large" autocomplete="username">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            autocomplete="current-password"
            show-password
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="login-options">
          <el-checkbox v-model="form.remember">7天内免登录</el-checkbox>
        </div>

        <el-alert
          v-if="errorMessage"
          class="login-error"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
        />

        <el-button
          class="login-button"
          type="primary"
          size="large"
          :loading="authStore.loading"
          @click="handleLogin"
        >
          进入系统
        </el-button>
      </el-form>
    </section>
  </div>
</template>

<script>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getApiErrorMessage } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useMainStore } from '../stores'
import { useServerAccessInfo } from '../composables/useServerAccessInfo'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    const mainStore = useMainStore()
    const formRef = ref(null)
    const errorMessage = ref('')
    const { accessInfo, downloadStartScript } = useServerAccessInfo()

    const form = reactive({
      username: '',
      password: '',
      remember: false
    })

    const rules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
    }

    const companyName = computed(() => mainStore.systemSettings.companyName || '南通迪特金属制品有限公司')

    const handleLogin = async () => {
      if (!formRef.value) return
      errorMessage.value = ''

      try {
        await formRef.value.validate()
        await authStore.login(form)
        await mainStore.loadFromBackend()
        ElMessage.success('登录成功')
        router.replace(route.query.redirect || '/dashboard')
      } catch (error) {
        errorMessage.value = getApiErrorMessage(error, '登录失败，请检查账号、密码或后端服务')
      }
    }

    return {
      authStore,
      formRef,
      form,
      rules,
      errorMessage,
      companyName,
      accessInfo,
      downloadStartScript,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 1.2fr) minmax(360px, 520px);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(37, 99, 235, 0.58)),
    linear-gradient(120deg, #0f172a, #0f766e 55%, #f59e0b);
  color: #ffffff;
}

.login-page--server {
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.86), rgba(15, 118, 110, 0.62)),
    linear-gradient(120deg, #0f172a, #2563eb 52%, #16a34a);
}

.login-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 54px;
  overflow: hidden;
}

.login-visual::after {
  content: "";
  position: absolute;
  inset: auto 8% 10% auto;
  width: 420px;
  height: 420px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  transform: rotate(18deg);
}

.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand-mark {
  width: 62px;
  height: 62px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  background: #ffffff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 20px 38px rgba(0, 0, 0, 0.24);
}

.brand h1 {
  margin: 0;
  font-size: 34px;
  letter-spacing: 0;
}

.brand p {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.78);
}

.status-strip {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-width: 720px;
}

.server-badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 10px 13px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-weight: 700;
  backdrop-filter: blur(12px);
}

.status-strip > div {
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
}

.status-strip span {
  display: block;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 13px;
}

.status-strip strong {
  font-size: 16px;
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px;
  color: #172033;
  background: rgba(255, 255, 255, 0.96);
}

.panel-heading {
  margin-bottom: 18px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 30px;
}

.panel-heading p {
  margin-top: 8px;
  color: #64748b;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  margin: 4px 0 18px;
}

.lan-login-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: linear-gradient(135deg, #eff6ff, #f0fdfa);
}

.server-console-card {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0fdf4, #eff6ff);
}

.console-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.console-row span {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.console-row strong {
  color: #0f172a;
}

.server-console-card small {
  color: #64748b;
  line-height: 1.6;
}

.lan-login-card span {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.lan-login-card strong {
  color: #0f172a;
  font-size: 18px;
  word-break: break-all;
}

.lan-login-card small {
  color: #64748b;
  line-height: 1.6;
}

.login-error {
  margin-bottom: 16px;
}

.login-button {
  width: 100%;
}

@media (max-width: 880px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-visual {
    min-height: 290px;
    padding: 32px;
  }

  .login-panel {
    padding: 32px;
  }

  .status-strip {
    grid-template-columns: 1fr;
  }
}
</style>
