<template>
  <div class="customers">
    <section class="customer-hero">
      <div class="hero-copy">
        <div class="eyebrow">
          <el-icon><OfficeBuilding /></el-icon>
          <span>客户档案</span>
        </div>
        <h1>客户信息管理</h1>
      </div>

      <div class="hero-actions">
        <el-button type="primary" size="large" v-permission="{ module: 'customers', action: 'create' }" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新增客户
        </el-button>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-card metric-card--blue">
        <div class="metric-icon">
          <el-icon><UserFilled /></el-icon>
        </div>
        <div>
          <span>客户总数</span>
          <strong>{{ customerMetrics.total }}</strong>
        </div>
      </div>
      <div class="metric-card metric-card--green">
        <div class="metric-icon">
          <el-icon><Tickets /></el-icon>
        </div>
        <div>
          <span>当前结果</span>
          <strong>{{ customerMetrics.filtered }}</strong>
        </div>
      </div>
      <div class="metric-card metric-card--amber">
        <div class="metric-icon">
          <el-icon><Phone /></el-icon>
        </div>
        <div>
          <span>已留电话</span>
          <strong>{{ customerMetrics.withPhone }}</strong>
        </div>
      </div>
      <div class="metric-card metric-card--violet">
        <div class="metric-icon">
          <el-icon><Clock /></el-icon>
        </div>
        <div>
          <span>本月新增</span>
          <strong>{{ customerMetrics.thisMonth }}</strong>
        </div>
      </div>
    </section>

    <section class="filter-panel">
      <div class="section-heading">
        <div>
          <h2>客户检索</h2>
        </div>
        <el-tag v-if="hasActiveFilters" effect="light" type="info">
          {{ activeFilterCount }} 个条件
        </el-tag>
      </div>

      <el-form
        :model="searchForm"
        class="filter-form"
        label-position="top"
        @submit.prevent="handleSearch"
      >
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.name" placeholder="请输入客户名称" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="searchForm.contact" placeholder="请输入联系人" clearable>
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="searchForm.phone" placeholder="请输入联系电话" clearable>
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" native-type="submit">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button :disabled="!hasActiveFilters" @click="resetSearch">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
      </el-form>
    </section>

    <section class="table-panel">
      <div class="table-toolbar">
        <div>
          <h2>客户列表</h2>
          <span>{{ customerMetrics.filtered }} / {{ customerMetrics.total }}</span>
        </div>
      </div>

      <el-table
        :data="filteredCustomers"
        :empty-text="emptyText"
        class="premium-table"
        row-key="id"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="code" label="客户编码" width="120">
          <template #default="scope">
            <el-tag class="code-tag" effect="plain">{{ scope.row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="客户名称" min-width="210">
          <template #default="scope">
            <div class="customer-cell">
              <div class="customer-avatar">
                {{ getCustomerInitial(scope.row.name) }}
              </div>
              <div class="customer-main">
                <strong>{{ scope.row.name }}</strong>
                <span>{{ scope.row.code || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="140">
          <template #default="scope">
            <span class="inline-field">
              <el-icon><User /></el-icon>
              {{ scope.row.contact || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="150">
          <template #default="scope">
            <a v-if="scope.row.phone" class="phone-link" :href="`tel:${normalizePhone(scope.row.phone)}`">
              <el-icon><Phone /></el-icon>
              {{ scope.row.phone }}
            </a>
            <span v-else class="muted-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="220">
          <template #default="scope">
            <span class="address-cell">
              <el-icon><Location /></el-icon>
              <span>{{ scope.row.address || '-' }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="180">
          <template #default="scope">
            <span class="notes-cell">{{ scope.row.notes || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="130">
          <template #default="scope">
            <span class="date-pill">{{ formatDate(scope.row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button type="primary" link v-permission="{ module: 'customers', action: 'update' }" @click="handleEdit(scope.row)">
                <el-icon><EditPen /></el-icon>
                编辑
              </el-button>
              <el-button type="danger" link v-permission="{ module: 'customers', action: 'delete' }" @click="handleDelete(scope.row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="showAddDialog"
      :title="editingCustomer ? '编辑客户' : '新增客户'"
      width="560px"
      class="customer-dialog"
      @closed="resetForm"
    >
      <el-form
        ref="customerFormRef"
        :model="customerForm"
        :rules="customerRules"
        class="customer-form"
        label-position="top"
      >
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="customerForm.name" placeholder="请输入客户名称">
            <template #prefix>
              <el-icon><OfficeBuilding /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="customerForm.contact" placeholder="请输入联系人">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="customerForm.phone" placeholder="请输入联系电话">
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="customerForm.address" placeholder="请输入地址">
            <template #prefix>
              <el-icon><Location /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="customerForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" v-permission="{ module: 'customers', action: editingCustomer ? 'update' : 'create' }" @click="handleSubmit">
            {{ editingCustomer ? '更新' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="showDeleteDialog" title="确认删除" width="380px" class="delete-dialog">
      <div class="delete-content">
        <div class="delete-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div>
          <p>确定要删除客户 "{{ deletingCustomer?.name }}" 吗？</p>
          <span>删除后无法恢复，请谨慎操作。</span>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" v-permission="{ module: 'customers', action: 'delete' }" @click="confirmDelete">确定删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '../stores'
import { formatDate } from '../utils/formatters'

const CUSTOMER_FORM_DEFAULTS = {
  name: '',
  contact: '',
  phone: '',
  address: '',
  notes: ''
}

const SEARCH_DEFAULTS = {
  name: '',
  contact: '',
  phone: ''
}

const includesText = (value, keyword) => {
  return String(value || '').toLowerCase().includes(keyword.toLowerCase())
}

const newestFirst = (items) => {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export default {
  name: 'Customers',
  setup() {
    const store = useMainStore()
    const loading = ref(false)
    const showAddDialog = ref(false)
    const showDeleteDialog = ref(false)
    const editingCustomer = ref(null)
    const deletingCustomer = ref(null)
    const customerFormRef = ref()

    const searchForm = reactive({ ...SEARCH_DEFAULTS })
    const customerForm = reactive({ ...CUSTOMER_FORM_DEFAULTS })

    const customerRules = {
      name: [
        { required: true, message: '请输入客户名称', trigger: 'blur' }
      ],
      contact: [
        { required: true, message: '请输入联系人', trigger: 'blur' }
      ],
      phone: [
        { required: true, message: '请输入电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
      ]
    }

    const allCustomers = computed(() => store.customers || [])

    const filteredCustomers = computed(() => {
      const records = allCustomers.value.filter(customer => {
        return (!searchForm.name || includesText(customer.name, searchForm.name))
          && (!searchForm.contact || includesText(customer.contact, searchForm.contact))
          && (!searchForm.phone || includesText(customer.phone, searchForm.phone))
      })

      return newestFirst(records)
    })

    const activeFilterCount = computed(() => {
      return Object.values(searchForm).filter(Boolean).length
    })

    const hasActiveFilters = computed(() => activeFilterCount.value > 0)

    const customerMetrics = computed(() => {
      const today = new Date()
      const total = allCustomers.value.length
      const thisMonth = allCustomers.value.filter(customer => {
        const createdAt = new Date(customer.createdAt)
        return createdAt.getFullYear() === today.getFullYear()
          && createdAt.getMonth() === today.getMonth()
      }).length

      return {
        total,
        filtered: filteredCustomers.value.length,
        withPhone: allCustomers.value.filter(customer => Boolean(customer.phone)).length,
        thisMonth
      }
    })

    const emptyText = computed(() => {
      return hasActiveFilters.value ? '没有匹配的客户' : '暂无客户数据'
    })

    const handleSearch = () => {}

    const resetSearch = () => {
      Object.assign(searchForm, { ...SEARCH_DEFAULTS })
    }

    const resetForm = () => {
      editingCustomer.value = null
      Object.assign(customerForm, { ...CUSTOMER_FORM_DEFAULTS })
      customerFormRef.value?.clearValidate?.()
    }

    const openCreateDialog = () => {
      resetForm()
      showAddDialog.value = true
    }

    const handleEdit = (customer) => {
      editingCustomer.value = customer
      Object.assign(customerForm, {
        ...CUSTOMER_FORM_DEFAULTS,
        name: customer.name,
        contact: customer.contact,
        phone: customer.phone,
        address: customer.address || '',
        notes: customer.notes || ''
      })
      showAddDialog.value = true
    }

    const handleDelete = (customer) => {
      deletingCustomer.value = customer
      showDeleteDialog.value = true
    }

    const handleSubmit = async () => {
      if (!customerFormRef.value) return

      try {
        await customerFormRef.value.validate()

        const payload = { ...customerForm }
        if (editingCustomer.value) {
          store.updateCustomer(editingCustomer.value.id, payload)
          ElMessage.success('客户信息更新成功')
        } else {
          store.addCustomer(payload)
          ElMessage.success('客户添加成功')
        }

        showAddDialog.value = false
        resetForm()
      } catch (error) {
        console.error('表单验证失败:', error)
      }
    }

    const confirmDelete = () => {
      if (!deletingCustomer.value) return

      store.deleteCustomer(deletingCustomer.value.id)
      ElMessage.success('客户删除成功')
      showDeleteDialog.value = false
      deletingCustomer.value = null
    }

    const getCustomerInitial = (name) => {
      return String(name || '?').trim().slice(0, 1).toUpperCase()
    }

    const normalizePhone = (phone) => {
      return String(phone || '').replace(/\s+/g, '')
    }

    return {
      store,
      loading,
      showAddDialog,
      showDeleteDialog,
      editingCustomer,
      deletingCustomer,
      customerFormRef,
      searchForm,
      customerForm,
      customerRules,
      filteredCustomers,
      activeFilterCount,
      hasActiveFilters,
      customerMetrics,
      emptyText,
      formatDate,
      handleSearch,
      resetSearch,
      resetForm,
      openCreateDialog,
      handleEdit,
      handleDelete,
      handleSubmit,
      confirmDelete,
      getCustomerInitial,
      normalizePhone
    }
  }
}
</script>

<style scoped>
.customers {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #172033;
}

.customer-hero,
.filter-panel,
.table-panel,
.metric-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.customer-hero {
  min-height: 118px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92)),
    linear-gradient(90deg, #dbeafe, #ccfbf1);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-copy h1 {
  margin: 0;
  color: #0f172a;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  min-height: 92px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.metric-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.metric-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 6px;
}

.metric-card strong {
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
}

.metric-card--blue .metric-icon {
  background: #dbeafe;
  color: #2563eb;
}

.metric-card--green .metric-icon {
  background: #ccfbf1;
  color: #0f766e;
}

.metric-card--amber .metric-icon {
  background: #fef3c7;
  color: #b45309;
}

.metric-card--violet .metric-icon {
  background: #ede9fe;
  color: #7c3aed;
}

.filter-panel,
.table-panel {
  padding: 18px;
}

.section-heading,
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-heading h2,
.table-toolbar h2 {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 650;
}

.table-toolbar span {
  color: #64748b;
  font-size: 13px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 1px;
}

.customer-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.customer-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #eef2ff;
  color: #4338ca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.customer-main {
  min-width: 0;
}

.customer-main strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-main span {
  color: #94a3b8;
  font-size: 12px;
}

.inline-field,
.phone-link,
.address-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
}

.phone-link {
  color: #2563eb;
  text-decoration: none;
}

.phone-link:hover {
  color: #1d4ed8;
}

.address-cell {
  max-width: 100%;
}

.address-cell span,
.notes-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-cell {
  display: inline-block;
  max-width: 100%;
  color: #64748b;
}

.muted-text {
  color: #94a3b8;
}

.code-tag {
  font-family: Consolas, Monaco, monospace;
  border-color: #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}

.date-pill {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 8px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.customer-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.customer-form .el-form-item:last-child {
  grid-column: 1 / -1;
}

.delete-content {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.delete-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef2f2;
  color: #dc2626;
  font-size: 22px;
  flex-shrink: 0;
}

.delete-content p {
  margin: 0 0 6px;
  color: #0f172a;
  font-weight: 600;
}

.delete-content span {
  color: #dc2626;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.filter-form .el-form-item) {
  margin-bottom: 0;
}

:deep(.filter-form .el-form-item__label),
:deep(.customer-form .el-form-item__label) {
  color: #475569;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 8px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #93c5fd inset;
}

:deep(.premium-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.premium-table .el-table__header th.el-table__cell) {
  background: #f8fafc;
  color: #475569;
  font-weight: 650;
}

:deep(.premium-table .el-table__row) {
  height: 58px;
}

:deep(.premium-table .el-table__row:hover > td.el-table__cell) {
  background: #f8fbff;
}

:deep(.customer-dialog .el-dialog),
:deep(.delete-dialog .el-dialog) {
  border-radius: 8px;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-form {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .customer-hero {
    align-items: stretch;
    flex-direction: column;
    padding: 18px;
  }

  .hero-actions,
  .hero-actions .el-button {
    width: 100%;
  }

  .metric-grid,
  .filter-form,
  .customer-form {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions .el-button {
    width: 100%;
  }

  .section-heading,
  .table-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 420px) {
  .customers {
    gap: 12px;
  }

  .customer-hero,
  .filter-panel,
  .table-panel,
  .metric-card {
    padding: 12px;
  }

  .hero-copy h1 {
    font-size: 21px;
  }

  .metric-card {
    min-height: 78px;
  }

  .metric-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .metric-card strong {
    font-size: 21px;
  }

  .delete-content {
    flex-direction: column;
  }

  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .dialog-footer .el-button {
    width: 100%;
  }
}
</style>
