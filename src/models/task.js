import { generateId } from '../utils/id.js'

export function createTask({
  title,
  tags = [],
  estimatedMinutes = null,
  parentId = null,
}) {
  const now = Date.now()
  return {
    id: generateId(),
    title: title.trim(),
    status: 'todo',
    tags,
    estimatedMinutes,
    parentId,
    childIds: [],
    completed: false,
    timerStartedAt: null,
    timerElapsedBeforePause: 0,
    createdAt: now,
    updatedAt: now,
  }
}
