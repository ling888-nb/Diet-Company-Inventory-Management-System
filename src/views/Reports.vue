<template>
  <div class="reports">
    <div class="page-header">
      <h1>报表管理</h1>
    </div>

    <!-- 报表卡片 -->
    <div class="reports-grid">
      <el-card class="report-card" @click="generateReport('inbound')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #3b82f6;">📥</span>
          </div>
          <div class="report-info">
            <h3>入库报表</h3>
            <p>查看入库记录统计和明细</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('outbound')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #10b981;">📤</span>
          </div>
          <div class="report-info">
            <h3>出库报表</h3>
            <p>查看出库记录统计和明细</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('inventory')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #f59e0b;">📦</span>
          </div>
          <div class="report-info">
            <h3>库存报表</h3>
            <p>查看当前库存状态和变化</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('customers')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #ef4444;">👥</span>
          </div>
          <div class="report-info">
            <h3>客户报表</h3>
            <p>查看客户信息和交易统计</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('products')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #8b5cf6;">📋</span>
          </div>
          <div class="report-info">
            <h3>产品报表</h3>
            <p>查看产品信息和制作步骤</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('materials')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #06b6d4;">🚛</span>
          </div>
          <div class="report-info">
            <h3>材料报表</h3>
            <p>查看材料库存和使用情况</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('processes')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #84cc16;">📅</span>
          </div>
          <div class="report-info">
            <h3>工艺报表</h3>
            <p>查看涂装工艺和颜色统计</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('coating')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #f97316;">🎨</span>
          </div>
          <div class="report-info">
            <h3>涂装报表</h3>
            <p>查看涂装工艺和颜色使用</p>
          </div>
        </div>
      </el-card>

      <el-card class="report-card" @click="generateReport('summary')">
        <div class="report-content">
          <div class="report-icon">
            <span style="font-size: 40px; color: #8b5cf6;">📊</span>
          </div>
          <div class="report-info">
            <h3>综合报表</h3>
            <p>查看系统整体运营数据</p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 报表生成对话框 -->
    <el-dialog
      v-model="showReportDialog"
      title="生成报表"
      width="60%"
      :max-width="700"
    >
      <div v-if="selectedReport" class="report-form">
        <div class="report-header">
          <h3>{{ selectedReport.title }}</h3>
          <p>{{ selectedReport.description }}</p>
        </div>

        <el-form :model="reportForm" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始日期">
                <el-date-picker
                  v-model="reportForm.startDate"
                  type="date"
                  placeholder="请选择开始日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束日期">
                <el-date-picker
                  v-model="reportForm.endDate"
                  type="date"
                  placeholder="请选择结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="报表格式">
            <el-radio-group v-model="reportForm.format">
              <el-radio label="excel">Excel</el-radio>
              <el-radio label="pdf">PDF</el-radio>
              <el-radio label="csv">CSV</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="包含内容">
            <el-checkbox-group v-model="reportForm.include">
              <el-checkbox label="summary">统计摘要</el-checkbox>
              <el-checkbox label="details">详细数据</el-checkbox>
              <el-checkbox label="charts">图表分析</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>

        <div class="report-actions">
          <el-button type="primary" @click="generateSelectedReport">
            生成报表
          </el-button>
          <el-button @click="previewReport">
            预览报表
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 报表预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      title="报表预览"
      width="80%"
      :max-width="1000"
    >
      <div v-if="previewData" class="preview-content">
        <div class="preview-header">
          <h3>{{ selectedReport?.title }} - 预览</h3>
          <div class="preview-actions">
            <el-button type="primary" @click="downloadReport">
              下载报表
            </el-button>
            <el-button @click="printReport">
              打印报表
            </el-button>
          </div>
        </div>

        <div class="preview-body">
          <!-- 统计摘要 -->
          <div v-if="previewData.summary" class="summary-section">
            <h4>统计摘要</h4>
            <el-row :gutter="20">
              <el-col :span="6" v-for="item in previewData.summary" :key="item.label">
                <div class="summary-item">
                  <div class="summary-number">{{ item.value }}</div>
                  <div class="summary-label">{{ item.label }}</div>
                </div>
              </el-col>
            </el-row>
          </div>

          <!-- 详细数据 -->
          <div v-if="previewData.details" class="details-section">
            <h4>详细数据</h4>
            <el-table :data="previewData.details" style="width: 100%" size="small">
              <el-table-column 
                v-for="column in previewData.columns" 
                :key="column.prop"
                :prop="column.prop" 
                :label="column.label" 
                :width="column.width"
              />
            </el-table>
          </div>
        </div>
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
  name: 'Reports',
  setup() {
    const store = useMainStore()
    const selectedReportType = ref('')
    const exportHistory = ref([])
    const showReportDialog = ref(false)
    const showPreviewDialog = ref(false)
    const selectedReport = ref(null)
    const previewData = ref(null)

    const reportForm = reactive({
      startDate: '',
      endDate: '',
      format: 'excel',
      include: ['summary', 'details']
    })

    const exportConfig = reactive({
      format: 'xlsx',
      dateRange: [],
      customerId: ''
    })

    const reportTypeNames = {
      all: '全部数据',
      customers: '客户信息',
      products: '产品信息',
      inventory: '库存信息',
      inbound: '入库记录',
      outbound: '出库记录',
      production: '生产计划',
      coating: '涂装工艺',
      materials: '材料信息'
    }

    const reportConfigs = {
      inbound: {
        title: '入库报表',
        description: '查看入库记录统计和明细'
      },
      outbound: {
        title: '出库报表',
        description: '查看出库记录统计和明细'
      },
      inventory: {
        title: '库存报表',
        description: '查看当前库存状态和变化'
      },
      customers: {
        title: '客户报表',
        description: '查看客户信息和交易统计'
      },
      products: {
        title: '产品报表',
        description: '查看产品信息和制作步骤'
      },
      materials: {
        title: '材料报表',
        description: '查看材料库存和使用情况'
      },
      processes: {
        title: '工艺报表',
        description: '查看涂装工艺和颜色统计'
      },
      coating: {
        title: '涂装报表',
        description: '查看涂装工艺和颜色使用'
      },
      summary: {
        title: '综合报表',
        description: '查看系统整体运营数据'
      }
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('zh-CN')
    }

    const generateReport = (type) => {
      selectedReport.value = reportConfigs[type]
      showReportDialog.value = true
    }

    const generateSelectedReport = () => {
      // 生成报表逻辑
      const data = getReportData(selectedReport.value?.title || '')
      previewData.value = {
        summary: generateSummary(data),
        details: data,
        columns: generateColumns(data)
      }
      showReportDialog.value = false
      showPreviewDialog.value = true
    }

    const previewReport = () => {
      const data = getReportData(selectedReport.value?.title || '')
      previewData.value = {
        summary: generateSummary(data),
        details: data,
        columns: generateColumns(data)
      }
      showReportDialog.value = false
      showPreviewDialog.value = true
    }

    const downloadReport = () => {
      if (!previewData.value) return
      
      const data = previewData.value.details
      const timestamp = new Date().toISOString().split('T')[0]
      const fileName = `${selectedReport.value?.title || '报表'}_${timestamp}.xlsx`
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '报表数据')
      XLSX.writeFile(wb, fileName)
      
      ElMessage.success('报表下载成功')
    }

    const printReport = () => {
      ElMessage.info('打印功能需要根据实际需求实现')
    }

    const getReportData = (reportType) => {
      switch (reportType) {
        case '入库报表':
          return store.getInboundRecordsWithRelations.map(record => ({
            '订单号': record.orderNumber,
            '客户': record.customerName,
            '产品': record.productName,
            '数量': record.quantity,
            '入库时间': formatDate(record.createdAt)
          }))
        case '出库报表':
          return store.getOutboundRecordsWithRelations.map(record => ({
            '订单号': record.orderNumber,
            '客户': record.customerName,
            '产品': record.productName,
            '数量': record.quantity,
            '出库时间': formatDate(record.createdAt)
          }))
        case '库存报表':
          return store.getProductsWithRelations.map(product => ({
            '产品名称': product.name,
            '客户': product.customerName,
            '规格型号': product.specification,
            '创建时间': formatDate(product.createdAt)
          }))
        case '客户报表':
          return store.customers.map(customer => ({
            '客户名称': customer.name,
            '联系人': customer.contact,
            '电话': customer.phone,
            '创建时间': formatDate(customer.createdAt)
          }))
        case '产品报表':
          return store.getProductsWithRelations.map(product => ({
            '产品名称': product.name,
            '客户': product.customerName,
            '规格型号': product.specification,
            '创建时间': formatDate(product.createdAt)
          }))
        case '材料报表':
          return store.materials.map(material => ({
            '材料名称': material.name,
            '规格型号': material.specification,
            '单位': material.unit,
            '单价': material.price,
            '创建时间': formatDate(material.createdAt)
          }))
        case '工艺报表':
          return store.coatingProcesses.map(process => ({
            '工艺名称': process.name,
            '工艺类型': process.type,
            '创建时间': formatDate(process.createdAt)
          }))
        case '涂装报表':
          return [
            { '颜色名称': '黑色', '颜色代码': '#000000', '创建时间': '-' },
            { '颜色名称': '白色', '颜色代码': '#ffffff', '创建时间': '-' },
            { '颜色名称': '红色', '颜色代码': '#ff0000', '创建时间': '-' },
            { '颜色名称': '蓝色', '颜色代码': '#0000ff', '创建时间': '-' },
            { '颜色名称': '绿色', '颜色代码': '#00ff00', '创建时间': '-' },
            { '颜色名称': '黄色', '颜色代码': '#ffff00', '创建时间': '-' },
            { '颜色名称': '灰色', '颜色代码': '#808080', '创建时间': '-' },
            { '颜色名称': '银色', '颜色代码': '#c0c0c0', '创建时间': '-' },
            { '颜色名称': '金色', '颜色代码': '#ffd700', '创建时间': '-' }
          ]
        case '综合报表':
          return [
            { '类型': '客户总数', '数量': store.customers.length },
            { '类型': '产品总数', '数量': store.products.length },
            { '类型': '材料总数', '数量': store.materials.length },
            { '类型': '入库记录', '数量': store.inboundRecords.length },
            { '类型': '出库记录', '数量': store.outboundRecords.length }
          ]
        default:
          return []
      }
    }

    const generateSummary = (data) => {
      if (!Array.isArray(data) || data.length === 0) return []
      
      return [
        { label: '总记录数', value: data.length },
        { label: '数据条数', value: data.length },
        { label: '生成时间', value: new Date().toLocaleString('zh-CN') }
      ]
    }

    const generateColumns = (data) => {
      if (!Array.isArray(data) || data.length === 0) return []
      
      return Object.keys(data[0]).map(key => ({
        prop: key,
        label: key,
        width: 120
      }))
    }

    const selectReportType = (type) => {
      selectedReportType.value = type
    }

    const clearExportConfig = () => {
      Object.assign(exportConfig, {
        format: 'xlsx',
        dateRange: [],
        customerId: ''
      })
    }



    const exportReport = () => {
      const data = getReportData(reportConfigs[selectedReportType.value]?.title || '')
      const timestamp = new Date().toISOString().split('T')[0]
      const typeName = reportTypeNames[selectedReportType.value]
      
      if (exportConfig.format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, typeName)
        
        const fileName = `${typeName}_${timestamp}.xlsx`
        XLSX.writeFile(wb, fileName)
        
        // 记录导出历史
        exportHistory.value.unshift({
          type: selectedReportType.value,
          format: 'xlsx',
          fileName: fileName,
          recordCount: Array.isArray(data) ? data.length : Object.keys(data).length,
          exportTime: new Date().toISOString()
        })
        
        ElMessage.success('报表导出成功')
      } else {
        // CSV格式导出
        const csvContent = convertToCSV(data)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const fileName = `${typeName}_${timestamp}.csv`
        
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        
        // 记录导出历史
        exportHistory.value.unshift({
          type: selectedReportType.value,
          format: 'csv',
          fileName: fileName,
          recordCount: Array.isArray(data) ? data.length : Object.keys(data).length,
          exportTime: new Date().toISOString()
        })
        
        ElMessage.success('报表导出成功')
      }
    }

    const convertToCSV = (data) => {
      if (!Array.isArray(data) || data.length === 0) return ''
      
      const headers = Object.keys(data[0])
      const csvRows = [headers.join(',')]
      
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || ''
          return `"${value}"`
        })
        csvRows.push(values.join(','))
      })
      
      return csvRows.join('\n')
    }
    return {
      store,
      selectedReportType,
      exportConfig,
      exportHistory,
      reportTypeNames,
      showReportDialog,
      showPreviewDialog,
      selectedReport,
      previewData,
      reportForm,
      formatDate,
      selectReportType,
      clearExportConfig,
      exportReport,
      downloadReport,
      generateReport,
      generateSelectedReport,
      previewReport,
      printReport
    }
  }
}
</script>

<style scoped>
.reports {
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

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.report-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
}

.report-card:hover {
  transform: translateY(-5px);
  border-color: #3b82f6;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.report-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.report-icon {
  margin-bottom: 15px;
}

.report-info h3 {
  margin: 10px 0 5px 0;
  color: #1e3a8a;
  font-size: 18px;
}

.report-info p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.export-card {
  margin-bottom: 20px;
}

.history-card {
  margin-bottom: 20px;
}

.report-type-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.report-type-card:hover {
  transform: translateY(-5px);
  border-color: #3b82f6;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.report-type-content {
  text-align: center;
  padding: 20px;
}

.report-type-content h3 {
  margin: 15px 0 10px 0;
  color: #1e3a8a;
  font-size: 16px;
}

.report-type-content p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

@media (max-width: 768px) {
  .reports {
    padding: 0;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .reports-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .report-card,
  .report-type-content {
    padding: 14px;
  }

  .report-card .el-row {
    margin: 0;
  }
  
  .report-card .el-col {
    padding: 0 10px;
    margin-bottom: 20px;
  }
  
  .export-card .el-form .el-row {
    margin: 0;
  }
  
  .export-card .el-form .el-col {
    padding: 0 10px;
  }
}

@media (max-width: 520px) {
  .page-header {
    margin-bottom: 12px;
  }

  .report-info h3,
  .report-type-content h3 {
    font-size: 15px;
  }

  .report-info p,
  .report-type-content p {
    font-size: 13px;
  }
}
</style> 
