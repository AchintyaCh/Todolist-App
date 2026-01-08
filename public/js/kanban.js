/* ============================================
   Arrange My List - Kanban Board JavaScript
   ============================================ */

// State
let tasks = {
    todo: [],
    in_progress: [],
    done: []
};

let draggedTask = null;
let editingTaskId = null;

// Load tasks from API
async function loadTasks() {
    try {
        const data = await apiRequest('/api/tasks');
        tasks = data;
        renderKanban();
    } catch (error) {
        showToast('Failed to load tasks', 'error');
    }
}

// Render Kanban board
function renderKanban() {
    renderColumn('todo', 'todoTasks', 'todoCount');
    renderColumn('in_progress', 'inProgressTasks', 'inProgressCount');
    renderColumn('done', 'doneTasks', 'doneCount');
}

// Render a single column
function renderColumn(status, containerId, countId) {
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    const taskList = tasks[status] || [];

    if (countEl) {
        countEl.textContent = taskList.length;
    }

    if (!container) return;

    if (taskList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <p style="color: var(--text-muted); font-size: 0.875rem;">No tasks yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = taskList.map((task, index) => createTaskCard(task, index)).join('');

    // Initialize drag events
    initDragEvents();
}

// Create task card HTML
function createTaskCard(task, index) {
    const priorityClass = task.priority || 'medium';
    const dueDate = task.due_date ? formatDate(task.due_date) : '';

    return `
        <div class="task-card glass-card draggable stagger-${index + 1}" 
             data-id="${task.id}" 
             data-status="${task.status}"
             draggable="true">
            <div class="task-card-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-card-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-card-meta">
                <span class="task-priority ${priorityClass}">${priorityClass.charAt(0).toUpperCase() + priorityClass.slice(1)}</span>
                ${dueDate ? `<span>📅 ${dueDate}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-icon task-action-btn hover-scale" onclick="editTask(${task.id})" title="Edit">✏️</button>
                <button class="btn btn-icon task-action-btn hover-scale" onclick="deleteTask(${task.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `;
}

// Initialize drag and drop
function initDragEvents() {
    const taskCards = document.querySelectorAll('.task-card');
    const dropZones = document.querySelectorAll('.drop-zone');

    taskCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = this;
    this.classList.add('dragging', 'is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd(e) {
    this.classList.remove('dragging', 'is-dragging');
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over', 'is-over');
    });
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over', 'is-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over', 'is-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over', 'is-over');

    if (!draggedTask) return;

    const taskId = draggedTask.dataset.id;
    const oldStatus = draggedTask.dataset.status;
    const newStatus = this.parentElement.dataset.status;

    if (oldStatus === newStatus) return;

    try {
        // Optimistic update
        const taskIndex = tasks[oldStatus].findIndex(t => t.id == taskId);
        if (taskIndex > -1) {
            const [task] = tasks[oldStatus].splice(taskIndex, 1);
            task.status = newStatus;
            tasks[newStatus].push(task);
            renderKanban();
        }

        // API update
        await apiRequest(`/api/tasks/reorder/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, position: tasks[newStatus].length })
        });

        showToast('Task moved successfully', 'success');
    } catch (error) {
        // Revert on error
        loadTasks();
        showToast('Failed to move task', 'error');
    }
}

// Open task modal for adding
function openAddTaskModal() {
    editingTaskId = null;
    document.getElementById('taskModalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    openModal('taskModal');
}

// Edit task
async function editTask(id) {
    editingTaskId = id;

    // Find task in state
    let task = null;
    for (const status of ['todo', 'in_progress', 'done']) {
        task = tasks[status].find(t => t.id == id);
        if (task) break;
    }

    if (!task) {
        showToast('Task not found', 'error');
        return;
    }

    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority || 'medium';

    if (task.due_date) {
        const date = new Date(task.due_date);
        document.getElementById('taskDueDate').value = date.toISOString().slice(0, 16);
    }

    openModal('taskModal');
}

// Delete task
async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });

        // Remove from state
        for (const status of ['todo', 'in_progress', 'done']) {
            const index = tasks[status].findIndex(t => t.id == id);
            if (index > -1) {
                tasks[status].splice(index, 1);
                break;
            }
        }

        renderKanban();
        showToast('Task deleted', 'success');
    } catch (error) {
        showToast('Failed to delete task', 'error');
    }
}

// Task form submission
document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value || null;

    const taskData = { title, description, priority, dueDate };

    try {
        if (id) {
            // Update existing
            const updatedTask = await apiRequest(`/api/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });

            // Update in state
            for (const status of ['todo', 'in_progress', 'done']) {
                const index = tasks[status].findIndex(t => t.id == id);
                if (index > -1) {
                    tasks[status][index] = updatedTask;
                    break;
                }
            }

            showToast('Task updated', 'success');
        } else {
            // Create new
            const newTask = await apiRequest('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });

            tasks.todo.push(newTask);
            showToast('Task created', 'success');
        }

        renderKanban();
        closeModal('taskModal');
    } catch (error) {
        showToast(error.message || 'Failed to save task', 'error');
    }
});

// Event listeners
document.getElementById('addTaskBtn')?.addEventListener('click', openAddTaskModal);
document.getElementById('closeTaskModal')?.addEventListener('click', () => closeModal('taskModal'));
document.getElementById('cancelTaskBtn')?.addEventListener('click', () => closeModal('taskModal'));

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.loadTasks = loadTasks;
window.editTask = editTask;
window.deleteTask = deleteTask;
