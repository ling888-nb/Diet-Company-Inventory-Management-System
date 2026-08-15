<template>
  <div class="inbound">
    <div class="page-header">
      <div class="header-left">
        <h1>入库管理</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" v-permission="{ module: 'inboundRecords', action: 'create' }" @click="showAddDialog = true">
          新增入库
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" class="search-form">
        <div class="search-row">
          <el-form-item label="订单号">
            <el-input v-model="searchForm.orderNumber" placeholder="请输入订单号" clearable />
          </el-form-item>
          <el-form-item label="客户">
            <el-select v-model="searchForm.customerId" placeholder="请选择客户" clearable>
              <el-option
                v-for="customer in (store.customers || [])"
                :key="customer.id"
                :label="customer.name"
                :value="customer.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="产品">
            <el-select v-model="searchForm.productId" placeholder="请选择产品" clearable>
              <el-option
                v-for="product in (store.products || [])"
                :key="product.id"
                :label="product.name"
                :value="product.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="入库日期">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </div>
        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="resetSearch">
            重置
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 入库记录列表 -->
    <el-card>
      <el-table :data="filteredInboundRecords" style="width: 100%" v-loading="loading">
        <el-table-column prop="orderNumber" label="订单号" width="120" />
        <el-table-column prop="flowNumber" label="流转单号" width="120" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="productName" label="产品" width="120" />
        <el-table-column prop="coatingProcess" label="涂装工艺" width="100" />

        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column prop="inboundDate" label="来料日期" width="100" />
        <el-table-column prop="createdAt" label="入库时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="handleViewFlow(scope.row)">
                查看流转单
              </el-button>
              <el-button type="success" size="small" v-permission="{ module: 'inboundRecords', action: 'update' }" @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" v-permission="{ module: 'inboundRecords', action: 'delete' }" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑入库对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingRecord ? '编辑入库记录' : '新增入库记录'"
      width="50%"
      :max-width="650"
    >
      <el-form
        ref="inboundFormRef"
        :model="inboundForm"
        :rules="inboundRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerId">
              <el-select 
                v-model="inboundForm.customerId" 
                placeholder="请选择客户"
                @change="handleCustomerChange"
                style="width: 100%"
              >
                <el-option
                  v-for="customer in (store.customers || [])"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品" prop="productId">
              <el-select 
                v-model="inboundForm.productId" 
                placeholder="请选择产品"
                @change="handleProductChange"
                style="width: 100%"
              >
                <el-option
                  v-for="product in availableProducts"
                  :key="product.id"
                  :label="product.name"
                  :value="product.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 产品关联信息显示 -->
        <div v-if="selectedProductInfo" class="product-info-display">
          <el-card class="info-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>关联产品信息</span>
              </div>
            </template>
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="info-item">
                  <label>产品编码：</label>
                  <span>{{ selectedProductInfo.code }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>规格型号：</label>
                  <span>{{ selectedProductInfo.specification || '-' }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>单位：</label>
                  <span>{{ selectedProductInfo.unit || '-' }}</span>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="info-item">
                  <label>参考线速：</label>
                  <span>{{ selectedProductInfo.referenceLineSpeed ? `${selectedProductInfo.referenceLineSpeed} ${selectedProductInfo.referenceLineSpeedUnit || 'm/min'}` : '-' }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>参考炉温：</label>
                  <span>{{ selectedProductInfo.referenceFurnaceTemp ? `${selectedProductInfo.referenceFurnaceTemp} °C` : '-' }}</span>
                </div>
              </el-col>

            </el-row>
                         <el-row v-if="selectedProductInfo.steps && selectedProductInfo.steps.length > 0">
               <el-col :span="24">
                 <div class="info-item">
                   <label>涂装工艺步骤：</label>
                   <div class="steps-display">
                     <el-tag 
                       v-for="(step, index) in selectedProductInfo.steps" 
                       :key="step.id"
                       :type="index === 0 ? 'primary' : 'info'"
                       style="margin-right: 8px; margin-bottom: 4px;"
                     >
                       {{ index + 1 }}. {{ step.coatingProcessName }}
                     </el-tag>
                   </div>
                   <div class="field-hint" style="margin-top: 8px;">
                     <span style="color: #409eff;">系统将自动使用第一个步骤的涂装工艺</span>
                   </div>
                 </div>
               </el-col>
             </el-row>
          </el-card>
        </div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数量" prop="quantity">
              <el-input-number 
                v-model="inboundForm.quantity" 
                :min="1" 
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来料日期" prop="inboundDate">
              <el-date-picker
                v-model="inboundForm.inboundDate"
                type="date"
                placeholder="请选择来料日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input
            v-model="inboundForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'inboundRecords', action: editingRecord ? 'update' : 'create' }" @click="handleSubmit">
            {{ editingRecord ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 流转单查看对话框 -->
    <el-dialog
      v-model="showFlowDialog"
      title="流转单详情"
      width="90%"
      :max-width="1200"
    >
      <div v-if="selectedRecord" class="flow-sheet">
        <div class="flow-header">
          <h2>产品流转单</h2>
          <div class="flow-info">
            <el-row :gutter="20">
              <el-col :span="8">
                <p><strong>订单号：</strong>{{ selectedRecord.orderNumber }}</p>
                <p><strong>流转单号：</strong>{{ selectedRecord.flowNumber }}</p>
              </el-col>
              <el-col :span="8">
                <p><strong>客户：</strong>{{ selectedRecord.customerName }}</p>
                <p><strong>产品：</strong>{{ selectedRecord.productName }}</p>
              </el-col>
              <el-col :span="8">
                <p><strong>数量：</strong>{{ selectedRecord.quantity }}</p>
                <p><strong>来料日期：</strong>{{ selectedRecord.inboundDate }}</p>
              </el-col>
            </el-row>
          </div>
          
          <!-- 产品详细信息 -->
          <div v-if="selectedProductInfo" class="product-details">
            <h3>产品详细信息</h3>
            <el-row :gutter="20">
              <el-col :span="6">
                <p><strong>产品编码：</strong>{{ selectedProductInfo.code }}</p>
                <p><strong>规格型号：</strong>{{ selectedProductInfo.specification || '-' }}</p>
              </el-col>
              <el-col :span="6">
                <p><strong>单位：</strong>{{ selectedProductInfo.unit || '-' }}</p>
                <p><strong>参考线速：</strong>{{ selectedProductInfo.referenceLineSpeed ? `${selectedProductInfo.referenceLineSpeed} ${selectedProductInfo.referenceLineSpeedUnit || 'm/min'}` : '-' }}</p>
              </el-col>
              <el-col :span="6">
                <p><strong>参考炉温：</strong>{{ selectedProductInfo.referenceFurnaceTemp ? `${selectedProductInfo.referenceFurnaceTemp} °C` : '-' }}</p>

              </el-col>
              <el-col :span="6">
                <p><strong>涂装工艺：</strong>{{ selectedRecord.coatingProcess }}</p>

              </el-col>
            </el-row>
            
                         <!-- 涂装工艺步骤 -->
             <div v-if="selectedProductInfo.steps && selectedProductInfo.steps.length > 0" class="process-steps">
               <h4>涂装工艺步骤</h4>
               <el-table :data="selectedProductInfo.steps" style="width: 100%" border>
                 <el-table-column prop="stepNumber" label="步骤" width="80">
                   <template #default="scope">
                     {{ scope.$index + 1 }}
                   </template>
                 </el-table-column>
                 <el-table-column prop="coatingProcessName" label="工艺名称" width="150" />
                 <el-table-column prop="materials" label="所需材料" width="200">
                   <template #default="scope">
                     <div v-if="scope.row.materials && scope.row.materials.length > 0">
                                               <el-tag 
                          v-for="material in scope.row.materials" 
                          :key="material.id"
                          size="small"
                          style="margin-right: 4px; margin-bottom: 4px;"
                        >
                          {{ material.name }}
                        </el-tag>
                     </div>
                     <span v-else style="color: #909399;">-</span>
                   </template>
                 </el-table-column>
                 <el-table-column prop="lineSpeed" label="线速" width="120">
                   <template #default="scope">
                     {{ scope.row.lineSpeed ? `${scope.row.lineSpeed} ${scope.row.lineSpeedUnit || 'm/min'}` : '-' }}
                   </template>
                 </el-table-column>
                 <el-table-column prop="furnaceTemp" label="炉温" width="120">
                   <template #default="scope">
                     {{ scope.row.furnaceTemp ? `${scope.row.furnaceTemp} °C` : '-' }}
                   </template>
                 </el-table-column>
                 <el-table-column prop="notes" label="备注" min-width="150" />
               </el-table>
             </div>
          </div>
        </div>
        
                 <el-table :data="flowTableData" style="width: 100%">
           <el-table-column prop="process" label="工序" width="120" />
           <el-table-column prop="lineNumber" label="产线号" width="100" />
           <el-table-column prop="inspector" label="检验员" width="100" />
           <el-table-column prop="date" label="完成日期" width="120" />
           <el-table-column prop="notes" label="备注" min-width="150" />
         </el-table>
        
        <div class="flow-actions">
          <el-button type="primary" @click="printFlowSheet">
            打印流转单
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除" width="30%" :max-width="350">
      <p>确定要删除入库记录 "{{ deletingRecord?.orderNumber }}" 吗？</p>
      <p style="color: #f56c6c; font-size: 14px;">删除后无法恢复，请谨慎操作！</p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" v-permission="{ module: 'inboundRecords', action: 'delete' }" @click="confirmDelete">确定删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '../stores'

export default {
  name: 'Inbound',
  setup() {
    const store = useMainStore()
    const loading = ref(false)
    const showAddDialog = ref(false)
    const showFlowDialog = ref(false)
    const showDeleteDialog = ref(false)
    const editingRecord = ref(null)
    const deletingRecord = ref(null)
    const selectedRecord = ref(null)
    const inboundFormRef = ref()

    // 新增：选中的产品信息
    const selectedProductInfo = ref(null)

    const searchForm = reactive({
      orderNumber: '',
      customerId: '',
      productId: '',
      dateRange: []
    })

    const inboundForm = reactive({
      customerId: '',
      productId: '',
      quantity: 1,
      inboundDate: '',
      notes: ''
    })

    const inboundRules = {
      customerId: [
        { required: true, message: '请选择客户', trigger: 'change' }
      ],
      productId: [
        { required: true, message: '请选择产品', trigger: 'change' }
      ],

      quantity: [
        { required: true, message: '请输入数量', trigger: 'blur' }
      ],
      inboundDate: [
        { required: true, message: '请选择来料日期', trigger: 'change' }
      ]
    }



    const availableProducts = computed(() => {
      const products = store.getProductsWithRelations
      if (!inboundForm.customerId) return products
      return products.filter(product => product.customerId === inboundForm.customerId)
    })

    const getProductInfo = (productId) => {
      return productId ? store.getProductDetail(productId) : null
    }

    const filteredInboundRecords = computed(() => {
      let records = [...store.getInboundRecordsWithRelations]
      
      if (searchForm.orderNumber) {
        records = records.filter(record => 
          record.orderNumber.toLowerCase().includes(searchForm.orderNumber.toLowerCase())
        )
      }
      
      if (searchForm.customerId) {
        records = records.filter(record => record.customerId === searchForm.customerId)
      }
      
      if (searchForm.productId) {
        records = records.filter(record => record.productId === searchForm.productId)
      }
      
      if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        records = records.filter(record => {
          const recordDate = new Date(record.inboundDate)
          const startDate = new Date(searchForm.dateRange[0])
          const endDate = new Date(searchForm.dateRange[1])
          return recordDate >= startDate && recordDate <= endDate
        })
      }
      
      return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

         const flowTableData = computed(() => {
       const processes = [
         { process: '前处理', lineNumber: '', inspector: '', date: '', notes: '' },
         { process: '涂装', lineNumber: '', inspector: '', date: '', notes: '' },
         { process: '检验', lineNumber: '', inspector: '', date: '', notes: '' },
         { process: '包装', lineNumber: '', inspector: '', date: '', notes: '' },
         { process: '入库', lineNumber: '', inspector: '', date: '', notes: '' }
       ]
       return processes
     })

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }

    const handleSearch = () => {
      // 搜索逻辑已在computed中实现
    }

    const resetSearch = () => {
      Object.assign(searchForm, {
        orderNumber: '',
        customerId: '',
        productId: '',
        dateRange: []
      })
    }

    const handleCustomerChange = () => {
      inboundForm.productId = ''
      selectedProductInfo.value = null
    }

    const handleProductChange = () => {
      // 当产品选择变化时，更新产品信息显示
      if (inboundForm.productId) {
        selectedProductInfo.value = getProductInfo(inboundForm.productId)
      } else {
        selectedProductInfo.value = null
      }
    }

    // 监听产品选择变化
    watch(() => inboundForm.productId, (newProductId) => {
      if (newProductId) {
        selectedProductInfo.value = getProductInfo(newProductId)
      } else {
        selectedProductInfo.value = null
      }
    })

    const handleEdit = (record) => {
      editingRecord.value = record
      Object.assign(inboundForm, {
        customerId: record.customerId,
        productId: record.productId,
        quantity: record.quantity,
        inboundDate: record.inboundDate,
        notes: record.notes || ''
      })
      
      // 设置产品信息
      selectedProductInfo.value = getProductInfo(record.productId)
      
      showAddDialog.value = true
    }

    const handleDelete = (record) => {
      deletingRecord.value = record
      showDeleteDialog.value = true
    }

    const handleViewFlow = (record) => {
      selectedRecord.value = record
      // 设置产品信息用于流转单显示
      selectedProductInfo.value = getProductInfo(record.productId)
      showFlowDialog.value = true
    }

    const handleSubmit = async () => {
      if (!inboundFormRef.value) return
      
      try {
        await inboundFormRef.value.validate()
        
        const primaryProcess = store.getPrimaryProcessByProduct(inboundForm.productId)
        
        const recordData = {
          customerId: inboundForm.customerId,
          productId: inboundForm.productId,
          coatingProcessId: primaryProcess.id,
          quantity: inboundForm.quantity,
          inboundDate: inboundForm.inboundDate,
          notes: inboundForm.notes
        }
        
        if (editingRecord.value) {
          // 编辑入库记录
          store.updateInboundRecord(editingRecord.value.id, recordData)
          ElMessage.success('入库记录更新成功')
        } else {
          // 新增入库记录
          store.addInboundRecord(recordData)
          ElMessage.success('入库记录添加成功')
        }
        
        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const confirmDelete = () => {
      if (deletingRecord.value) {
        store.deleteInboundRecord(deletingRecord.value.id)
        ElMessage.success('入库记录删除成功')
        showDeleteDialog.value = false
        deletingRecord.value = null
      }
    }

    const printFlowSheet = () => {
      window.print()
    }

    const resetForm = () => {
      editingRecord.value = null
      selectedProductInfo.value = null
      Object.assign(inboundForm, {
        customerId: '',
        productId: '',
        quantity: 1,
        inboundDate: '',
        notes: ''
      })
      if (inboundFormRef.value) {
        inboundFormRef.value.resetFields()
      }
    }

    return {
      store,
      loading,
      showAddDialog,
      showFlowDialog,
      showDeleteDialog,
      editingRecord,
      deletingRecord,
      selectedRecord,
      selectedProductInfo,
      inboundFormRef,
      searchForm,
      inboundForm,
      inboundRules,
      availableProducts,
      filteredInboundRecords,
      flowTableData,
      formatDate,
      handleSearch,
      resetSearch,
      handleCustomerChange,
      handleProductChange,
      handleEdit,
      handleDelete,
      handleViewFlow,
      handleSubmit,
      confirmDelete,
      printFlowSheet
    }
  }
}
</script>

<style scoped>
.inbound {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  color: #1e3a8a;
  margin: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-left h1 {
  color: #1e3a8a;
  margin: 0;
  font-size: 20px;
}

.header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.search-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.search-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
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
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .header-right {
    justify-content: center;
  }
  
  .search-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .search-actions {
    justify-content: center;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
  
  .action-buttons .el-button {
    width: 100%;
    margin: 1px 0;
    font-size: 11px;
    padding: 3px 6px;
  }
}

.color-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.flow-sheet {
  padding: 20px;
}

.flow-header {
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #1e3a8a;
  padding-bottom: 20px;
}

.flow-header h2 {
  color: #1e3a8a;
  margin: 0 0 10px 0;
  font-size: 24px;
}

.flow-header h3 {
  color: #6b7280;
  margin: 0;
  font-size: 18px;
}

.flow-info {
  margin-bottom: 30px;
}

.flow-info p {
  margin: 10px 0;
  font-size: 14px;
}

.flow-table {
  margin-bottom: 30px;
}

.flow-table h4 {
  color: #1e3a8a;
  margin-bottom: 15px;
}

.flow-actions {
  text-align: center;
  margin-top: 30px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .search-card .el-form {
    display: flex;
    flex-direction: column;
  }
  
  .search-card .el-form-item {
    margin-bottom: 10px;
  }
}

@media print {
  .flow-sheet {
    padding: 0;
  }
  
  .flow-actions {
    display: none;
  }
}

.field-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.field-hint .el-icon {
  color: #409eff;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-option .color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

/* 新增样式 */
.product-info-display {
  margin: 20px 0;
}

.info-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-header {
  font-weight: 600;
  color: #1e3a8a;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.info-item label {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
  margin-right: 8px;
}

.info-item span {
  color: #303133;
}

.steps-display {
  margin-top: 8px;
}

.product-details {
  margin: 20px 0;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.product-details h3 {
  color: #1e3a8a;
  margin-bottom: 15px;
  font-size: 18px;
}

.product-details h4 {
  color: #1e3a8a;
  margin: 20px 0 10px 0;
  font-size: 16px;
}

.process-steps {
  margin-top: 20px;
}

.process-steps .el-table {
  margin-top: 10px;
}

@media print {
  .flow-sheet {
    padding: 0;
  }
  
  .flow-actions {
    display: none;
  }
  
  .product-details {
    background-color: white !important;
    border: 1px solid #000 !important;
  }
  
  .product-details h3,
  .product-details h4 {
    color: #000 !important;
  }
  
  .info-item label {
    color: #000 !important;
  }
  
  .info-item span {
    color: #000 !important;
  }
}
</style> 
