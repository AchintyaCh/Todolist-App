/* ============================================
   Arrange My List - Auth JavaScript (shared)
   ============================================ */

// This file contains shared auth functionality
// Individual login/register forms have their own inline scripts

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Redirect if authenticated (for login/register pages)
async function redirectIfAuthenticated() {
    const isAuth = await checkAuth();
    if (isAuth) {
        window.location.href = '/';
    }
}

// Redirect if not authenticated (for protected pages)
async function requireAuth() {
    const isAuth = await checkAuth();
    if (!isAuth) {
        window.location.href = '/login';
    }
}

// Export functions
window.checkAuth = checkAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.requireAuth = requireAuth;
