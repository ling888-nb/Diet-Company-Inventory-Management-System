<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1>后台管理</h1>
        <p>账号权限、操作审计和本地数据库备份</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadAll">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="用户管理" name="users">
        <div class="toolbar">
          <el-button type="primary" @click="openUserDialog()">
            <el-icon><Plus /></el-icon>
            新增账号
          </el-button>
        </div>

        <el-table :data="users" border>
          <el-table-column prop="username" label="用户名" min-width="120" />
          <el-table-column prop="real_name" label="真实姓名" min-width="130" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'">
                {{ row.status === 'enabled' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="150">
            <template #default="{ row }">
              <el-tag v-if="row.is_admin" type="warning">超级管理员</el-tag>
              <el-tag
                v-for="roleId in row.role_ids"
                :key="roleId"
                class="role-tag"
                effect="plain"
              >
                {{ getRoleName(roleId) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_login_at" label="最后登录" min-width="180" />
          <el-table-column prop="last_login_ip" label="最后IP" min-width="130" />
          <el-table-column label="密码" min-width="260">
            <template #default="{ row }">
              <div class="password-cell">
                <template v-if="row.is_admin">
                  <el-tag effect="plain" type="info">个人中心修改</el-tag>
                </template>
                <template v-else-if="visiblePasswords[row.id]">
                  <el-input
                    :model-value="visiblePasswords[row.id]"
                    class="visible-password-input"
                    readonly
                    show-password
                  />
                  <el-button size="small" type="primary" link @click="copyPassword(visiblePasswords[row.id])">
                    复制
                  </el-button>
                </template>
                <template v-else>
                  <el-tag effect="plain" type="warning">已加密保存，可重置显示新密码</el-tag>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openUserDialog(row)">编辑</el-button>
              <el-button size="small" type="warning" link :disabled="row.is_admin" @click="openPasswordDialog(row)">重置密码</el-button>
              <el-button
                size="small"
                type="danger"
                link
                :disabled="row.username === 'admin'"
                @click="deleteUser(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="角色权限" name="roles">
        <div class="toolbar">
          <el-button type="primary" @click="openRoleDialog()">
            <el-icon><Plus /></el-icon>
            新增角色
          </el-button>
        </div>

        <el-table :data="roles" border>
          <el-table-column prop="name" label="角色名称" min-width="150" />
          <el-table-column prop="description" label="说明" min-width="220" />
          <el-table-column label="类型" width="110">
            <template #default="{ row }">
              <el-tag :type="row.is_system ? 'info' : 'success'">
                {{ row.is_system ? '系统角色' : '自定义' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="openRoleDialog(row)">编辑</el-button>
              <el-button
                size="small"
                type="danger"
                link
                :disabled="Boolean(row.is_system)"
                @click="deleteRole(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="操作日志" name="logs">
        <el-form :model="logQuery" class="log-filter" inline>
          <el-form-item label="用户名">
            <el-input v-model.trim="logQuery.username" clearable placeholder="用户名" />
          </el-form-item>
          <el-form-item label="操作类型">
            <el-select v-model="logQuery.action_type" clearable placeholder="全部" style="width: 150px">
              <el-option label="登录" value="登录" />
              <el-option label="登出" value="登出" />
              <el-option label="新增" value="新增" />
              <el-option label="修改" value="修改" />
              <el-option label="删除" value="删除" />
              <el-option label="权限变更" value="权限变更" />
              <el-option label="数据库备份" value="数据库备份" />
              <el-option label="数据库恢复" value="数据库恢复" />
            </el-select>
          </el-form-item>
          <el-form-item label="开始">
            <el-date-picker v-model="logQuery.start" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item label="结束">
            <el-date-picker v-model="logQuery.end" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadLogs">筛选</el-button>
            <el-button @click="resetLogs">重置</el-button>
            <el-button type="success" @click="exportLogs">导出Excel</el-button>
          </el-form-item>
        </el-form>

        <el-table :data="logs" border>
          <el-table-column prop="created_at" label="时间" min-width="180" />
          <el-table-column label="用户" min-width="160">
            <template #default="{ row }">{{ row.username }} / {{ row.real_name }}</template>
          </el-table-column>
          <el-table-column prop="ip_address" label="IP地址" min-width="130" />
          <el-table-column prop="action_type" label="类型" width="120" />
          <el-table-column prop="content" label="内容" min-width="260" />
          <el-table-column prop="result" label="结果" width="100" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="数据库备份" name="backup">
        <div class="backup-grid">
          <section class="backup-panel">
            <h3>一键备份</h3>
            <p>下载服务器本机 SQLite 数据库文件，复制这个文件即可迁移全部业务数据和账号权限。</p>
            <el-button type="primary" @click="downloadBackup">
              <el-icon><Download /></el-icon>
              下载数据库备份
            </el-button>
          </section>

          <section class="backup-panel">
            <h3>恢复数据库</h3>
            <p>仅支持由本系统导出的 .sqlite3 文件。恢复后建议重启后端服务。</p>
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept=".sqlite3"
              :on-change="file => restoreFile = file.raw"
              :on-remove="() => restoreFile = null"
            >
              <el-button>
                <el-icon><Upload /></el-icon>
                选择备份文件
              </el-button>
            </el-upload>
            <el-button class="restore-button" type="warning" :disabled="!restoreFile" @click="restoreBackup">
              恢复数据库
            </el-button>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showUserDialog" :title="editingUser ? '编辑账号' : '新增账号'" width="860px">
      <el-form :model="userForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="用户名">
            <el-input v-model.trim="userForm.username" :disabled="editingUser?.username === 'admin'" />
          </el-form-item>
          <el-form-item label="真实姓名">
            <el-input v-model.trim="userForm.real_name" />
          </el-form-item>
          <el-form-item v-if="!editingUser" label="登录密码">
            <el-input v-model="userForm.password" type="password" show-password placeholder="留空则由系统生成一次性显示的新密码" />
          </el-form-item>
          <el-form-item label="账号状态">
            <el-switch
              :model-value="userForm.status === 'enabled'"
              active-text="启用"
              inactive-text="禁用"
              :disabled="editingUser?.username === 'admin'"
              @change="value => userForm.status = value ? 'enabled' : 'disabled'"
            />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="userForm.role_ids" multiple collapse-tags placeholder="选择角色">
              <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="userForm.notes" type="textarea" :rows="2" />
          </el-form-item>
        </div>

        <permission-matrix
          v-model="userForm.permissions"
          :modules="modules"
          :actions="actions"
          :action-labels="actionLabels"
        />
      </el-form>
      <template #footer>
        <el-button @click="showUserDialog = false">取消</el-button>
        <el-button type="primary" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRoleDialog" :title="editingRole ? '编辑角色' : '新增角色'" width="820px">
      <el-form :model="roleForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="角色名称">
            <el-input v-model.trim="roleForm.name" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model.trim="roleForm.description" />
          </el-form-item>
        </div>
        <permission-matrix
          v-model="roleForm.permissions"
          :modules="modules"
          :actions="actions"
          :action-labels="actionLabels"
        />
      </el-form>
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="submitRole">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPasswordDialog" title="重置普通用户密码" width="500px">
      <el-alert
        class="password-tip"
        title="历史密码采用 bcrypt 哈希存储，无法还原明文；重置后会显示本次新密码。"
        type="info"
        show-icon
        :closable="false"
      />
      <el-alert
        v-if="passwordError"
        class="password-tip"
        :title="passwordError"
        type="error"
        show-icon
        :closable="false"
      />
      <el-form label-position="top">
        <el-form-item label="重置账号">
          <el-input :model-value="passwordUser?.username || ''" disabled />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            placeholder="留空自动生成安全密码，也可手动输入"
            @input="passwordError = ''"
          />
          <small class="password-rule">至少 8 位，必须同时包含字母和数字。</small>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button @click="generatePasswordForDialog">生成安全密码</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="submitPassword">确认并显示新密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi, downloadWithAuth, getApiErrorMessage } from '../services/api'

const PermissionMatrix = defineComponent({
  name: 'PermissionMatrix',
  props: {
    modelValue: { type: Object, required: true },
    modules: { type: Object, required: true },
    actions: { type: Array, required: true },
    actionLabels: { type: Object, required: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const updatePermission = (module, action, value) => {
      emit('update:modelValue', {
        ...props.modelValue,
        [module]: {
          ...(props.modelValue[module] || {}),
          [action]: value
        }
      })
    }

    return () => h('div', { class: 'permission-matrix' }, [
      h('div', { class: 'matrix-head' }, [
        h('span', '权限项'),
        ...props.actions.map(action => h('span', props.actionLabels[action] || action))
      ]),
      ...Object.entries(props.modules).map(([module, label]) => h('div', { class: 'matrix-row' }, [
        h('strong', label),
        ...props.actions.map(action => h('label', { class: 'matrix-check' }, [
          h('input', {
            type: 'checkbox',
            checked: Boolean(props.modelValue?.[module]?.[action]),
            onChange: event => updatePermission(module, action, event.target.checked)
          })
        ]))
      ]))
    ])
  }
})

const ACTION_LABELS = {
  view: '查看',
  create: '新增',
  update: '修改',
  delete: '删除'
}

export default {
  name: 'Admin',
  components: { PermissionMatrix },
  setup() {
    const activeTab = ref('users')
    const loading = ref(false)
    const users = ref([])
    const roles = ref([])
    const logs = ref([])
    const modules = ref({})
    const actions = ref(['view', 'create', 'update', 'delete'])
    const restoreFile = ref(null)

    const showUserDialog = ref(false)
    const showRoleDialog = ref(false)
    const showPasswordDialog = ref(false)
    const editingUser = ref(null)
    const editingRole = ref(null)
    const passwordUser = ref(null)
    const passwordError = ref('')
    const passwordLoading = ref(false)
    const visiblePasswords = reactive({})

    const logQuery = reactive({
      username: '',
      action_type: '',
      start: '',
      end: ''
    })

    const userForm = reactive({
      username: '',
      real_name: '',
      password: '',
      status: 'enabled',
      notes: '',
      role_ids: [],
      permissions: {}
    })

    const roleForm = reactive({
      name: '',
      description: '',
      permissions: {}
    })

    const passwordForm = reactive({
      password: ''
    })

    const actionLabels = computed(() => ACTION_LABELS)

    const blankPermissions = () => {
      return Object.keys(modules.value).reduce((result, module) => {
        result[module] = actions.value.reduce((row, action) => {
          row[action] = false
          return row
        }, {})
        return result
      }, {})
    }

    const clonePermissions = (permissions = {}) => {
      const blank = blankPermissions()
      Object.keys(blank).forEach(module => {
        Object.keys(blank[module]).forEach(action => {
          blank[module][action] = Boolean(permissions?.[module]?.[action])
        })
      })
      return blank
    }

    const getRoleName = (id) => {
      return roles.value.find(role => role.id === id)?.name || `角色${id}`
    }

    const loadMeta = async () => {
      const data = await adminApi.permissionModules()
      modules.value = data.modules || {}
      actions.value = data.actions || actions.value
    }

    const loadUsers = async () => {
      users.value = await adminApi.listUsers()
    }

    const loadRoles = async () => {
      roles.value = await adminApi.listRoles()
    }

    const loadLogs = async () => {
      logs.value = await adminApi.listAuditLogs({
        username: logQuery.username || undefined,
        action_type: logQuery.action_type || undefined,
        start: logQuery.start || undefined,
        end: logQuery.end || undefined
      })
    }

    const loadAll = async () => {
      loading.value = true
      try {
        await loadMeta()
        await Promise.all([loadUsers(), loadRoles(), loadLogs()])
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '后台数据加载失败'))
      } finally {
        loading.value = false
      }
    }

    const openUserDialog = (user = null) => {
      editingUser.value = user
      Object.assign(userForm, {
        username: user?.username || '',
        real_name: user?.real_name || '',
        password: '',
        status: user?.status || 'enabled',
        notes: user?.notes || '',
        role_ids: [...(user?.role_ids || [])],
        permissions: clonePermissions(user?.permissions)
      })
      showUserDialog.value = true
    }

    const submitUser = async () => {
      try {
        if (editingUser.value) {
          await adminApi.updateUser(editingUser.value.id, {
            username: userForm.username,
            real_name: userForm.real_name,
            status: userForm.status,
            notes: userForm.notes,
            role_ids: userForm.role_ids,
            permissions: userForm.permissions
          })
          ElMessage.success('账号已更新')
        } else {
          const result = await adminApi.createUser({ ...userForm })
          ElMessage.success('账号已创建')
          rememberVisiblePassword(result.item?.id, result.temporary_password)
          await showTemporaryPassword(userForm.username, result.temporary_password, result.notice)
        }
        showUserDialog.value = false
        await loadUsers()
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '账号保存失败'))
      }
    }

    const deleteUser = async (user) => {
      try {
        await ElMessageBox.confirm(`确定删除账号 ${user.username} 吗？`, '删除账号', { type: 'warning' })
        await adminApi.deleteUser(user.id)
        ElMessage.success('账号已删除')
        await loadUsers()
      } catch (error) {
        if (error !== 'cancel') ElMessage.error(getApiErrorMessage(error, '删除失败'))
      }
    }

    const openPasswordDialog = (user) => {
      passwordUser.value = user
      passwordForm.password = ''
      passwordError.value = ''
      showPasswordDialog.value = true
    }

    const rememberVisiblePassword = (userId, password) => {
      if (!userId || !password) return
      visiblePasswords[userId] = password
    }

    const showTemporaryPassword = async (username, temporaryPassword, notice) => {
      if (!temporaryPassword) return
      await ElMessageBox.alert(
        `账号：${username}\n新密码：${temporaryPassword}\n\n${notice || '该密码仅本次显示，请立即交给对应用户。'}`,
        '请记录新密码',
        {
          confirmButtonText: '我已记录',
          customClass: 'password-result-box'
        }
      )
    }

    const generateLocalPassword = () => {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
      const digits = '23456789'
      const all = `${letters}${digits}`
      const pick = chars => chars[Math.floor(Math.random() * chars.length)]
      const chars = [pick(letters), pick(digits)]
      while (chars.length < 12) chars.push(pick(all))
      return chars.sort(() => Math.random() - 0.5).join('')
    }

    const generatePasswordForDialog = () => {
      passwordForm.password = generateLocalPassword()
      passwordError.value = ''
    }

    const copyPassword = async (password) => {
      try {
        await navigator.clipboard.writeText(password)
        ElMessage.success('密码已复制')
      } catch {
        ElMessage.warning('复制失败，请手动选择密码复制')
      }
    }

    const submitPassword = async () => {
      passwordError.value = ''
      passwordLoading.value = true
      try {
        const result = await adminApi.resetPassword(passwordUser.value.id, passwordForm.password || undefined)
        ElMessage.success('密码已重置')
        showPasswordDialog.value = false
        rememberVisiblePassword(passwordUser.value.id, result.temporary_password)
        await showTemporaryPassword(passwordUser.value.username, result.temporary_password, result.notice)
      } catch (error) {
        passwordError.value = getApiErrorMessage(error, '密码重置失败')
        ElMessage.error(passwordError.value)
      } finally {
        passwordLoading.value = false
      }
    }

    const openRoleDialog = (role = null) => {
      editingRole.value = role
      Object.assign(roleForm, {
        name: role?.name || '',
        description: role?.description || '',
        permissions: clonePermissions(role?.permissions)
      })
      showRoleDialog.value = true
    }

    const submitRole = async () => {
      try {
        if (editingRole.value) {
          await adminApi.updateRole(editingRole.value.id, { ...roleForm })
          ElMessage.success('角色已更新')
        } else {
          await adminApi.createRole({ ...roleForm })
          ElMessage.success('角色已创建')
        }
        showRoleDialog.value = false
        await loadRoles()
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '角色保存失败'))
      }
    }

    const deleteRole = async (role) => {
      try {
        await ElMessageBox.confirm(`确定删除角色 ${role.name} 吗？`, '删除角色', { type: 'warning' })
        await adminApi.deleteRole(role.id)
        ElMessage.success('角色已删除')
        await loadRoles()
      } catch (error) {
        if (error !== 'cancel') ElMessage.error(getApiErrorMessage(error, '删除失败'))
      }
    }

    const resetLogs = () => {
      Object.assign(logQuery, { username: '', action_type: '', start: '', end: '' })
      loadLogs()
    }

    const exportLogs = async () => {
      try {
        await downloadWithAuth(adminApi.exportAuditLogs(logQuery), 'audit_logs.xlsx')
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '日志导出失败'))
      }
    }

    const downloadBackup = async () => {
      try {
        await downloadWithAuth(adminApi.databaseBackupUrl(), `inventory_backup_${Date.now()}.sqlite3`)
      } catch (error) {
        ElMessage.error(getApiErrorMessage(error, '数据库备份失败'))
      }
    }

    const restoreBackup = async () => {
      try {
        await ElMessageBox.confirm('恢复数据库会覆盖当前所有数据，确认继续吗？', '恢复数据库', { type: 'warning' })
        await adminApi.restoreDatabase(restoreFile.value)
        ElMessage.success('数据库已恢复，请重启后端服务')
      } catch (error) {
        if (error !== 'cancel') ElMessage.error(getApiErrorMessage(error, '数据库恢复失败'))
      }
    }

    onMounted(loadAll)

    return {
      activeTab,
      loading,
      users,
      roles,
      logs,
      modules,
      actions,
      actionLabels,
      logQuery,
      userForm,
      roleForm,
      passwordForm,
      passwordUser,
      passwordError,
      passwordLoading,
      visiblePasswords,
      restoreFile,
      showUserDialog,
      showRoleDialog,
      showPasswordDialog,
      editingUser,
      editingRole,
      getRoleName,
      loadAll,
      loadLogs,
      resetLogs,
      openUserDialog,
      submitUser,
      deleteUser,
      openPasswordDialog,
      submitPassword,
      generatePasswordForDialog,
      copyPassword,
      openRoleDialog,
      submitRole,
      deleteRole,
      exportLogs,
      downloadBackup,
      restoreBackup
    }
  }
}
</script>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.page-header,
.toolbar,
.backup-panel {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #0f172a;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 12px;
}

.role-tag {
  margin-right: 6px;
}

.log-filter {
  padding: 14px;
  border-radius: 8px;
  background: #ffffff;
}

.admin-tabs {
  min-width: 0;
}

.backup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.backup-panel {
  padding: 22px;
}

.backup-panel h3 {
  margin: 0 0 10px;
  color: #0f172a;
}

.backup-panel p {
  min-height: 48px;
  margin: 0 0 18px;
  color: #64748b;
  line-height: 1.7;
}

.restore-button {
  margin-top: 14px;
}

.password-tip {
  margin-bottom: 14px;
}

.password-rule {
  display: block;
  margin-top: 6px;
  color: #64748b;
  line-height: 1.5;
}

.password-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.visible-password-input {
  max-width: 160px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.permission-matrix {
  margin-top: 12px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.admin-page :deep(.permission-matrix) {
  margin-top: 12px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.matrix-head,
.matrix-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) repeat(4, minmax(72px, 0.6fr));
  align-items: center;
  min-width: 520px;
}

.matrix-head {
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.matrix-head span,
.matrix-row strong,
.matrix-check {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.matrix-row:last-child strong,
.matrix-row:last-child .matrix-check {
  border-bottom: none;
}

.matrix-row strong {
  color: #172033;
  font-size: 13px;
}

.matrix-check {
  display: flex;
  justify-content: center;
}

.matrix-check input {
  width: 16px;
  height: 16px;
}

.admin-page :deep(.matrix-head),
.admin-page :deep(.matrix-row) {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) repeat(4, minmax(72px, 0.6fr));
  align-items: center;
  min-width: 520px;
}

.admin-page :deep(.matrix-head) {
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.admin-page :deep(.matrix-head span),
.admin-page :deep(.matrix-row strong),
.admin-page :deep(.matrix-check) {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.admin-page :deep(.matrix-row strong) {
  color: #172033;
  font-size: 13px;
}

.admin-page :deep(.matrix-check) {
  display: flex;
  justify-content: center;
}

.admin-page :deep(.matrix-check input) {
  width: 16px;
  height: 16px;
}

@media (max-width: 900px) {
  .page-header,
  .backup-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar {
    justify-content: flex-start;
  }

  .log-filter {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .log-filter :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 0;
  }

  .backup-panel p {
    min-height: 0;
  }

  .admin-page :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }

  .admin-page :deep(.el-tabs__nav) {
    white-space: nowrap;
  }
}

@media (max-width: 520px) {
  .admin-page {
    gap: 12px;
  }

  .page-header,
  .toolbar,
  .backup-panel {
    padding: 12px;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .visible-password-input {
    max-width: 100%;
    flex: 1 1 160px;
  }

  .matrix-head,
  .matrix-row,
  .admin-page :deep(.matrix-head),
  .admin-page :deep(.matrix-row) {
    grid-template-columns: minmax(126px, 1.2fr) repeat(4, minmax(58px, 0.6fr));
    min-width: 390px;
  }

  .matrix-head span,
  .matrix-row strong,
  .matrix-check,
  .admin-page :deep(.matrix-head span),
  .admin-page :deep(.matrix-row strong),
  .admin-page :deep(.matrix-check) {
    padding: 9px 8px;
  }
}
</style>
