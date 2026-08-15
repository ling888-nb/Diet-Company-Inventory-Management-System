<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  width: 100%;
  min-width: 0;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', Arial, sans-serif;
  background:
    linear-gradient(145deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.9)),
    linear-gradient(135deg, #dbeafe 0%, #ccfbf1 50%, #fef3c7 100%);
  min-height: 100vh;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  color: #172033;
  text-rendering: optimizeLegibility;
}

#app {
  min-height: 100vh;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

img,
svg,
canvas,
video {
  max-width: 100%;
}

button,
input,
textarea,
select {
  font: inherit;
}

::selection {
  color: #ffffff;
  background: #2563eb;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #eef2f7;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border: 2px solid #eef2f7;
  border-radius: 8px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.el-table {
  max-width: 100%;
}

.el-table__body-wrapper,
.el-table__header-wrapper {
  min-width: 0;
}

.el-table .cell {
  word-break: break-word;
}

.el-dialog,
.el-message-box {
  max-width: calc(100vw - 32px);
}

.dialog-footer,
.action-buttons,
.hero-actions,
.filter-actions,
.table-toolbar,
.section-heading,
.toolbar,
.action-bar,
.page-header {
  min-width: 0;
}

.el-input,
.el-select,
.el-input-number,
.el-date-editor,
.el-cascader {
  max-width: 100%;
}

@media (max-width: 900px) {
  .el-dialog,
  .el-message-box {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  .el-dialog {
    margin-top: 7vh !important;
  }

  .el-dialog__body {
    max-height: calc(100dvh - 180px);
    overflow: auto;
    padding: 16px;
  }

  .el-dialog__header,
  .el-dialog__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .el-form--inline {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    align-items: end;
  }

  .el-form--inline .el-form-item {
    display: flex;
    width: 100%;
    margin-right: 0;
    margin-bottom: 0;
  }

  .el-form--inline .el-form-item__content,
  .el-form-item__content,
  .el-input,
  .el-select,
  .el-input-number,
  .el-date-editor,
  .el-cascader {
    width: 100% !important;
  }

  .el-row {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .el-col {
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }

  .el-card__body {
    padding: 14px !important;
  }

  .el-tabs--border-card > .el-tabs__content {
    padding: 12px;
  }

  .el-tabs__nav-scroll {
    overflow-x: auto;
  }

  .el-tabs__nav {
    white-space: nowrap;
  }

  .el-table {
    font-size: 12px;
  }

  .el-table .cell {
    padding: 0 8px;
    line-height: 1.45;
  }

  .el-table__fixed-right,
  .el-table__fixed {
    box-shadow: none;
  }

  .el-button {
    min-height: 34px;
  }

  .el-button + .el-button {
    margin-left: 0;
  }

  .dialog-footer,
  .action-buttons,
  .hero-actions,
  .filter-actions,
  .toolbar,
  .action-bar,
  .page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dialog-footer > .el-button,
  .filter-actions > .el-button,
  .hero-actions > .el-button,
  .action-buttons > .el-button {
    flex: 1 1 auto;
  }
}

@media (max-width: 640px) {
  body {
    background:
      linear-gradient(145deg, rgba(248, 250, 252, 0.98), rgba(239, 246, 255, 0.94)),
      linear-gradient(135deg, #dbeafe 0%, #ccfbf1 100%);
  }

  .el-dialog__body {
    max-height: calc(100dvh - 156px);
    padding: 14px;
  }

  .el-form-item {
    margin-bottom: 13px;
  }

  .el-form-item__label {
    line-height: 1.25;
    margin-bottom: 6px;
  }

  .el-table__empty-block {
    min-height: 120px;
  }

  .page-header,
  .table-toolbar,
  .section-heading,
  .action-bar {
    align-items: stretch;
  }

  .page-header h1,
  .section-heading h2,
  .table-toolbar h2 {
    font-size: 20px;
    line-height: 1.25;
  }

  .el-notification {
    width: calc(100vw - 24px) !important;
    right: 12px !important;
  }
}
</style> 
