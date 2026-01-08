/* ============================================
   Arrange My List - Main App JavaScript
   ============================================ */

// Global state
window.appState = {
    user: null,
    currentTab: 'calendar'
};

// API helper with error handling
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Toast notification system
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    });

    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Load current user
async function loadCurrentUser() {
    try {
        const user = await apiRequest('/api/auth/me');
        window.appState.user = user;

        // Update avatar
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl && user) {
            const initials = (user.displayName || user.username).charAt(0).toUpperCase();
            avatarEl.textContent = initials;
        }

        return user;
    } catch (error) {
        window.location.href = '/login';
        return null;
    }
}

// Tab navigation
function initTabNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    const sections = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const tab = link.dataset.tab;
            window.appState.currentTab = tab;

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${tab}-section`) {
                    section.classList.add('active');
                }
            });

            // Trigger load for the tab
            if (tab === 'calendar' && typeof loadCalendarData === 'function') {
                loadCalendarData();
            } else if (tab === 'kanban' && typeof loadTasks === 'function') {
                loadTasks();
            } else if (tab === 'notes' && typeof loadNotes === 'function') {
                loadNotes();
            }
        });
    });
}

// Modal helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modals on overlay click or escape key
function initModalHandlers() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
}

// Navbar scroll effect
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// Logout handler
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await apiRequest('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
            } catch (error) {
                showToast('Logout failed', 'error');
            }
        });
    }
}

// Format date helper
function formatDate(date, options = {}) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    });
}

// Format time helper
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Load user first
    await loadCurrentUser();

    // Initialize features
    initTabNavigation();
    initModalHandlers();
    initNavbarScroll();
    initLogout();

    // Load initial data - Calendar is default tab
    if (typeof initCalendar === 'function') {
        initCalendar();
    }
    if (typeof loadTasks === 'function') {
        loadTasks();
    }
    if (typeof loadNotes === 'function') {
        loadNotes();
    }
});

// Make functions globally available
window.apiRequest = apiRequest;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatRelativeTime = formatRelativeTime;
window.debounce = debounce;
