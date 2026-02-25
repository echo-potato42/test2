const STORAGE_KEY = 'kanban-state'

export function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state to localStorage:', e)
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error('Failed to load state from localStorage:', e)
    return null
  }
}
