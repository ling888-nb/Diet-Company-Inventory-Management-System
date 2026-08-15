const DB_NAME = 'inventory-system-file-storage'
const STORE_NAME = 'settings'
const DIRECTORY_KEY = 'directoryHandle'
const STATUS_KEY = 'inventory-system-file-status'

export const DATA_FILE_NAME = 'inventory-system-data.json'

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const getSetting = async (key) => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

const setSetting = async (key, value) => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(value, key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

const deleteSetting = async (key) => {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

const getSavedStatus = () => {
  if (typeof localStorage === 'undefined') return {}

  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}')
  } catch {
    return {}
  }
}

const saveStatus = (status) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STATUS_KEY, JSON.stringify({
    ...getSavedStatus(),
    ...status
  }))
}

const getDirectoryPermission = async (directoryHandle, requestPermission = false) => {
  if (!directoryHandle) return 'unknown'

  const options = { mode: 'readwrite' }
  const permission = await directoryHandle.queryPermission(options)
  if (permission === 'granted' || !requestPermission) {
    return permission
  }

  return directoryHandle.requestPermission(options)
}

const writeJsonFile = async (directoryHandle, fileName, data) => {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()

  await writable.write(new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  }))
  await writable.close()
}

export const isFolderStorageSupported = () => {
  return typeof window !== 'undefined' &&
    Boolean(window.showDirectoryPicker) &&
    typeof indexedDB !== 'undefined'
}

export const buildExportFileName = (prefix = 'data_export') => {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8).replaceAll(':', '')
  return `${prefix}_${date}_${time}.json`
}

export const getStorageFolderStatus = async () => {
  const savedStatus = getSavedStatus()

  if (!isFolderStorageSupported()) {
    return {
      supported: false,
      selected: false,
      permission: 'unavailable',
      fileName: DATA_FILE_NAME,
      ...savedStatus
    }
  }

  const directoryHandle = await getSetting(DIRECTORY_KEY)
  if (!directoryHandle) {
    return {
      supported: true,
      selected: false,
      permission: 'unknown',
      fileName: DATA_FILE_NAME,
      ...savedStatus
    }
  }

  const permission = await getDirectoryPermission(directoryHandle)

  return {
    supported: true,
    selected: true,
    folderName: directoryHandle.name,
    permission,
    fileName: DATA_FILE_NAME,
    ...savedStatus
  }
}

export const chooseDataDirectory = async () => {
  if (!isFolderStorageSupported()) {
    throw new Error('当前浏览器不支持选择保存文件夹')
  }

  const directoryHandle = await window.showDirectoryPicker({
    id: 'inventory-system-data',
    mode: 'readwrite'
  })

  const permission = await getDirectoryPermission(directoryHandle, true)
  if (permission !== 'granted') {
    throw new Error('未获得文件夹写入权限')
  }

  await setSetting(DIRECTORY_KEY, directoryHandle)
  saveStatus({
    folderName: directoryHandle.name,
    permission,
    fileName: DATA_FILE_NAME,
    lastError: ''
  })

  return directoryHandle
}

export const saveDataToSelectedFolder = async (data, options = {}) => {
  if (!isFolderStorageSupported()) {
    throw new Error('当前浏览器不支持文件夹保存')
  }

  const directoryHandle = await getSetting(DIRECTORY_KEY)
  if (!directoryHandle) {
    throw new Error('尚未选择保存文件夹')
  }

  const permission = await getDirectoryPermission(directoryHandle, options.requestPermission)
  if (permission !== 'granted') {
    throw new Error('文件夹写入权限未授权')
  }

  const savedAt = new Date().toISOString()
  await writeJsonFile(directoryHandle, options.fileName || DATA_FILE_NAME, {
    ...data,
    savedAt
  })

  saveStatus({
    folderName: directoryHandle.name,
    permission,
    fileName: options.fileName || DATA_FILE_NAME,
    lastSavedAt: savedAt,
    lastError: ''
  })

  return {
    folderName: directoryHandle.name,
    fileName: options.fileName || DATA_FILE_NAME,
    savedAt
  }
}

export const exportDataToSelectedFolder = async (data) => {
  const fileName = buildExportFileName()
  return saveDataToSelectedFolder({
    ...data,
    exportTime: new Date().toISOString()
  }, {
    fileName,
    requestPermission: true
  })
}

export const scheduleDataFileSave = (data) => {
  if (!isFolderStorageSupported()) return

  window.clearTimeout(window.__inventoryDataFileSaveTimer)
  window.__inventoryDataFileSaveTimer = window.setTimeout(async () => {
    try {
      await saveDataToSelectedFolder(data, { requestPermission: false })
    } catch (error) {
      saveStatus({
        lastError: error.message || '自动保存失败'
      })
    }
  }, 600)
}

export const downloadJsonFile = (data, fileName = buildExportFileName()) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const clearSavedDataDirectory = async () => {
  if (isFolderStorageSupported()) {
    await deleteSetting(DIRECTORY_KEY)
  }

  saveStatus({
    selected: false,
    folderName: '',
    permission: 'unknown',
    lastError: ''
  })
}
