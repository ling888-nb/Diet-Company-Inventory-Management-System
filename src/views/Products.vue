<template>
  <div class="products">
    <div class="page-header">
        <h1>产品信息管理</h1>
        <el-button type="primary" v-permission="{ module: 'products', action: 'create' }" @click="handleAddProduct">
          新增产品
        </el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
          <el-form-item label="产品名称">
            <el-input v-model="searchForm.name" placeholder="请输入产品名称" clearable />
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
        <el-form-item label="规格型号">
          <el-input v-model="searchForm.specification" placeholder="请输入规格型号" clearable />
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

    <!-- 产品列表 -->
    <el-card>
      <el-table :data="filteredProducts" style="width: 100%" v-loading="loading">
        <el-table-column prop="code" label="产品编码" width="120" />
        <el-table-column prop="name" label="产品名称" width="150" />
        <el-table-column prop="specification" label="规格型号" width="150" />
        <el-table-column prop="customerName" label="关联客户" width="120" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="scope">
            ¥{{ scope.row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="referenceLineSpeed" label="参考线速" width="150">
          <template #default="scope">
            {{ scope.row.referenceLineSpeed ? `${scope.row.referenceLineSpeed} ${scope.row.referenceLineSpeedUnit || 'm/min'}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="referenceFurnaceTemp" label="参考炉温" width="120">
          <template #default="scope">
            {{ scope.row.referenceFurnaceTemp ? `${scope.row.referenceFurnaceTemp} °C` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="150" />
        <el-table-column prop="createdAt" label="创建时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button type="success" size="small" v-permission="{ module: 'products', action: 'update' }" @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button type="primary" size="small" @click="handleViewSteps(scope.row)">
                查看步骤
              </el-button>
              <el-button type="danger" size="small" v-permission="{ module: 'products', action: 'delete' }" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑产品对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingProduct ? '编辑产品' : '新增产品'"
      width="80%"
      :max-width="1200"
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户" prop="customerId">
              <el-select 
                v-model="productForm.customerId" 
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
            <el-form-item label="产品编码" prop="code">
              <el-input v-model="productForm.code" placeholder="产品编码将自动生成" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品名称" prop="name">
              <el-input v-model="productForm.name" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号" prop="specification">
              <el-input v-model="productForm.specification" placeholder="请输入规格型号" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="productForm.unit" placeholder="请选择单位" style="width: 100%">
                <el-option label="个" value="个" />
                <el-option label="件" value="件" />
                <el-option label="套" value="套" />
                <el-option label="米" value="米" />
                <el-option label="平方米" value="平方米" />
                <el-option label="立方米" value="立方米" />
                </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价" prop="price">
              <el-input-number 
                v-model="productForm.price" 
                :min="0" 
                :precision="2"
                style="width: 100%"
                placeholder="请输入单价（可选）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="参考线速" prop="referenceLineSpeed">
              <el-input-number 
                v-model="productForm.referenceLineSpeed" 
                :min="0" 
                :precision="1"
                style="width: 100%"
                placeholder="请输入参考线速"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="单位">
              <el-select 
                v-model="productForm.referenceLineSpeedUnit" 
                placeholder="单位"
                style="width: 100%"
                filterable
                allow-create
                default-first-option
              >
                <el-option label="m/min" value="m/min" />
                <el-option label="m/s" value="m/s" />
                <el-option label="cm/min" value="cm/min" />
                <el-option label="ft/min" value="ft/min" />
                <el-option label="m/h" value="m/h" />
                <el-option label="HZ" value="HZ" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="参考炉温" prop="referenceFurnaceTemp">
              <el-input-number 
                v-model="productForm.referenceFurnaceTemp" 
                :min="0" 
                :precision="1"
                style="width: 100%"
                placeholder="请输入参考炉温 (°C)"
              />
            </el-form-item>
          </el-col>
        </el-row>



            <el-form-item label="备注">
              <el-input 
                v-model="productForm.notes" 
                type="textarea" 
                :rows="3"
            placeholder="请输入备注（选填）"
              />
            </el-form-item>



        <!-- 制作步骤 -->
        <el-form-item label="制作步骤">
          <div class="steps-container">
            <div class="steps-header">
              <h4>涂装工艺步骤</h4>
              <el-button type="primary" size="small" @click="addStep">
                添加步骤
              </el-button>
            </div>
            
            <draggable 
              v-model="productForm.steps" 
              item-key="id"
              handle=".drag-handle"
              class="steps-list"
            >
              <template #item="{ element: step, index }">
                <div class="step-item">
                  <div class="step-header">
                    <div class="drag-handle">
                      <span>步骤 {{ index + 1 }}</span>
                    </div>
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="removeStep(index)"
                      style="margin-left: 10px;"
                    >
                      删除
                    </el-button>
                  </div>
                
                <el-row :gutter="20">
                  <el-col :span="8">
                      <el-form-item label="涂装工艺">
                      <el-select 
                          v-model="step.coatingProcessId" 
                          placeholder="请选择涂装工艺"
                        style="width: 100%"
                          clearable
                      >
                        <el-option
                            v-for="process in (store.coatingProcesses || [])"
                            :key="process.id"
                            :label="process.name"
                            :value="process.id"
                          >
                            <div class="process-option">
                              <span>{{ process.name }}</span>
                              <el-tag v-if="process.type === 'composite'" type="warning" size="small">
                                复合工艺
                              </el-tag>
                            </div>
                          </el-option>
                      </el-select>
                        <!-- 显示已选择的工艺 -->
                        <div v-if="step.coatingProcessId" class="selected-process-display">
                          <small>已选择: {{ getSelectedProcessName(step.coatingProcessId) }}</small>
                        </div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                      <el-form-item label="使用的材料">
                      <el-select 
                          v-model="step.materialId" 
                          placeholder="请选择使用的材料"
                        style="width: 100%"
                          clearable
                      >
                        <el-option
                            v-for="material in (store.materials || [])"
                            :key="material.id"
                            :label="material.name"
                            :value="material.id"
                          >
                            <div class="material-option">
                              <span>{{ material.name }}</span>
                              <el-tag size="small" type="info">{{ material.specification }}</el-tag>
                            </div>
                          </el-option>
                      </el-select>
                        <!-- 显示已选择的材料 -->
                        <div v-if="step.materialId" class="selected-material-display">
                          <small>已选择: {{ getSelectedMaterialName(step.materialId) }}</small>
                        </div>
                    </el-form-item>
                  </el-col>

                  </el-row>


              </div>
            </template>
            </draggable>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'products', action: editingProduct ? 'update' : 'create' }" @click="handleSubmit">
            {{ editingProduct ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看步骤对话框 -->
    <el-dialog
      v-model="showStepsDialog"
      title="产品制作步骤"
      width="60%"
      :max-width="800"
    >
      <div v-if="selectedProduct" class="steps-view">
        <div class="product-info">
          <h3>{{ selectedProduct.name }}</h3>
          <p><strong>规格型号：</strong>{{ selectedProduct.specification }}</p>
          <p><strong>关联客户：</strong>{{ selectedProduct.customerName }}</p>
          <p><strong>参考线速：</strong>{{ selectedProduct.referenceLineSpeed ? `${selectedProduct.referenceLineSpeed} ${selectedProduct.referenceLineSpeedUnit || 'm/min'}` : '未设置' }}</p>
          <p><strong>参考炉温：</strong>{{ selectedProduct.referenceFurnaceTemp ? `${selectedProduct.referenceFurnaceTemp} °C` : '未设置' }}</p>
        </div>
        
        <div class="steps-list">
            <div 
            v-for="(step, index) in selectedProduct.steps" 
              :key="index" 
            class="step-item"
            >
            <div class="step-header">
              <h4>步骤 {{ index + 1 }}</h4>
              </div>
            <div class="step-content">
              <p><strong>涂装工艺：</strong>{{ step.coatingProcessName }}</p>
              <p><strong>使用的材料：</strong>{{ step.materialName || '未选择' }}</p>

                </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="showDeleteDialog" title="确认删除" width="30%" :max-width="350">
      <p>确定要删除产品 "{{ deletingProduct?.name }}" 吗？</p>
      <p style="color: #f56c6c; font-size: 14px;">删除后无法恢复，请谨慎操作！</p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" v-permission="{ module: 'products', action: 'delete' }" @click="confirmDelete">确定删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
    import { ref, reactive, computed } from 'vue'
    import { ElMessage } from 'element-plus'
    import { useMainStore } from '../stores'
    import draggable from 'vuedraggable'
    import { generateProductCode } from '../utils/codeGenerator.js'

export default {
  name: 'Products',
  components: {
    draggable
  },
  setup() {
    const store = useMainStore()
    const loading = ref(false)
    const showAddDialog = ref(false)
    const showDeleteDialog = ref(false)
    const showStepsDialog = ref(false)
    const editingProduct = ref(null)
    const deletingProduct = ref(null)
    const selectedProduct = ref(null)
    const productFormRef = ref()

    const searchForm = reactive({
      name: '',
      specification: '',
      customerId: ''
    })

    const productForm = reactive({
      customerId: '',
      customerCode: '',
      code: '',
      name: '',
      specification: '',
      unit: '个', // 新增单位字段
      price: 0, // 新增单价字段
      referenceLineSpeed: null, // 参考线速
      referenceLineSpeedUnit: 'm/min', // 参考线速单位
      referenceFurnaceTemp: null, // 参考炉温
      steps: [],
      notes: ''
    })

    const productRules = {
      customerId: [
        { required: true, message: '请选择关联客户', trigger: 'change' }
      ],
      code: [
        { required: false, message: '请输入产品编码', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入产品名称', trigger: 'blur' }
      ],
      specification: [
        { required: true, message: '请输入规格型号', trigger: 'blur' }
      ],
      price: [
        { required: false, message: '请输入单价', trigger: 'blur' }
      ]
    }

    const filteredProducts = computed(() => {
      let products = [...store.getProductsWithRelations]
      
      if (searchForm.name) {
        products = products.filter(product => 
          product.name.toLowerCase().includes(searchForm.name.toLowerCase())
        )
      }
      
      if (searchForm.specification) {
        products = products.filter(product => 
          product.specification.toLowerCase().includes(searchForm.specification.toLowerCase())
        )
      }
      
      if (searchForm.customerId) {
        products = products.filter(product => 
          product.customerId === searchForm.customerId
        )
      }
      
      return products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })



    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }


    
    const handleCustomerChange = () => {
      const customer = store.getCustomerById(productForm.customerId)
      productForm.customerCode = customer?.code || ''
      
      const customerChanged = editingProduct.value && editingProduct.value.customerId !== productForm.customerId
      if (productForm.customerId && (!editingProduct.value || customerChanged || !productForm.code)) {
        const productsForCode = store.products.filter(product => product.id !== editingProduct.value?.id)
        productForm.code = generateProductCode(productsForCode, productForm.customerCode, productForm.customerId)
      }
    }

    const addStep = () => {
      productForm.steps.push({
        id: Date.now() + Math.random(), // 生成唯一ID
        coatingProcessId: '',
        materialId: '',
        notes: ''
      })
    }

    const removeStep = (index) => {
      productForm.steps.splice(index, 1)
    }

    // 获取已选择工艺的名称
    const getSelectedProcessName = (processId) => {
      if (!processId) return '未知工艺'
      const process = store.getProcessById(processId)
      return process ? `${process.name} (${process.type === 'composite' ? '复合工艺' : '单一工艺'})` : '未知工艺'
    }

    // 获取已选择材料的名称
    const getSelectedMaterialName = (materialId) => {
      if (!materialId) return '未知材料'
      const material = store.getMaterialById(materialId)
      return material ? `${material.name} (${material.specification})` : '未知材料'
    }

    const handleSearch = () => {
      // 搜索逻辑已在computed中实现
    }

    const resetSearch = () => {
      Object.assign(searchForm, {
        name: '',
        specification: '',
        customerId: ''
      })
    }

    const handleEdit = (product) => {
      editingProduct.value = product
      Object.assign(productForm, {
        customerId: product.customerId,
        customerCode: product.customerCode,
        code: product.code || '',
        name: product.name,
        specification: product.specification,
        unit: product.unit || '个',
        price: product.price || 0,
        referenceLineSpeed: product.referenceLineSpeed || null,
        referenceLineSpeedUnit: product.referenceLineSpeedUnit || 'm/min',
        referenceFurnaceTemp: product.referenceFurnaceTemp || null,
        steps: (product.steps || []).map(step => ({
          ...step,
          id: step.id || Date.now() + Math.random() // 确保每个步骤都有ID
        })),
        notes: product.notes || ''
      })
      showAddDialog.value = true
    }

    const handleViewSteps = (product) => {
      selectedProduct.value = store.getProductDetail(product.id)
      showStepsDialog.value = true
    }

    const handleAddProduct = () => {
      resetProductForm()
      showAddDialog.value = true
    }

    const handleDelete = (product) => {
      deletingProduct.value = product
      showDeleteDialog.value = true
    }

    const handleSubmit = async () => {
      if (!productFormRef.value) return
      
      try {
        await productFormRef.value.validate()
        
        const productData = {
          customerId: productForm.customerId,
          customerCode: productForm.customerCode,
          code: productForm.code,
          name: productForm.name,
          specification: productForm.specification,
          unit: productForm.unit,
          price: productForm.price,
          referenceLineSpeed: productForm.referenceLineSpeed,
          referenceLineSpeedUnit: productForm.referenceLineSpeedUnit,
          referenceFurnaceTemp: productForm.referenceFurnaceTemp,
          steps: productForm.steps,
          notes: productForm.notes
        }
        
        if (editingProduct.value) {
          store.updateProduct(editingProduct.value.id, productData)
          ElMessage.success('产品信息更新成功')
        } else {
          store.addProduct(productData)
          ElMessage.success('产品信息添加成功')
        }
        
        showAddDialog.value = false
        resetProductForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const confirmDelete = () => {
      if (!deletingProduct.value) return
      
      store.deleteProduct(deletingProduct.value.id)
      ElMessage.success('产品信息删除成功')
      showDeleteDialog.value = false
      deletingProduct.value = null
    }

    const resetProductForm = () => {
      editingProduct.value = null
      Object.assign(productForm, {
        customerId: '',
        customerCode: '',
        code: '',
        name: '',
        specification: '',
        unit: '个',
        price: 0,
        referenceLineSpeed: null,
        referenceLineSpeedUnit: 'm/min',
        referenceFurnaceTemp: null,
        steps: [],
        notes: ''
      })
      if (productFormRef.value) {
        productFormRef.value.resetFields()
      }
    }

    return {
      store,
      loading,
      showAddDialog,
      showDeleteDialog,
      showStepsDialog,
      editingProduct,
      deletingProduct,
      selectedProduct,
      productFormRef,
      searchForm,
      productForm,
      productRules,
      filteredProducts,
      formatDate,
      handleCustomerChange,
      addStep,
      removeStep,
      handleSearch,
      resetSearch,
      handleAddProduct,
      handleEdit,
      handleViewSteps,
      handleDelete,
      handleSubmit,
      getSelectedProcessName,
      getSelectedMaterialName,
      confirmDelete
    }
  }
}
</script>

<style scoped>
.products {
  padding: 20px;
  min-width: 0;
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

.search-card {
  margin-bottom: 20px;
}

.color-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}



.steps-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background-color: #f9fafb;
  min-width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.steps-header h4 {
  margin: 0;
  color: #374151;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  min-width: 100%;
  max-width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f3f4f6;
}

.step-number {
  font-weight: bold;
  color: #1e3a8a;
  font-size: 16px;
}

.product-info {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.product-info h3 {
  margin: 0 0 10px 0;
  color: #1e3a8a;
}

.product-info p {
  margin: 5px 0;
  color: #374151;
}

.steps-detail {
  margin-top: 20px;
}

.steps-detail h4 {
  color: #1e3a8a;
  margin-bottom: 15px;
}

.step-detail-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.step-detail-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f3f4f6;
}

.step-detail-header .step-number {
  background: #1e3a8a;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step-detail-header h5 {
  margin: 0;
  color: #1e3a8a;
}

.step-detail-content p {
  margin: 5px 0;
  color: #374151;
}

.step-notes {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
  padding: 10px;
  border-radius: 4px;
}

.no-steps {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .steps-container {
    padding: 15px;
  }
  
  .step-item {
    padding: 15px;
  }
}

/* 拖拽相关样式 */
.drag-handle {
  cursor: move;
  padding: 10px 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(148, 163, 184, 0.1) 100%);
  border: 1px solid rgba(100, 116, 139, 0.2);
  position: relative;
  overflow: hidden;
}

.drag-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.drag-handle:hover {
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
  color: #1e3a8a;
  transform: scale(1.08);
  border-color: rgba(30, 58, 138, 0.3);
  box-shadow: 0 2px 8px rgba(30, 58, 138, 0.2);
}

.drag-handle:hover::before {
  left: 100%;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.step-header::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #64748b, #94a3b8, #64748b);
  background-size: 200% 100%;
  animation: shimmer 2.5s ease-in-out infinite;
}

.step-number {
  font-weight: bold;
  color: #1e3a8a;
  min-width: 60px;
}

.ghost-step {
  opacity: 0.5;
  background: #f3f4f6;
  border: 2px dashed #1e3a8a;
}

.chosen-step {
  background: #eff6ff;
  border: 2px solid #1e3a8a;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.step-item {
  background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.step-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

.step-item:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e1;
  transform: translateY(-3px) scale(1.01);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.process-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.process-option .el-tag {
  margin-left: 8px;
}

.material-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.material-option .el-tag {
  margin-left: 8px;
}





.steps-view .step-content {
  padding: 15px;
  background: #f9fafb;
  border-radius: 6px;
  margin-top: 10px;
}

.steps-view .step-content p {
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}





.selected-material-display {
  margin-top: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #bbf7d0;
  border-radius: 10px;
  min-width: 300px;
  max-width: 100%;
  width: fit-content;
  box-shadow: 0 3px 12px rgba(34, 197, 94, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.selected-material-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #22c55e, #10b981, #22c55e);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}

.selected-material-display:hover {
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.18);
  transform: translateY(-2px);
  border-color: #86efac;
}

.selected-material-display small {
  color: #166534;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.selected-process-display {
  margin-top: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
  border-radius: 10px;
  min-width: 300px;
  max-width: 100%;
  width: fit-content;
  box-shadow: 0 3px 12px rgba(245, 158, 11, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.selected-process-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}

.selected-process-display:hover {
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.18);
  transform: translateY(-2px);
  border-color: #fcd34d;
}

.selected-process-display small {
  color: #92400e;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

@media (max-width: 900px) {
  .products {
    padding: 0;
  }

  .page-header,
  .search-card,
  .products > .el-card {
    margin-bottom: 14px;
  }

  :deep(.search-card .el-form) {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  :deep(.search-card .el-form-item) {
    margin-right: 0;
    margin-bottom: 0;
  }

  .steps-header,
  .step-header,
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .steps-container,
  .step-item,
  .product-info,
  .step-detail-item {
    padding: 14px;
  }

  .selected-material-display,
  .selected-process-display {
    min-width: 0;
    width: 100%;
    padding: 10px 12px;
  }

  .selected-material-display small,
  .selected-process-display small {
    font-size: 13px;
    word-break: break-word;
  }
}

@media (max-width: 520px) {
  .page-header h1 {
    font-size: 20px;
  }

  .steps-container,
  .step-item,
  .product-info,
  .step-detail-item {
    padding: 12px;
  }

  .dialog-footer .el-button {
    width: 100%;
  }

  .steps-view .step-content p {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
}
</style> 
