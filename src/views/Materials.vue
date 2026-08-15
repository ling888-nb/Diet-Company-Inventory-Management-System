<template>
  <div class="materials">
    <div class="page-header">
      <h1>材料信息管理</h1>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 材料信息 -->
      <el-tab-pane v-if="canViewResource('materials')" label="材料信息" name="materials">
        <div class="tab-content">
          <div class="action-bar">
            <div class="action-left">
              <el-button type="primary" v-permission="{ module: 'materials', action: 'create' }" @click="showAddMaterialDialog = true">
                新增材料
              </el-button>
            </div>
            <div class="action-right">
              <el-input
                v-model="materialSearch"
                placeholder="搜索材料名称、规格、厂家"
                style="width: 300px;"
                clearable
              >
                <template #prefix>
                  <span>🔍</span>
                </template>
              </el-input>
            </div>
          </div>

          <el-table :data="filteredMaterials" style="width: 100%" v-loading="loading">
            <el-table-column prop="code" label="材料编码" width="100" />
            <el-table-column prop="name" label="材料名称" width="120" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="typeName" label="材料类型" width="100" />
            <el-table-column prop="supplierName" label="供应商" width="120" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="price" label="单价" width="80">
              <template #default="scope">
                ¥{{ scope.row.price }}
              </template>
            </el-table-column>

            <el-table-column prop="notes" label="备注" min-width="150" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materials', action: 'update' }" @click="handleEditMaterial(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materials', action: 'delete' }" @click="handleDeleteMaterial(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 材料入库 -->
      <el-tab-pane v-if="canViewResource('materialInboundRecords')" label="材料入库" name="inbound">
        <div class="tab-content">
          <div class="action-bar">
            <div class="action-left">
              <el-button type="primary" v-permission="{ module: 'materialInboundRecords', action: 'create' }" @click="showAddInboundDialog = true">
                新增入库
              </el-button>
            </div>
            <div class="action-right">
              <el-input
                v-model="inboundSearch"
                placeholder="搜索材料名称、供应商"
                style="width: 300px;"
                clearable
              >
                <template #prefix>
                  <span>🔍</span>
                </template>
              </el-input>
            </div>
          </div>

          <el-table :data="filteredInboundRecords" style="width: 100%" v-loading="loading">
            <el-table-column prop="orderNumber" label="订单号" width="120" />
            <el-table-column prop="materialName" label="材料名称" width="150" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="supplierName" label="供应商" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="入库数量" width="100" />
            <el-table-column prop="unitPrice" label="单价" width="100">
              <template #default="scope">
                ¥{{ scope.row.unitPrice?.toFixed(2) || '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="总金额" width="120">
              <template #default="scope">
                ¥{{ (scope.row.quantity * (scope.row.unitPrice || 0)).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="inboundDate" label="入库日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.inboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="150" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materialInboundRecords', action: 'update' }" @click="handleEditInbound(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materialInboundRecords', action: 'delete' }" @click="handleDeleteInbound(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 材料出库领用 -->
      <el-tab-pane v-if="canViewResource('materialOutboundRecords')" label="材料出库领用" name="outbound">
        <div class="tab-content">
          <div class="action-bar">
            <div class="action-left">
              <el-button type="primary" v-permission="{ module: 'materialOutboundRecords', action: 'create' }" @click="showAddOutboundDialog = true">
                新增出库
              </el-button>
            </div>
            <div class="action-right">
              <el-input
                v-model="outboundSearch"
                placeholder="搜索材料名称、产线、产品"
                style="width: 300px;"
                clearable
              >
                <template #prefix>
                  <span>🔍</span>
                </template>
              </el-input>
            </div>
          </div>

          <el-table :data="filteredOutboundRecords" style="width: 100%" v-loading="loading">
            <el-table-column prop="orderNumber" label="领用单号" width="120" />
            <el-table-column prop="materialName" label="材料名称" width="150" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="领用数量" width="100" />
            <el-table-column prop="outboundDate" label="领用日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.outboundDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="productionLine" label="领用产线" width="120" />
            <el-table-column prop="productName" label="使用产品" width="150" />
            <el-table-column prop="productCode" label="产品编码" width="120" />
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="150" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materialOutboundRecords', action: 'update' }" @click="handleEditOutbound(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materialOutboundRecords', action: 'delete' }" @click="handleDeleteOutbound(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 材料回收 -->
      <el-tab-pane v-if="canViewResource('materialRecycleRecords')" label="材料回收" name="recycle">
        <div class="tab-content">
          <div class="action-bar">
            <div class="action-left">
              <el-button type="primary" v-permission="{ module: 'materialRecycleRecords', action: 'create' }" @click="showAddRecycleDialog = true">
                新增回收
              </el-button>
            </div>
            <div class="action-right">
              <el-input
                v-model="recycleSearch"
                placeholder="搜索材料名称、产线、产品"
                style="width: 300px;"
                clearable
              >
                <template #prefix>
                  <span>🔍</span>
                </template>
              </el-input>
            </div>
          </div>

          <el-table :data="filteredRecycleRecords" style="width: 100%" v-loading="loading">
            <el-table-column prop="orderNumber" label="回收单号" width="120" />
            <el-table-column prop="materialName" label="材料名称" width="150" />
            <el-table-column prop="specification" label="规格型号" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="quantity" label="回收数量" width="100" />
            <el-table-column prop="recycleDate" label="回收日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.recycleDate) }}
              </template>
            </el-table-column>
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
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="150" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materialRecycleRecords', action: 'update' }" @click="handleEditRecycle(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materialRecycleRecords', action: 'delete' }" @click="handleDeleteRecycle(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 材料类型 -->
      <el-tab-pane v-if="canViewResource('materialTypes')" label="材料类型" name="types">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" v-permission="{ module: 'materialTypes', action: 'create' }" @click="showAddTypeDialog = true">
              新增类型
            </el-button>
          </div>

          <el-table :data="store.materialTypes" style="width: 100%">
            <el-table-column prop="name" label="类型名称" width="150" />
            <el-table-column prop="description" label="类型描述" min-width="200" />
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materialTypes', action: 'update' }" @click="handleEditType(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materialTypes', action: 'delete' }" @click="handleDeleteType(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 供应商 -->
      <el-tab-pane v-if="canViewResource('materialSuppliers')" label="供应商" name="suppliers">
        <div class="tab-content">
          <div class="action-bar">
            <el-button type="primary" v-permission="{ module: 'materialSuppliers', action: 'create' }" @click="showAddSupplierDialog = true">
              新增供应商
            </el-button>
          </div>

          <el-table :data="store.materialSuppliers" style="width: 100%">
            <el-table-column prop="name" label="供应商名称" width="150" />
            <el-table-column prop="contact" label="联系人" width="100" />
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="address" label="地址" min-width="200" />
            <el-table-column prop="createdAt" label="创建时间" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <div class="action-buttons">
                  <el-button type="success" size="small" v-permission="{ module: 'materialSuppliers', action: 'update' }" @click="handleEditSupplier(scope.row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" v-permission="{ module: 'materialSuppliers', action: 'delete' }" @click="handleDeleteSupplier(scope.row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑材料对话框 -->
    <el-dialog
      v-model="showAddMaterialDialog"
      :title="editingMaterial ? '编辑材料' : '新增材料'"
      width="60%"
      :max-width="800"
    >
      <!-- 编码生成演示区域 -->
      <div v-if="!editingMaterial" class="code-demo-section">
        <el-alert
          title="智能编码生成演示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="code-demo-content">
              <p><strong>编码格式：</strong>M + 类型代码 + 序号</p>
              <p><strong>示例：</strong>MST001（M-材料，ST-钢材，001-序号）</p>
              <div class="code-preview">
                <span class="code-label">当前预览编码：</span>
                <el-tag type="success" size="large">{{ materialCodePreview }}</el-tag>
              </div>
            </div>
          </template>
        </el-alert>
      </div>

      <el-form
        ref="materialFormRef"
        :model="materialForm"
        :rules="materialRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="材料编码">
              <el-input 
                v-model="materialCodePreview" 
                placeholder="系统自动生成" 
                readonly
                disabled
              >
                <template #append>
                  <el-tooltip content="编码格式：M + 类型代码 + 序号" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料名称" prop="name">
              <el-input v-model="materialForm.name" placeholder="请输入材料名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="规格型号" prop="specification">
              <el-input v-model="materialForm.specification" placeholder="请输入规格型号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料类型" prop="typeId">
              <el-select v-model="materialForm.typeId" placeholder="请选择材料类型" style="width: 100%">
                <el-option
                  v-for="type in (store.materialTypes || [])"
                  :key="type.id"
                  :label="type.name"
                  :value="type.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="materialForm.supplierId" placeholder="请选择供应商" style="width: 100%">
                <el-option
                  v-for="supplier in (store.materialSuppliers || [])"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select v-model="materialForm.unit" placeholder="请选择单位" style="width: 100%">
                <el-option label="吨" value="吨" />
                <el-option label="千克" value="千克" />
                <el-option label="个" value="个" />
                <el-option label="米" value="米" />
                <el-option label="平方米" value="平方米" />
                <el-option label="立方米" value="立方米" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价" prop="price">
              <el-input-number 
                v-model="materialForm.price" 
                :min="0" 
                :precision="2"
                style="width: 100%"
                placeholder="请输入单价（可选）"
              />
            </el-form-item>
          </el-col>
        </el-row>





        <el-form-item label="备注">
          <el-input
            v-model="materialForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddMaterialDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materials', action: editingMaterial ? 'update' : 'create' }" @click="handleSubmitMaterial">
            {{ editingMaterial ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增/编辑类型对话框 -->
    <el-dialog
      v-model="showAddTypeDialog"
      :title="editingType ? '编辑类型' : '新增类型'"
      width="50%"
      :max-width="600"
    >
      <el-form
        ref="typeFormRef"
        :model="typeForm"
        :rules="typeRules"
        label-width="100px"
      >
        <el-form-item label="类型名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="请输入类型名称" />
        </el-form-item>
        <el-form-item label="类型编码" prop="code">
          <el-input 
            v-model="typeForm.code" 
            placeholder="请输入类型编码（如：ST、AL、CU）" 
            maxlength="3"
          >
            <template #append>
              <el-tooltip content="编码用于材料智能编码生成，建议使用2-3个字母" placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="类型描述" prop="description">
          <el-input
            v-model="typeForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入类型描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddTypeDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materialTypes', action: editingType ? 'update' : 'create' }" @click="handleSubmitType">
            {{ editingType ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增/编辑供应商对话框 -->
    <el-dialog
      v-model="showAddSupplierDialog"
      :title="editingSupplier ? '编辑供应商' : '新增供应商'"
      width="50%"
      :max-width="600"
    >
      <el-form
        ref="supplierFormRef"
        :model="supplierForm"
        :rules="supplierRules"
        label-width="100px"
      >
        <el-form-item label="供应商名称" prop="name">
          <el-input v-model="supplierForm.name" placeholder="请输入供应商名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="supplierForm.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="supplierForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input
            v-model="supplierForm.address"
            type="textarea"
            :rows="3"
            placeholder="请输入地址"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddSupplierDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materialSuppliers', action: editingSupplier ? 'update' : 'create' }" @click="handleSubmitSupplier">
            {{ editingSupplier ? '更新' : '确定' }}
          </el-button>
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
          <el-button type="danger" v-permission="{ module: deletePermissionModule, action: 'delete' }" @click="confirmDelete">确定删除</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增/编辑材料入库对话框 -->
    <el-dialog
      v-model="showAddInboundDialog"
      :title="editingInbound ? '编辑入库' : '新增入库'"
      width="60%"
      :max-width="800"
    >
      <el-form
        ref="inboundFormRef"
        :model="inboundForm"
        :rules="inboundRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="订单号" prop="orderNumber">
              <el-input 
                v-model="inboundForm.orderNumber" 
                placeholder="系统自动生成" 
                readonly
                :disabled="!editingInbound"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料" prop="materialId">
              <el-select 
                v-model="inboundForm.materialId" 
                placeholder="请选择材料"
                style="width: 100%"
                @change="handleMaterialChange"
              >
                <el-option
                  v-for="material in store.materials"
                  :key="material.id"
                  :label="`${material.name} - ${material.specification}`"
                  :value="material.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>



        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier">
              <el-input v-model="inboundForm.supplier" placeholder="请输入供应商" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select 
                v-model="inboundForm.unit" 
                placeholder="请选择或输入单位"
                style="width: 100%"
                filterable
                allow-create
                default-first-option
                clearable
                :disabled="!inboundForm.materialId"
              >
                <el-option 
                  v-for="unit in availableUnits" 
                  :key="unit" 
                  :label="unit" 
                  :value="unit" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库数量" prop="quantity">
              <el-input-number 
                v-model="inboundForm.quantity" 
                :min="1" 
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价" prop="unitPrice">
              <el-input-number 
                v-model="inboundForm.unitPrice" 
                :min="0" 
                :precision="2"
                style="width: 100%"
                placeholder="请输入单价（可选）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库日期" prop="inboundDate">
              <el-date-picker
                v-model="inboundForm.inboundDate"
                type="date"
                placeholder="选择入库日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
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
          <el-button @click="showAddInboundDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materialInboundRecords', action: editingInbound ? 'update' : 'create' }" @click="handleSubmitInbound">
            {{ editingInbound ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增/编辑材料出库领用对话框 -->
    <el-dialog
      v-model="showAddOutboundDialog"
      :title="editingOutbound ? '编辑出库' : '新增出库'"
      width="60%"
      :max-width="800"
    >
      <el-form
        ref="outboundFormRef"
        :model="outboundForm"
        :rules="outboundRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="领用单号" prop="orderNumber">
              <el-input 
                v-model="outboundForm.orderNumber" 
                placeholder="系统自动生成" 
                readonly
                :disabled="!editingOutbound"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料" prop="materialId">
              <el-select 
                v-model="outboundForm.materialId" 
                placeholder="请选择材料"
                style="width: 100%"
                @change="handleOutboundMaterialChange"
              >
                <el-option
                  v-for="material in store.materials"
                  :key="material.id"
                  :label="`${material.name} - ${material.specification}`"
                  :value="material.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select 
                v-model="outboundForm.unit" 
                placeholder="请选择或输入单位"
                style="width: 100%"
                filterable
                allow-create
                default-first-option
                clearable
                :disabled="!outboundForm.materialId"
              >
                <el-option 
                  v-for="unit in availableOutboundUnits" 
                  :key="unit" 
                  :label="unit" 
                  :value="unit" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="领用数量" prop="quantity">
              <el-input-number 
                v-model="outboundForm.quantity" 
                :min="1" 
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="领用日期" prop="outboundDate">
              <el-date-picker
                v-model="outboundForm.outboundDate"
                type="date"
                placeholder="选择领用日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="领用产线" prop="productionLine">
              <el-select 
                v-model="outboundForm.productionLine" 
                placeholder="请选择产线"
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
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="使用产品" prop="productId">
              <el-select 
                v-model="outboundForm.productId" 
                placeholder="请选择产品"
                style="width: 100%"
              >
                <el-option
                  v-for="product in store.products"
                  :key="product.id"
                  :label="`${product.name} - ${product.code}`"
                  :value="product.id"
                />
              </el-select>
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
          <el-button @click="showAddOutboundDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materialOutboundRecords', action: editingOutbound ? 'update' : 'create' }" @click="handleSubmitOutbound">
            {{ editingOutbound ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增/编辑材料回收对话框 -->
    <el-dialog
      v-model="showAddRecycleDialog"
      :title="editingRecycle ? '编辑回收' : '新增回收'"
      width="60%"
      :max-width="800"
    >
      <el-form
        ref="recycleFormRef"
        :model="recycleForm"
        :rules="recycleRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="回收单号" prop="orderNumber">
              <el-input 
                v-model="recycleForm.orderNumber" 
                placeholder="系统自动生成" 
                readonly
                :disabled="!editingRecycle"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料" prop="materialId">
              <el-select 
                v-model="recycleForm.materialId" 
                placeholder="请选择材料"
                style="width: 100%"
                @change="handleRecycleMaterialChange"
              >
                <el-option
                  v-for="material in store.materials"
                  :key="material.id"
                  :label="`${material.name} - ${material.specification}`"
                  :value="material.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-select 
                v-model="recycleForm.unit" 
                placeholder="请选择或输入单位"
                style="width: 100%"
                filterable
                allow-create
                default-first-option
                clearable
                :disabled="!recycleForm.materialId"
              >
                <el-option 
                  v-for="unit in availableRecycleUnits" 
                  :key="unit" 
                  :label="unit" 
                  :value="unit" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回收数量" prop="quantity">
              <el-input-number 
                v-model="recycleForm.quantity" 
                :min="1" 
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="回收日期" prop="recycleDate">
              <el-date-picker
                v-model="recycleForm.recycleDate"
                type="date"
                placeholder="选择回收日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回收产线" prop="productionLine">
              <el-select 
                v-model="recycleForm.productionLine" 
                placeholder="请选择产线"
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
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="来源产品" prop="productId">
              <el-select 
                v-model="recycleForm.productId" 
                placeholder="请选择产品"
                style="width: 100%"
                clearable
              >
                <el-option
                  v-for="product in store.products"
                  :key="product.id"
                  :label="`${product.name} - ${product.code}`"
                  :value="product.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回收原因" prop="recycleReason">
              <el-select 
                v-model="recycleForm.recycleReason" 
                placeholder="请选择回收原因"
                style="width: 100%"
                clearable
              >
                <el-option label="生产剩余" value="生产剩余" />
                <el-option label="质量不合格" value="质量不合格" />
                <el-option label="设备故障" value="设备故障" />
                <el-option label="工艺调整" value="工艺调整" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="质量状态" prop="qualityStatus">
              <el-select 
                v-model="recycleForm.qualityStatus" 
                placeholder="请选择质量状态"
                style="width: 100%"
              >
                <el-option label="良好" value="good" />
                <el-option label="轻微损坏" value="slightly_damaged" />
                <el-option label="严重损坏" value="damaged" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input 
            v-model="recycleForm.notes" 
            type="textarea" 
            :rows="3"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddRecycleDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'materialRecycleRecords', action: editingRecycle ? 'update' : 'create' }" @click="handleSubmitRecycle">
            {{ editingRecycle ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
    import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '../stores'
import { useAuthStore } from '../stores/auth'
    import { generateSmartMaterialCode } from '../utils/codeGenerator.js'
    import { formatDate } from '../utils/formatters'
    import { getMaterialUnitOptions } from '../utils/materialUnits'

const FORM_DEFAULTS = {
  material: {
    name: '',
    specification: '',
    typeId: '',
    supplierId: '',
    unit: '',
    price: 0,
    notes: ''
  },
  type: {
    name: '',
    code: '',
    description: ''
  },
  supplier: {
    name: '',
    contact: '',
    phone: '',
    address: ''
  },
  inbound: {
    orderNumber: '',
    materialId: '',
    supplier: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    inboundDate: '',
    notes: ''
  },
  outbound: {
    orderNumber: '',
    materialId: '',
    unit: '',
    quantity: 1,
    outboundDate: '',
    productionLine: '',
    productId: '',
    notes: ''
  },
  recycle: {
    orderNumber: '',
    materialId: '',
    unit: '',
    quantity: 1,
    recycleDate: '',
    productionLine: '',
    productId: '',
    recycleReason: '',
    qualityStatus: 'good',
    notes: ''
  }
}

const FORM_FIELDS = {
  material: ['name', 'specification', 'typeId', 'supplierId', 'unit', 'price', 'notes'],
  type: ['name', 'code', 'description'],
  supplier: ['name', 'contact', 'phone', 'address'],
  inbound: ['materialId', 'supplier', 'unit', 'quantity', 'unitPrice', 'inboundDate', 'notes'],
  outbound: ['materialId', 'unit', 'quantity', 'outboundDate', 'productionLine', 'productId', 'notes'],
  recycle: ['materialId', 'unit', 'quantity', 'recycleDate', 'productionLine', 'productId', 'recycleReason', 'qualityStatus', 'notes']
}

const SEARCH_FIELDS = {
  materials: ['name', 'specification', 'supplierName'],
  inbound: ['materialName', 'supplierName', 'orderNumber'],
  movement: ['materialName', 'productionLine', 'productName', 'orderNumber']
}

const safeIncludes = (value, search) => {
  return String(value || '').toLowerCase().includes(search)
}

const newestFirst = (items) => {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

const filterRecords = (records, searchValue, fields) => {
  const recordsByDate = newestFirst(records)
  if (!searchValue) return recordsByDate

  const search = searchValue.toLowerCase()
  return recordsByDate.filter(record => fields.some(field => safeIncludes(record[field], search)))
}

const pickFields = (source, fields) => {
  return fields.reduce((payload, field) => {
    payload[field] = source[field]
    return payload
  }, {})
}

const pickExistingFields = (source, fields) => {
  return fields.reduce((payload, field) => {
    if (source[field] !== undefined) {
      payload[field] = source[field]
    }
    return payload
  }, {})
}

export default {
  name: 'Materials',
  setup() {
    const store = useMainStore()
    const authStore = useAuthStore()
    const loading = ref(false)
    const activeTab = ref('materials')
    const materialSearch = ref('')
    const inboundSearch = ref('')
    const outboundSearch = ref('')
    const recycleSearch = ref('')
    
    // 对话框状态
    const showAddMaterialDialog = ref(false)
    const showAddTypeDialog = ref(false)
    const showAddSupplierDialog = ref(false)
    const showAddInboundDialog = ref(false)
    const showAddOutboundDialog = ref(false)
    const showAddRecycleDialog = ref(false)
    const showDeleteDialog = ref(false)
    
    // 编辑状态
    const editingMaterial = ref(null)
    const editingType = ref(null)
    const editingSupplier = ref(null)
    const editingInbound = ref(null)
    const editingOutbound = ref(null)
    const editingRecycle = ref(null)
    const deletingItem = ref(null)
    const deletingType = ref('')
    
    // 表单引用
    const materialFormRef = ref()
    const typeFormRef = ref()
    const supplierFormRef = ref()
    const inboundFormRef = ref()
    const outboundFormRef = ref()
    const recycleFormRef = ref()

    // 材料表单
    const materialForm = reactive({ ...FORM_DEFAULTS.material })

    // 类型表单
    const typeForm = reactive({ ...FORM_DEFAULTS.type })



    // 供应商表单
    const supplierForm = reactive({ ...FORM_DEFAULTS.supplier })

    // 材料入库表单
    const inboundForm = reactive({ ...FORM_DEFAULTS.inbound })

    // 材料出库领用表单
    const outboundForm = reactive({ ...FORM_DEFAULTS.outbound })

    // 材料回收表单
    const recycleForm = reactive({ ...FORM_DEFAULTS.recycle })



    // 表单验证规则
    const materialRules = {
      name: [{ required: true, message: '请输入材料名称', trigger: 'blur' }],
      specification: [{ required: true, message: '请输入规格型号', trigger: 'blur' }],
      typeId: [{ required: true, message: '请选择材料类型', trigger: 'change' }],
      supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
      unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
      price: [{ required: false, message: '请输入单价', trigger: 'blur' }]
    }

    const typeRules = {
      name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
      code: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
      description: [{ required: false, message: '请输入类型描述', trigger: 'blur' }]
    }



    const supplierRules = {
      name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
      contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
      phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
      address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
    }

    const inboundRules = {
      materialId: [{ required: true, message: '请选择材料', trigger: 'change' }],
      supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
      unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
      quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }],
      unitPrice: [{ required: false, message: '请输入单价', trigger: 'blur' }],
      inboundDate: [{ required: true, message: '请选择入库日期', trigger: 'change' }]
    }

    const outboundRules = {
      materialId: [{ required: true, message: '请选择材料', trigger: 'change' }],
      unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
      quantity: [{ required: true, message: '请输入领用数量', trigger: 'blur' }],
      outboundDate: [{ required: true, message: '请选择领用日期', trigger: 'change' }],
              productionLine: [{ required: false, message: '请选择领用产线', trigger: 'change' }],
      productId: [{ required: true, message: '请选择使用产品', trigger: 'change' }]
    }

    const recycleRules = {
      materialId: [{ required: true, message: '请选择材料', trigger: 'change' }],
      unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
      quantity: [{ required: true, message: '请输入回收数量', trigger: 'blur' }],
      recycleDate: [{ required: true, message: '请选择回收日期', trigger: 'change' }],
      recycleReason: [{ required: true, message: '请选择回收原因', trigger: 'change' }],
      qualityStatus: [{ required: true, message: '请选择质量状态', trigger: 'change' }]
    }



    // 获取质量状态文本
    const getQualityStatusText = (status) => {
      const statusMap = {
        'good': '良好',
        'slightly_damaged': '轻微损坏',
        'damaged': '严重损坏'
      }
      return statusMap[status] || '未知'
    }



    // 过滤后的材料列表
    const filteredMaterials = computed(() => {
      return filterRecords(store.getMaterialsWithRelations || [], materialSearch.value, SEARCH_FIELDS.materials)
    })


    
    // 智能生成材料编码
    const generateMaterialCode = () => {
      return generateSmartMaterialCode(
        store.materials || [], 
        materialForm, 
        store.materialTypes || []
      )
    }

    // 材料编码预览
    const materialCodePreview = computed(() => {
      if (editingMaterial.value) {
        return editingMaterial.value.code
      }
      return generateMaterialCode()
    })

    // 过滤后的入库记录
    const filteredInboundRecords = computed(() => {
      return filterRecords(store.getMaterialInboundRecordsWithRelations || [], inboundSearch.value, SEARCH_FIELDS.inbound)
    })

    // 过滤后的出库记录
    const filteredOutboundRecords = computed(() => {
      return filterRecords(store.getMaterialOutboundRecordsWithRelations || [], outboundSearch.value, SEARCH_FIELDS.movement)
    })

    // 过滤后的回收记录
    const filteredRecycleRecords = computed(() => {
      return filterRecords(store.getMaterialRecycleRecordsWithRelations || [], recycleSearch.value, SEARCH_FIELDS.movement)
    })



    const getUnitsForMaterial = (materialId) => {
      return getMaterialUnitOptions(store.getMaterialById(materialId), store.materialTypes)
    }

    const availableUnits = computed(() => getUnitsForMaterial(inboundForm.materialId))
    const availableOutboundUnits = computed(() => getUnitsForMaterial(outboundForm.materialId))
    const availableRecycleUnits = computed(() => getUnitsForMaterial(recycleForm.materialId))

    const resetForm = (form, defaults, formRef, editingRef) => {
      editingRef.value = null
      Object.assign(form, { ...defaults })
      formRef.value?.resetFields?.()
    }

    const openEditForm = (editingRef, form, defaults, record, dialogRef, overrides = {}) => {
      editingRef.value = record
      Object.assign(form, {
        ...defaults,
        ...pickExistingFields(record, Object.keys(defaults)),
        ...overrides
      })
      dialogRef.value = true
    }

    const submitEntityForm = async ({
      formRef,
      editingRef,
      dialogRef,
      buildPayload,
      createRecord,
      updateRecord,
      reset,
      createdMessage,
      updatedMessage
    }) => {
      if (!formRef.value) return

      try {
        await formRef.value.validate()

        const payload = buildPayload()
        if (editingRef.value) {
          updateRecord(editingRef.value.id, payload)
          ElMessage.success(updatedMessage)
        } else {
          const createdRecord = createRecord(payload)
          const message = typeof createdMessage === 'function'
            ? createdMessage(createdRecord, payload)
            : createdMessage
          ElMessage.success(message)
        }

        dialogRef.value = false
        reset()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const buildMovementPayload = (form, fields, editingRef) => {
      const payload = pickFields(form, fields)
      if (editingRef.value && form.orderNumber) {
        payload.orderNumber = form.orderNumber
      }
      return payload
    }

    const submitMovementForm = (options) => {
      return submitEntityForm({
        ...options,
        buildPayload: () => buildMovementPayload(options.form, options.fields, options.editingRef)
      })
    }

    const syncMaterialUnit = (form, materialId) => {
      const material = store.getMaterialById(materialId)
      form.unit = material?.unit || ''
      return material
    }

    const canViewResource = (resource) => authStore.hasPermission(resource, 'view')

    const prepareDelete = (type, item) => {
      deletingType.value = type
      deletingItem.value = item
      showDeleteDialog.value = true
    }

    const deleteActions = {
      material: { remove: id => store.deleteMaterial(id), message: '材料信息删除成功' },
      type: { remove: id => store.deleteMaterialType(id), message: '材料类型删除成功' },
      supplier: { remove: id => store.deleteMaterialSupplier(id), message: '供应商信息删除成功' },
      inbound: { remove: id => store.deleteMaterialInbound(id), message: '材料入库记录删除成功' },
      outbound: { remove: id => store.deleteMaterialOutbound(id), message: '材料出库记录删除成功' },
      recycle: { remove: id => store.deleteMaterialRecycle(id), message: '材料回收记录删除成功' }
    }

    const deletePermissionMap = {
      material: 'materials',
      type: 'materialTypes',
      supplier: 'materialSuppliers',
      inbound: 'materialInboundRecords',
      outbound: 'materialOutboundRecords',
      recycle: 'materialRecycleRecords'
    }

    const deletePermissionModule = computed(() => deletePermissionMap[deletingType.value] || 'materials')

    // 材料相关操作
    const handleEditMaterial = (material) => {
      openEditForm(editingMaterial, materialForm, FORM_DEFAULTS.material, material, showAddMaterialDialog)
    }

    const handleDeleteMaterial = (material) => {
      prepareDelete('material', material)
    }

    const handleSubmitMaterial = async () => {
      await submitEntityForm({
        formRef: materialFormRef,
        editingRef: editingMaterial,
        dialogRef: showAddMaterialDialog,
        buildPayload: () => ({
          ...pickFields(materialForm, FORM_FIELDS.material),
          code: editingMaterial.value?.code || generateMaterialCode()
        }),
        createRecord: payload => store.addMaterial(payload),
        updateRecord: (id, payload) => store.updateMaterial(id, payload),
        reset: resetMaterialForm,
        createdMessage: (record, payload) => `材料信息添加成功，编码：${record?.code || payload.code}`,
        updatedMessage: '材料信息更新成功'
      })
    }

    // 类型相关操作
    const handleEditType = (type) => {
      openEditForm(editingType, typeForm, FORM_DEFAULTS.type, type, showAddTypeDialog)
    }

    const handleDeleteType = (type) => {
      prepareDelete('type', type)
    }

    const handleSubmitType = async () => {
      await submitEntityForm({
        formRef: typeFormRef,
        editingRef: editingType,
        dialogRef: showAddTypeDialog,
        buildPayload: () => ({
          ...pickFields(typeForm, FORM_FIELDS.type),
          code: typeForm.code.toUpperCase()
        }),
        createRecord: payload => store.addMaterialType(payload),
        updateRecord: (id, payload) => store.updateMaterialType(id, payload),
        reset: resetTypeForm,
        createdMessage: '材料类型添加成功',
        updatedMessage: '材料类型更新成功'
      })
    }



    // 供应商相关操作
    const handleEditSupplier = (supplier) => {
      openEditForm(editingSupplier, supplierForm, FORM_DEFAULTS.supplier, supplier, showAddSupplierDialog)
    }

    const handleDeleteSupplier = (supplier) => {
      prepareDelete('supplier', supplier)
    }

    const handleSubmitSupplier = async () => {
      await submitEntityForm({
        formRef: supplierFormRef,
        editingRef: editingSupplier,
        dialogRef: showAddSupplierDialog,
        buildPayload: () => pickFields(supplierForm, FORM_FIELDS.supplier),
        createRecord: payload => store.addMaterialSupplier(payload),
        updateRecord: (id, payload) => store.updateMaterialSupplier(id, payload),
        reset: resetSupplierForm,
        createdMessage: '供应商信息添加成功',
        updatedMessage: '供应商信息更新成功'
      })
    }

    // 删除确认
    const confirmDelete = () => {
      if (!deletingItem.value) return

      const action = deleteActions[deletingType.value]
      if (action) {
        action.remove(deletingItem.value.id)
        ElMessage.success(action.message)
      }
      
      showDeleteDialog.value = false
      deletingItem.value = null
      deletingType.value = ''
    }

    // 重置表单
    const resetMaterialForm = () => {
      resetForm(materialForm, FORM_DEFAULTS.material, materialFormRef, editingMaterial)
    }

    const resetTypeForm = () => {
      resetForm(typeForm, FORM_DEFAULTS.type, typeFormRef, editingType)
    }



    const resetSupplierForm = () => {
      resetForm(supplierForm, FORM_DEFAULTS.supplier, supplierFormRef, editingSupplier)
    }

    // 材料入库相关操作

    const handleMaterialChange = (materialId) => {
      const material = syncMaterialUnit(inboundForm, materialId)
      const supplier = material
        ? (store.materialSuppliers || []).find(item => item.id === material.supplierId)
        : null

      inboundForm.supplier = supplier?.name || ''
      inboundForm.unitPrice = material?.price || 0
    }

    const handleEditInbound = (record) => {
      openEditForm(editingInbound, inboundForm, FORM_DEFAULTS.inbound, record, showAddInboundDialog, {
        supplier: record.supplier || record.supplierName || ''
      })
    }

    const handleDeleteInbound = (record) => {
      prepareDelete('inbound', record)
    }

    const handleSubmitInbound = async () => {
      await submitMovementForm({
        form: inboundForm,
        fields: FORM_FIELDS.inbound,
        formRef: inboundFormRef,
        editingRef: editingInbound,
        dialogRef: showAddInboundDialog,
        createRecord: payload => store.addMaterialInbound(payload),
        updateRecord: (id, payload) => store.updateMaterialInbound(id, payload),
        reset: resetInboundForm,
        createdMessage: '材料入库记录添加成功',
        updatedMessage: '材料入库记录更新成功'
      })
    }

    const resetInboundForm = () => {
      resetForm(inboundForm, FORM_DEFAULTS.inbound, inboundFormRef, editingInbound)
    }

    // 材料出库相关操作
    const handleOutboundMaterialChange = (materialId) => {
      syncMaterialUnit(outboundForm, materialId)
    }

    const handleEditOutbound = (record) => {
      openEditForm(editingOutbound, outboundForm, FORM_DEFAULTS.outbound, record, showAddOutboundDialog)
    }

    const handleDeleteOutbound = (record) => {
      prepareDelete('outbound', record)
    }

    const handleSubmitOutbound = async () => {
      await submitMovementForm({
        form: outboundForm,
        fields: FORM_FIELDS.outbound,
        formRef: outboundFormRef,
        editingRef: editingOutbound,
        dialogRef: showAddOutboundDialog,
        createRecord: payload => store.addMaterialOutbound(payload),
        updateRecord: (id, payload) => store.updateMaterialOutbound(id, payload),
        reset: resetOutboundForm,
        createdMessage: '材料出库记录添加成功',
        updatedMessage: '材料出库记录更新成功'
      })
    }

    const resetOutboundForm = () => {
      resetForm(outboundForm, FORM_DEFAULTS.outbound, outboundFormRef, editingOutbound)
    }

    // 回收相关函数
    const handleRecycleMaterialChange = (materialId) => {
      syncMaterialUnit(recycleForm, materialId)
    }

    const handleEditRecycle = (record) => {
      openEditForm(editingRecycle, recycleForm, FORM_DEFAULTS.recycle, record, showAddRecycleDialog)
    }

    const handleDeleteRecycle = (record) => {
      prepareDelete('recycle', record)
    }

    const handleSubmitRecycle = async () => {
      await submitMovementForm({
        form: recycleForm,
        fields: FORM_FIELDS.recycle,
        formRef: recycleFormRef,
        editingRef: editingRecycle,
        dialogRef: showAddRecycleDialog,
        createRecord: payload => store.addMaterialRecycle(payload),
        updateRecord: (id, payload) => store.updateMaterialRecycle(id, payload),
        reset: resetRecycleForm,
        createdMessage: '材料回收记录添加成功',
        updatedMessage: '材料回收记录更新成功'
      })
    }

    const resetRecycleForm = () => {
      resetForm(recycleForm, FORM_DEFAULTS.recycle, recycleFormRef, editingRecycle)
    }

    return {
      store,
      canViewResource,
      loading,
      activeTab,
      materialSearch,
      inboundSearch,
      outboundSearch,
      recycleSearch,
      showAddMaterialDialog,
      showAddTypeDialog,
      showAddSupplierDialog,
      showAddInboundDialog,
      showAddOutboundDialog,
      showAddRecycleDialog,
      showDeleteDialog,
      editingMaterial,
      editingType,
      editingSupplier,
      editingInbound,
      editingOutbound,
      editingRecycle,
      deletingItem,
      deletePermissionModule,
      materialFormRef,
      typeFormRef,
      supplierFormRef,
      inboundFormRef,
      outboundFormRef,
      recycleFormRef,
      materialForm,
      typeForm,
      supplierForm,
      inboundForm,
      outboundForm,
      recycleForm,
      materialRules,
      typeRules,
      supplierRules,
      inboundRules,
      outboundRules,
      recycleRules,
      filteredMaterials,
      filteredInboundRecords,
      filteredOutboundRecords,
      filteredRecycleRecords,
      materialCodePreview,
      formatDate,
      generateMaterialCode,
      handleEditMaterial,
      handleDeleteMaterial,
      handleSubmitMaterial,
      handleEditType,
      handleDeleteType,
      handleSubmitType,
      handleEditSupplier,
      handleDeleteSupplier,
      handleSubmitSupplier,

      handleMaterialChange,
      handleEditInbound,
      handleDeleteInbound,
      handleSubmitInbound,
      resetInboundForm,
      handleOutboundMaterialChange,
      handleEditOutbound,
      handleDeleteOutbound,
      handleSubmitOutbound,
      resetOutboundForm,
      handleRecycleMaterialChange,
      handleEditRecycle,
      handleDeleteRecycle,
      handleSubmitRecycle,
      resetRecycleForm,
      confirmDelete,
      getQualityStatusText,
      availableUnits,
      availableOutboundUnits,
      availableRecycleUnits,

    }
  }
}
</script>

<style scoped>
.materials {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.action-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-right {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
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
  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .action-left {
    justify-content: center;
  }
  
  .action-right {
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



.code-demo-section {
  margin-bottom: 20px;
}

.code-demo-content {
  margin-top: 10px;
}

.code-demo-content p {
  margin: 5px 0;
  font-size: 14px;
  color: #374151;
}

.code-preview {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.code-label {
  font-weight: 600;
  color: #1e3a8a;
}





.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .materials {
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
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .action-left,
  .action-right {
    width: 100%;
    justify-content: flex-start;
  }

  .action-right :deep(.el-input) {
    width: 100% !important;
  }

  .action-bar .el-input {
    margin-left: 0 !important;
  }

  .code-preview {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 520px) {
  .page-header {
    margin-bottom: 12px;
  }

  .action-left,
  .action-right,
  .dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .action-left .el-button,
  .dialog-footer .el-button {
    width: 100%;
  }

  .code-demo-content p {
    font-size: 13px;
  }
}
</style> 
