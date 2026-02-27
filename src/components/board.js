import { getState } from '../state/store.js'
import { renderColumn } from './column.js'
import { renderParentOverview } from './parent-overview.js'

export function renderBoard(appEl, { onEdit, onAddSubtask, onAddTask }) {
  const state = getState()
  appEl.innerHTML = ''

  // Header
  const header = document.createElement('div')
  header.className = 'app-header'
  const h1 = document.createElement('h1')
  h1.textContent = 'Kanban TODO'
  const addBtn = document.createElement('button')
  addBtn.className = 'btn btn-primary'
  addBtn.textContent = '+ New Task'
  addBtn.addEventListener('click', onAddTask)
  header.append(h1, addBtn)
  appEl.appendChild(header)

  // Parent overview (tasks that have children)
  const parents = Object.values(state.tasks).filter((t) => t.childIds.length > 0)
  if (parents.length > 0) {
    appEl.appendChild(renderParentOverview(parents, { onEdit, onAddSubtask }))
  }

  // Kanban board — only tasks without children (standalone + child tasks)
  const kanbanTasks = Object.values(state.tasks).filter((t) => t.childIds.length === 0)

  const grouped = {
    todo: kanbanTasks.filter((t) => t.status === 'todo'),
    inProgress: kanbanTasks.filter((t) => t.status === 'inProgress'),
    done: kanbanTasks.filter((t) => t.status === 'done'),
  }

  const board = document.createElement('div')
  board.className = 'board'

  for (const status of ['todo', 'inProgress', 'done']) {
    board.appendChild(renderColumn(status, grouped[status], { onEdit }))
  }

  appEl.appendChild(board)
}
