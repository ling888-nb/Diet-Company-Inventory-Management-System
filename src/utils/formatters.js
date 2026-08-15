export const formatDate = (dateString, fallback = '-') => {
  if (!dateString) return fallback

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toLocaleDateString('zh-CN')
}

export const formatDateTime = (dateString, fallback = '-') => {
  if (!dateString) return fallback

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toLocaleString('zh-CN')
}

export const formatCurrency = (value, fallback = '0.00') => {
  const number = Number(value)
  if (Number.isNaN(number)) return fallback

  return number.toFixed(2)
}
