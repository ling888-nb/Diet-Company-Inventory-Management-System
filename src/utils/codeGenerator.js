/**
 * 编码生成工具函数
 */

/**
 * 生成智能编码
 * @param {Array} existingItems - 现有项目数组
 * @param {string} codeField - 编码字段名，默认为 'code'
 * @param {string} prefix - 编码前缀，如 'M', 'P'
 * @param {number} padding - 数字填充位数，默认为 4
 * @param {string} separator - 分隔符，用于复杂编码格式
 * @returns {string} 生成的编码
 */
export const generateSmartCode = (existingItems, codeField = 'code', prefix = '', padding = 4, separator = '') => {
  if (!existingItems || !Array.isArray(existingItems)) {
    return `${prefix}${String(1).padStart(padding, '0')}`
  }

  // 提取所有现有的编码数字
  const existingCodes = existingItems
    .map(item => item[codeField])
    .filter(code => code && code.startsWith(prefix))
    .map(code => {
      if (separator) {
        // 处理带分隔符的编码，如 "CUSTOMERCODE-001"
        const parts = code.split(separator)
        if (parts.length >= 2) {
          const match = parts[parts.length - 1].match(/^(\d+)$/)
          return match ? parseInt(match[1]) : 0
        }
        return 0
      } else {
        // 处理简单编码，如 "M0001", "P001"
        const match = code.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      }
    })
    .filter(num => num > 0)

  // 找到下一个可用的编号
  let nextNumber = 1
  if (existingCodes.length > 0) {
    const maxNumber = Math.max(...existingCodes)
    nextNumber = maxNumber + 1
  }

  // 生成编码
  const numberPart = String(nextNumber).padStart(padding, '0')
  return separator ? `${prefix}${separator}${numberPart}` : `${prefix}${numberPart}`
}

/**
 * 生成智能材料编码
 * @param {Array} materials - 材料数组
 * @param {Object} materialData - 材料数据，包含类型等信息
 * @param {Array} materialTypes - 材料类型数组
 * @returns {string} 材料编码
 */
export const generateSmartMaterialCode = (materials, materialData = {}, materialTypes = []) => {
  // 基础编码生成
  const baseCode = generateSmartCode(materials, 'code', 'M', 4)
  
  // 如果没有提供材料数据，返回基础编码
  if (!materialData.typeId) {
    return baseCode
  }

  // 获取材料类型信息
  const materialType = materialTypes.find(type => type.id === materialData.typeId)
  const typeCode = materialType ? materialType.code || materialType.name.substring(0, 2).toUpperCase() : ''
  
  // 生成智能编码格式：M + 类型代码 + 序号
  let smartCode = 'M'
  
  if (typeCode) {
    smartCode += typeCode
  }
  
  // 查找相同类型的材料数量
  const similarMaterials = materials.filter(material => {
    return materialData.typeId && material.typeId === materialData.typeId
  })
  
  // 生成序号
  const sequenceNumber = similarMaterials.length + 1
  const paddedSequence = String(sequenceNumber).padStart(3, '0')
  
  smartCode += paddedSequence
  
  // 检查编码唯一性
  const isUnique = !materials.some(material => material.code === smartCode)
  
  // 如果不唯一，回退到基础编码
  if (!isUnique) {
    return baseCode
  }
  
  return smartCode
}

/**
 * 生成材料编码（兼容旧版本）
 * @param {Array} materials - 材料数组
 * @returns {string} 材料编码
 */
export const generateMaterialCode = (materials) => {
  return generateSmartCode(materials, 'code', 'M', 4)
}

/**
 * 生成工艺编码
 * @param {Array} processes - 工艺数组
 * @returns {string} 工艺编码
 */
export const generateProcessCode = (processes) => {
  return generateSmartCode(processes, 'code', 'P', 3)
}

/**
 * 生成产品编码
 * @param {Array} products - 产品数组
 * @param {string} customerCode - 客户编码
 * @param {string} customerId - 客户ID
 * @returns {string} 产品编码
 */
export const generateProductCode = (products, customerCode, customerId) => {
  const customerProducts = customerId
    ? products.filter(product => product.customerId === customerId)
    : products
  const numberPart = generateSmartCode(customerProducts, 'code', customerCode, 3, '-').split('-').pop()
  return `${customerCode}-${numberPart}`
}

/**
 * 验证编码唯一性
 * @param {string} code - 要验证的编码
 * @param {Array} existingItems - 现有项目数组
 * @param {string} codeField - 编码字段名
 * @param {string} excludeId - 排除的ID（编辑时使用）
 * @returns {boolean} 是否唯一
 */
export const isCodeUnique = (code, existingItems, codeField = 'code', excludeId = null) => {
  if (!existingItems || !Array.isArray(existingItems)) {
    return true
  }

  return !existingItems.some(item => 
    item[codeField] === code && item.id !== excludeId
  )
}

/**
 * 格式化编码显示
 * @param {string} code - 原始编码
 * @param {string} type - 编码类型
 * @returns {string} 格式化后的编码
 */
export const formatCode = (code, type = 'default') => {
  if (!code) return ''
  
  const formatters = {
    material: (code) => `材料编码: ${code}`,
    process: (code) => `工艺编码: ${code}`,
    product: (code) => `产品编码: ${code}`,
    default: (code) => code
  }
  
  return (formatters[type] || formatters.default)(code)
}

/**
 * 解析材料编码
 * @param {string} code - 材料编码
 * @returns {Object} 解析结果
 */
export const parseMaterialCode = (code) => {
  if (!code) return null
  
  const result = {
    original: code,
    type: 'unknown',
    sequence: 0
  }
  
  // 解析智能编码格式：M + 类型代码 + 序号
  const match = code.match(/^M([A-Z]{2})(\d{3})$/)
  if (match) {
    result.type = match[1]
    result.sequence = parseInt(match[2])
    return result
  }
  
  // 解析基础编码格式：M + 序号
  const basicMatch = code.match(/^M(\d{4})$/)
  if (basicMatch) {
    result.sequence = parseInt(basicMatch[1])
    return result
  }
  
  return result
}

/**
 * 生成材料编码预览
 * @param {Object} materialData - 材料数据
 * @param {Array} materials - 现有材料数组
 * @param {Array} materialTypes - 材料类型数组
 * @returns {string} 预览编码
 */
export const previewMaterialCode = (materialData, materials, materialTypes) => {
  return generateSmartMaterialCode(materials, materialData, materialTypes)
} 
