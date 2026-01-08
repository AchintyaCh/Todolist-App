/* ============================================
   Arrange My List - Notes App JavaScript
   ============================================ */

// State
let notes = [];
let editingNoteId = null;
let selectedNoteColor = 'default';

// Load notes from API
async function loadNotes() {
    try {
        notes = await apiRequest('/api/notes');
        renderNotes();
    } catch (error) {
        showToast('Failed to load notes', 'error');
    }
}

// Render notes grid
function renderNotes() {
    const container = document.getElementById('notesGrid');
    if (!container) return;

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📝</div>
                <h3 class="empty-state-title">No notes yet</h3>
                <p class="empty-state-description">Create your first note to get started</p>
                <button class="btn btn-primary ripple" onclick="openAddNoteModal()">+ Add Note</button>
            </div>
        `;
        return;
    }

    container.innerHTML = notes.map((note, index) => createNoteCard(note, index)).join('');
}

// Create note card HTML
function createNoteCard(note, index) {
    const color = note.color || 'default';
    const isPinned = note.is_pinned ? 'pinned' : '';
    const updatedAt = formatRelativeTime(note.updated_at);

    return `
        <div class="note-card glass-card hover-lift ${isPinned} animate-fadeInUp stagger-${(index % 5) + 1}" 
             data-id="${note.id}"
             data-color="${color}">
            <div class="note-card-title">${escapeHtml(note.title)}</div>
            <div class="note-card-content">${escapeHtml(note.content || '')}</div>
            <div class="note-card-footer">
                <span class="note-card-date">${updatedAt}</span>
                <div class="note-actions">
                    <button class="btn btn-icon task-action-btn hover-scale" onclick="togglePin(${note.id})" title="${note.is_pinned ? 'Unpin' : 'Pin'}">
                        ${note.is_pinned ? '📌' : '📍'}
                    </button>
                    <button class="btn btn-icon task-action-btn hover-scale" onclick="editNote(${note.id})" title="Edit">✏️</button>
                    <button class="btn btn-icon task-action-btn hover-scale" onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

// Open note modal for adding
function openAddNoteModal() {
    editingNoteId = null;
    selectedNoteColor = 'default';
    document.getElementById('noteModalTitle').textContent = 'Add New Note';
    document.getElementById('noteForm').reset();
    document.getElementById('noteId').value = '';

    // Reset color picker
    document.querySelectorAll('#noteColorPicker .color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === 'default') {
            opt.classList.add('selected');
        }
    });

    openModal('noteModal');
}

// Edit note
async function editNote(id) {
    const note = notes.find(n => n.id == id);
    if (!note) {
        showToast('Note not found', 'error');
        return;
    }

    editingNoteId = id;
    selectedNoteColor = note.color || 'default';

    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content || '';

    // Set color picker
    document.querySelectorAll('#noteColorPicker .color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === selectedNoteColor) {
            opt.classList.add('selected');
        }
    });

    openModal('noteModal');
}

// Delete note
async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        await apiRequest(`/api/notes/${id}`, { method: 'DELETE' });

        const index = notes.findIndex(n => n.id == id);
        if (index > -1) {
            notes.splice(index, 1);
        }

        renderNotes();
        showToast('Note deleted', 'success');
    } catch (error) {
        showToast('Failed to delete note', 'error');
    }
}

// Toggle pin
async function togglePin(id) {
    try {
        const result = await apiRequest(`/api/notes/${id}/pin`, { method: 'PATCH' });

        const note = notes.find(n => n.id == id);
        if (note) {
            note.is_pinned = result.isPinned;
            // Re-sort notes (pinned first)
            notes.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
        }

        renderNotes();
        showToast(result.isPinned ? 'Note pinned' : 'Note unpinned', 'success');
    } catch (error) {
        showToast('Failed to toggle pin', 'error');
    }
}

// Color picker handling
document.getElementById('noteColorPicker')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
        document.querySelectorAll('#noteColorPicker .color-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        e.target.classList.add('selected');
        selectedNoteColor = e.target.dataset.color;
    }
});

// Note form submission
document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('noteId').value;
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    const color = selectedNoteColor;

    const noteData = { title, content, color };

    try {
        if (id) {
            // Update existing
            const updatedNote = await apiRequest(`/api/notes/${id}`, {
                method: 'PUT',
                body: JSON.stringify(noteData)
            });

            const index = notes.findIndex(n => n.id == id);
            if (index > -1) {
                notes[index] = updatedNote;
            }

            showToast('Note updated', 'success');
        } else {
            // Create new
            const newNote = await apiRequest('/api/notes', {
                method: 'POST',
                body: JSON.stringify(noteData)
            });

            notes.unshift(newNote);
            showToast('Note created', 'success');
        }

        renderNotes();
        closeModal('noteModal');
    } catch (error) {
        showToast(error.message || 'Failed to save note', 'error');
    }
});

// Event listeners
document.getElementById('addNoteBtn')?.addEventListener('click', openAddNoteModal);
document.getElementById('closeNoteModal')?.addEventListener('click', () => closeModal('noteModal'));
document.getElementById('cancelNoteBtn')?.addEventListener('click', () => closeModal('noteModal'));

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.loadNotes = loadNotes;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.togglePin = togglePin;
window.openAddNoteModal = openAddNoteModal;
