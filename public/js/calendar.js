/* ============================================
   Arrange My List - Calendar JavaScript
   ============================================ */

// State
let events = [];
let calendarTasks = [];
let calendarNotes = [];
let currentDate = new Date();
let editingEventId = null;
let selectedEventColor = '#3b82f6';

const eventColors = {
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    purple: '#8b5cf6',
    pink: '#ec4899'
};

// Initialize calendar
function initCalendar() {
    renderCalendar();
    loadCalendarData();
}

// Load events, tasks, and notes for calendar
async function loadCalendarData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    try {
        // Load all data in parallel
        const [eventsData, tasksData, notesData] = await Promise.all([
            apiRequest(`/api/calendar?month=${month}&year=${year}`),
            apiRequest('/api/tasks'),
            apiRequest('/api/notes')
        ]);
        
        events = eventsData;
        
        // Flatten tasks from kanban groups
        calendarTasks = [
            ...(tasksData.todo || []),
            ...(tasksData.in_progress || []),
            ...(tasksData.done || [])
        ];
        
        calendarNotes = notesData;
        
        renderCalendar();
    } catch (error) {
        showToast('Failed to load calendar data', 'error');
    }
}

// Alias for compatibility
async function loadEvents() {
    await loadCalendarData();
}

// Render calendar
function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('currentMonth');

    if (!container || !monthDisplay) return;

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    monthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Calculate calendar days
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Build calendar HTML
    let html = '';

    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Today for comparison
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Previous month filler days
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        html += `<div class="calendar-day other-month">
            <span class="calendar-day-number">${day}</span>
        </div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && today.getDate() === day;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayItems = getItemsForDate(dateStr);

        html += `<div class="calendar-day${isToday ? ' today' : ''}" 
                     onclick="openAddEventModal('${dateStr}')"
                     data-date="${dateStr}">
            <span class="calendar-day-number">${day}</span>
            ${dayItems.slice(0, 4).map(item => `
                <div class="calendar-event" 
                     style="background: ${item.color || '#4285f4'};"
                     onclick="event.stopPropagation(); ${item.onClick}"
                     title="${escapeHtml(item.title)}">
                    ${item.icon} ${escapeHtml(item.title)}
                </div>
            `).join('')}
            ${dayItems.length > 4 ? `<div class="calendar-event" style="background: var(--glass-bg-light);">+${dayItems.length - 4} more</div>` : ''}
        </div>`;
    }

    // Next month filler days
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">
            <span class="calendar-day-number">${day}</span>
        </div>`;
    }

    container.innerHTML = html;
}

// Get all items (events, tasks, notes) for a specific date
function getItemsForDate(dateStr) {
    const items = [];
    
    // Add events
    events.forEach(event => {
        const startDate = new Date(event.start_time).toISOString().split('T')[0];
        const endDate = new Date(event.end_time).toISOString().split('T')[0];
        if (dateStr >= startDate && dateStr <= endDate) {
            items.push({
                type: 'event',
                id: event.id,
                title: event.title,
                color: event.color || '#4285f4',
                icon: '📅',
                onClick: `editEvent(${event.id})`
            });
        }
    });
    
    // Add tasks with due dates
    calendarTasks.forEach(task => {
        if (task.due_date) {
            const taskDate = new Date(task.due_date).toISOString().split('T')[0];
            if (taskDate === dateStr) {
                const priorityColors = {
                    low: '#22c55e',
                    medium: '#eab308',
                    high: '#ef4444'
                };
                items.push({
                    type: 'task',
                    id: task.id,
                    title: task.title,
                    color: priorityColors[task.priority] || '#eab308',
                    icon: task.status === 'done' ? '✅' : '📌',
                    onClick: `viewTaskFromCalendar(${task.id})`
                });
            }
        }
    });
    
    // Add notes (show on their creation date)
    calendarNotes.forEach(note => {
        const noteDate = new Date(note.created_at).toISOString().split('T')[0];
        if (noteDate === dateStr) {
            const noteColors = {
                yellow: '#fbbf24',
                green: '#22c55e',
                blue: '#3b82f6',
                pink: '#ec4899',
                purple: '#8b5cf6',
                default: '#6b7280'
            };
            items.push({
                type: 'note',
                id: note.id,
                title: note.title,
                color: noteColors[note.color] || '#6b7280',
                icon: '📝',
                onClick: `viewNoteFromCalendar(${note.id})`
            });
        }
    });
    
    return items;
}

// View task from calendar (switch to tasks tab and highlight)
function viewTaskFromCalendar(taskId) {
    // Switch to tasks tab
    document.querySelector('.nav-link[data-tab="kanban"]')?.click();
    
    // Highlight the task briefly
    setTimeout(() => {
        const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
        if (taskCard) {
            taskCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            taskCard.classList.add('animate-glowPulse');
            setTimeout(() => taskCard.classList.remove('animate-glowPulse'), 2000);
        }
    }, 300);
}

// View note from calendar (switch to notes tab)
function viewNoteFromCalendar(noteId) {
    // Switch to notes tab
    document.querySelector('.nav-link[data-tab="notes"]')?.click();
    
    // Highlight the note briefly
    setTimeout(() => {
        const noteCard = document.querySelector(`.note-card[data-id="${noteId}"]`);
        if (noteCard) {
            noteCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            noteCard.classList.add('animate-glowPulse');
            setTimeout(() => noteCard.classList.remove('animate-glowPulse'), 2000);
        }
    }, 300);
}

// Navigate months
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadEvents();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadEvents();
}

function goToToday() {
    currentDate = new Date();
    loadEvents();
}

// Open event modal for adding
function openAddEventModal(dateStr = null) {
    editingEventId = null;
    selectedEventColor = '#3b82f6';
    document.getElementById('eventModalTitle').textContent = 'Add New Event';
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('deleteEventBtn').style.display = 'none';

    // Set default dates
    if (dateStr) {
        document.getElementById('eventStartTime').value = `${dateStr}T09:00`;
        document.getElementById('eventEndTime').value = `${dateStr}T10:00`;
    } else {
        const now = new Date();
        const start = now.toISOString().slice(0, 16);
        now.setHours(now.getHours() + 1);
        const end = now.toISOString().slice(0, 16);
        document.getElementById('eventStartTime').value = start;
        document.getElementById('eventEndTime').value = end;
    }

    // Reset color picker
    document.querySelectorAll('#eventColorPicker .color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === 'blue') {
            opt.classList.add('selected');
        }
    });

    openModal('eventModal');
}

// Edit event
async function editEvent(id) {
    const event = events.find(e => e.id == id);
    if (!event) {
        showToast('Event not found', 'error');
        return;
    }

    editingEventId = id;
    selectedEventColor = event.color || '#3b82f6';

    document.getElementById('eventModalTitle').textContent = 'Edit Event';
    document.getElementById('eventId').value = event.id;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventStartTime').value = new Date(event.start_time).toISOString().slice(0, 16);
    document.getElementById('eventEndTime').value = new Date(event.end_time).toISOString().slice(0, 16);
    document.getElementById('deleteEventBtn').style.display = 'block';

    // Set color picker
    const colorName = Object.keys(eventColors).find(key => eventColors[key] === event.color) || 'blue';
    document.querySelectorAll('#eventColorPicker .color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === colorName) {
            opt.classList.add('selected');
        }
    });

    openModal('eventModal');
}

// Delete event
async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        await apiRequest(`/api/calendar/${id}`, { method: 'DELETE' });

        const index = events.findIndex(e => e.id == id);
        if (index > -1) {
            events.splice(index, 1);
        }

        renderCalendar();
        closeModal('eventModal');
        showToast('Event deleted', 'success');
    } catch (error) {
        showToast('Failed to delete event', 'error');
    }
}

// Color picker handling
document.getElementById('eventColorPicker')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
        document.querySelectorAll('#eventColorPicker .color-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        e.target.classList.add('selected');
        selectedEventColor = eventColors[e.target.dataset.color] || '#3b82f6';
    }
});

// Event form submission
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endTime = document.getElementById('eventEndTime').value;
    const color = selectedEventColor;

    // Validate times
    if (new Date(endTime) <= new Date(startTime)) {
        showToast('End time must be after start time', 'error');
        return;
    }

    const eventData = { title, description, startTime, endTime, color };

    try {
        if (id) {
            // Update existing
            const updatedEvent = await apiRequest(`/api/calendar/${id}`, {
                method: 'PUT',
                body: JSON.stringify(eventData)
            });

            const index = events.findIndex(e => e.id == id);
            if (index > -1) {
                events[index] = updatedEvent;
            }

            showToast('Event updated', 'success');
        } else {
            // Create new
            const newEvent = await apiRequest('/api/calendar', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });

            events.push(newEvent);
            showToast('Event created', 'success');
        }

        renderCalendar();
        closeModal('eventModal');
    } catch (error) {
        showToast(error.message || 'Failed to save event', 'error');
    }
});

// Event listeners
document.getElementById('addEventBtn')?.addEventListener('click', () => openAddEventModal());
document.getElementById('closeEventModal')?.addEventListener('click', () => closeModal('eventModal'));
document.getElementById('cancelEventBtn')?.addEventListener('click', () => closeModal('eventModal'));
document.getElementById('deleteEventBtn')?.addEventListener('click', () => {
    const id = document.getElementById('eventId').value;
    if (id) deleteEvent(id);
});
document.getElementById('prevMonth')?.addEventListener('click', prevMonth);
document.getElementById('nextMonth')?.addEventListener('click', nextMonth);
document.getElementById('todayBtn')?.addEventListener('click', goToToday);

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.initCalendar = initCalendar;
window.renderCalendar = renderCalendar;
window.loadEvents = loadEvents;
window.loadCalendarData = loadCalendarData;
window.editEvent = editEvent;
window.openAddEventModal = openAddEventModal;
window.viewTaskFromCalendar = viewTaskFromCalendar;
window.viewNoteFromCalendar = viewNoteFromCalendar;
