import { deleteTask } from '../state/actions.js'
import { getState } from '../state/store.js'

export function renderParentOverview(parents, { onEdit, onAddSubtask }) {
  const state = getState()
  const el = document.createElement('div')
  el.className = 'parent-overview'

  // Completed parents on the left, active on the right
  const sorted = [...parents].sort((a, b) => {
    if (a.completed && !b.completed) return -1
    if (!a.completed && b.completed) return 1
    return 0
  })

  for (const parent of sorted) {
    const card = document.createElement('div')
    card.className = `parent-card${parent.completed ? ' completed' : ''}`

    const header = document.createElement('div')
    header.className = 'parent-card-header'

    const title = document.createElement('span')
    title.className = 'parent-card-title'
    title.textContent = parent.title

    const doneCount = parent.childIds.filter((cid) => state.tasks[cid]?.completed).length
    const totalCount = parent.childIds.length

    const progress = document.createElement('span')
    progress.className = 'parent-progress-text'
    progress.textContent = `${doneCount}/${totalCount}`

    header.append(title, progress)
    card.appendChild(header)

    // Progress bar
    const progressBar = document.createElement('div')
    progressBar.className = 'parent-progress-bar'
    const progressFill = document.createElement('div')
    progressFill.className = 'parent-progress-fill'
    progressFill.style.width = totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%'
    progressBar.appendChild(progressFill)
    card.appendChild(progressBar)

    // Tags
    if (parent.tags.length > 0) {
      const tags = document.createElement('div')
      tags.className = 'parent-tags'
      for (const tagName of parent.tags) {
        const tag = document.createElement('span')
        tag.className = 'tag'
        tag.textContent = tagName
        tags.appendChild(tag)
      }
      card.appendChild(tags)
    }

    // Actions
    const actions = document.createElement('div')
    actions.className = 'parent-card-actions'

    if (!parent.completed) {
      const addBtn = document.createElement('button')
      addBtn.className = 'btn-icon'
      addBtn.textContent = '+ Sub'
      addBtn.addEventListener('click', () => onAddSubtask(parent.id))
      actions.appendChild(addBtn)
    }

    const editBtn = document.createElement('button')
    editBtn.className = 'btn-icon'
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', () => onEdit(parent.id))
    actions.appendChild(editBtn)

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'btn-icon delete'
    deleteBtn.textContent = 'Del'
    deleteBtn.addEventListener('click', () => deleteTask(parent.id))
    actions.appendChild(deleteBtn)

    card.appendChild(actions)
    el.appendChild(card)
  }

  return el
}
