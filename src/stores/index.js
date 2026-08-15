import { defineStore } from 'pinia'
import { dataApi, getApiErrorMessage } from '../services/api'
import { scheduleDataFileSave } from '../utils/dataStorage'

const STORAGE_KEY = 'inventory-system-data'

const DEFAULT_SYSTEM_SETTINGS = {
  companyName: '南通迪特金属制品有限公司',
  allowEdit: true,
  cloudSync: true,
  interfacePreferences: {
    accent: 'ocean',
    density: 'comfortable',
    actionDock: 'right',
    motion: true
  }
}

const COLLECTION_KEYS = [
  'customers',
  'products',
  'coatingProcesses',
  'processCombinations',
  'materials',
  'materialTypes',
  'materialColors',
  'materialSuppliers',
  'inboundRecords',
  'outboundRecords',
  'materialInboundRecords',
  'materialOutboundRecords',
  'materialRecycleRecords',
  'materialConsumptionRecords'
]

const nowIso = () => new Date().toISOString()

const createId = (prefix = '') => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const findById = (state, collection, id) => {
  return (state[collection] || []).find(item => item.id === id)
}

const nextCode = (items, prefix, padding) => {
  const maxNumber = (items || [])
    .map(item => item.code)
    .map(code => {
      const match = typeof code === 'string' ? code.match(new RegExp(`^${prefix}(\\d+)$`)) : null
      return match ? Number(match[1]) : 0
    })
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}${String(maxNumber + 1).padStart(padding, '0')}`
}

const stripCachedRelationNames = (record) => {
  const {
    customerName,
    productName,
    coatingProcess,
    coatingProcessName,
    materialName,
    supplierName,
    ...payload
  } = record || {}

  return payload
}

const normalizeSteps = (steps = []) => {
  return (steps || []).map((step, index) => ({
    id: step.id || createId(`step_${index + 1}_`),
    coatingProcessId: step.coatingProcessId || '',
    materialId: step.materialId || '',
    materialQuantity: step.materialQuantity || 1,
    notes: step.notes || '',
    ...step
  }))
}

const getPrimaryProcess = (state, productId) => {
  const product = findById(state, 'products', productId)
  const firstStep = product?.steps?.find(step => step.coatingProcessId)
  const process = firstStep ? findById(state, 'coatingProcesses', firstStep.coatingProcessId) : null

  return {
    id: firstStep?.coatingProcessId || '',
    name: process?.name || ''
  }
}

const decorateProduct = (state, product) => {
  if (!product) return null

  const customer = findById(state, 'customers', product.customerId)
  const steps = normalizeSteps(product.steps).map((step, index) => {
    const process = findById(state, 'coatingProcesses', step.coatingProcessId)
    const material = findById(state, 'materials', step.materialId)

    return {
      ...step,
      stepNumber: index + 1,
      coatingProcessName: process?.name || '未知工艺',
      coatingProcessType: process?.type || '',
      materialName: material?.name || '',
      material,
      materials: material ? [{
        id: material.id,
        name: material.name,
        code: material.code || '',
        specification: material.specification || '',
        quantity: step.materialQuantity || 1,
        unit: material.unit || '个'
      }] : []
    }
  })

  const primaryProcess = steps.find(step => step.coatingProcessId)

  return {
    ...product,
    customerName: customer?.name || '未知客户',
    customerCode: customer?.code || product.customerCode || '',
    steps,
    primaryProcessId: primaryProcess?.coatingProcessId || '',
    primaryProcessName: primaryProcess?.coatingProcessName || ''
  }
}

const decorateMaterial = (state, material) => {
  if (!material) return null

  const type = findById(state, 'materialTypes', material.typeId)
  const supplier = findById(state, 'materialSuppliers', material.supplierId)

  return {
    ...material,
    typeName: type?.name || '未知类型',
    supplierName: supplier?.name || '未知供应商'
  }
}

const decorateMovementRecord = (state, record) => {
  if (!record) return null

  const product = findById(state, 'products', record.productId)
  const productDetail = decorateProduct(state, product)
  const customerId = record.customerId || product?.customerId || ''
  const processId = record.coatingProcessId || productDetail?.primaryProcessId || ''
  const customer = findById(state, 'customers', customerId)
  const process = findById(state, 'coatingProcesses', processId)

  return {
    ...record,
    customerId,
    coatingProcessId: processId,
    customerName: customer?.name || record.customerName || '未知客户',
    productName: product?.name || record.productName || '未知产品',
    productCode: product?.code || '',
    coatingProcess: process?.name || record.coatingProcess || '未知工艺'
  }
}

const decorateMaterialRecord = (state, record) => {
  if (!record) return null

  const material = findById(state, 'materials', record.materialId)
  const supplier = findById(state, 'materialSuppliers', record.supplierId)
  const customer = findById(state, 'customers', record.customerId)
  const product = findById(state, 'products', record.productId)

  return {
    ...record,
    materialName: material?.name || record.materialName || '未知材料',
    materialCode: material?.code || '',
    specification: material?.specification || record.specification || '',
    unit: record.unit || material?.unit || '',
    supplierName: supplier?.name || record.supplierName || record.supplier || '未知供应商',
    customerName: customer?.name || record.customerName || '未知客户',
    productName: product?.name || record.productName || '未知产品',
    productCode: product?.code || ''
  }
}

const productStock = (state, productId, processId = '') => {
  const targetProcessId = processId || getPrimaryProcess(state, productId).id
  const sameProductProcess = record => {
    return record.productId === productId && (!targetProcessId || record.coatingProcessId === targetProcessId)
  }

  const totalInbound = (state.inboundRecords || [])
    .filter(sameProductProcess)
    .reduce((sum, record) => sum + Number(record.quantity || 0), 0)

  const totalOutbound = (state.outboundRecords || [])
    .filter(sameProductProcess)
    .reduce((sum, record) => sum + Number(record.quantity || 0), 0)

  return {
    totalInbound,
    totalOutbound,
    availableQuantity: Math.max(0, totalInbound - totalOutbound)
  }
}

const addEntity = (store, collection, payload, defaults = {}) => {
  const record = {
    id: createId(),
    ...defaults,
    ...payload,
    createdAt: payload?.createdAt || nowIso()
  }

  store[collection].push(record)
  store.saveToLocalStorage()
  store.persistRecord(collection, record, 'create')
  return record
}

const updateEntity = (store, collection, id, updates) => {
  const index = store[collection].findIndex(item => item.id === id)
  if (index === -1) return null

  const updatedRecord = {
    ...store[collection][index],
    ...updates,
    updatedAt: nowIso()
  }

  store[collection][index] = updatedRecord
  store.saveToLocalStorage()
  store.persistRecord(collection, updatedRecord, 'update')
  return updatedRecord
}

const deleteEntity = (store, collection, id) => {
  const before = store[collection].length
  store[collection] = store[collection].filter(item => item.id !== id)
  const deleted = store[collection].length !== before

  if (deleted) {
    store.saveToLocalStorage()
    store.deleteRemoteRecord(collection, id)
  }

  return deleted
}

const hydrateStore = (store, data = {}) => {
  COLLECTION_KEYS.forEach(key => {
    store[key] = Array.isArray(data[key]) ? data[key] : []
  })

  store.systemSettings = {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...(data.systemSettings || {}),
    interfacePreferences: {
      ...DEFAULT_SYSTEM_SETTINGS.interfacePreferences,
      ...(data.systemSettings?.interfacePreferences || {})
    }
  }
}

export const useMainStore = defineStore('main', {
  state: () => ({
    customers: [],
    products: [],
    coatingProcesses: [],
    processCombinations: [],

    materials: [],
    materialTypes: [],
    materialColors: [],
    materialSuppliers: [],
    inboundRecords: [],
    outboundRecords: [],
    materialInboundRecords: [],
    materialOutboundRecords: [],
    materialRecycleRecords: [],
    materialConsumptionRecords: [],

    systemSettings: { ...DEFAULT_SYSTEM_SETTINGS },
    syncStatus: 'idle',
    syncError: '',
    _isHydrated: false,
    _remoteReady: false
  }),

  getters: {
    getCustomerById: (state) => (id) => findById(state, 'customers', id),
    getProductById: (state) => (id) => findById(state, 'products', id),
    getMaterialById: (state) => (id) => findById(state, 'materials', id),
    getProcessById: (state) => (id) => findById(state, 'coatingProcesses', id),

    getProductsByCustomer: (state) => (customerId) => {
      return state.products.filter(product => product.customerId === customerId)
    },

    getProductDetail: (state) => (productId) => {
      return decorateProduct(state, findById(state, 'products', productId))
    },

    getProductsWithRelations: (state) => {
      return state.products.map(product => decorateProduct(state, product))
    },

    getMaterialsWithRelations: (state) => {
      return state.materials.map(material => decorateMaterial(state, material))
    },

    getInboundRecordsWithRelations: (state) => {
      return state.inboundRecords.map(record => decorateMovementRecord(state, record))
    },

    getOutboundRecordsWithRelations: (state) => {
      return state.outboundRecords.map(record => decorateMovementRecord(state, record))
    },

    getMaterialInboundRecordsWithRelations: (state) => {
      return state.materialInboundRecords.map(record => decorateMaterialRecord(state, record))
    },

    getMaterialOutboundRecordsWithRelations: (state) => {
      return state.materialOutboundRecords.map(record => decorateMaterialRecord(state, record))
    },

    getMaterialRecycleRecordsWithRelations: (state) => {
      return state.materialRecycleRecords.map(record => decorateMaterialRecord(state, record))
    },

    getPrimaryProcessByProduct: (state) => (productId) => {
      return getPrimaryProcess(state, productId)
    },

    getProductStock: (state) => (productId, processId = '') => {
      return productStock(state, productId, processId)
    },

    getInventoryByProduct: (state) => (productId) => {
      return productStock(state, productId).availableQuantity
    },

    interfacePreferences: (state) => {
      return {
        ...DEFAULT_SYSTEM_SETTINGS.interfacePreferences,
        ...(state.systemSettings.interfacePreferences || {})
      }
    }
  },

  actions: {
    async loadFromBackend() {
      this.syncStatus = 'loading'
      this.syncError = ''
      try {
        const data = await dataApi.snapshot()
        hydrateStore(this, data)
        this._isHydrated = true
        this._remoteReady = true
        this.syncStatus = 'synced'
        this.saveToLocalStorage()
        return data
      } catch (error) {
        this.syncStatus = 'error'
        this.syncError = getApiErrorMessage(error, '无法连接局域网后端')
        throw error
      }
    },

    async persistRecord(collection, record, operation = 'update') {
      if (!record?.id) return null
      this.syncStatus = 'saving'
      this.syncError = ''

      try {
        const saved = operation === 'create'
          ? await dataApi.create(collection, record)
          : await dataApi.update(collection, record.id, record)
        const index = this[collection].findIndex(item => item.id === saved.id)
        if (index !== -1) {
          this[collection][index] = saved
          this.saveToLocalStorage()
        }
        this._remoteReady = true
        this.syncStatus = 'synced'
        return saved
      } catch (error) {
        this.syncStatus = 'error'
        this.syncError = getApiErrorMessage(error, '数据同步失败')
        console.error('数据同步失败:', error)
        return null
      }
    },

    async deleteRemoteRecord(collection, id) {
      if (!id) return false
      this.syncStatus = 'saving'
      this.syncError = ''

      try {
        await dataApi.remove(collection, id)
        this.syncStatus = 'synced'
        return true
      } catch (error) {
        this.syncStatus = 'error'
        this.syncError = getApiErrorMessage(error, '删除同步失败')
        console.error('删除同步失败:', error)
        return false
      }
    },

    addCustomer(customer) {
      return addEntity(this, 'customers', customer, {
        code: nextCode(this.customers, 'C', 4)
      })
    },

    updateCustomer(id, updates) {
      const updatedCustomer = updateEntity(this, 'customers', id, updates)

      if (updatedCustomer?.code) {
        this.products = this.products.map(product => (
          product.customerId === id
            ? { ...product, customerCode: updatedCustomer.code }
            : product
        ))
        this.saveToLocalStorage()
      }

      return updatedCustomer
    },

    deleteCustomer(id) {
      return deleteEntity(this, 'customers', id)
    },

    addProduct(product) {
      const customer = findById(this, 'customers', product.customerId)
      return addEntity(this, 'products', {
        ...product,
        steps: normalizeSteps(product.steps),
        customerCode: customer?.code || product.customerCode || ''
      })
    },

    updateProduct(id, updates) {
      const existingProduct = findById(this, 'products', id)
      const customer = findById(this, 'customers', updates.customerId)
      return updateEntity(this, 'products', id, {
        ...updates,
        steps: updates.steps ? normalizeSteps(updates.steps) : existingProduct?.steps || [],
        customerCode: customer?.code || updates.customerCode || existingProduct?.customerCode || ''
      })
    },

    deleteProduct(id) {
      return deleteEntity(this, 'products', id)
    },

    addCoatingProcess(process) {
      return addEntity(this, 'coatingProcesses', process)
    },

    updateCoatingProcess(id, updates) {
      return updateEntity(this, 'coatingProcesses', id, updates)
    },

    deleteCoatingProcess(id) {
      return deleteEntity(this, 'coatingProcesses', id)
    },

    addProcessCombination(combination) {
      return addEntity(this, 'processCombinations', combination)
    },

    updateProcessCombination(id, updates) {
      return updateEntity(this, 'processCombinations', id, updates)
    },

    deleteProcessCombination(id) {
      return deleteEntity(this, 'processCombinations', id)
    },

    getCombinationProcesses(combinationId) {
      const combination = this.processCombinations.find(item => item.id === combinationId)
      if (!combination?.processIds) return []

      return combination.processIds
        .map(processId => findById(this, 'coatingProcesses', processId))
        .filter(Boolean)
    },

    isProcessUsedInCombinations(processId) {
      return this.processCombinations.some(combination => {
        return combination.processIds && combination.processIds.includes(processId)
      })
    },

    addMaterialType(type) {
      return addEntity(this, 'materialTypes', type)
    },

    updateMaterialType(id, updates) {
      return updateEntity(this, 'materialTypes', id, updates)
    },

    deleteMaterialType(id) {
      return deleteEntity(this, 'materialTypes', id)
    },

    addMaterialColor(color) {
      return addEntity(this, 'materialColors', color)
    },

    updateMaterialColor(id, updates) {
      return updateEntity(this, 'materialColors', id, updates)
    },

    deleteMaterialColor(id) {
      return deleteEntity(this, 'materialColors', id)
    },

    addMaterialSupplier(supplier) {
      return addEntity(this, 'materialSuppliers', supplier)
    },

    updateMaterialSupplier(id, updates) {
      return updateEntity(this, 'materialSuppliers', id, updates)
    },

    deleteMaterialSupplier(id) {
      return deleteEntity(this, 'materialSuppliers', id)
    },

    addMaterial(material) {
      return addEntity(this, 'materials', material)
    },

    updateMaterial(id, updates) {
      return updateEntity(this, 'materials', id, updates)
    },

    deleteMaterial(id) {
      return deleteEntity(this, 'materials', id)
    },

    addInboundRecord(record) {
      const payload = stripCachedRelationNames(record)
      const primaryProcess = getPrimaryProcess(this, payload.productId)

      return addEntity(this, 'inboundRecords', {
        ...payload,
        customerId: payload.customerId || findById(this, 'products', payload.productId)?.customerId || '',
        coatingProcessId: payload.coatingProcessId || primaryProcess.id
      }, {
        orderNumber: `IN${Date.now()}`,
        flowNumber: `FL${Date.now()}`
      })
    },

    updateInboundRecord(id, updates) {
      const payload = stripCachedRelationNames(updates)
      const primaryProcess = getPrimaryProcess(this, payload.productId)

      return updateEntity(this, 'inboundRecords', id, {
        ...payload,
        customerId: payload.customerId || findById(this, 'products', payload.productId)?.customerId || '',
        coatingProcessId: payload.coatingProcessId || primaryProcess.id
      })
    },

    deleteInboundRecord(id) {
      return deleteEntity(this, 'inboundRecords', id)
    },

    addOutboundRecord(record) {
      const payload = stripCachedRelationNames(record)
      const primaryProcess = getPrimaryProcess(this, payload.productId)

      return addEntity(this, 'outboundRecords', {
        ...payload,
        customerId: payload.customerId || findById(this, 'products', payload.productId)?.customerId || '',
        coatingProcessId: payload.coatingProcessId || primaryProcess.id
      }, {
        orderNumber: `OUT${Date.now()}`
      })
    },

    updateOutboundRecord(id, updates) {
      const payload = stripCachedRelationNames(updates)
      const primaryProcess = getPrimaryProcess(this, payload.productId)

      return updateEntity(this, 'outboundRecords', id, {
        ...payload,
        customerId: payload.customerId || findById(this, 'products', payload.productId)?.customerId || '',
        coatingProcessId: payload.coatingProcessId || primaryProcess.id
      })
    },

    deleteOutboundRecord(id) {
      return deleteEntity(this, 'outboundRecords', id)
    },

    addMaterialInbound(record) {
      return addEntity(this, 'materialInboundRecords', stripCachedRelationNames(record), {
        orderNumber: `MIN${Date.now()}`
      })
    },

    updateMaterialInbound(id, updates) {
      return updateEntity(this, 'materialInboundRecords', id, stripCachedRelationNames(updates))
    },

    deleteMaterialInbound(id) {
      return deleteEntity(this, 'materialInboundRecords', id)
    },

    addMaterialOutbound(record) {
      return addEntity(this, 'materialOutboundRecords', stripCachedRelationNames(record), {
        orderNumber: `MOUT${Date.now()}`
      })
    },

    updateMaterialOutbound(id, updates) {
      return updateEntity(this, 'materialOutboundRecords', id, stripCachedRelationNames(updates))
    },

    deleteMaterialOutbound(id) {
      return deleteEntity(this, 'materialOutboundRecords', id)
    },

    addMaterialRecycle(record) {
      return addEntity(this, 'materialRecycleRecords', stripCachedRelationNames(record), {
        orderNumber: `MREC${Date.now()}`
      })
    },

    updateMaterialRecycle(id, updates) {
      return updateEntity(this, 'materialRecycleRecords', id, stripCachedRelationNames(updates))
    },

    deleteMaterialRecycle(id) {
      return deleteEntity(this, 'materialRecycleRecords', id)
    },

    addMaterialConsumption(record) {
      return addEntity(this, 'materialConsumptionRecords', stripCachedRelationNames(record))
    },

    updateMaterialConsumption(id, updates) {
      return updateEntity(this, 'materialConsumptionRecords', id, stripCachedRelationNames(updates))
    },

    deleteMaterialConsumption(id) {
      return deleteEntity(this, 'materialConsumptionRecords', id)
    },

    updateInterfacePreferences(updates) {
      this.systemSettings.interfacePreferences = {
        ...DEFAULT_SYSTEM_SETTINGS.interfacePreferences,
        ...(this.systemSettings.interfacePreferences || {}),
        ...updates
      }
      this.saveToLocalStorage()
      this.persistSystemSettings()
    },

    saveToLocalStorage() {
      if (typeof localStorage === 'undefined') return

      const data = this.getPersistedData()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      scheduleDataFileSave(data)
    },

    getPersistedData(extra = {}) {
      const data = COLLECTION_KEYS.reduce((result, key) => {
        result[key] = this[key] || []
        return result
      }, {})

      return {
        ...data,
        systemSettings: this.systemSettings,
        schemaVersion: 1,
        savedAt: nowIso(),
        ...extra
      }
    },

    updateSystemSettings(settings) {
      this.systemSettings = {
        ...this.systemSettings,
        ...settings
      }
      this.saveToLocalStorage()
      this.persistSystemSettings()
    },

    restoreFromBackup(data) {
      hydrateStore(this, data)
      this._isHydrated = true
      this.saveToLocalStorage()
      this.restoreBackendSnapshot(data)
    },

    async persistSystemSettings() {
      try {
        const settings = await dataApi.updateSettings(this.systemSettings)
        this.systemSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...settings,
          interfacePreferences: {
            ...DEFAULT_SYSTEM_SETTINGS.interfacePreferences,
            ...(settings?.interfacePreferences || {})
          }
        }
        this.syncStatus = 'synced'
        this.syncError = ''
      } catch (error) {
        this.syncStatus = 'error'
        this.syncError = getApiErrorMessage(error, '系统设置同步失败')
        console.error('系统设置同步失败:', error)
      }
    },

    async restoreBackendSnapshot(data) {
      try {
        await dataApi.restoreSnapshot(data)
        this.syncStatus = 'synced'
        this.syncError = ''
      } catch (error) {
        this.syncStatus = 'error'
        this.syncError = getApiErrorMessage(error, '备份恢复同步失败')
        console.error('备份恢复同步失败:', error)
      }
    },

    loadFromLocalStorage() {
      if (this._isHydrated || typeof localStorage === 'undefined') return

      const rawData = localStorage.getItem(STORAGE_KEY)
      if (!rawData) {
        this._isHydrated = true
        return
      }

      try {
        hydrateStore(this, JSON.parse(rawData))
      } catch (error) {
        console.error('本地数据读取失败:', error)
      } finally {
        this._isHydrated = true
      }
    },

    initializeDefaultData() {
      let changed = false

      if (this.customers.length === 0) {
        this.customers = [{
          id: 'customer_1',
          code: 'C0001',
          name: '示例客户',
          contact: '张三',
          phone: '13800138000',
          address: '江苏省南通市',
          notes: '示例客户信息',
          createdAt: nowIso()
        }]
        changed = true
      }

      if (this.coatingProcesses.length === 0) {
        const defaultProcesses = [
          { name: '喷粉', type: 'single' },
          { name: '电泳', type: 'single' },
          { name: '喷漆', type: 'single' },
          { name: '喷砂', type: 'single' },
          { name: '抛丸', type: 'single' },
          { name: '前处理', type: 'single' },
          { name: '钝化', type: 'single' },
          { name: '复合涂装工艺', type: 'composite' }
        ]

        this.coatingProcesses = defaultProcesses.map((process, index) => ({
          id: `process_${index + 1}`,
          code: `P${String(index + 1).padStart(3, '0')}`,
          ...process,
          createdAt: nowIso()
        }))
        changed = true
      }

      if (this.materialTypes.length === 0) {
        const defaultTypes = [
          { name: '钢材', description: '各种规格的钢材' },
          { name: '铝材', description: '各种规格的铝材' },
          { name: '铜材', description: '各种规格的铜材' },
          { name: '不锈钢', description: '各种规格的不锈钢' },
          { name: '塑料', description: '各种规格的塑料材料' }
        ]

        this.materialTypes = defaultTypes.map((type, index) => ({
          id: `type_${index + 1}`,
          ...type,
          createdAt: nowIso()
        }))
        changed = true
      }

      if (this.materialColors.length === 0) {
        const defaultMaterialColors = [
          { name: '原色', code: '#8B7355' },
          { name: '银色', code: '#C0C0C0' },
          { name: '金色', code: '#FFD700' },
          { name: '古铜色', code: '#CD7F32' },
          { name: '黑色', code: '#000000' },
          { name: '白色', code: '#FFFFFF' },
          { name: '红色', code: '#FF0000' },
          { name: '蓝色', code: '#0000FF' },
          { name: '绿色', code: '#00FF00' }
        ]

        this.materialColors = defaultMaterialColors.map((color, index) => ({
          id: `color_${index + 1}`,
          ...color,
          createdAt: nowIso()
        }))
        changed = true
      }

      if (this.materialSuppliers.length === 0) {
        const defaultSuppliers = [
          { name: '宝钢集团', contact: '李经理', phone: '021-12345678', address: '上海市宝山区' },
          { name: '鞍钢集团', contact: '王经理', phone: '0412-87654321', address: '辽宁省鞍山市' },
          { name: '武钢集团', contact: '张经理', phone: '027-12345678', address: '湖北省武汉市' },
          { name: '沙钢集团', contact: '刘经理', phone: '0512-87654321', address: '江苏省张家港市' }
        ]

        this.materialSuppliers = defaultSuppliers.map((supplier, index) => ({
          id: `supplier_${index + 1}`,
          ...supplier,
          createdAt: nowIso()
        }))
        changed = true
      }

      if (changed) {
        this.saveToLocalStorage()
      }
    }
  }
})
