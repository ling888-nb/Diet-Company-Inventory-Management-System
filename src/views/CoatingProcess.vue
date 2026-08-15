<template>
  <div class="coating-process">
    <div class="page-header">
      <h1>涂装工艺管理</h1>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 涂装工艺 -->
      <el-tab-pane v-if="canViewResource('coatingProcesses')" label="涂装工艺" name="processes">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" v-permission="{ module: 'coatingProcesses', action: 'create' }" @click="showAddProcessDialog = true">
              新增工艺
            </el-button>
            <el-button type="success" v-permission="{ module: 'processCombinations', action: 'create' }" @click="showQuickCreateCombination = true" :disabled="!selectedProcesses.length">
              快速创建组合
            </el-button>
          </div>

          <el-table 
            :data="store.coatingProcesses" 
            style="width: 100%"
            @selection-change="handleProcessSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="code" label="工艺编码" width="120" />
            <el-table-column prop="name" label="工艺名称" width="150" />
            <el-table-column prop="type" label="工艺类型" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.type === 'composite' ? 'warning' : 'success'">
                  {{ scope.row.type === 'composite' ? '复合工艺' : '单一工艺' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="工艺描述" min-width="200" />
            <el-table-column prop="usage" label="使用情况" width="120">
              <template #default="scope">
                <div v-if="getProcessUsageInfo(scope.row.id).length > 0">
                  <el-tooltip 
                    :content="getProcessUsageInfo(scope.row.id).map(c => c.name).join(', ')"
                    placement="top"
                  >
                    <el-tag type="info" size="small">
                      被{{ getProcessUsageInfo(scope.row.id).length }}个组合使用
                    </el-tag>
                  </el-tooltip>
                </div>
                <el-tag v-else type="warning" size="small">未使用</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'coatingProcesses', action: 'update' }" @click="handleEditProcess(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'coatingProcesses', action: 'delete' }" @click="handleDeleteProcess(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>



      <!-- 工艺组合 -->
      <el-tab-pane v-if="canViewResource('processCombinations')" label="工艺组合" name="combinations">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" v-permission="{ module: 'processCombinations', action: 'create' }" @click="showAddCombinationDialog = true">
              新增组合
            </el-button>
          </div>

          <el-table :data="processCombinations" style="width: 100%">
            <el-table-column prop="name" label="组合名称" width="150" />
            <el-table-column prop="processes" label="包含工艺" min-width="200">
              <template #default="scope">
                <div class="process-tags">
                  <el-tag 
                    v-for="(process, index) in scope.row.processIds" 
                    :key="`${process}-${index}`"
                    style="margin-right: 5px; margin-bottom: 5px;"
                    type="primary"
                  >
                    {{ getProcessName(process) }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="组合描述" min-width="200" />
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="primary" size="small" @click="handleViewCombination(scope.row)">
                    详情
                  </el-button>
                  <el-button type="success" size="small" v-permission="{ module: 'processCombinations', action: 'update' }" @click="handleEditCombination(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'processCombinations', action: 'delete' }" @click="handleDeleteCombination(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑工艺对话框 -->
    <el-dialog
      v-model="showAddProcessDialog"
      :title="editingProcess ? '编辑工艺' : '新增工艺'"
      width="50%"
      :max-width="600"
    >
      <el-form
        ref="processFormRef"
        :model="processForm"
        :rules="processRules"
        label-width="100px"
      >
        <el-form-item label="工艺名称" prop="name">
          <el-input v-model="processForm.name" placeholder="请输入工艺名称" />
        </el-form-item>
        <el-form-item label="工艺编码" prop="code">
          <el-input v-model="processForm.code" placeholder="工艺编码将自动生成" disabled />
        </el-form-item>
        <el-form-item label="工艺类型" prop="type">
          <el-select v-model="processForm.type" placeholder="请选择工艺类型" style="width: 100%">
            <el-option label="单一工艺" value="single" />
            <el-option label="复合工艺" value="composite" />
          </el-select>
        </el-form-item>
        <el-form-item label="工艺描述" prop="description">
          <el-input
            v-model="processForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入工艺描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddProcessDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'coatingProcesses', action: editingProcess ? 'update' : 'create' }" @click="handleSubmitProcess">
            {{ editingProcess ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>



    <!-- 新增/编辑组合对话框 -->
    <el-dialog
      v-model="showAddCombinationDialog"
      :title="editingCombination ? '编辑组合' : '新增组合'"
      width="60%"
      :max-width="700"
    >
      <el-form
        ref="combinationFormRef"
        :model="combinationForm"
        :rules="combinationRules"
        label-width="100px"
      >
        <el-form-item label="组合名称" prop="name">
          <el-input v-model="combinationForm.name" placeholder="请输入组合名称" />
        </el-form-item>
        <el-form-item label="包含工艺" prop="processIds">
          <el-select 
            v-model="combinationForm.processIds" 
            multiple
            placeholder="请选择工艺"
            style="width: 100%"
            filterable
            allow-create
            default-first-option
          >
            <el-option
              v-for="process in store.coatingProcesses"
              :key="process.id"
              :label="process.name"
              :value="process.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="组合描述" prop="description">
          <el-input
            v-model="combinationForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入组合描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddCombinationDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'processCombinations', action: editingCombination ? 'update' : 'create' }" @click="handleSubmitCombination">
            {{ editingCombination ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 快速创建组合对话框 -->
    <el-dialog
      v-model="showQuickCreateCombination"
      title="快速创建组合"
      width="50%"
      :max-width="600"
    >
      <div class="quick-create-content">
        <p class="selected-processes-info">
          已选择 {{ selectedProcesses.length }} 个工艺：
        </p>
        <div class="selected-processes-list">
          <el-tag 
            v-for="process in selectedProcesses" 
            :key="`${process.id}-${selectedProcesses.indexOf(process)}`"
            style="margin: 5px;"
            type="success"
          >
            {{ process.name }}
          </el-tag>
        </div>
        
        <el-form
          ref="quickCombinationFormRef"
          :model="quickCombinationForm"
          :rules="quickCombinationRules"
          label-width="100px"
          style="margin-top: 20px;"
        >
          <el-form-item label="组合名称" prop="name">
            <el-input v-model="quickCombinationForm.name" placeholder="请输入组合名称" />
          </el-form-item>
          <el-form-item label="组合描述" prop="description">
            <el-input
              v-model="quickCombinationForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入组合描述"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showQuickCreateCombination = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'processCombinations', action: 'create' }" @click="handleQuickCreateCombination">
            创建组合
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看组合详情对话框 -->
    <el-dialog
      v-model="showViewCombinationDialog"
      title="组合详情"
      width="60%"
      :max-width="700"
    >
      <div v-if="viewingCombination" class="combination-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="组合名称">
            {{ viewingCombination.name }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(viewingCombination.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="组合描述" :span="2">
            {{ viewingCombination.description || '暂无描述' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="combination-processes">
          <h4>包含工艺 ({{ viewingCombination.processIds?.length || 0 }}个)</h4>
          <div class="processes-list">
            <el-card 
              v-for="(processId, index) in viewingCombination.processIds" 
              :key="`${processId}-${index}`"
              class="process-card"
              shadow="hover"
            >
              <template #header>
                <div class="process-header">
                  <span class="process-name">{{ getProcessName(processId) }}</span>
                  <el-tag type="info" size="small">
                    第{{ index + 1 }}次使用
                  </el-tag>
                </div>
              </template>
              <div class="process-content">
                <p><strong>编码：</strong>{{ getProcessById(processId)?.code || '未知' }}</p>
                <p><strong>描述：</strong>{{ getProcessById(processId)?.description || '暂无描述' }}</p>
              </div>
            </el-card>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showViewCombinationDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除" width="30%" :max-width="350">
      <p>确定要删除 "{{ deletingItem?.name }}" 吗？</p>
      <p style="color: #f56c6c; font-size: 14px;">删除后无法恢复，请谨慎操作！</p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" v-permission="{ module: deletingType === 'process' ? 'coatingProcesses' : 'processCombinations', action: 'delete' }" @click="confirmDelete">确定删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
    import { ref, reactive, computed, onMounted } from 'vue'
    import { ElMessage, ElMessageBox } from 'element-plus'
    import { useMainStore } from '../stores'
    import { useAuthStore } from '../stores/auth'
    import { generateProcessCode as generateProcessCodeUtil } from '../utils/codeGenerator.js'

export default {
  name: 'CoatingProcess',
  setup() {
    const store = useMainStore()
    const authStore = useAuthStore()
    const activeTab = ref('processes')
    const showAddProcessDialog = ref(false)
    const showAddCombinationDialog = ref(false)
    const showQuickCreateCombination = ref(false)
    const showViewCombinationDialog = ref(false)
    const showDeleteDialog = ref(false)
    const editingProcess = ref(null)
    const editingCombination = ref(null)
    const viewingCombination = ref(null)
    const deletingItem = ref(null)
    const deletingType = ref('')
    const selectedProcesses = ref([])
    const processFormRef = ref()
    const combinationFormRef = ref()
    const quickCombinationFormRef = ref()

    const processForm = reactive({
      name: '',
      code: '', // 工艺编码
      type: 'single',
      description: ''
    })

    const combinationForm = reactive({
      name: '',
      processIds: [],
      description: ''
    })

    const quickCombinationForm = reactive({
      name: '',
      description: ''
    })

    const processRules = {
      name: [
        { required: true, message: '请输入工艺名称', trigger: 'blur' }
      ],
      type: [
        { required: true, message: '请选择工艺类型', trigger: 'change' }
      ]
    }

    const combinationRules = {
      name: [
        { required: true, message: '请输入组合名称', trigger: 'blur' }
      ],
      processIds: [
        { required: true, message: '请选择包含的工艺', trigger: 'change' },
        { 
          validator: (rule, value, callback) => {
            if (!value || value.length === 0) {
              callback(new Error('请至少选择一个工艺'))
            } else if (value.length > 10) {
              callback(new Error('最多只能选择10个工艺'))
            } else {
              callback()
            }
          }, 
          trigger: 'change' 
        }
      ]
    }

    const quickCombinationRules = {
      name: [
        { required: true, message: '请输入组合名称', trigger: 'blur' }
      ]
    }



    const processCombinations = computed(() => {
      return store.processCombinations.map(combination => ({
        ...combination,
        processes: combination.processIds ? combination.processIds.map(id => 
          store.coatingProcesses.find(p => p.id === id)
        ).filter(Boolean) : []
      }))
    })

    // 获取工艺在组合中的使用情况
    const getProcessUsageInfo = (processId) => {
      const usedInCombinations = store.processCombinations.filter(combination => 
        combination.processIds && combination.processIds.includes(processId)
      )
      return usedInCombinations
    }

    // 根据工艺ID获取工艺名称
    const getProcessName = (processId) => {
      const process = store.coatingProcesses.find(p => p.id === processId)
      return process ? process.name : '未知工艺'
    }

    // 根据工艺ID获取工艺对象
    const getProcessById = (processId) => {
      return store.coatingProcesses.find(p => p.id === processId)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }


    
    // 自动生成工艺编码
    const generateProcessCode = () => {
      return generateProcessCodeUtil(store.coatingProcesses || [])
    }

    const handleProcessSelectionChange = (selection) => {
      selectedProcesses.value = selection
    }

    const canViewResource = (resource) => authStore.hasPermission(resource, 'view')

    const handleEditProcess = (process) => {
      editingProcess.value = process
      processForm.name = process.name
      processForm.code = process.code || ''
      processForm.type = process.type
      processForm.description = process.description
      showAddProcessDialog.value = true
    }



    const handleEditCombination = (combination) => {
      editingCombination.value = combination
      combinationForm.name = combination.name
      combinationForm.processIds = combination.processIds || []
      combinationForm.description = combination.description
      showAddCombinationDialog.value = true
    }

    const handleViewCombination = (combination) => {
      viewingCombination.value = combination
      showViewCombinationDialog.value = true
    }

    const handleDeleteProcess = (item) => {
      deletingItem.value = item
      deletingType.value = 'process'
      showDeleteDialog.value = true
    }



    const handleDeleteCombination = (combination) => {
      deletingItem.value = combination
      deletingType.value = 'combination'
      showDeleteDialog.value = true
    }

    const handleSubmitProcess = async () => {
      if (!processFormRef.value) return
      
      try {
        await processFormRef.value.validate()
        
        if (editingProcess.value) {
          // 编辑工艺
          store.updateCoatingProcess(editingProcess.value.id, processForm)
          ElMessage.success('工艺更新成功')
        } else {
          // 新增工艺 - 自动生成编码
          const processData = {
            ...processForm,
            code: generateProcessCode()
          }
          store.addCoatingProcess(processData)
          ElMessage.success('工艺添加成功')
        }
        
        showAddProcessDialog.value = false
        resetProcessForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }



    const handleSubmitCombination = async () => {
      if (!combinationFormRef.value) return
      
      try {
        await combinationFormRef.value.validate()
        
        if (editingCombination.value) {
          // 编辑组合
          store.updateProcessCombination(editingCombination.value.id, combinationForm)
          ElMessage.success('组合更新成功')
        } else {
          // 新增组合
          store.addProcessCombination(combinationForm)
          ElMessage.success('组合添加成功')
        }
        
        showAddCombinationDialog.value = false
        resetCombinationForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const handleQuickCreateCombination = async () => {
      if (!quickCombinationFormRef.value) return

      try {
        await quickCombinationFormRef.value.validate()

        const combinationData = {
          ...quickCombinationForm,
          processIds: selectedProcesses.value.map(p => p.id)
        }
        store.addProcessCombination(combinationData)
        ElMessage.success('组合添加成功')
        showQuickCreateCombination.value = false
        resetQuickCombinationForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const resetQuickCombinationForm = () => {
      quickCombinationForm.name = ''
      quickCombinationForm.description = ''
      if (quickCombinationFormRef.value) {
        quickCombinationFormRef.value.resetFields()
      }
    }

    const confirmDelete = () => {
      if (deletingItem.value) {
        if (deletingType.value === 'process') {
          // 删除工艺
          store.deleteCoatingProcess(deletingItem.value.id)
          ElMessage.success('工艺删除成功')
        } else {
          // 删除组合
          store.deleteProcessCombination(deletingItem.value.id)
          ElMessage.success('组合删除成功')
        }
        showDeleteDialog.value = false
        deletingItem.value = null
        deletingType.value = ''
      }
    }

    const resetProcessForm = () => {
      editingProcess.value = null
      processForm.name = ''
      processForm.code = ''
      processForm.type = 'single'
      processForm.description = ''
      if (processFormRef.value) {
        processFormRef.value.resetFields()
      }
    }



    const resetCombinationForm = () => {
      editingCombination.value = null
      combinationForm.name = ''
      combinationForm.processIds = []
      combinationForm.description = ''
      if (combinationFormRef.value) {
        combinationFormRef.value.resetFields()
      }
    }

    onMounted(() => {
      let changed = false

      store.coatingProcesses.forEach((process, index) => {
        if (!process.code) {
          process.code = `P${String(index + 1).padStart(3, '0')}`
          changed = true
        }
      })
      
      const compositeProcesses = store.coatingProcesses.filter(process => process.type === 'composite')
      compositeProcesses.forEach(process => {
        const processIds = process.processIds || []
        const alreadyMigrated = store.processCombinations.some(combination => {
          return combination.name === process.name && JSON.stringify(combination.processIds || []) === JSON.stringify(processIds)
        })

        if (!alreadyMigrated) {
          store.addProcessCombination({
            name: process.name,
            description: process.description,
            processIds
          })
        }

        store.deleteCoatingProcess(process.id)
        changed = true
      })
      
      if (changed) {
        store.saveToLocalStorage()
      }
    })

    return {
      store,
      canViewResource,
      activeTab,
      showAddProcessDialog,
      showAddCombinationDialog,
      showQuickCreateCombination,
      showViewCombinationDialog,
      showDeleteDialog,
      editingProcess,
      editingCombination,
      viewingCombination,
      deletingItem,
      deletingType,
      selectedProcesses,
      processFormRef,
      combinationFormRef,
      quickCombinationFormRef,
      processForm,
      combinationForm,
      quickCombinationForm,
      processRules,
      combinationRules,
      quickCombinationRules,
      processCombinations,
      formatDate,
      generateProcessCode,
      getProcessUsageInfo,
      getProcessName,
      getProcessById,
      handleProcessSelectionChange,
      handleEditProcess,
      handleEditCombination,
      handleViewCombination,
      handleDeleteProcess,
      handleDeleteCombination,
      handleSubmitProcess,
      handleSubmitCombination,
      handleQuickCreateCombination,
      confirmDelete
    }
  }
}
</script>

<style scoped>
.coating-process {
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

.tab-content {
  padding: 20px 0;
}

.action-bar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.action-bar .el-button {
  font-size: 14px;
  padding: 8px 16px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.action-buttons .el-button {
  margin: 1px;
  font-size: 12px;
  padding: 4px 8px;
}

/* 响应式按钮布局 */
@media (max-width: 1200px) {
  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
  
  .action-buttons .el-button {
    width: 100%;
    margin: 1px 0;
  }
}

@media (max-width: 768px) {
  .coating-process {
    padding: 0;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .tab-content {
    padding: 12px 0;
  }

  :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }

  :deep(.el-tabs__nav) {
    white-space: nowrap;
  }

  .action-bar {
    justify-content: flex-start;
  }
  
  .action-bar .el-button {
    width: 100%;
    margin: 10px 0;
    font-size: 11px;
    padding: 3px 6px;
  }
}



.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .colors-grid {
    grid-template-columns: 1fr;
  }

  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .dialog-footer .el-button {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .page-header {
    margin-bottom: 12px;
  }

  .processes-list {
    grid-template-columns: 1fr;
  }

  .process-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}

.quick-create-content {
  padding: 10px 0;
}

.selected-processes-info {
  margin: 0 0 10px 0;
  font-weight: 500;
  color: #409eff;
}

.selected-processes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.combination-details {
  padding: 10px 0;
}

.combination-processes {
  margin-top: 20px;
}

.combination-processes h4 {
  margin: 0 0 15px 0;
  color: #409eff;
  font-size: 16px;
}

.processes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.process-card {
  margin-bottom: 10px;
}

.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.process-name {
  font-weight: 500;
  color: #303133;
}

.process-content p {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.process-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.process-tags .el-tag {
  margin: 2px;
}
</style> 
