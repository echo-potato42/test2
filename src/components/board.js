import { getState } from '../state/store.js'
import { renderColumn } from './column.js'
import { renderTimerBar } from './timer-display.js'

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

  // Timer bar
  appEl.appendChild(renderTimerBar())

  // Board columns
  const board = document.createElement('div')
  board.className = 'board'

  // Get top-level tasks grouped by status
  const topLevelTasks = Object.values(state.tasks).filter((t) => !t.parentId)

  const grouped = {
    todo: topLevelTasks.filter((t) => t.status === 'todo'),
    inProgress: topLevelTasks.filter((t) => t.status === 'inProgress'),
    done: topLevelTasks.filter((t) => t.status === 'done'),
  }

  for (const status of ['todo', 'inProgress', 'done']) {
    board.appendChild(
      renderColumn(status, grouped[status], { onEdit, onAddSubtask })
    )
  }

  appEl.appendChild(board)
}
