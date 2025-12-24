// auth.js - Authentication utilities
console.log('auth.js loaded');

const API_BASE_URL = 'http://localhost:3000/api';

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - checking auth status');
    
    // Don't run on auth.html
    if (!window.location.pathname.includes('auth.html')) {
        initializeAuth();
    }
});

// Initialize authentication
function initializeAuth() {
    console.log('Initializing auth...');
    
    // First check localStorage
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    console.log('Token from localStorage:', token ? 'Exists' : 'Missing');
    console.log('User from localStorage:', user);
    
    if (token && user) {
        // Validate token with server
        validateToken(token).then(isValid => {
            if (isValid) {
                console.log('Token is valid, updating UI');
                updateUIForLoggedInUser(user);
            } else {
                console.log('Token is invalid, clearing storage');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                updateUIForGuest();
            }
        }).catch(error => {
            console.error('Token validation failed:', error);
            updateUIForGuest();
        });
    } else {
        console.log('No token found, showing guest UI');
        updateUIForGuest();
    }
}

// Validate token with server
async function validateToken(token) {
    try {
        console.log('Validating token with server...');
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.log('Token validation failed:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('Token validation response:', data);
        return data.success === true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    console.log('updateUIForLoggedInUser called with:', user);
    
    const authButtons = document.getElementById('authButtons');
    if (!authButtons) {
        console.error('authButtons element not found');
        // Fallback to older selector
        const fallbackButtons = document.querySelector('.auth-buttons');
        if (fallbackButtons) {
            fallbackButtons.innerHTML = `
                <div class="user-menu">
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>${user.username || 'User'}</span>
                        <div class="user-dropdown">
                            <button class="logout-btn" onclick="logout()">
                                <i class="fas fa-sign-out-alt"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Create user menu
    authButtons.innerHTML = `
        <div class="user-menu">
            <div class="user-info">
                <div class="user-avatar">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>${user.username || 'User'}</span>
                <div class="user-dropdown">
                    <button class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Show welcome banner
    const existingBanner = document.querySelector('.welcome-banner');
    if (!existingBanner) {
        const welcomeBanner = document.createElement('div');
        welcomeBanner.className = 'welcome-banner';
        welcomeBanner.innerHTML = `
            <div class="container">
                <h3>Welcome back, ${user.fullName || user.username || 'User'}!</h3>
                <p>Continue your learning journey with ${user.subscription === 'premium' ? 'Premium' : 'Free'} access</p>
            </div>
        `;
        
        // Insert welcome banner after header
        const header = document.querySelector('header');
        if (header) {
            header.after(welcomeBanner);
        }
    }
    
    console.log('UI updated for logged in user');
}

// Update UI for guest user
function updateUIForGuest() {
    console.log('updateUIForGuest called');
    
    const authButtons = document.getElementById('authButtons');
    if (!authButtons) {
        console.error('authButtons element not found');
        // Fallback to older selector
        const fallbackButtons = document.querySelector('.auth-buttons');
        if (fallbackButtons) {
            fallbackButtons.innerHTML = `
                <button class="btn btn-outline" onclick="redirectToAuth('login')">Login</button>
                <button class="btn btn-primary" onclick="redirectToAuth('register')">Register</button>
                <button class="btn btn-primary" onclick="window.location.href='subscription.html'">Get Premium</button>
            `;
        }
        return;
    }
    
    // Remove existing welcome banner
    const existingBanner = document.querySelector('.welcome-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Show login/register buttons
    authButtons.innerHTML = `
        <button class="btn btn-outline" onclick="redirectToAuth('login')">Login</button>
        <button class="btn btn-primary" onclick="redirectToAuth('register')">Register</button>
        <button class="btn btn-primary" onclick="window.location.href='subscription.html'">Get Premium</button>
    `;
    
    console.log('UI updated for guest user');
}

// Redirect to auth page
function redirectToAuth(type = 'login') {
    window.location.href = `auth.html${type === 'register' ? '#register' : ''}`;
}

// Logout function
function logout() {
    console.log('Logout called');
    
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification('Logged out successfully', 'success');
    } else {
        alert('Logged out successfully');
    }
    
    // Redirect to home after delay
    setTimeout(() => {
        window.location.href = 'interface.html';
    }, 1000);
}

// Make functions globally available
window.redirectToAuth = redirectToAuth;
window.logout = logout;
window.initializeAuth = initializeAuth;