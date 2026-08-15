<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="avatar">{{ userInitial }}</div>
      <div>
        <h1>{{ authStore.displayName }}</h1>
        <p>{{ authStore.user?.username }} · {{ authStore.isAdmin ? '超级管理员' : '普通用户' }}</p>
      </div>
    </div>

    <div class="profile-grid">
      <el-card shadow="never">
        <template #header>
          <span>个人资料</span>
        </template>
        <el-form :model="profileForm" label-position="top">
          <el-form-item label="真实姓名">
            <el-input v-model.trim="profileForm.real_name" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="profileForm.notes" type="textarea" :rows="3" />
          </el-form-item>
          <el-button type="primary" @click="saveProfile">保存资料</el-button>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <span>修改密码</span>
        </template>
        <el-form :model="passwordForm" label-position="top">
          <el-alert
            v-if="passwordError"
            class="password-error"
            :title="passwordError"
            type="error"
            show-icon
            :closable="false"
          />
          <el-form-item label="原密码">
            <el-input v-model="passwordForm.old_password" type="password" show-password @input="passwordError = ''" />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="passwordForm.new_password" type="password" show-password @input="passwordError = ''" />
            <small class="password-rule">至少 8 位，必须同时包含字母和数字。</small>
          </el-form-item>
          <el-form-item label="确认新密码">
            <el-input v-model="passwordForm.confirm_password" type="password" show-password @input="passwordError = ''" />
          </el-form-item>
          <el-button type="primary" :loading="passwordLoading" @click="changePassword">更新密码</el-button>
        </el-form>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <span>我的权限</span>
      </template>
      <div class="permission-list">
        <div v-for="item in permissionRows" :key="item.module" class="permission-row">
          <strong>{{ item.title }}</strong>
          <span :class="{ active: item.view }">查看</span>
          <span :class="{ active: item.create }">新增</span>
          <span :class="{ active: item.update }">修改</span>
          <span :class="{ active: item.delete }">删除</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { navigationItems } from '../config/navigation'
import { getApiErrorMessage } from '../services/api'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'Profile',
  setup() {
    const authStore = useAuthStore()

    const profileForm = reactive({
      real_name: '',
      notes: ''
    })

    const passwordForm = reactive({
      old_password: '',
      new_password: '',
      confirm_password: ''
    })
    const passwordError = ref('')
    const passwordLoading = ref(false)

    const userInitial = computed(() => {
      return String(authStore.displayName || 'U').trim().slice(0, 1).toUpperCase()
    })

    const permissionRows = computed(() => {
      return navigationItems
        .filter(item => !item.hiddenInMenu)
        .flatMap(item => (item.resources?.length ? item.resources : [item.module]).filter(Boolean).map(module => ({
          module,
          title: `${item.title} / ${module}`,
          view: authStore.hasPermission(module, 'view'),
          create: authStore.hasPermission(module, 'create'),
          update: authStore.hasPermission(module, 'update'),
          delete: authStore.hasPermission(module, 'delete')
        })))
    })

    const syncForm = () => {
      profileForm.real_name = authStore.user?.real_name || ''
      profileForm.notes = authStore.user?.notes || ''
    }

    const saveProfile = async () => {
      try {
        await authStore.updateProfile({ ...profileForm })
        ElMessage.success('个人资料已保存')
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '资料保存失败'))
      }
    }

    const changePassword = async () => {
      passwordError.value = ''
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        passwordError.value = '两次输入的新密码不一致'
        ElMessage.error(passwordError.value)
        return
      }
      passwordLoading.value = true
      try {
        await authStore.changePassword({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
        Object.assign(passwordForm, { old_password: '', new_password: '', confirm_password: '' })
        ElMessage.success('密码已更新')
      } catch (error) {
        passwordError.value = getApiErrorMessage(error, '密码修改失败')
        ElMessage.error(passwordError.value)
      } finally {
        passwordLoading.value = false
      }
    }

    onMounted(syncForm)

    return {
      authStore,
      profileForm,
      passwordForm,
      passwordError,
      passwordLoading,
      userInitial,
      permissionRows,
      saveProfile,
      changePassword
    }
  }
}
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff, #eef6ff);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.avatar {
  width: 62px;
  height: 62px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #0f766e);
  font-size: 24px;
  font-weight: 800;
}

.profile-header h1 {
  margin: 0;
  font-size: 24px;
  color: #0f172a;
}

.profile-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.password-error {
  margin-bottom: 14px;
}

.password-rule {
  display: block;
  margin-top: 6px;
  color: #64748b;
  line-height: 1.5;
}

.permission-list {
  display: grid;
  gap: 8px;
  overflow-x: auto;
}

.permission-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) repeat(4, 72px);
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.permission-row strong {
  color: #172033;
}

.permission-row span {
  color: #94a3b8;
  text-align: center;
}

.permission-row span.active {
  color: #0f766e;
  font-weight: 700;
}

@media (max-width: 820px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .permission-row {
    grid-template-columns: 1fr repeat(4, 56px);
    min-width: 420px;
  }
}

@media (max-width: 520px) {
  .profile-page {
    gap: 12px;
  }

  .profile-header {
    align-items: flex-start;
    padding: 14px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .profile-header h1 {
    font-size: 21px;
  }

  .permission-row {
    grid-template-columns: minmax(132px, 1fr) repeat(4, 50px);
    min-width: 350px;
    padding: 9px;
    font-size: 12px;
  }
}
</style>
