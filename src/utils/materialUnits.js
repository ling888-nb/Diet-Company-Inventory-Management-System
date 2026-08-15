const BASE_UNITS = [
  '个', '件', '套', '箱', '包', '卷', '片', '块', '条', '根',
  '支', '瓶', '袋', '盒', '桶', '罐', '盘', '捆', '打', '双',
  '对', '组', '台', '架', '辆', '艘', '架次', '人次'
]

const UNIT_RULES = [
  {
    keywords: ['金属', '钢材', '铝材', '铜材'],
    units: ['千克', '吨', '米', '厘米', '毫米', '平方米', '立方米', '根', '条', '块', '片']
  },
  {
    keywords: ['塑料', '橡胶'],
    units: ['千克', '克', '米', '厘米', '毫米', '个', '件', '套', '卷', '片', '块', '条', '根', '支']
  },
  {
    keywords: ['涂料', '油漆', '颜料', '胶水', '粘合剂', '润滑', '机油', '清洁', '清洗'],
    units: ['升', '毫升', '千克', '克', '桶', '罐', '瓶', '袋', '盒', '支', '个', '件']
  },
  {
    keywords: ['工具', '设备', '电子', '电器'],
    units: ['个', '件', '套', '台', '架', '支', '根', '条', '块', '片']
  },
  {
    keywords: ['包装', '容器'],
    units: ['个', '件', '套', '箱', '包', '袋', '盒', '桶', '罐', '瓶', '卷', '片', '块', '条', '根', '支']
  },
  {
    keywords: ['化工', '化学'],
    units: ['千克', '克', '升', '毫升', '桶', '罐', '瓶', '袋', '盒', '个', '件']
  },
  {
    keywords: ['纺织', '布料'],
    units: ['米', '厘米', '毫米', '平方米', '卷', '片', '块', '条', '根', '支', '个', '件']
  },
  {
    keywords: ['木材', '木料'],
    units: ['立方米', '平方米', '米', '厘米', '毫米', '根', '条', '块', '片', '个', '件']
  },
  {
    keywords: ['玻璃', '陶瓷'],
    units: ['平方米', '米', '厘米', '毫米', '个', '件', '块', '片', '条', '根', '支']
  },
  {
    keywords: ['纸张', '纸板'],
    units: ['张', '页', '本', '册', '卷', '包', '箱', '个', '件', '平方米', '米', '厘米', '毫米']
  },
  {
    keywords: ['螺丝', '螺母', '螺栓'],
    units: ['个', '件', '套', '包', '盒', '箱', '袋', '打', '双', '对', '组']
  },
  {
    keywords: ['轴承', '齿轮', '阀门', '接头'],
    units: ['个', '件', '套', '包', '盒', '箱', '袋', '台', '架']
  },
  {
    keywords: ['电线', '电缆', '管道', '管材'],
    units: ['米', '厘米', '毫米', '卷', '根', '条', '支', '个', '件', '套']
  },
  {
    keywords: ['密封', '垫片'],
    units: ['个', '件', '套', '包', '盒', '箱', '袋', '片', '块', '条', '根', '支']
  }
]

export const getMaterialUnitOptions = (material, materialTypes = []) => {
  if (!material) return []

  const materialType = materialTypes.find(type => type.id === material.typeId)
  const typeName = materialType?.name || ''
  const matchedRule = UNIT_RULES.find(rule => {
    return rule.keywords.some(keyword => typeName.includes(keyword))
  })
  const units = [...new Set([...(matchedRule?.units || BASE_UNITS), ...BASE_UNITS])]

  if (material.unit && !units.includes(material.unit)) {
    units.unshift(material.unit)
  }

  return units
}
