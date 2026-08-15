<template>
  <div class="outbound">
    <div class="page-header">
      <h1>出库管理</h1>
      <el-button type="primary" v-permission="{ module: 'outboundRecords', action: 'create' }" @click="handleAddOutbound">
        新增出库
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
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
        <el-form-item label="出库日期">
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
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="resetSearch">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 出库记录列表 -->
    <el-card>
      <el-table :data="filteredOutboundRecords" style="width: 100%" v-loading="loading">
        <el-table-column prop="orderNumber" label="订单号" width="120" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="productName" label="产品" width="120" />
        <el-table-column prop="coatingProcess" label="涂装工艺" width="100" />

        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column prop="lineNumber" label="产线号" width="80" />
        <el-table-column prop="notes" label="备注" min-width="120" />
        <el-table-column prop="createdAt" label="出库时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button type="success" size="small" v-permission="{ module: 'outboundRecords', action: 'update' }" @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" v-permission="{ module: 'outboundRecords', action: 'delete' }" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 搜索提示信息 -->
      <div v-if="filteredOutboundRecords.length === 0 && !loading" class="search-hint">
        <el-alert
          title="搜索提示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>出库以产品名称和客户名称搜索，可能会出现同样的产品多个订单号，然后根据现场流转单号选择出库</p>
          </template>
        </el-alert>
      </div>
    </el-card>

    <!-- 新增/编辑出库对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingRecord ? '编辑出库记录' : '新增出库记录'"
      width="70%"
      :max-width="900"
    >
      <el-form
        ref="outboundFormRef"
        :model="outboundForm"
        :rules="outboundRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerId">
              <el-select 
                v-model="outboundForm.customerId" 
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
                v-model="outboundForm.productId" 
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
                    <div class="field-hint" style="margin-top: 8px;">
                      <span style="color: #409eff;">系统将自动使用第一个步骤的涂装工艺</span>
                    </div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <el-row :gutter="20">

          <el-col :span="12">

          </el-col>
        </el-row>

        <!-- 实时库存显示 -->
        <div v-if="outboundForm.productId" class="stock-info-display">
          <el-card class="stock-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>实时库存信息</span>
              </div>
            </template>
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="info-item">
                  <label>总入库数量：</label>
                  <span>{{ totalInboundQuantity }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>已出库数量：</label>
                  <span>{{ totalOutboundQuantity }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>可用库存：</label>
                  <span class="stock-quantity" :class="{ 'low-stock': availableStockQuantity <= 10 }">
                    {{ availableStockQuantity }}
                    <el-tag :type="availableStockQuantity > 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px;">
                      {{ availableStockQuantity > 0 ? '有库存' : '无库存' }}
                    </el-tag>
                  </span>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出库产线" prop="lineNumber">
              <el-select 
                v-model="outboundForm.lineNumber" 
                placeholder="请选择出库产线"
                style="width: 100%"
                filterable
                allow-create
                default-first-option
              >
                <el-option label="产线1" value="产线1" />
                <el-option label="产线2" value="产线2" />
                <el-option label="产线3" value="产线3" />
                <el-option label="产线4" value="产线4" />
                <el-option label="产线5" value="产线5" />
                <el-option label="产线6" value="产线6" />
                <el-option label="产线7" value="产线7" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="*数量" prop="quantity">
              <el-input-number 
                v-model="outboundForm.quantity" 
                :min="1" 
                :max="Math.max(availableStockQuantity, 1)"
                style="width: 100%"
                placeholder="请输入数量"
                :disabled="availableStockQuantity <= 0"
              />
              <div v-if="availableStockQuantity <= 0" class="field-hint">
                <span style="color: #f56c6c;">当前无可用库存</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 关联入库记录选择 -->
        <el-row :gutter="20" v-if="availableInboundRecords.length > 0">
          <el-col :span="24">
            <el-form-item label="关联入库记录" prop="inboundRecordId">
              <el-select 
                v-model="outboundForm.inboundRecordId" 
                placeholder="请选择关联的入库记录（可选）"
                style="width: 100%"
                clearable
                @change="handleInboundRecordChange"
              >
                <el-option
                  v-for="inboundRecord in availableInboundRecords"
                  :key="inboundRecord.id"
                  :label="`${inboundRecord.orderNumber} - ${inboundRecord.productName} - ${inboundRecord.quantity}件`"
                  :value="inboundRecord.id"
                >
                  <div class="inbound-option">
                    <div class="inbound-info">
                      <span class="order-number">{{ inboundRecord.orderNumber }}</span>
                      <span class="product-name">{{ inboundRecord.productName }}</span>
                    </div>
                    <div class="inbound-details">
                      <el-tag size="small" type="info">{{ inboundRecord.quantity }}件</el-tag>
                      <el-tag size="small" type="success">{{ formatDate(inboundRecord.createdAt) }}</el-tag>
                      <el-tag size="small" type="warning">{{ inboundRecord.coatingProcess }}</el-tag>
                    </div>
                  </div>
                </el-option>
              </el-select>
              <div class="field-hint">
                <span>选择关联的入库记录有助于追踪产品流向</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input
            v-model="outboundForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'outboundRecords', action: editingRecord ? 'update' : 'create' }" @click="handleSubmit" :disabled="availableStockQuantity <= 0">
            {{ editingRecord ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除" width="30%" :max-width="350">
      <p>确定要删除出库记录 "{{ deletingRecord?.orderNumber }}" 吗？</p>
      <p style="color: #f56c6c; font-size: 14px;">删除后无法恢复，请谨慎操作！</p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" v-permission="{ module: 'outboundRecords', action: 'delete' }" @click="confirmDelete">确定删除</el-button>
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
  name: 'Outbound',
  setup() {
    const store = useMainStore()
    const loading = ref(false)
    const showAddDialog = ref(false)
    const showDeleteDialog = ref(false)
    const editingRecord = ref(null)
    const deletingRecord = ref(null)
    const outboundFormRef = ref()

    // 新增：选中的产品信息
    const selectedProductInfo = ref(null)

    const searchForm = reactive({
      orderNumber: '',
      customerId: '',
      productId: '',
      dateRange: []
    })

    const outboundForm = reactive({
      customerId: '',
      productId: '',
      stockItemId: '',
      inboundRecordId: '',
      quantity: 1,
      lineNumber: '',
      notes: ''
    })

    const outboundRules = {
      customerId: [
        { required: true, message: '请选择客户', trigger: 'change' }
      ],
      productId: [
        { required: true, message: '请选择产品', trigger: 'change' }
      ],


      quantity: [
        { required: true, message: '请输入数量', trigger: 'blur' }
      ],
      lineNumber: [
        { required: false, message: '请选择出库产线', trigger: 'change' }
      ]
    }



    const availableProducts = computed(() => {
      const products = store.getProductsWithRelations
      if (!outboundForm.customerId) return products
      return products.filter(product => product.customerId === outboundForm.customerId)
    })

    const getProductInfo = (productId) => {
      return productId ? store.getProductDetail(productId) : null
    }

    const selectedProcessId = computed(() => {
      return selectedProductInfo.value?.primaryProcessId || store.getPrimaryProcessByProduct(outboundForm.productId).id
    })

    const selectedProductStock = computed(() => {
      if (!outboundForm.productId) {
        return { totalInbound: 0, totalOutbound: 0, availableQuantity: 0 }
      }

      const stock = store.getProductStock(outboundForm.productId, selectedProcessId.value)
      const editableQuantity = editingRecord.value?.productId === outboundForm.productId
        ? Number(editingRecord.value.quantity || 0)
        : 0

      return {
        totalInbound: stock.totalInbound,
        totalOutbound: Math.max(0, stock.totalOutbound - editableQuantity),
        availableQuantity: stock.availableQuantity + editableQuantity
      }
    })

    const totalInboundQuantity = computed(() => {
      return selectedProductStock.value.totalInbound
    })

    const totalOutboundQuantity = computed(() => {
      return selectedProductStock.value.totalOutbound
    })

    const availableStockQuantity = computed(() => {
      return selectedProductStock.value.availableQuantity
    })

    const availableStockItems = computed(() => {
      const stockMap = new Map()
      
      store.getInboundRecordsWithRelations.forEach(inboundRecord => {
        const key = `${inboundRecord.productId}-${inboundRecord.coatingProcessId}`
        
        if (!stockMap.has(key)) {
          stockMap.set(key, {
            id: key,
            productId: inboundRecord.productId,
            customerId: inboundRecord.customerId,
            coatingProcessId: inboundRecord.coatingProcessId,
            productName: inboundRecord.productName,
            customerName: inboundRecord.customerName,
            coatingProcess: inboundRecord.coatingProcess,
            totalInbound: 0,
            totalOutbound: 0,
            availableQuantity: 0
          })
        }

        stockMap.get(key).totalInbound += Number(inboundRecord.quantity || 0)
      })
      
      store.getOutboundRecordsWithRelations.forEach(outboundRecord => {
        const key = `${outboundRecord.productId}-${outboundRecord.coatingProcessId}`
        if (stockMap.has(key)) {
          stockMap.get(key).totalOutbound += Number(outboundRecord.quantity || 0)
        }
      })
      
      // 计算可用库存并过滤掉无库存的项目
      const stockItems = Array.from(stockMap.values())
        .map(item => ({
          ...item,
          availableQuantity: Math.max(0, item.totalInbound - item.totalOutbound)
        }))
        .filter(item => item.availableQuantity > 0)
        .sort((a, b) => b.availableQuantity - a.availableQuantity)
      
      return stockItems
    })

    const selectedStockItem = computed(() => {
      if (!outboundForm.stockItemId) return null
      return availableStockItems.value.find(item => item.id === outboundForm.stockItemId)
    })

    const availableInboundRecords = computed(() => {
      if (!outboundForm.productId) {
        return []
      }
      
      return store.getInboundRecordsWithRelations
        .filter(record => 
          record.productId === outboundForm.productId &&
          (!selectedProcessId.value || record.coatingProcessId === selectedProcessId.value)
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })



    const filteredOutboundRecords = computed(() => {
      let records = [...store.getOutboundRecordsWithRelations]
      
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
          const recordDate = new Date(record.createdAt)
          const startDate = new Date(searchForm.dateRange[0])
          const endDate = new Date(searchForm.dateRange[1])
          return recordDate >= startDate && recordDate <= endDate
        })
      }
      
      return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
      outboundForm.productId = ''
      selectedProductInfo.value = null
    }

    const handleProductChange = () => {
      // 当产品选择变化时，更新产品信息显示
      if (outboundForm.productId) {
        selectedProductInfo.value = getProductInfo(outboundForm.productId)
      } else {
        selectedProductInfo.value = null
      }
    }

    // 监听产品选择变化
    watch(() => outboundForm.productId, (newProductId) => {
      if (newProductId) {
        selectedProductInfo.value = getProductInfo(newProductId)
      } else {
        selectedProductInfo.value = null
      }
    })

    const handleStockItemChange = (stockItemId) => {
      if (stockItemId) {
        const stockItem = availableStockItems.value.find(item => item.id === stockItemId)
        if (stockItem) {
          outboundForm.customerId = stockItem.customerId
          outboundForm.productId = stockItem.productId
          outboundForm.inboundRecordId = ''
          outboundForm.quantity = 1
        }
      } else {
        // 清空表单
        outboundForm.customerId = ''
        outboundForm.productId = ''
        outboundForm.inboundRecordId = ''
        outboundForm.quantity = 1
      }
    }

    const handleInboundRecordChange = (inboundRecordId) => {
      if (inboundRecordId) {
        const inboundRecord = store.getInboundRecordsWithRelations.find(record => record.id === inboundRecordId)
        if (inboundRecord) {
          outboundForm.customerId = inboundRecord.customerId
          outboundForm.productId = inboundRecord.productId
        }
      }
    }

    const handleEdit = (record) => {
      editingRecord.value = record
      const stockItemId = `${record.productId}-${record.coatingProcessId}`
      Object.assign(outboundForm, {
        customerId: record.customerId,
        productId: record.productId,
        stockItemId: stockItemId,
        inboundRecordId: record.inboundRecordId || '',
        quantity: record.quantity,
        lineNumber: record.lineNumber,
        notes: record.notes || ''
      })
      selectedProductInfo.value = getProductInfo(record.productId)
      showAddDialog.value = true
    }

    const handleDelete = (record) => {
      deletingRecord.value = record
      showDeleteDialog.value = true
    }

    const handleAddOutbound = () => {
      resetForm()
      showAddDialog.value = true
    }

    const handleSubmit = async () => {
      if (!outboundFormRef.value) return
      
      try {
        await outboundFormRef.value.validate()
        
        // 检查库存是否足够
        if (outboundForm.quantity > availableStockQuantity.value) {
          ElMessage.error(`库存不足，可用库存: ${availableStockQuantity.value}`)
          return
        }
        
        const primaryProcess = store.getPrimaryProcessByProduct(outboundForm.productId)
        
        const recordData = {
          customerId: outboundForm.customerId,
          productId: outboundForm.productId,
          coatingProcessId: primaryProcess.id,
          inboundRecordId: outboundForm.inboundRecordId,
          quantity: outboundForm.quantity,
          lineNumber: outboundForm.lineNumber,
          notes: outboundForm.notes
        }
        
        if (editingRecord.value) {
          // 编辑出库记录
          store.updateOutboundRecord(editingRecord.value.id, recordData)
          ElMessage.success('出库记录更新成功')
        } else {
          // 新增出库记录
          store.addOutboundRecord(recordData)
          ElMessage.success('出库记录添加成功')
        }
        
        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const confirmDelete = () => {
      if (deletingRecord.value) {
        store.deleteOutboundRecord(deletingRecord.value.id)
        ElMessage.success('出库记录删除成功')
        showDeleteDialog.value = false
        deletingRecord.value = null
      }
    }

    const resetForm = () => {
      editingRecord.value = null
      selectedProductInfo.value = null
      Object.assign(outboundForm, {
        customerId: '',
        productId: '',
        stockItemId: '',
        inboundRecordId: '',
        quantity: 1,
        lineNumber: '',
        notes: ''
      })
      if (outboundFormRef.value) {
        outboundFormRef.value.resetFields()
      }
    }

    return {
      store,
      loading,
      showAddDialog,
      showDeleteDialog,
      editingRecord,
      deletingRecord,
      selectedProductInfo,
      outboundFormRef,
      searchForm,
      outboundForm,
      outboundRules,
      availableProducts,
      totalInboundQuantity,
      totalOutboundQuantity,
      availableStockQuantity,
      filteredOutboundRecords,
      formatDate,
      handleSearch,
      resetSearch,
      handleStockItemChange,
      handleInboundRecordChange,
      availableStockItems,
      selectedStockItem,
      availableInboundRecords,
      handleCustomerChange,
      handleProductChange,
      handleEdit,
      handleDelete,
      handleAddOutbound,
      handleSubmit,
      confirmDelete,
      resetForm
    }
  }
}
</script>

<style scoped>
.outbound {
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

.search-card {
  margin-bottom: 20px;
}

.search-card .el-form {
  margin-bottom: 0;
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

.stock-info {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.search-hint {
  margin-top: 20px;
}

.search-hint .el-alert {
  margin-bottom: 0;
}

.search-hint p {
  margin: 0;
  line-height: 1.5;
}

.inbound-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.inbound-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-number {
  font-weight: 600;
  color: #1e3a8a;
  font-size: 14px;
}

.product-name {
  color: #6b7280;
  font-size: 12px;
}

.inbound-details {
  display: flex;
  gap: 4px;
  align-items: center;
}

.inbound-details .el-tag {
  font-size: 10px;
  padding: 2px 6px;
}

.stock-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-info .product-name {
  font-weight: 600;
  color: #1e3a8a;
  font-size: 14px;
}

.stock-info .customer-name {
  color: #6b7280;
  font-size: 12px;
}

.stock-details {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.stock-details .el-tag {
  font-size: 10px;
  padding: 2px 6px;
}

.stock-details .color-display {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stock-details .color-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
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

.stock-info-display {
  margin: 20px 0;
}

.stock-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.stock-quantity {
  font-weight: 600;
  font-size: 16px;
}

.stock-quantity.low-stock {
  color: #f56c6c;
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
</style> 
