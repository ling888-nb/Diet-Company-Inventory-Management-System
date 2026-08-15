export const navigationItems = [
  {
    path: 'dashboard',
    route: '/dashboard',
    name: 'Dashboard',
    title: '首页',
    icon: 'HomeFilled',
    module: 'dashboard',
    resources: ['dashboard'],
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: 'customers',
    route: '/customers',
    name: 'Customers',
    title: '客户信息',
    icon: 'User',
    module: 'customers',
    resources: ['customers'],
    component: () => import('../views/Customers.vue')
  },
  {
    path: 'products',
    route: '/products',
    name: 'Products',
    title: '产品信息',
    icon: 'Goods',
    module: 'products',
    resources: ['products'],
    component: () => import('../views/Products.vue')
  },
  {
    path: 'coating-process',
    route: '/coating-process',
    name: 'CoatingProcess',
    title: '涂装工艺',
    icon: 'Operation',
    module: 'coatingProcesses',
    resources: ['coatingProcesses', 'processCombinations'],
    component: () => import('../views/CoatingProcess.vue')
  },
  {
    path: 'materials',
    route: '/materials',
    name: 'Materials',
    title: '材料信息',
    icon: 'Box',
    module: 'materials',
    resources: [
      'materials',
      'materialTypes',
      'materialColors',
      'materialSuppliers',
      'materialInboundRecords',
      'materialOutboundRecords',
      'materialRecycleRecords',
      'materialConsumptionRecords'
    ],
    component: () => import('../views/Materials.vue')
  },
  {
    path: 'inbound',
    route: '/inbound',
    name: 'Inbound',
    title: '入库管理',
    icon: 'Download',
    module: 'inboundRecords',
    resources: ['inboundRecords'],
    component: () => import('../views/Inbound.vue')
  },
  {
    path: 'outbound',
    route: '/outbound',
    name: 'Outbound',
    title: '出库管理',
    icon: 'Upload',
    module: 'outboundRecords',
    resources: ['outboundRecords'],
    component: () => import('../views/Outbound.vue')
  },
  {
    path: 'inventory',
    route: '/inventory',
    name: 'Inventory',
    title: '库存管理',
    icon: 'DataAnalysis',
    module: 'inventory',
    resources: ['inventory'],
    component: () => import('../views/Inventory.vue')
  },
  {
    path: 'reports',
    route: '/reports',
    name: 'Reports',
    title: '报表查询',
    icon: 'Document',
    module: 'reports',
    resources: ['reports'],
    component: () => import('../views/Reports.vue')
  },
  {
    path: 'settings',
    route: '/settings',
    name: 'Settings',
    title: '系统设置',
    icon: 'Setting',
    module: 'settings',
    resources: ['settings'],
    component: () => import('../views/Settings.vue')
  },
  {
    path: 'profile',
    route: '/profile',
    name: 'Profile',
    title: '个人中心',
    icon: 'Avatar',
    module: '',
    resources: [],
    component: () => import('../views/Profile.vue'),
    hiddenInMenu: true
  },
  {
    path: 'admin',
    route: '/admin',
    name: 'Admin',
    title: '后台管理',
    icon: 'Lock',
    module: 'admin-users',
    resources: ['admin-users', 'admin-roles', 'audit-logs', 'backups'],
    adminOnly: true,
    component: () => import('../views/Admin.vue')
  }
]

export const getNavigationItemByRoute = (routePath) => {
  return navigationItems.find(item => item.route === routePath)
}
