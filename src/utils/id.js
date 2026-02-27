export function generateId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `t_${timestamp}_${random}`
}
