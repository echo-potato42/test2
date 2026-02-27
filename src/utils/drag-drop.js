import { moveTask } from '../state/actions.js'
import { showToast } from '../components/toast.js'

export function makeDraggable(element, taskId) {
  element.setAttribute('draggable', 'true')

  element.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    element.classList.add('dragging')
  })

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging')
  })
}

export function makeDropZone(element, targetStatus) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    element.classList.add('drag-over')
  })

  element.addEventListener('dragleave', (e) => {
    // Only remove if leaving the actual column, not a child element
    if (!element.contains(e.relatedTarget)) {
      element.classList.remove('drag-over')
    }
  })

  element.addEventListener('drop', (e) => {
    e.preventDefault()
    element.classList.remove('drag-over')
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      const result = moveTask(taskId, targetStatus)
      if (!result.ok) showToast(result.error, 'error')
    }
  })
}
