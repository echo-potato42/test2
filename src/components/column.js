import { renderTaskCard } from './task-card.js'
import { makeDropZone } from '../utils/drag-drop.js'

const COLUMN_CONFIG = {
  todo: { title: 'TODO' },
  inProgress: { title: 'In Progress', wip: 1 },
  done: { title: 'Done' },
}

export function renderColumn(status, tasks, { onEdit }) {
  const config = COLUMN_CONFIG[status]
  const el = document.createElement('div')
  el.className = 'column'

  const header = document.createElement('div')
  header.className = 'column-header'

  const titleSpan = document.createElement('span')
  titleSpan.textContent = config.title
  header.appendChild(titleSpan)

  const count = document.createElement('span')
  count.className = 'count'
  count.textContent = tasks.length
  header.appendChild(count)

  if (config.wip) {
    const wip = document.createElement('span')
    wip.className = 'wip-badge'
    wip.textContent = `WIP ${tasks.length}/${config.wip}`
    header.appendChild(wip)
  }

  el.appendChild(header)

  const body = document.createElement('div')
  body.className = 'column-body'
  makeDropZone(body, status)

  if (tasks.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'column-empty'
    empty.textContent =
      status === 'todo' ? 'No tasks yet'
      : status === 'inProgress' ? 'Drag a task here'
      : 'Completed tasks appear here'
    body.appendChild(empty)
  } else {
    for (const task of tasks) {
      body.appendChild(renderTaskCard(task, { onEdit }))
    }
  }

  el.appendChild(body)
  return el
}
