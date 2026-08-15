<template>
  <div class="inventory">
    <div class="page-header">
      <h1>库存管理</h1>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="产品名称">
          <el-input v-model="searchForm.productName" placeholder="请输入产品名称或编码" clearable />
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
        <el-form-item label="材料名称">
          <el-select v-model="searchForm.materialId" placeholder="请选择材料" clearable>
            <el-option
              v-for="material in (store.materials || [])"
              :key="material.id"
              :label="material.name"
              :value="material.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select v-model="searchForm.stockStatus" placeholder="请选择库存状态" clearable>
            <el-option label="有库存" value="inStock" />
            <el-option label="低库存" value="lowStock" />
            <el-option label="无库存" value="outOfStock" />
          </el-select>
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

    <!-- 库存统计 -->
    <el-card class="stats-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-number">{{ totalProducts }}</div>
            <div class="stat-label">产品总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-number">{{ inStockCount }}</div>
            <div class="stat-label">有库存</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-number">{{ lowStockCount }}</div>
            <div class="stat-label">低库存</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-number">{{ outOfStockCount }}</div>
            <div class="stat-label">无库存</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 搜索导向提示 -->
    <el-card v-if="searchForm.materialId" class="search-guidance-card">
      <el-alert
        :title="'使用材料' + selectedMaterialName + '的产品'"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <div v-if="productsUsingMaterial.length > 0">
            <p>以下产品使用了该材料：</p>
            <div class="material-products">
              <el-tag 
                v-for="product in productsUsingMaterial" 
                :key="product.id"
                type="primary"
                size="small"
                style="margin-right: 8px; margin-bottom: 4px;"
              >
                {{ product.name }}
              </el-tag>
            </div>
          </div>
          <div v-else>
            <p>暂无产品使用该材料</p>
          </div>
        </template>
      </el-alert>
    </el-card>

    <!-- 库存管理标签页 -->
    <el-card>
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 产品库存标签页 -->
        <el-tab-pane label="产品库存" name="products">
          <div class="tab-header">
            <h3>产品库存明细</h3>
            <el-button type="primary" @click="exportProductInventory">
              导出产品库存
            </el-button>
          </div>

          <el-table :data="filteredProductInventory" style="width: 100%" v-loading="loading" max-height="600">
            <el-table-column prop="productCode" label="产品编码" width="120" fixed="left" />
            <el-table-column prop="productName" label="产品名称" width="150" fixed="left" />
            <el-table-column prop="customerName" label="客户" width="120" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="coatingProcess" label="涂装工艺" width="120" />
                         <el-table-column prop="materials" label="所用材料" width="200">
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
                 <span v-else>-</span>
               </template>
             </el-table-column>
            <el-table-column prop="totalInbound" label="入库数量" width="100" />
            <el-table-column prop="totalOutbound" label="出库数量" width="100" />
            <el-table-column prop="currentStock" label="当前库存" width="100">
              <template #default="scope">
                <el-tag :type="getStockTagType(scope.row.currentStock)">
                  {{ scope.row.currentStock }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="stockValue" label="库存价值" width="120">
              <template #default="scope">
                <span>¥{{ (scope.row.currentStock * (scope.row.unitPrice || 0)).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastInboundDate" label="最后入库" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.lastInboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="lastOutboundDate" label="最后出库" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.lastOutboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="stockStatus" label="库存状态" width="100">
              <template #default="scope">
                <el-tag :type="getStockStatusType(scope.row.currentStock)">
                  {{ getStockStatusText(scope.row.currentStock) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="turnoverRate" label="周转率" width="100">
              <template #default="scope">
                <span>{{ calculateTurnoverRate(scope.row) }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="primary" size="small" @click="viewProductStockHistory(scope.row)">
                    查看记录
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 材料库存标签页 -->
        <el-tab-pane label="材料库存" name="materials">
          <div class="tab-header">
            <h3>材料库存明细</h3>
            <el-button type="primary" @click="exportMaterialInventory">
              导出材料库存
            </el-button>
          </div>

          <el-table :data="filteredMaterialInventory" style="width: 100%" v-loading="loading" max-height="600">
            <el-table-column prop="materialCode" label="材料编码" width="120" fixed="left" />
            <el-table-column prop="materialName" label="材料名称" width="150" fixed="left" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="materialType" label="材料类型" width="100" />
            <el-table-column prop="supplierName" label="供应商" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="unitPrice" label="单价" width="100">
              <template #default="scope">
                <span>¥{{ scope.row.unitPrice?.toFixed(2) || '0.00' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalInbound" label="入库数量" width="100" />
            <el-table-column prop="totalOutbound" label="出库数量" width="100" />
            <el-table-column prop="totalRecycled" label="回收数量" width="100" />
            <el-table-column prop="currentStock" label="当前库存" width="100">
              <template #default="scope">
                <el-tag :type="getStockTagType(scope.row.currentStock)">
                  {{ scope.row.currentStock }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="stockValue" label="库存价值" width="120">
              <template #default="scope">
                <span>¥{{ (scope.row.currentStock * (scope.row.unitPrice || 0)).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lastInboundDate" label="最后入库" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.lastInboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="lastOutboundDate" label="最后出库" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.lastOutboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="stockStatus" label="库存状态" width="100">
              <template #default="scope">
                <el-tag :type="getStockStatusType(scope.row.currentStock)">
                  {{ getStockStatusText(scope.row.currentStock) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="primary" size="small" @click="viewMaterialStockHistory(scope.row)">
                    查看记录
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 产品库存历史记录对话框 -->
    <el-dialog
      v-model="showProductHistoryDialog"
      title="产品库存历史记录"
      width="80%"
      :max-width="900"
    >
      <div v-if="selectedProduct" class="history-content">
        <div class="product-info">
          <h3>{{ selectedProduct.productName }}</h3>
          <div class="product-details">
            <div class="detail-row">
              <span class="detail-label">产品编码：</span>
              <span class="detail-value">{{ selectedProduct.productCode }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">客户：</span>
              <span class="detail-value">{{ selectedProduct.customerName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">规格型号：</span>
              <span class="detail-value">{{ selectedProduct.specification }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">涂装工艺：</span>
              <span class="detail-value">{{ selectedProduct.coatingProcess }}</span>
            </div>
                         <div class="detail-row">
               <span class="detail-label">所用材料：</span>
               <span class="detail-value">
                 <div v-if="selectedProduct.materials && selectedProduct.materials.length > 0">
                   <el-tag 
                     v-for="material in selectedProduct.materials" 
                     :key="material.id"
                     size="small"
                     style="margin-right: 4px; margin-bottom: 4px;"
                   >
                     {{ material.name }}
                   </el-tag>
                 </div>
                 <span v-else>-</span>
               </span>
             </div>
            <div class="detail-row">
              <span class="detail-label">当前库存：</span>
              <span class="detail-value">
                <el-tag :type="getStockTagType(selectedProduct.currentStock)">
                  {{ selectedProduct.currentStock }}
                </el-tag>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">库存价值：</span>
              <span class="detail-value">¥{{ (selectedProduct.currentStock * (selectedProduct.unitPrice || 0)).toFixed(2) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">周转率：</span>
              <span class="detail-value">{{ calculateTurnoverRate(selectedProduct) }}%</span>
            </div>
          </div>
        </div>
        
        <el-tabs v-model="historyActiveTab">
          <el-tab-pane label="入库记录" name="inbound">
                         <el-table :data="inboundHistory" style="width: 100%">
               <el-table-column prop="orderNumber" label="订单号" width="120" />
               <el-table-column prop="quantity" label="数量" width="80" />
               <el-table-column prop="coatingProcess" label="涂装工艺" width="100" />
               <el-table-column prop="inboundDate" label="来料日期" width="100" />
               <el-table-column prop="createdAt" label="入库时间" width="120">
                 <template #default="scope">
                   {{ formatDate(scope.row.createdAt) }}
                 </template>
               </el-table-column>
             </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="出库记录" name="outbound">
                         <el-table :data="outboundHistory" style="width: 100%">
               <el-table-column prop="orderNumber" label="订单号" width="120" />
               <el-table-column prop="quantity" label="数量" width="80" />
               <el-table-column prop="coatingProcess" label="涂装工艺" width="100" />
               <el-table-column prop="lineNumber" label="产线号" width="80" />
               <el-table-column prop="createdAt" label="出库时间" width="120">
                 <template #default="scope">
                   {{ formatDate(scope.row.createdAt) }}
                 </template>
               </el-table-column>
             </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 材料库存历史记录对话框 -->
    <el-dialog
      v-model="showMaterialHistoryDialog"
      title="材料库存历史记录"
      width="80%"
      :max-width="900"
    >
      <div v-if="selectedMaterial" class="history-content">
        <div class="product-info">
          <h3>{{ selectedMaterial.materialName }}</h3>
          <div class="product-details">
            <div class="detail-row">
              <span class="detail-label">材料编码：</span>
              <span class="detail-value">{{ selectedMaterial.materialCode }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">规格型号：</span>
              <span class="detail-value">{{ selectedMaterial.specification }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">材料类型：</span>
              <span class="detail-value">{{ selectedMaterial.materialType }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">供应商：</span>
              <span class="detail-value">{{ selectedMaterial.supplierName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">当前库存：</span>
              <span class="detail-value">
                <el-tag :type="getStockTagType(selectedMaterial.currentStock)">
                  {{ selectedMaterial.currentStock }}
                </el-tag>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">库存价值：</span>
              <span class="detail-value">¥{{ (selectedMaterial.currentStock * (selectedMaterial.unitPrice || 0)).toFixed(2) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">消耗率：</span>
              <span class="detail-value">{{ calculateConsumptionRate(selectedMaterial) }}%</span>
            </div>
          </div>
        </div>
        
        <el-tabs v-model="materialHistoryActiveTab">
          <el-tab-pane label="入库记录" name="materialInbound">
            <el-table :data="materialInboundHistory" style="width: 100%">
              <el-table-column prop="orderNumber" label="订单号" width="120" />
              <el-table-column prop="quantity" label="数量" width="80" />
              <el-table-column prop="unitPrice" label="单价" width="100">
                <template #default="scope">
                  <span>¥{{ scope.row.unitPrice?.toFixed(2) || '0.00' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="supplierName" label="供应商" width="120" />
              <el-table-column prop="customerName" label="客户" width="120" />
              <el-table-column prop="productName" label="产品" width="150" />
              <el-table-column prop="createdAt" label="入库时间" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="出库记录" name="materialOutbound">
            <el-table :data="materialOutboundHistory" style="width: 100%">
              <el-table-column prop="orderNumber" label="领用单号" width="120" />
              <el-table-column prop="quantity" label="领用数量" width="100" />
              <el-table-column prop="productionLine" label="领用产线" width="120" />
              <el-table-column prop="productName" label="使用产品" width="150" />
              <el-table-column prop="productCode" label="产品编码" width="120" />
              <el-table-column prop="createdAt" label="领用时间" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="回收记录" name="materialRecycle">
            <el-table :data="materialRecycleHistory" style="width: 100%">
              <el-table-column prop="orderNumber" label="回收单号" width="120" />
              <el-table-column prop="quantity" label="回收数量" width="100" />
              <el-table-column prop="productionLine" label="回收产线" width="120" />
              <el-table-column prop="productName" label="来源产品" width="150" />
              <el-table-column prop="productCode" label="产品编码" width="120" />
              <el-table-column prop="recycleReason" label="回收原因" width="120" />
              <el-table-column prop="qualityStatus" label="质量状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.qualityStatus === 'good' ? 'success' : scope.row.qualityStatus === 'damaged' ? 'danger' : 'warning'">
                    {{ getQualityStatusText(scope.row.qualityStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="回收时间" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '../stores'
import * as XLSX from 'xlsx'

export default {
  name: 'Inventory',
  setup() {
    const store = useMainStore()
    
    
    const loading = ref(false)
    const activeTab = ref('products')
    const showProductHistoryDialog = ref(false)
    const showMaterialHistoryDialog = ref(false)
    const historyActiveTab = ref('inbound')
    const materialHistoryActiveTab = ref('materialInbound')
    const selectedProduct = ref(null)
    const selectedMaterial = ref(null)

    const searchForm = reactive({
      productName: '',
      customerId: '',
      materialId: '',
      stockStatus: '',
      dateRange: []
    })

    const totalProducts = computed(() => {
      return store.products.length
    })

    const inStockCount = computed(() => {
      return filteredProductInventory.value.filter(p => p.currentStock > 0).length
    })

    const lowStockCount = computed(() => {
      return filteredProductInventory.value.filter(p => p.currentStock > 0 && p.currentStock < 10).length
    })

    const outOfStockCount = computed(() => {
      return filteredProductInventory.value.filter(p => p.currentStock === 0).length
    })

    // 搜索导向相关计算属性
    const selectedMaterialName = computed(() => {
      if (!searchForm.materialId) return ''
      const material = store.materials.find(m => m.id === searchForm.materialId)
      return material?.name || ''
    })

    const productsUsingMaterial = computed(() => {
      if (!searchForm.materialId) return []
      return store.getProductsWithRelations.filter(product => {
        return product.steps && product.steps.some(step => step.materialId === searchForm.materialId)
      })
    })

    const filteredProductInventory = computed(() => {
      let inventory = store.getProductsWithRelations.map(product => {
        const inboundRecords = store.getInboundRecordsWithRelations.filter(record => record.productId === product.id)
        const outboundRecords = store.getOutboundRecordsWithRelations.filter(record => record.productId === product.id)
        const totalInbound = inboundRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0)
        const totalOutbound = outboundRecords.reduce((sum, record) => sum + Number(record.quantity || 0), 0)
        const lastInboundRecord = [...inboundRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        const lastOutboundRecord = [...outboundRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        const materials = product.steps.flatMap(step => step.materials || [])
        const currentStock = Math.max(0, totalInbound - totalOutbound)
        const unitPrice = product.price || product.unitPrice || 0

        return {
          ...product,
          productCode: product.code || '',
          productName: product.name || '',
          totalInbound,
          totalOutbound,
          currentStock,
          lastInboundDate: lastInboundRecord?.createdAt || null,
          lastOutboundDate: lastOutboundRecord?.createdAt || null,
          coatingProcess: lastInboundRecord?.coatingProcess || product.primaryProcessName || '未知工艺',
          materials,
          unitPrice,
          stockValue: currentStock * unitPrice,
          turnoverRate: totalInbound > 0 ? ((totalOutbound / totalInbound) * 100).toFixed(1) : 0
        }
      })

      if (searchForm.productName) {
        inventory = inventory.filter(item => 
          item.productName.toLowerCase().includes(searchForm.productName.toLowerCase()) ||
          item.productCode.toLowerCase().includes(searchForm.productName.toLowerCase())
        )
      }

      if (searchForm.customerId) {
        inventory = inventory.filter(item => item.customerId === searchForm.customerId)
      }

      // 根据材料筛选产品
      if (searchForm.materialId) {
        inventory = inventory.filter(item => {
          return item.materials && item.materials.some(material => material.id === searchForm.materialId)
        })
      }

      if (searchForm.stockStatus === 'inStock') {
        inventory = inventory.filter(item => item.currentStock > 0)
      } else if (searchForm.stockStatus === 'lowStock') {
        inventory = inventory.filter(item => item.currentStock > 0 && item.currentStock < 10)
      } else if (searchForm.stockStatus === 'outOfStock') {
        inventory = inventory.filter(item => item.currentStock === 0)
      }

      if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        inventory = inventory.filter(item => {
          const lastInboundDate = new Date(item.lastInboundDate)
          const lastOutboundDate = new Date(item.lastOutboundDate)
          const startDate = new Date(searchForm.dateRange[0])
          const endDate = new Date(searchForm.dateRange[1])
          
          return (lastInboundDate >= startDate && lastInboundDate <= endDate) ||
                 (lastOutboundDate >= startDate && lastOutboundDate <= endDate)
        })
      }

      return inventory.sort((a, b) => b.currentStock - a.currentStock)
    })

    const filteredMaterialInventory = computed(() => {
      let inventory = store.materials.map(material => {
        // 获取材料相关的入库、出库和回收记录
        const inboundRecords = store.materialInboundRecords?.filter(record => record.materialId === material.id) || []
        const outboundRecords = store.materialOutboundRecords?.filter(record => record.materialId === material.id) || []
        const recycleRecords = store.materialRecycleRecords?.filter(record => record.materialId === material.id) || []
        
        // 计算总数
        const totalInbound = inboundRecords.reduce((sum, record) => sum + record.quantity, 0)
        const totalOutbound = outboundRecords.reduce((sum, record) => sum + record.quantity, 0)
        const totalRecycled = recycleRecords.reduce((sum, record) => sum + record.quantity, 0)
        
        // 计算当前库存：入库 + 回收 - 出库
        const currentStock = Math.max(0, totalInbound + totalRecycled - totalOutbound)
        
        // 获取最新的入库记录
        const lastInboundRecord = inboundRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        
        // 获取最新的出库记录
        const lastOutboundRecord = outboundRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        
        // 获取最新的回收记录
        const lastRecycleRecord = recycleRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        
        // 获取材料类型和供应商信息
        const materialType = store.materialTypes?.find(t => t.id === material.typeId)
        const supplier = store.materialSuppliers?.find(s => s.id === material.supplierId)
        
        return {
          ...material,
          materialCode: material.code || '',
          materialName: material.name,
          materialType: materialType?.name || '未知类型',
          supplierName: supplier?.name || '未知供应商',
          unit: material.unit,
          unitPrice: material.unitPrice || 0,
          totalInbound,
          totalOutbound,
          totalRecycled,
          currentStock,
          lastInboundDate: lastInboundRecord?.createdAt || null,
          lastOutboundDate: lastOutboundRecord?.createdAt || null,
          lastRecycleDate: lastRecycleRecord?.createdAt || null,
          // 计算库存价值
          stockValue: currentStock * (material.unitPrice || 0),
          // 计算消耗率
          consumptionRate: totalInbound > 0 ? ((totalOutbound / totalInbound) * 100).toFixed(1) : 0
        }
      })

      // 应用搜索过滤
      if (searchForm.productName) {
        inventory = inventory.filter(item => 
          item.materialName.toLowerCase().includes(searchForm.productName.toLowerCase()) ||
          item.materialCode.toLowerCase().includes(searchForm.productName.toLowerCase())
        )
      }

      // 根据产品筛选材料（查找使用该材料的产品）
      if (searchForm.customerId) {
        inventory = inventory.filter(item => item.supplierId === searchForm.customerId)
      }

      if (searchForm.stockStatus === 'inStock') {
        inventory = inventory.filter(item => item.currentStock > 0)
      } else if (searchForm.stockStatus === 'lowStock') {
        inventory = inventory.filter(item => item.currentStock > 0 && item.currentStock < 10)
      } else if (searchForm.stockStatus === 'outOfStock') {
        inventory = inventory.filter(item => item.currentStock === 0)
      }

      return inventory.sort((a, b) => b.currentStock - a.currentStock)
    })

    const inboundHistory = computed(() => {
      if (!selectedProduct.value) return []
      
      return store.getInboundRecordsWithRelations
        .filter(record => 
          record.productId === selectedProduct.value.id
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    const outboundHistory = computed(() => {
      if (!selectedProduct.value) return []
      
      return store.getOutboundRecordsWithRelations
        .filter(record => 
          record.productId === selectedProduct.value.id
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    const materialInboundHistory = computed(() => {
      if (!selectedMaterial.value) return []
      
      return store.getMaterialInboundRecordsWithRelations
        .filter(record => 
          record.materialId === selectedMaterial.value.id
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    const materialOutboundHistory = computed(() => {
      if (!selectedMaterial.value) return []
      
      return store.getMaterialOutboundRecordsWithRelations
        .filter(record => 
          record.materialId === selectedMaterial.value.id
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    const materialRecycleHistory = computed(() => {
      if (!selectedMaterial.value) return []
      
      return store.getMaterialRecycleRecordsWithRelations
        .filter(record => 
          record.materialId === selectedMaterial.value.id
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }

    const handleSearch = () => {
      // 搜索逻辑已在computed中实现
    }

    const resetSearch = () => {
      Object.assign(searchForm, {
        productName: '',
        customerId: '',
        materialId: '',
        stockStatus: '',
        dateRange: []
      })
    }

    const viewProductStockHistory = (product) => {
      selectedProduct.value = product
      showProductHistoryDialog.value = true
    }

    const viewMaterialStockHistory = (material) => {
      selectedMaterial.value = material
      showMaterialHistoryDialog.value = true
    }

         const exportProductInventory = () => {
       const data = filteredProductInventory.value.map(item => ({
         '产品编码': item.productCode,
         '产品名称': item.productName,
         '客户': item.customerName,
         '规格型号': item.specification,
         '涂装工艺': item.coatingProcess,
         '所用材料': item.materials ? item.materials.map(m => m.name).join(', ') : '',
         '入库数量': item.totalInbound,
         '出库数量': item.totalOutbound,
         '当前库存': item.currentStock,
         '库存价值': `¥${(item.currentStock * (item.unitPrice || 0)).toFixed(2)}`,
         '库存状态': getStockStatusText(item.currentStock),
         '周转率': `${calculateTurnoverRate(item)}%`,
         '最后入库': item.lastInboundDate ? formatDate(item.lastInboundDate) : '',
         '最后出库': item.lastOutboundDate ? formatDate(item.lastOutboundDate) : ''
       }))
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '产品库存')
      
      const fileName = `产品库存明细_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      ElMessage.success('产品库存明细导出成功')
    }

    const exportMaterialInventory = () => {
      const data = filteredMaterialInventory.value.map(item => ({
        '材料编码': item.materialCode,
        '材料名称': item.materialName,
        '规格型号': item.specification,
        '材料类型': item.materialType,
        '供应商': item.supplierName,
        '单位': item.unit,
        '单价': `¥${item.unitPrice?.toFixed(2) || '0.00'}`,
        '入库数量': item.totalInbound,
        '出库数量': item.totalOutbound,
        '回收数量': item.totalRecycled,
        '当前库存': item.currentStock,
        '库存价值': `¥${(item.currentStock * (item.unitPrice || 0)).toFixed(2)}`,
        '库存状态': getStockStatusText(item.currentStock),
        '消耗率': `${calculateConsumptionRate(item)}%`,
        '最后入库': item.lastInboundDate ? formatDate(item.lastInboundDate) : '',
        '最后出库': item.lastOutboundDate ? formatDate(item.lastOutboundDate) : ''
      }))
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '材料库存')
      
      const fileName = `材料库存明细_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      ElMessage.success('材料库存明细导出成功')
    }

    const getStockTagType = (stock) => {
      if (stock > 0) return 'success'
      if (stock === 0) return 'danger'
      return 'warning'
    }

    const getStockStatusType = (stock) => {
      if (stock === 0) return 'danger'
      if (stock < 10) return 'warning'
      if (stock < 50) return 'info'
      return 'success'
    }

    const getStockStatusText = (stock) => {
      if (stock === 0) return '无库存'
      if (stock < 10) return '低库存'
      if (stock < 50) return '正常'
      return '充足'
    }

    const calculateTurnoverRate = (item) => {
      if (item.totalInbound === 0) return 0
      return ((item.totalOutbound / item.totalInbound) * 100).toFixed(1)
    }

    const calculateConsumptionRate = (item) => {
      if (item.totalInbound === 0) return 0
      return ((item.totalOutbound / item.totalInbound) * 100).toFixed(1)
    }

    const getQualityStatusText = (status) => {
      const statusMap = {
        'good': '良好',
        'slightly_damaged': '轻微损坏',
        'damaged': '严重损坏'
      }
      return statusMap[status] || '未知'
    }

    return {
      store,
      loading,
      activeTab,
      showProductHistoryDialog,
      showMaterialHistoryDialog,
      historyActiveTab,
      materialHistoryActiveTab,
      selectedProduct,
      selectedMaterial,
      searchForm,
      totalProducts,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      filteredProductInventory,
      filteredMaterialInventory,
      inboundHistory,
      outboundHistory,
      materialInboundHistory,
      materialOutboundHistory,
      materialRecycleHistory,
      formatDate,
      handleSearch,
      resetSearch,
      viewProductStockHistory,
      viewMaterialStockHistory,
      exportProductInventory,
      exportMaterialInventory,
      getStockTagType,
      getStockStatusType,
      getStockStatusText,
      calculateTurnoverRate,
      calculateConsumptionRate,
      getQualityStatusText,
      selectedMaterialName,
      productsUsingMaterial
    }
  }
}
</script>

<style scoped>
.inventory {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  color: #1e3a8a;
  margin: 0;
  font-size: 20px;
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

.color-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.product-info {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.product-info h3 {
  margin: 0 0 15px 0;
  color: #1e3a8a;
  font-size: 18px;
  font-weight: 600;
}

.product-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 80px;
  font-size: 14px;
}

.detail-value {
  color: #1f2937;
  font-size: 14px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h3 {
  margin: 0;
  color: #1e3a8a;
  font-size: 16px;
  font-weight: 600;
}

.search-card {
  margin-bottom: 20px;
}

.search-card .el-form {
  margin-bottom: 0;
}

.search-guidance-card {
  margin-bottom: 20px;
}

.material-products {
  margin-top: 8px;
}

.stats-card {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #1e3a8a;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.history-content {
  max-height: 500px;
  overflow-y: auto;
}

.product-info {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e9e9eb;
}

.product-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
}

.product-info p {
  margin-bottom: 5px;
  color: #606266;
  font-size: 14px;
}

.product-info strong {
  color: #303133;
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
  
  .stats-card .el-row {
    margin: 0;
  }
  
  .stats-card .el-col {
    padding: 0 10px;
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 12px;
  }
}
</style> 
