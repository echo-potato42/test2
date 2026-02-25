export function showToast(message, type = 'info') {
  const root = document.getElementById('toast-root')
  // Remove existing toast
  root.innerHTML = ''

  const toast = document.createElement('div')
  toast.className = `toast${type === 'error' ? ' error' : ''}`
  toast.textContent = message
  root.appendChild(toast)

  setTimeout(() => toast.remove(), 3000)
}
