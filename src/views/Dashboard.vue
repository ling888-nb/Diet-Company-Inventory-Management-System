<template>
  <div class="dashboard">
    <section class="dashboard-hero">
      <div class="hero-content">
        <div class="hero-kicker">
          <el-icon><DataAnalysis /></el-icon>
          <span>实时运营看板</span>
        </div>
        <h1>系统概览</h1>
        <p>欢迎使用 {{ companyName }} 进销存系统</p>
      </div>

      <div class="lan-access-card" :class="{ 'lan-access-card--server': accessInfo.isServerClient }">
        <span>{{ accessInfo.isServerClient ? '服务器控制台' : '其他设备登录地址' }}</span>
        <strong>{{ accessInfo.lanAddress }}</strong>
        <small>
          {{ accessInfo.isServerClient ? '当前设备是服务器本机，可在这里查看后端状态和连接设备。' : '同一 WiFi / 局域网内的电脑和手机可直接打开此网址登录。' }}
        </small>
      </div>

      <div class="hero-actions">
        <el-button type="primary" size="large" @click="$router.push('/inbound')">
          <el-icon><Download /></el-icon>
          入库登记
        </el-button>
        <el-button size="large" @click="$router.push('/outbound')">
          <el-icon><Upload /></el-icon>
          出库管理
        </el-button>
        <el-button size="large" @click="$router.push('/reports')">
          <el-icon><Document /></el-icon>
          报表导出
        </el-button>
      </div>
    </section>

    <section v-if="accessInfo.isServerClient" class="server-status-panel">
      <div class="panel-header">
        <div>
          <h2>服务器状态</h2>
          <span>当前页面由服务器本机打开</span>
        </div>
        <el-tag :type="accessInfo.backendOk ? 'success' : 'danger'">
          {{ accessInfo.backendOk ? '后端正常' : '后端异常' }}
        </el-tag>
      </div>

      <div class="server-status-grid">
        <div>
          <span>连接设备</span>
          <strong>{{ accessInfo.activeDeviceCount }} 台</strong>
        </div>
        <div>
          <span>远程设备</span>
          <strong>{{ accessInfo.remoteDeviceCount }} 台 / {{ accessInfo.remoteLoggedInCount }} 个账号</strong>
        </div>
        <div>
          <span>API 地址</span>
          <strong>{{ accessInfo.apiAddress }}</strong>
        </div>
        <div>
          <span>启动脚本</span>
          <el-button type="primary" size="small" @click="downloadStartScript">
            下载 start_lan_system.bat
          </el-button>
        </div>
      </div>

      <div class="remote-devices-panel">
        <div class="remote-devices-head">
          <div>
            <h3>远程登录设备</h3>
            <span>显示最近 5 分钟内活跃的非服务器设备</span>
          </div>
          <el-tag effect="plain">{{ remoteClients.length }} 台</el-tag>
        </div>

        <el-table
          :data="remoteClients"
          class="premium-table remote-devices-table"
          style="width: 100%"
          size="small"
          empty-text="暂无远程设备在线"
        >
          <el-table-column prop="ip" label="设备 IP" min-width="130" />
          <el-table-column label="登录账号" min-width="130">
            <template #default="scope">
              <span v-if="scope.row.logged_in">{{ scope.row.username }}</span>
              <el-tag v-else type="info" effect="plain">未登录</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="真实姓名" min-width="130">
            <template #default="scope">
              {{ scope.row.real_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="登录时间" min-width="160">
            <template #default="scope">
              {{ formatServerTime(scope.row.login_at) }}
            </template>
          </el-table-column>
          <el-table-column label="最后活跃" min-width="160">
            <template #default="scope">
              {{ formatServerTime(scope.row.last_seen) }}
            </template>
          </el-table-column>
          <el-table-column label="设备信息" min-width="180" show-overflow-tooltip>
            <template #default="scope">
              {{ simplifyUserAgent(scope.row.user_agent) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-alert
        class="server-start-note"
        title="网页不能在后端关闭时直接启动后端；请在服务器电脑双击 start_lan_system.bat。一旦后端运行，其他设备只需打开上方局域网地址。"
        type="info"
        :closable="false"
        show-icon
      />
    </section>

    <section class="stats-grid">
      <div
        v-for="stat in statsCards"
        :key="stat.label"
        class="stat-card"
        :class="`stat-card--${stat.tone}`"
      >
        <div class="stat-icon">
          <el-icon>
            <component :is="stat.icon" />
          </el-icon>
        </div>
        <div class="stat-info">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.hint }}</small>
        </div>
      </div>
    </section>

    <section class="charts-grid">
      <div v-for="chart in dashboardCharts" :key="chart.title" class="chart-panel">
        <div class="panel-header">
          <div>
            <h2>{{ chart.title }}</h2>
            <span>{{ chart.centerLabel }}构成</span>
          </div>
          <el-tag effect="light" type="info">合计 {{ chart.total }}</el-tag>
        </div>

        <div class="chart-body">
          <div class="pie-wrap">
            <svg v-if="!chart.isEmpty" viewBox="0 0 42 42" class="pie-chart" aria-hidden="true">
              <circle class="pie-bg" cx="21" cy="21" r="15.9155" />
              <circle
                v-for="segment in chart.segments"
                :key="segment.name"
                class="pie-slice"
                cx="21"
                cy="21"
                r="15.9155"
                :stroke="segment.color"
                :stroke-dasharray="segment.dasharray"
                :stroke-dashoffset="segment.dashoffset"
              />
              <text x="21" y="20.4" text-anchor="middle" class="pie-value">{{ chart.centerValue }}</text>
              <text x="21" y="25" text-anchor="middle" class="pie-label">{{ chart.centerLabel }}</text>
            </svg>
            <div v-else class="empty-chart">暂无数据</div>
          </div>

          <div class="chart-legend">
            <div v-for="segment in chart.segments" :key="segment.name" class="legend-item">
              <div class="legend-main">
                <span class="legend-color" :style="{ backgroundColor: segment.color }"></span>
                <span class="legend-name">{{ segment.name }}</span>
              </div>
              <div class="legend-meta">
                <span>{{ segment.value }}</span>
                <strong>{{ formatPercent(segment.percent) }}</strong>
              </div>
              <div class="legend-track">
                <span :style="{ width: `${Math.max(segment.percent, 3)}%`, backgroundColor: segment.color }"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="warning-panel" :class="{ 'warning-panel--danger': stockWarningProducts.length > 0 }">
      <div class="panel-header">
        <div>
          <h2>产品库存预警</h2>
          <span>低于 {{ lowStockLimit }} 件会进入关注列表</span>
        </div>
        <el-tag :type="stockWarningProducts.length > 0 ? 'danger' : 'success'">
          {{ stockWarningProducts.length > 0 ? `${stockWarningProducts.length} 个需处理` : '库存正常' }}
        </el-tag>
      </div>

      <el-alert
        v-if="stockWarningProducts.length === 0"
        title="当前没有缺货或低库存产品"
        type="success"
        :closable="false"
        show-icon
      />

      <el-table v-else :data="stockWarningProducts" class="premium-table" style="width: 100%" size="small">
        <el-table-column prop="code" label="产品编码" width="120" />
        <el-table-column prop="name" label="产品名称" min-width="150" />
        <el-table-column prop="customerName" label="客户" width="130" />
        <el-table-column prop="specification" label="规格型号" min-width="130" />
        <el-table-column prop="currentStock" label="当前库存" width="110">
          <template #default="scope">
            <el-tag :type="scope.row.statusType">{{ scope.row.currentStock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.statusType">{{ scope.row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="$router.push(`/inventory?productId=${scope.row.id}`)">
              查库存
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="dashboard-content">
      <div class="recent-panel">
        <div class="panel-header">
          <div>
            <h2>最近入库记录</h2>
            <span>最新 5 条产品入库</span>
          </div>
          <el-button type="primary" link @click="$router.push('/inbound')">查看全部</el-button>
        </div>

        <el-table :data="recentInbound" class="premium-table" style="width: 100%" size="small" empty-text="暂无入库记录">
          <el-table-column prop="orderNumber" label="订单号" width="130" />
          <el-table-column prop="customerName" label="客户" min-width="120" />
          <el-table-column prop="productName" label="产品" min-width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="createdAt" label="入库时间" width="130">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="recent-panel">
        <div class="panel-header">
          <div>
            <h2>最近出库记录</h2>
            <span>最新 5 条产品出库</span>
          </div>
          <el-button type="primary" link @click="$router.push('/outbound')">查看全部</el-button>
        </div>

        <el-table :data="recentOutbound" class="premium-table" style="width: 100%" size="small" empty-text="暂无出库记录">
          <el-table-column prop="orderNumber" label="订单号" width="130" />
          <el-table-column prop="customerName" label="客户" min-width="120" />
          <el-table-column prop="productName" label="产品" min-width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="createdAt" label="出库时间" width="130">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <section class="quick-actions-panel" :class="quickActionsClass">
      <div class="panel-header">
        <div>
          <h2>快速操作</h2>
          <span>常用入口会跟随全局按钮位置偏好调整</span>
        </div>
        <el-tag effect="plain">功能入口</el-tag>
      </div>

      <div class="action-buttons">
        <el-button
          v-for="action in quickActions"
          :key="action.route"
          :type="action.type"
          @click="$router.push(action.route)"
        >
          <el-icon>
            <component :is="action.icon" />
          </el-icon>
          {{ action.label }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useMainStore } from '../stores'
import { formatDate } from '../utils/formatters'
import { useServerAccessInfo } from '../composables/useServerAccessInfo'

const LOW_STOCK_LIMIT = 10
const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#ea580c']

const sumQuantity = (records = []) => {
  return records.reduce((sum, record) => sum + Number(record.quantity || 0), 0)
}

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString('zh-CN')
}

const buildPieChart = (title, items, centerLabel) => {
  const visibleItems = items.filter(item => Number(item.value || 0) > 0)
  const total = visibleItems.reduce((sum, item) => sum + Number(item.value || 0), 0)
  let offset = 0

  const segments = visibleItems.map((item, index) => {
    const percent = total > 0 ? (Number(item.value) / total) * 100 : 0
    const segment = {
      ...item,
      value: Number(item.value),
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
      percent,
      dasharray: `${percent} ${100 - percent}`,
      dashoffset: -offset
    }

    offset += percent
    return segment
  })

  return {
    title,
    total,
    centerLabel,
    centerValue: formatNumber(total),
    isEmpty: total === 0,
    segments
  }
}

export default {
  name: 'Dashboard',
  setup() {
    const store = useMainStore()
    const { accessInfo, downloadStartScript } = useServerAccessInfo()

    const companyName = computed(() => {
      return store.systemSettings.companyName || '南通迪特金属制品有限公司'
    })

    const recentInbound = computed(() => {
      return [...store.getInboundRecordsWithRelations]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    })

    const recentOutbound = computed(() => {
      return [...store.getOutboundRecordsWithRelations]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    })

    const productStockRows = computed(() => {
      return store.getProductsWithRelations.map(product => {
        const stock = store.getProductStock(product.id, product.primaryProcessId)
        const currentStock = stock.availableQuantity
        const statusText = currentStock === 0 ? '缺货' : currentStock <= LOW_STOCK_LIMIT ? '低库存' : '正常'
        const statusType = currentStock === 0 ? 'danger' : currentStock <= LOW_STOCK_LIMIT ? 'warning' : 'success'

        return {
          ...product,
          currentStock,
          totalInbound: stock.totalInbound,
          totalOutbound: stock.totalOutbound,
          statusText,
          statusType
        }
      })
    })

    const stockWarningProducts = computed(() => {
      return productStockRows.value
        .filter(product => product.currentStock <= LOW_STOCK_LIMIT)
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 8)
    })

    const statsCards = computed(() => [
      {
        label: '客户总数',
        value: formatNumber(store.customers.length),
        hint: '客户档案',
        icon: 'UserFilled',
        tone: 'blue'
      },
      {
        label: '产品总数',
        value: formatNumber(store.products.length),
        hint: '产品档案',
        icon: 'Goods',
        tone: 'green'
      },
      {
        label: '入库记录',
        value: formatNumber(store.inboundRecords.length),
        hint: '产品入库',
        icon: 'Download',
        tone: 'amber'
      },
      {
        label: '出库记录',
        value: formatNumber(store.outboundRecords.length),
        hint: '产品出库',
        icon: 'Upload',
        tone: 'red'
      },
      {
        label: '材料种类',
        value: formatNumber(store.materials.length),
        hint: '材料档案',
        icon: 'Box',
        tone: 'violet'
      }
    ])

    const productStockChart = computed(() => {
      const outOfStock = productStockRows.value.filter(product => product.currentStock === 0).length
      const lowStock = productStockRows.value.filter(product => product.currentStock > 0 && product.currentStock <= LOW_STOCK_LIMIT).length
      const healthyStock = productStockRows.value.filter(product => product.currentStock > LOW_STOCK_LIMIT).length

      return buildPieChart('产品库存状态', [
        { name: '库存正常', value: healthyStock, color: '#16a34a' },
        { name: '低库存', value: lowStock, color: '#f59e0b' },
        { name: '缺货', value: outOfStock, color: '#dc2626' }
      ], '产品')
    })

    const businessFlowChart = computed(() => {
      return buildPieChart('实时业务流向', [
        { name: '产品入库', value: sumQuantity(store.inboundRecords), color: '#2563eb' },
        { name: '产品出库', value: sumQuantity(store.outboundRecords), color: '#dc2626' },
        { name: '材料入库', value: sumQuantity(store.materialInboundRecords), color: '#16a34a' },
        { name: '材料出库', value: sumQuantity(store.materialOutboundRecords), color: '#f59e0b' },
        { name: '材料回收', value: sumQuantity(store.materialRecycleRecords), color: '#7c3aed' }
      ], '数量')
    })

    const masterDataChart = computed(() => {
      return buildPieChart('基础资料占比', [
        { name: '客户', value: store.customers.length, color: '#2563eb' },
        { name: '产品', value: store.products.length, color: '#16a34a' },
        { name: '材料', value: store.materials.length, color: '#f59e0b' },
        { name: '工艺', value: store.coatingProcesses.length, color: '#7c3aed' }
      ], '条目')
    })

    const processProductChart = computed(() => {
      const processCountMap = new Map()
      productStockRows.value.forEach(product => {
        const processName = product.primaryProcessName || '未设置工艺'
        processCountMap.set(processName, (processCountMap.get(processName) || 0) + 1)
      })

      const sortedItems = Array.from(processCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length]
        }))

      return buildPieChart('产品工艺分布', sortedItems, '产品')
    })

    const dashboardCharts = computed(() => [
      productStockChart.value,
      businessFlowChart.value,
      masterDataChart.value,
      processProductChart.value
    ])

    const quickActions = [
      { label: '客户管理', route: '/customers', type: 'primary', icon: 'User' },
      { label: '产品管理', route: '/products', type: 'success', icon: 'Goods' },
      { label: '入库管理', route: '/inbound', type: 'warning', icon: 'Download' },
      { label: '出库管理', route: '/outbound', type: 'info', icon: 'Upload' },
      { label: '库存查询', route: '/inventory', type: 'primary', icon: 'DataAnalysis' },
      { label: '报表导出', route: '/reports', type: 'success', icon: 'Document' }
    ]

    const quickActionsClass = computed(() => {
      return `quick-actions-panel--${store.interfacePreferences.actionDock}`
    })

    const remoteClients = computed(() => {
      return accessInfo.value.activeClients
        .filter(client => !client.is_server)
        .sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
    })

    const formatPercent = (percent) => {
      if (percent > 0 && percent < 1) return '<1%'
      return `${Math.round(percent)}%`
    }

    const formatServerTime = (value) => {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    const simplifyUserAgent = (value = '') => {
      if (!value) return '-'
      if (/Mobile|Android|iPhone|iPad/i.test(value)) return '移动端浏览器'
      if (/Edg\//i.test(value)) return 'Microsoft Edge'
      if (/Chrome\//i.test(value)) return 'Chrome 浏览器'
      if (/Firefox\//i.test(value)) return 'Firefox 浏览器'
      if (/Safari\//i.test(value)) return 'Safari 浏览器'
      return value
    }

    return {
      store,
      companyName,
      accessInfo,
      lowStockLimit: LOW_STOCK_LIMIT,
      recentInbound,
      recentOutbound,
      statsCards,
      dashboardCharts,
      stockWarningProducts,
      remoteClients,
      quickActions,
      quickActionsClass,
      formatDate,
      formatPercent,
      formatServerTime,
      simplifyUserAgent,
      downloadStartScript
    }
  }
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  color: #172033;
}

.dashboard-hero {
  min-height: 170px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 26px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(240, 249, 255, 0.9)),
    linear-gradient(100deg, var(--ui-primary-soft), var(--ui-accent-soft));
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
}

.hero-content {
  min-width: 0;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-primary);
  font-size: 13px;
  font-weight: 650;
  margin-bottom: 10px;
}

.hero-content h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 760;
  letter-spacing: 0;
}

.hero-content p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 15px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.lan-access-card {
  min-width: 260px;
  max-width: 360px;
  padding: 14px 16px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
}

.lan-access-card span {
  display: block;
  color: var(--ui-primary);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 7px;
}

.lan-access-card strong {
  display: block;
  color: #0f172a;
  font-size: 17px;
  word-break: break-all;
}

.lan-access-card small {
  display: block;
  margin-top: 7px;
  color: #64748b;
  line-height: 1.55;
}

.lan-access-card--server {
  border-color: rgba(22, 163, 74, 0.3);
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.92), rgba(239, 246, 255, 0.9));
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 14px;
}

.stat-card,
.chart-panel,
.warning-panel,
.recent-panel,
.quick-actions-panel,
.server-status-panel {
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.stat-card {
  min-height: 112px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  overflow: hidden;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-info {
  min-width: 0;
}

.stat-info span {
  display: block;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 6px;
}

.stat-info strong {
  display: block;
  color: #0f172a;
  font-size: 26px;
  line-height: 1;
}

.stat-info small {
  display: block;
  margin-top: 7px;
  color: #94a3b8;
  font-size: 12px;
}

.stat-card--blue .stat-icon {
  color: #2563eb;
  background: #dbeafe;
}

.stat-card--green .stat-icon {
  color: #0f766e;
  background: #ccfbf1;
}

.stat-card--amber .stat-icon {
  color: #b45309;
  background: #fef3c7;
}

.stat-card--red .stat-icon {
  color: #dc2626;
  background: #fee2e2;
}

.stat-card--violet .stat-icon {
  color: #7c3aed;
  background: #ede9fe;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.chart-panel,
.warning-panel,
.recent-panel,
.quick-actions-panel,
.server-status-panel {
  padding: 18px;
}

.server-status-panel {
  border-color: rgba(22, 163, 74, 0.22);
}

.server-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.server-status-grid > div {
  min-height: 82px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.server-status-grid span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 8px;
}

.server-status-grid strong {
  display: block;
  color: #0f172a;
  font-size: 16px;
  word-break: break-all;
}

.server-status-grid .el-button {
  max-width: 100%;
  white-space: normal;
}

.remote-devices-panel {
  margin-top: 14px;
  padding: 14px;
  min-width: 0;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
}

.remote-devices-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.remote-devices-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.remote-devices-head span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}

.remote-devices-table {
  border: 1px solid #eef2f7;
}

.server-start-note {
  margin-top: 14px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
}

.panel-header span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}

.chart-body {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 20px;
  align-items: center;
}

.pie-wrap {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pie-chart {
  width: 160px;
  height: 160px;
  filter: drop-shadow(0 12px 18px rgba(15, 23, 42, 0.08));
}

.pie-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.pie-slice {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 0.25s ease;
}

.pie-value {
  fill: #0f172a;
  font-size: 5px;
  font-weight: 750;
}

.pie-label {
  fill: #64748b;
  font-size: 3px;
}

.empty-chart {
  width: 138px;
  height: 138px;
  border-radius: 50%;
  border: 10px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.legend-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px 12px;
  align-items: center;
  font-size: 13px;
}

.legend-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.legend-meta strong {
  color: #0f172a;
}

.legend-track {
  grid-column: 1 / -1;
  height: 5px;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
}

.legend-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.warning-panel--danger {
  border-color: rgba(220, 38, 38, 0.24);
  box-shadow: 0 16px 36px rgba(220, 38, 38, 0.1);
}

.dashboard-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.quick-actions-panel--left .action-buttons,
.quick-actions-panel--right .action-buttons {
  justify-content: flex-start;
}

.quick-actions-panel--bottom .action-buttons {
  grid-template-columns: repeat(6, minmax(140px, 1fr));
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.action-buttons .el-button {
  height: 48px;
  margin: 0;
  justify-content: center;
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

:deep(.premium-table .el-table__row:hover > td.el-table__cell) {
  background: #f8fbff;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}

@media (max-width: 980px) {
  .dashboard-hero,
  .panel-header {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .lan-access-card {
    width: 100%;
    max-width: none;
  }

  .charts-grid,
  .dashboard-content,
  .server-status-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-hero {
    min-height: auto;
    padding: 18px;
    align-items: stretch;
  }

  .hero-content h1 {
    font-size: 24px;
  }

  .hero-content p {
    font-size: 13px;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-actions .el-button {
    width: 100%;
    margin: 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stat-card {
    min-height: 92px;
    padding: 12px;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .stat-info strong {
    font-size: 22px;
  }

  .chart-panel,
  .warning-panel,
  .recent-panel,
  .quick-actions-panel,
  .server-status-panel {
    padding: 14px;
  }

  .chart-body {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .pie-wrap {
    width: 132px;
    height: 132px;
    margin: 0 auto;
  }

  .pie-chart {
    width: 132px;
    height: 132px;
  }

  .panel-header {
    align-items: stretch;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .dashboard {
    gap: 12px;
  }

  .dashboard-hero,
  .lan-access-card,
  .chart-panel,
  .warning-panel,
  .recent-panel,
  .quick-actions-panel,
  .server-status-panel {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-height: 78px;
  }

  .server-status-grid {
    grid-template-columns: 1fr;
  }

  .remote-devices-head {
    flex-direction: column;
  }
}
</style>
