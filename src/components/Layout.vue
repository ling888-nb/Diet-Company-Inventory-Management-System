<template>
  <div class="layout" :class="layoutClasses" :style="themeStyle">
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-mark">DT</div>
        <div v-show="!isCollapse" class="logo-text">
          <h2>{{ companyName }}</h2>
          <p>智能进销存控制台</p>
        </div>
        <el-tooltip :content="isCollapse ? '展开导航' : '收起导航'" placement="right">
          <el-button class="collapse-button" circle text @click="isCollapse = !isCollapse">
            <el-icon>
              <component :is="isCollapse ? 'Expand' : 'Fold'" />
            </el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <el-menu
        :collapse="isCollapse"
        :default-active="route.path"
        class="sidebar-menu"
        background-color="transparent"
        router
      >
        <el-menu-item
          v-for="item in visibleNavigationItems"
          :key="item.route"
          :index="item.route"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>
            <span>{{ item.title }}</span>
          </template>
        </el-menu-item>
      </el-menu>
    </aside>

    <main class="main-content">
      <header class="top-nav">
        <div class="top-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>业务系统</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
          <div class="top-signals">
            <div class="page-signal">
              <span class="signal-dot"></span>
              <span>{{ pageSignalText }}</span>
            </div>
            <div v-if="accessInfo.isServerClient" class="server-signal">
              <el-icon><Monitor /></el-icon>
              <span>服务器本机</span>
              <strong>{{ accessInfo.backendOk ? '后端正常' : '后端异常' }}</strong>
              <em>{{ accessInfo.activeDeviceCount }} 台设备</em>
            </div>
          </div>
        </div>

        <div class="top-actions">
          <el-popover placement="bottom-end" width="330" trigger="click" popper-class="ui-popover">
            <template #reference>
              <el-button class="control-button">
                <el-icon><MagicStick /></el-icon>
                {{ preferenceSummary }}
              </el-button>
            </template>

            <div class="ui-panel">
              <div class="panel-title">
                <strong>界面偏好</strong>
                <span>即时生效并自动保存</span>
              </div>

              <div class="pref-block">
                <label>主题色</label>
                <el-radio-group
                  :model-value="preferences.accent"
                  size="small"
                  @change="value => updatePreference('accent', value)"
                >
                  <el-radio-button label="ocean">海蓝</el-radio-button>
                  <el-radio-button label="emerald">翡翠</el-radio-button>
                  <el-radio-button label="amber">琥珀</el-radio-button>
                  <el-radio-button label="violet">紫晶</el-radio-button>
                </el-radio-group>
              </div>

              <div class="pref-block">
                <label>按钮位置</label>
                <el-radio-group
                  :model-value="preferences.actionDock"
                  size="small"
                  @change="value => updatePreference('actionDock', value)"
                >
                  <el-radio-button label="right">右侧</el-radio-button>
                  <el-radio-button label="left">左侧</el-radio-button>
                  <el-radio-button label="bottom">底部</el-radio-button>
                  <el-radio-button label="hidden">隐藏</el-radio-button>
                </el-radio-group>
              </div>

              <div class="pref-row">
                <div>
                  <label>页面密度</label>
                  <span>{{ preferences.density === 'compact' ? '紧凑' : '舒适' }}</span>
                </div>
                <el-switch
                  :model-value="preferences.density === 'compact'"
                  active-text="紧凑"
                  inactive-text="舒适"
                  @change="value => updatePreference('density', value ? 'compact' : 'comfortable')"
                />
              </div>

              <div class="pref-row">
                <div>
                  <label>灵动效果</label>
                  <span>{{ preferences.motion ? '已开启' : '已关闭' }}</span>
                </div>
                <el-switch
                  :model-value="preferences.motion"
                  active-text="开"
                  inactive-text="关"
                  @change="value => updatePreference('motion', value)"
                />
              </div>
            </div>
          </el-popover>

          <el-dropdown>
            <span class="user-dropdown">
              <el-avatar size="small">{{ userInitial }}</el-avatar>
              <span>{{ authStore.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item v-if="authStore.isAdmin" @click="router.push('/admin')">后台管理</el-dropdown-item>
                <el-dropdown-item v-if="authStore.hasPermission('settings', 'view')" @click="router.push('/settings')">系统设置</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <nav class="mobile-nav" aria-label="移动端导航">
        <button
          v-for="item in visibleNavigationItems"
          :key="item.route"
          class="mobile-nav-item"
          :class="{ 'is-active': route.path === item.route }"
          type="button"
          @click="router.push(item.route)"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.title }}</span>
        </button>
      </nav>

      <section class="content">
        <router-view />
      </section>
    </main>

    <nav v-if="preferences.actionDock !== 'hidden'" class="quick-dock" :class="`quick-dock--${preferences.actionDock}`">
      <div class="dock-label">
        <el-icon><Position /></el-icon>
        <span>快捷入口</span>
      </div>
      <div class="dock-actions">
        <el-tooltip
          v-for="item in quickActions"
          :key="item.route"
          :content="item.title"
          :placement="preferences.actionDock === 'bottom' ? 'top' : preferences.actionDock === 'left' ? 'right' : 'left'"
        >
          <button
            class="dock-button"
            :class="{ 'is-active': route.path === item.route }"
            type="button"
            @click="router.push(item.route)"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
          </button>
        </el-tooltip>
      </div>
    </nav>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navigationItems, getNavigationItemByRoute } from '../config/navigation'
import { useMainStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import { useServerAccessInfo } from '../composables/useServerAccessInfo'

const ACCENT_THEMES = {
  ocean: {
    label: '海蓝',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    primaryDeep: '#172554',
    accent: '#0891b2',
    accentSoft: '#cffafe'
  },
  emerald: {
    label: '翡翠',
    primary: '#0f766e',
    primarySoft: '#ccfbf1',
    primaryDeep: '#134e4a',
    accent: '#16a34a',
    accentSoft: '#dcfce7'
  },
  amber: {
    label: '琥珀',
    primary: '#b45309',
    primarySoft: '#fef3c7',
    primaryDeep: '#78350f',
    accent: '#ea580c',
    accentSoft: '#ffedd5'
  },
  violet: {
    label: '紫晶',
    primary: '#7c3aed',
    primarySoft: '#ede9fe',
    primaryDeep: '#3b0764',
    accent: '#db2777',
    accentSoft: '#fce7f3'
  }
}

const DOCK_LABELS = {
  right: '右侧',
  left: '左侧',
  bottom: '底部',
  hidden: '隐藏'
}

export default {
  name: 'Layout',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const store = useMainStore()
    const authStore = useAuthStore()
    const isCollapse = ref(false)
    const { accessInfo } = useServerAccessInfo()

    const preferences = computed(() => store.interfacePreferences)

    const visibleNavigationItems = computed(() => {
      return navigationItems.filter(item => {
        if (item.hiddenInMenu) return false
        if (item.adminOnly && !authStore.isAdmin) return false
        return authStore.hasAnyPermission(item.resources || [item.module], 'view')
      })
    })

    const currentTitle = computed(() => {
      return getNavigationItemByRoute(route.path)?.title || route.meta.title || '首页'
    })

    const companyName = computed(() => {
      return store.systemSettings.companyName || '南通迪特金属制品有限公司'
    })

    const pageSignalText = computed(() => {
      const totalRecords = [
        store.customers,
        store.products,
        store.inboundRecords,
        store.outboundRecords,
        store.materials
      ].reduce((sum, list) => sum + (list?.length || 0), 0)

      return `已同步 ${totalRecords} 条业务数据`
    })

    const layoutClasses = computed(() => ({
      'layout--collapsed': isCollapse.value,
      'layout--compact': preferences.value.density === 'compact',
      'layout--no-motion': !preferences.value.motion
    }))

    const themeStyle = computed(() => {
      const theme = ACCENT_THEMES[preferences.value.accent] || ACCENT_THEMES.ocean
      return {
        '--ui-primary': theme.primary,
        '--ui-primary-soft': theme.primarySoft,
        '--ui-primary-deep': theme.primaryDeep,
        '--ui-accent': theme.accent,
        '--ui-accent-soft': theme.accentSoft,
        '--ui-nav-glow': `${theme.primary}55`
      }
    })

    const preferenceSummary = computed(() => {
      const theme = ACCENT_THEMES[preferences.value.accent] || ACCENT_THEMES.ocean
      const dockLabel = DOCK_LABELS[preferences.value.actionDock] || '右侧'
      return `${theme.label} · ${dockLabel}`
    })

    const quickActions = computed(() => {
      return visibleNavigationItems.value.filter(item => item.route !== '/settings' && item.route !== '/admin')
    })

    const updatePreference = (key, value) => {
      store.updateInterfacePreferences({ [key]: value })
    }

    const userInitial = computed(() => {
      return String(authStore.displayName || 'U').trim().slice(0, 1).toUpperCase()
    })

    const handleLogout = async () => {
      await authStore.logout()
      router.push('/login')
    }

    return {
      route,
      router,
      authStore,
      isCollapse,
      currentTitle,
      companyName,
      pageSignalText,
      preferences,
      preferenceSummary,
      accessInfo,
      layoutClasses,
      themeStyle,
      visibleNavigationItems,
      quickActions,
      updatePreference,
      userInitial,
      handleLogout
    }
  }
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  overflow-x: hidden;
  --sidebar-width: 266px;
  --content-padding: 22px;
  --panel-radius: 8px;
  --ease-ui: cubic-bezier(0.2, 0.8, 0.2, 1);
  color: #172033;
  background:
    radial-gradient(circle at top right, var(--ui-accent-soft) 0, transparent 34%),
    radial-gradient(circle at 14% 12%, var(--ui-primary-soft) 0, transparent 32%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.78));
}

.layout--collapsed {
  --sidebar-width: 76px;
}

.layout--compact {
  --content-padding: 14px;
}

.sidebar {
  width: var(--sidebar-width);
  background:
    radial-gradient(circle at 18px 18px, rgba(255, 255, 255, 0.22), transparent 22%),
    linear-gradient(165deg, var(--ui-primary-deep) 0%, var(--ui-primary) 58%, var(--ui-accent) 100%),
    var(--ui-primary-deep);
  box-shadow: 8px 0 34px var(--ui-nav-glow);
  position: fixed;
  height: 100vh;
  z-index: 1000;
  transition: width 0.22s var(--ease-ui), background 0.22s var(--ease-ui);
}

.logo {
  height: 76px;
  padding: 14px 12px;
  display: grid;
  grid-template-columns: 42px 1fr 32px;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
}

.layout--collapsed .logo {
  grid-template-columns: 42px;
  justify-content: center;
}

.logo-mark {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-primary);
  background: #ffffff;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.24);
}

.logo-text {
  min-width: 0;
}

.logo h2 {
  color: #ffffff;
  font-size: 15px;
  margin: 0 0 4px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo p {
  color: rgba(226, 232, 240, 0.78);
  font-size: 12px;
  margin: 0;
}

.collapse-button {
  color: #e2e8f0;
}

.layout--collapsed .collapse-button {
  position: absolute;
  right: 8px;
  bottom: -16px;
  background: var(--ui-primary);
  color: #ffffff;
}

.sidebar-menu {
  border: none;
  padding: 12px 8px;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: var(--sidebar-width);
}

.sidebar-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 4px 0;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 600;
  transition: transform 0.2s var(--ease-ui), background 0.2s var(--ease-ui), color 0.2s var(--ease-ui);
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #ffffff;
  transform: translateX(5px);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: #ffffff !important;
  color: var(--ui-primary) !important;
  box-shadow: inset 4px 0 0 var(--ui-accent), 0 12px 24px rgba(2, 6, 23, 0.22);
  transform: translateX(3px);
}

.sidebar-menu :deep(.el-menu-item.is-active .el-icon) {
  color: var(--ui-accent);
}

.main-content {
  flex: none;
  width: calc(100% - var(--sidebar-width));
  min-width: 0;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  transition: margin-left 0.22s var(--ease-ui), width 0.22s var(--ease-ui);
}

.mobile-nav {
  display: none;
}

.top-nav {
  min-height: 64px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9)),
    linear-gradient(90deg, var(--ui-primary-soft), var(--ui-accent-soft));
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  position: sticky;
  top: 0;
  z-index: 999;
  border-bottom: 2px solid var(--ui-primary-soft);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
}

.top-left {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.top-signals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.page-signal {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
}

.server-signal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 4px 9px;
  border: 1px solid rgba(22, 163, 74, 0.24);
  border-radius: 8px;
  color: #14532d;
  background: linear-gradient(135deg, #f0fdf4, #eff6ff);
  font-size: 12px;
  font-weight: 700;
}

.server-signal strong,
.server-signal em {
  font-style: normal;
  color: #0f766e;
  white-space: nowrap;
}

.signal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ui-accent);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-button,
.user-dropdown {
  border-radius: 8px;
}

.control-button {
  border-color: var(--ui-primary-soft);
  color: var(--ui-primary);
  background: #ffffff;
  font-weight: 650;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 7px 10px;
  color: #334155;
  transition: background-color 0.2s;
}

.user-dropdown:hover,
.control-button:hover {
  background: var(--ui-primary-soft);
  color: var(--ui-primary);
}

.content {
  flex: 1;
  padding: var(--content-padding);
  min-height: calc(100vh - 64px);
  min-width: 0;
  transition: padding 0.2s var(--ease-ui);
}

.ui-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.panel-title strong {
  color: #0f172a;
  font-size: 16px;
}

.panel-title span,
.pref-row span {
  color: #64748b;
  font-size: 12px;
}

.pref-block,
.pref-row {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.pref-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.pref-row > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pref-block label,
.pref-row label {
  color: #334155;
  font-size: 13px;
  font-weight: 650;
}

.quick-dock {
  position: fixed;
  z-index: 1200;
  display: flex;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--ui-primary-soft);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.86)),
    linear-gradient(135deg, var(--ui-primary-soft), var(--ui-accent-soft));
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 38px var(--ui-nav-glow);
}

.quick-dock--right,
.quick-dock--left {
  top: 50%;
  flex-direction: column;
  transform: translateY(-50%);
}

.quick-dock--right {
  right: 18px;
}

.quick-dock--left {
  left: calc(var(--sidebar-width) + 18px);
}

.quick-dock--bottom {
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  max-width: calc(100vw - var(--sidebar-width) - 36px);
  overflow-x: auto;
}

.dock-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ui-primary);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  padding: 0 3px;
}

.quick-dock--right .dock-label,
.quick-dock--left .dock-label {
  writing-mode: vertical-rl;
  padding: 4px 0;
}

.dock-actions {
  display: flex;
  gap: 8px;
}

.quick-dock--right .dock-actions,
.quick-dock--left .dock-actions {
  flex-direction: column;
}

.dock-button {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-primary);
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s var(--ease-ui), color 0.2s var(--ease-ui), background 0.2s var(--ease-ui);
}

.dock-button:hover,
.dock-button.is-active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ui-primary), var(--ui-accent));
  transform: translateY(-2px) scale(1.05);
}

.layout--compact :deep(.el-card__body),
.layout--compact :deep(.el-card__header) {
  padding: 12px;
}

.layout--compact :deep(.el-table .cell) {
  line-height: 18px;
}

.layout--compact :deep(.el-table__row) {
  height: 42px;
}

.layout--compact .top-nav {
  min-height: 54px;
}

.layout--compact .sidebar-menu :deep(.el-menu-item) {
  height: 38px;
  line-height: 38px;
}

.layout--compact .logo {
  height: 64px;
}

.layout--compact .dock-button {
  width: 36px;
  height: 36px;
}

.layout :deep(.el-card) {
  border-radius: var(--panel-radius);
  border-color: rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.layout :deep(.el-button) {
  border-radius: 8px;
}

.layout :deep(.el-button--primary) {
  --el-button-bg-color: var(--ui-primary);
  --el-button-border-color: var(--ui-primary);
  --el-button-hover-bg-color: var(--ui-accent);
  --el-button-hover-border-color: var(--ui-accent);
}

.layout :deep(.el-radio-button__inner) {
  border-radius: 0;
}

.layout :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.layout :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

.layout :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: var(--ui-primary);
  border-color: var(--ui-primary);
  box-shadow: -1px 0 0 0 var(--ui-primary);
}

.layout:not(.layout--no-motion) :deep(.el-card),
.layout:not(.layout--no-motion) :deep(.el-button),
.layout:not(.layout--no-motion) .dock-button {
  transition: transform 0.2s var(--ease-ui), box-shadow 0.2s var(--ease-ui), background 0.2s var(--ease-ui);
}

.layout:not(.layout--no-motion) :deep(.el-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.09);
}

.layout--no-motion *,
.layout--no-motion :deep(*) {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 900px) {
  .layout {
    --sidebar-width: 0px;
    display: block;
  }

  .sidebar {
    display: none;
  }

  .main-content {
    width: 100%;
    margin-left: 0;
  }

  .top-nav {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
    min-height: auto;
    padding: 12px;
  }

  .top-left {
    width: 100%;
  }

  .top-left :deep(.el-breadcrumb) {
    max-width: 100%;
    overflow: hidden;
  }

  .top-signals {
    width: 100%;
  }

  .server-signal,
  .page-signal {
    max-width: 100%;
    min-width: 0;
  }

  .server-signal span {
    display: none;
  }

  .top-actions {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }

  .control-button {
    flex: 1 1 auto;
    min-width: 0;
  }

  .control-button :deep(span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-dropdown {
    flex: 0 0 auto;
    max-width: 52%;
  }

  .user-dropdown > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-nav {
    position: sticky;
    top: 0;
    z-index: 998;
    display: flex;
    gap: 8px;
    padding: 9px 12px 10px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9)),
      linear-gradient(90deg, var(--ui-primary-soft), var(--ui-accent-soft));
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  }

  .mobile-nav-item {
    flex: 0 0 auto;
    min-width: 74px;
    min-height: 48px;
    padding: 7px 10px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 8px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #475569;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
  }

  .mobile-nav-item span {
    max-width: 84px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 650;
  }

  .mobile-nav-item.is-active {
    color: #ffffff;
    border-color: transparent;
    background: linear-gradient(135deg, var(--ui-primary), var(--ui-accent));
    box-shadow: 0 10px 20px var(--ui-nav-glow);
  }

  .content {
    padding: 14px;
    min-height: calc(100dvh - 124px);
  }

  .quick-dock--right,
  .quick-dock--left {
    display: none;
  }

  .quick-dock--bottom {
    left: 12px;
    right: 12px;
    bottom: 10px;
    transform: none;
    width: 100%;
    max-width: calc(100vw - 24px);
  }
}

@media (max-width: 640px) {
  .top-nav {
    padding: 10px;
  }

  .top-left :deep(.el-breadcrumb__inner),
  .page-signal,
  .server-signal {
    font-size: 11px;
  }

  .server-signal {
    gap: 6px;
    padding: 4px 7px;
  }

  .mobile-nav {
    padding: 8px 10px;
  }

  .mobile-nav-item {
    min-width: 66px;
    min-height: 44px;
    padding: 6px 8px;
  }

  .mobile-nav-item span {
    max-width: 72px;
    font-size: 11px;
  }

  .content {
    padding: 10px;
    min-height: calc(100dvh - 116px);
  }

  .dock-label {
    display: none;
  }

  .quick-dock--bottom {
    padding: 8px;
  }

  .dock-actions {
    width: 100%;
    overflow-x: auto;
    justify-content: flex-start;
  }

  .dock-button {
    width: 38px;
    height: 38px;
  }
}
</style>
