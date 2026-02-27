import { getState } from '../state/store.js'
import { addTask, editTask } from '../state/actions.js'

export function openTaskForm({ taskId = null, parentId = null } = {}) {
  const modalRoot = document.getElementById('modal-root')
  const state = getState()
  const isEdit = taskId !== null
  const task = isEdit ? state.tasks[taskId] : null

  // Overlay
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })

  // Modal
  const modal = document.createElement('div')
  modal.className = 'modal'

  const heading = document.createElement('h2')
  heading.textContent = isEdit
    ? 'Edit Task'
    : parentId
      ? 'Add Subtask'
      : 'New Task'
  modal.appendChild(heading)

  // Title
  const titleGroup = createFormGroup('Title', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.id = 'task-title'
    input.value = isEdit ? task.title : ''
    input.placeholder = 'What needs to be done?'
    return input
  })
  modal.appendChild(titleGroup)

  // Estimated time
  const timeGroup = createFormGroup('Estimated time (min)', () => {
    const input = document.createElement('input')
    input.type = 'number'
    input.id = 'task-time'
    input.min = '1'
    input.value = isEdit && task.estimatedMinutes ? task.estimatedMinutes : ''
    input.placeholder = 'e.g. 25'
    return input
  })
  modal.appendChild(timeGroup)

  // Tags
  const tagsGroup = document.createElement('div')
  tagsGroup.className = 'form-group'

  const tagsLabel = document.createElement('label')
  tagsLabel.textContent = 'Tags'
  tagsGroup.appendChild(tagsLabel)

  const tagsContainer = document.createElement('div')
  tagsContainer.className = 'tags-input'

  const selectedTags = new Set(isEdit ? task.tags : [])

  // Render existing tags
  function renderTags() {
    // Keep only the input
    const input = tagsContainer.querySelector('.tag-add-input')
    tagsContainer.innerHTML = ''

    const allTags = state.availableTags
    for (const tagName of allTags) {
      const tag = document.createElement('span')
      tag.className = `tag${selectedTags.has(tagName) ? ' selected' : ''}`
      tag.textContent = tagName
      tag.addEventListener('click', () => {
        if (selectedTags.has(tagName)) {
          selectedTags.delete(tagName)
        } else {
          selectedTags.add(tagName)
        }
        renderTags()
      })
      tagsContainer.appendChild(tag)
    }

    // New tag input
    const newTagInput = document.createElement('input')
    newTagInput.type = 'text'
    newTagInput.className = 'tag-add-input'
    newTagInput.placeholder = 'New tag + Enter'
    newTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const val = newTagInput.value.trim()
        if (val && !state.availableTags.includes(val)) {
          state.availableTags.push(val)
        }
        if (val) {
          selectedTags.add(val)
          renderTags()
        }
      }
    })
    tagsContainer.appendChild(newTagInput)
  }

  renderTags()
  tagsGroup.appendChild(tagsContainer)
  modal.appendChild(tagsGroup)

  // Parent task selector (only for new non-subtask creation)
  if (!isEdit && !parentId) {
    const topTasks = Object.values(state.tasks).filter((t) => !t.parentId)
    if (topTasks.length > 0) {
      const parentGroup = createFormGroup('Parent task (optional)', () => {
        const select = document.createElement('select')
        select.id = 'task-parent'

        const emptyOpt = document.createElement('option')
        emptyOpt.value = ''
        emptyOpt.textContent = '-- None (top-level task) --'
        select.appendChild(emptyOpt)

        for (const t of topTasks) {
          const opt = document.createElement('option')
          opt.value = t.id
          opt.textContent = t.title
          select.appendChild(opt)
        }

        return select
      })
      modal.appendChild(parentGroup)
    }
  }

  // Actions
  const actions = document.createElement('div')
  actions.className = 'modal-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'btn'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', () => overlay.remove())

  const saveBtn = document.createElement('button')
  saveBtn.className = 'btn btn-primary'
  saveBtn.textContent = isEdit ? 'Save' : 'Add'
  saveBtn.addEventListener('click', () => {
    const title = modal.querySelector('#task-title').value.trim()
    if (!title) return

    const timeInput = modal.querySelector('#task-time')
    const estimatedMinutes = timeInput.value
      ? parseInt(timeInput.value, 10)
      : null

    const tags = [...selectedTags]

    if (isEdit) {
      editTask(taskId, { title, tags, estimatedMinutes })
    } else {
      const parentSelect = modal.querySelector('#task-parent')
      const resolvedParentId = parentId || (parentSelect ? parentSelect.value || null : null)
      addTask({ title, tags, estimatedMinutes, parentId: resolvedParentId })
    }

    overlay.remove()
  })

  actions.append(cancelBtn, saveBtn)
  modal.appendChild(actions)

  overlay.appendChild(modal)
  modalRoot.appendChild(overlay)

  // Focus title input
  setTimeout(() => modal.querySelector('#task-title')?.focus(), 50)
}

function createFormGroup(labelText, createInput) {
  const group = document.createElement('div')
  group.className = 'form-group'

  const label = document.createElement('label')
  label.textContent = labelText
  group.appendChild(label)

  group.appendChild(createInput())
  return group
}
