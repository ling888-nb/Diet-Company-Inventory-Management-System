<template>
  <div class="settings">
    <div class="page-header">
      <h1>系统设置</h1>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 数据管理 -->
      <el-tab-pane label="数据管理" name="data">
        <div class="tab-content">
          <el-card class="data-card storage-card">
            <template #header>
              <span>数据保存位置</span>
            </template>

            <el-descriptions :column="2" border class="storage-descriptions">
              <el-descriptions-item label="保存方式">
                <el-tag type="success">浏览器本地</el-tag>
                <el-tag
                  v-if="fileStorage.selected"
                  :type="storagePermissionTagType"
                  class="status-tag"
                >
                  文件夹同步
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="文件夹">
                {{ fileStorage.folderName || '未选择' }}
              </el-descriptions-item>
              <el-descriptions-item label="保存文件">
                {{ fileStorage.fileName }}
              </el-descriptions-item>
              <el-descriptions-item label="权限状态">
                <el-tag :type="storagePermissionTagType">
                  {{ storagePermissionText }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="最后保存">
                {{ formatStorageTime(fileStorage.lastSavedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="同步状态">
                <span :class="{ 'storage-error': fileStorage.lastError }">
                  {{ fileStorage.lastError || '正常' }}
                </span>
              </el-descriptions-item>
            </el-descriptions>

            <el-alert
              v-if="!fileStorage.supported"
              class="storage-alert"
              title="当前浏览器不支持直接选择保存文件夹，请使用下载导出。"
              type="warning"
              :closable="false"
              show-icon
            />

            <div class="data-actions">
              <el-button type="primary" :disabled="!fileStorage.supported" @click="selectDataFolder">
                选择保存文件夹
              </el-button>
              <el-button type="success" :disabled="!fileStorage.selected" @click="saveDataFile">
                立即保存
              </el-button>
              <el-button type="warning" :disabled="!fileStorage.selected" @click="exportDataToFolder">
                导出到文件夹
              </el-button>
              <el-button @click="exportData">
                下载JSON
              </el-button>
              <el-button type="danger" plain :disabled="!fileStorage.selected" @click="clearDataFolder">
                清除文件夹
              </el-button>
            </div>
          </el-card>

          <el-card class="data-card">
            <template #header>
              <span>数据备份与恢复</span>
            </template>
            
            <div class="data-actions">
              <el-button type="success" @click="importData">
                导入数据
              </el-button>
            </div>
            
            <div class="data-info">
              <p><strong>当前数据统计：</strong></p>
              <ul>
                <li>客户数量：{{ (store.customers || []).length }}</li>
                <li>产品数量：{{ (store.products || []).length }}</li>
                <li>入库记录：{{ (store.inboundRecords || []).length }}</li>
                <li>出库记录：{{ (store.outboundRecords || []).length }}</li>
                <li>材料数量：{{ (store.materials || []).length }}</li>
                <li>涂装工艺：{{ (store.coatingProcesses || []).length }}</li>
                <li>涂装颜色：9 (预定义)</li>
              </ul>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 系统信息 -->
      <el-tab-pane label="系统信息" name="system">
        <div class="tab-content">
          <div class="system-grid">
            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #3b82f6;">👤</span>
              </div>
              <div class="system-info">
                <h3>用户管理</h3>
                <p>管理系统用户和权限</p>
                <el-button type="primary" size="small">配置用户</el-button>
              </div>
            </el-card>

            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #10b981;">📦</span>
              </div>
              <div class="system-info">
                <h3>产品配置</h3>
                <p>配置产品相关参数</p>
                <el-button type="primary" size="small">配置产品</el-button>
              </div>
            </el-card>

            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #f59e0b;">📄</span>
              </div>
              <div class="system-info">
                <h3>报表配置</h3>
                <p>配置报表生成参数</p>
                <el-button type="primary" size="small">配置报表</el-button>
              </div>
            </el-card>

            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #8b5cf6;">🎨</span>
              </div>
              <div class="system-info">
                <h3>工艺配置</h3>
                <p>配置涂装工艺参数</p>
                <el-button type="primary" size="small">配置工艺</el-button>
              </div>
            </el-card>

            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #f97316;">📦</span>
              </div>
              <div class="system-info">
                <h3>材料配置</h3>
                <p>配置材料相关参数</p>
                <el-button type="primary" size="small">配置材料</el-button>
              </div>
            </el-card>



            <el-card class="system-card">
              <div class="system-icon">
                <span style="font-size: 30px; color: #ef4444;">🗑️</span>
              </div>
              <div class="system-info">
                <h3>数据清理</h3>
                <p>清理历史数据</p>
                <el-button type="danger" size="small">清理数据</el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- 系统设置 -->
      <el-tab-pane label="系统设置" name="config">
        <div class="tab-content">
          <el-card>
            <template #header>
              <span>基本设置</span>
            </template>
            
            <el-form :model="systemConfig" label-width="120px">
              <el-form-item label="系统名称">
                <el-input v-model="systemConfig.systemName" placeholder="请输入系统名称" />
              </el-form-item>
              
              <el-form-item label="公司名称">
                <el-input v-model="systemConfig.companyName" placeholder="请输入公司名称" />
              </el-form-item>
              
              <el-form-item label="系统版本">
                <el-input v-model="systemConfig.version" placeholder="请输入系统版本" disabled />
              </el-form-item>
              
              <el-form-item label="数据保留天数">
                <el-input-number 
                  v-model="systemConfig.dataRetentionDays" 
                  :min="30" 
                  :max="3650"
                  placeholder="请输入数据保留天数"
                />
              </el-form-item>
              
              <el-form-item label="自动备份">
                <el-switch v-model="systemConfig.autoBackup" />
              </el-form-item>
              
              <el-form-item label="备份频率">
                <el-select v-model="systemConfig.backupFrequency" :disabled="!systemConfig.autoBackup">
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </el-form-item>
            </el-form>
            
            <div class="config-actions">
              <el-button type="primary" @click="saveConfig">保存设置</el-button>
              <el-button @click="resetConfig">重置设置</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 导入数据对话框 -->
    <el-dialog v-model="showImportDialog" title="导入数据" width="50%" :max-width="600">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="true"
        accept=".json"
        drag
      >
        <div class="upload-area">
          <span>将文件拖到此处，或点击上传</span>
          <p>支持 .json 格式的数据文件</p>
        </div>
      </el-upload>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmImport">确认导入</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 数据清理确认对话框 -->
    <el-dialog v-model="showCleanDialog" title="数据清理确认" width="40%" :max-width="500">
      <div class="clean-warning">
        <p><strong>⚠️ 警告：</strong>数据清理操作不可逆，请谨慎操作！</p>
        <p>清理后的数据将无法恢复。</p>
      </div>
      
      <el-form :model="cleanConfig" label-width="100px">
        <el-form-item label="清理范围">
          <el-checkbox-group v-model="cleanConfig.scope">
            <el-checkbox label="inbound">入库记录</el-checkbox>
            <el-checkbox label="outbound">出库记录</el-checkbox>
            <el-checkbox label="customers">客户信息</el-checkbox>
            <el-checkbox label="products">产品信息</el-checkbox>
            <el-checkbox label="materials">材料信息</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="清理条件">
          <el-date-picker
            v-model="cleanConfig.beforeDate"
            type="date"
            placeholder="清理此日期之前的数据"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCleanDialog = false">取消</el-button>
          <el-button type="danger" @click="confirmClean">确认清理</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMainStore } from '../stores'
import {
  DATA_FILE_NAME,
  buildExportFileName,
  chooseDataDirectory,
  clearSavedDataDirectory,
  downloadJsonFile,
  exportDataToSelectedFolder,
  getStorageFolderStatus,
  saveDataToSelectedFolder
} from '../utils/dataStorage'

export default {
  name: 'Settings',
  setup() {
    const store = useMainStore()
    const activeTab = ref('data')
    const showBackupDialog = ref(false)
    const showRestoreDialog = ref(false)
    const showCleanDialog = ref(false)
    const showImportDialog = ref(false)
    const selectedFile = ref(null)
    const fileStorage = reactive({
      supported: false,
      selected: false,
      folderName: '',
      permission: 'unknown',
      fileName: DATA_FILE_NAME,
      lastSavedAt: '',
      lastError: ''
    })

    const systemConfig = reactive({
      systemName: '进销存系统',
      companyName: '南通迪特金属制品有限公司',
      version: '1.0.0',
      dataRetentionDays: 365,
      autoBackup: false,
      backupFrequency: 'daily'
    })

    const cleanConfig = reactive({
      scope: [],
      beforeDate: ''
    })

    const basicSettings = reactive({
      companyName: '南通迪特金属制品有限公司',
      systemTitle: '进销存系统',
      version: '1.0.0'
    })

    const permissions = reactive([
      {
        module: '客户管理',
        description: '客户信息的增删改查',
        view: true,
        add: true,
        edit: true,
        delete: true,
        export: true
      },
      {
        module: '产品管理',
        description: '产品信息的增删改查',
        view: true,
        add: true,
        edit: true,
        delete: true,
        export: true
      },
      {
        module: '入库管理',
        description: '入库记录的增删改查',
        view: true,
        add: true,
        edit: true,
        delete: true,
        export: true
      },
      {
        module: '出库管理',
        description: '出库记录的增删改查',
        view: true,
        add: true,
        edit: true,
        delete: true,
        export: true
      },
      {
        module: '库存管理',
        description: '库存信息的查询和导出',
        view: true,
        add: false,
        edit: false,
        delete: false,
        export: true
      },

      {
        module: '系统设置',
        description: '系统配置和权限管理',
        view: true,
        add: false,
        edit: true,
        delete: false,
        export: false
      }
    ])

    const cloudSettings = reactive({
      enabled: false,
      frequency: 'manual',
      serverUrl: 'https://api.example.com/sync',
      status: 'disconnected'
    })

    const storagePermissionText = computed(() => {
      const textMap = {
        granted: '已授权',
        prompt: '需授权',
        denied: '已拒绝',
        unavailable: '不支持',
        unknown: '未选择'
      }

      return textMap[fileStorage.permission] || '未知'
    })

    const storagePermissionTagType = computed(() => {
      const typeMap = {
        granted: 'success',
        prompt: 'warning',
        denied: 'danger',
        unavailable: 'info',
        unknown: 'info'
      }

      return typeMap[fileStorage.permission] || 'info'
    })

    const refreshStorageStatus = async () => {
      const status = await getStorageFolderStatus()
      Object.assign(fileStorage, {
        supported: false,
        selected: false,
        folderName: '',
        permission: 'unknown',
        fileName: DATA_FILE_NAME,
        lastSavedAt: '',
        lastError: '',
        ...status
      })
    }

    const getExportData = (extra = {}) => {
      return store.getPersistedData({
        exportTime: new Date().toISOString(),
        ...extra
      })
    }

    const formatStorageTime = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const selectDataFolder = async () => {
      try {
        await chooseDataDirectory()
        await saveDataToSelectedFolder(store.getPersistedData(), { requestPermission: true })
        await refreshStorageStatus()
        ElMessage.success('保存文件夹已设置')
      } catch (error) {
        ElMessage.error(error.message || '选择文件夹失败')
      }
    }

    const saveDataFile = async () => {
      try {
        await saveDataToSelectedFolder(store.getPersistedData(), { requestPermission: true })
        await refreshStorageStatus()
        ElMessage.success('数据已保存到文件夹')
      } catch (error) {
        await refreshStorageStatus()
        ElMessage.error(error.message || '保存失败')
      }
    }

    const exportDataToFolder = async () => {
      try {
        const result = await exportDataToSelectedFolder(getExportData())
        await refreshStorageStatus()
        ElMessage.success(`已导出：${result.fileName}`)
      } catch (error) {
        await refreshStorageStatus()
        ElMessage.error(error.message || '导出失败')
      }
    }

    const clearDataFolder = async () => {
      await clearSavedDataDirectory()
      await refreshStorageStatus()
      ElMessage.success('已清除保存文件夹')
    }

    const saveBasicSettings = () => {
      store.updateSystemSettings(basicSettings)
      ElMessage.success('基本设置保存成功')
    }

    const savePermissions = () => {
      localStorage.setItem('system-permissions', JSON.stringify(permissions))
      ElMessage.success('权限设置保存成功')
    }

    const resetPermissions = () => {
      permissions.forEach(permission => {
        permission.view = true
        permission.add = true
        permission.edit = true
        permission.delete = true
        permission.export = true
      })
      ElMessage.success('权限设置已重置')
    }

    const backupData = () => {
      showBackupDialog.value = true
    }

    const confirmBackup = () => {
      downloadJsonFile(store.getPersistedData({
        backupTime: new Date().toISOString()
      }), buildExportFileName('backup'))
      showBackupDialog.value = false
      ElMessage.success('数据备份成功')
    }

    const restoreData = () => {
      showRestoreDialog.value = true
    }

    const handleFileChange = (file) => {
      selectedFile.value = file.raw
    }

    const confirmRestore = () => {
      if (!selectedFile.value) {
        ElMessage.warning('请选择备份文件')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          store.restoreFromBackup(data)
          ElMessage.success('数据恢复成功')
          showRestoreDialog.value = false
        } catch (error) {
          ElMessage.error('备份文件格式错误')
        }
      }
      reader.readAsText(selectedFile.value)
    }

    const clearCustomers = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有客户数据吗？', '确认清空', {
          type: 'warning'
        })
        store.customers = []
        store.saveToLocalStorage()
        ElMessage.success('客户数据已清空')
      } catch {}
    }

    const clearProducts = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有产品数据吗？', '确认清空', {
          type: 'warning'
        })
        store.products = []
        store.saveToLocalStorage()
        ElMessage.success('产品数据已清空')
      } catch {}
    }

    const clearInventory = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有库存数据吗？', '确认清空', {
          type: 'warning'
        })
        store.inboundRecords = []
        store.outboundRecords = []
        store.saveToLocalStorage()
        ElMessage.success('库存数据已清空')
      } catch {}
    }

    const clearCoating = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有涂装数据吗？', '确认清空', {
          type: 'warning'
        })
        store.coatingProcesses = []
        // store.coatingColors = [] // 已移除coatingColors
        store.saveToLocalStorage()
        ElMessage.success('涂装数据已清空')
      } catch {}
    }



    const clearMaterials = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有材料数据吗？', '确认清空', {
          type: 'warning'
        })
        store.materials = []
        store.materialTypes = []
        store.materialColors = []
        store.materialSuppliers = []
        store.saveToLocalStorage()
        ElMessage.success('材料数据已清空')
      } catch {}
    }

    const clearAllData = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清空所有数据吗？此操作不可恢复！',
          '确认清空',
          {
            type: 'warning',
            confirmButtonText: '确定清空',
            cancelButtonText: '取消'
          }
        )
        
        store.customers = []
        store.products = []
        store.inboundRecords = []
        store.outboundRecords = []

        store.coatingProcesses = []
        // store.coatingColors = [] // 已移除coatingColors
        store.materials = []
        store.materialTypes = []
        store.materialColors = []
        store.materialSuppliers = []
        store.saveToLocalStorage()
        
        ElMessage.success('所有数据已清空')
      } catch {}
    }

    const testConnection = () => {
      ElMessage.info('云端连接功能需要根据实际需求实现')
    }

    const syncData = () => {
      ElMessage.info('数据同步功能需要根据实际需求实现')
    }

    const saveConfig = () => {
      localStorage.setItem('system-config', JSON.stringify(systemConfig))
      ElMessage.success('系统设置保存成功')
    }

    const resetConfig = () => {
      Object.assign(systemConfig, {
        systemName: '进销存系统',
        companyName: '南通迪特金属制品有限公司',
        version: '1.0.0',
        dataRetentionDays: 365,
        autoBackup: false,
        backupFrequency: 'daily'
      })
      ElMessage.success('系统设置已重置')
    }

    const confirmClean = () => {
      // 实现数据清理逻辑
      ElMessage.success('数据清理完成')
      showCleanDialog.value = false
    }

    const importData = () => {
      showImportDialog.value = true
    }

    const exportData = () => {
      downloadJsonFile(getExportData(), buildExportFileName())
      ElMessage.success('数据导出成功')
    }

    const confirmImport = () => {
      if (!selectedFile.value) {
        ElMessage.warning('请选择要导入的文件')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          store.restoreFromBackup(data)
          ElMessage.success('数据导入成功')
          showImportDialog.value = false
        } catch (error) {
          ElMessage.error('文件格式错误')
        }
      }
      reader.readAsText(selectedFile.value)
    }

    onMounted(() => {
      refreshStorageStatus()

      // 加载权限设置
      const savedPermissions = localStorage.getItem('system-permissions')
      if (savedPermissions) {
        const parsed = JSON.parse(savedPermissions)
        Object.assign(permissions, parsed)
      }

      // 加载系统设置
      const savedConfig = localStorage.getItem('system-config')
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        Object.assign(systemConfig, parsed)
      }
    })

    return {
      store,
      activeTab,
      showBackupDialog,
      showRestoreDialog,
      showCleanDialog,
      showImportDialog,
      selectedFile,
      systemConfig,
      cleanConfig,
      basicSettings,
      permissions,
      cloudSettings,
      fileStorage,
      storagePermissionText,
      storagePermissionTagType,
      formatStorageTime,
      selectDataFolder,
      saveDataFile,
      exportDataToFolder,
      clearDataFolder,
      saveConfig,
      resetConfig,
      confirmClean,
      importData,
      exportData,
      confirmImport,
      saveBasicSettings,
      savePermissions,
      resetPermissions,
      backupData,
      confirmBackup,
      restoreData,
      handleFileChange,
      confirmRestore,
      clearCustomers,
      clearProducts,
      clearInventory,
      clearCoating,

      clearMaterials,
      clearAllData,
      testConnection,
      syncData
    }
  }
}
</script>

<style scoped>
.settings {
  padding: 20px;
  min-width: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  color: #1e3a8a;
  margin: 0;
}

.data-card {
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}

.data-card:hover {
  transform: translateY(-5px);
}

.storage-card {
  transition: none;
}

.storage-card:hover {
  transform: none;
}

.storage-descriptions {
  margin-bottom: 16px;
}

.status-tag {
  margin-left: 8px;
}

.storage-alert {
  margin-bottom: 16px;
}

.storage-error {
  color: #f56c6c;
}

.data-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.data-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.data-header h3 {
  margin: 0;
  color: #1e3a8a;
}

.data-content p {
  margin: 5px 0;
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.backup-content,
.restore-content {
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .settings {
    padding: 0;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .data-card {
    margin-bottom: 15px;
  }

  .data-actions,
  .data-header,
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .data-actions .el-button,
  .dialog-footer .el-button {
    width: 100%;
  }

  .backup-content,
  .restore-content {
    padding: 12px;
  }
}

@media (max-width: 520px) {
  .page-header {
    margin-bottom: 12px;
  }

  .data-header {
    gap: 8px;
  }

  .storage-descriptions {
    overflow-x: auto;
  }
}
</style> 
