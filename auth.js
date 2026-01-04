// Firebase Authentication System

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User logged in:', user.email);
        await loadUserData(user.uid);
    } else {
        console.log('No user logged in');
        checkProtectedPages();
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            window.currentUser = {
                uid: uid,
                ...userDoc.data()
            };
            console.log('User data loaded:', window.currentUser);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Get current user data
function getUserData() {
    return window.currentUser || null;
}

// Check if user is on protected page
function checkProtectedPages() {
    const protectedPages = ['dashboard.html', 'deposit.html', 'withdraw.html', 'transactions.html', 'settings.html'];
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    if (protectedPages.includes(currentPage)) {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login to access this page.');
            window.location.href = 'login.html';
        }
    }
}

// Handle Registration
async function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const country = document.getElementById('country').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long!');
        return;
    }
    
    if (!agreeTerms) {
        alert('You must agree to the Terms of Service and Privacy Policy!');
        return;
    }
    
    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpperCase || !hasNumber) {
        alert('Password must contain at least one uppercase letter and one number!');
        return;
    }
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // Create user with Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Create user document in Firestore
        const userData = {
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            email: email.toLowerCase(),
            phone: phone,
            country: country,
            balance: 0,
            btcHoldings: 0,
            totalProfit: 0,
            registeredDate: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            status: 'active'
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        
        // Set current user
        window.currentUser = {
            uid: user.uid,
            ...userData
        };
        
        alert(`Welcome to CryptoVest, ${firstName}!\n\nYour account has been created successfully.\n\nA verification email has been sent to ${email}.\nPlease verify your email address.`);
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please login instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
        }
        
        alert(errorMessage);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Please enter both email and password!');
        return;
    }
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Load user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Check if account is active
            if (userData.status === 'suspended') {
                await auth.signOut();
                alert('Your account has been suspended. Please contact support.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            window.currentUser = {
                uid: user.uid,
                ...userData
            };
            
            alert(`Welcome back, ${userData.firstName}!`);
            window.location.href = 'dashboard.html';
        } else {
            alert('User data not found. Please contact support.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please register first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed login attempts. Please try again later.';
                break;
        }
        
        alert(errorMessage);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Logout
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
            window.currentUser = null;
            alert('You have been logged out successfully!');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    }
}

// Social Login (Google)
async function socialLogin(provider) {
    if (provider === 'google') {
        try {
            const googleProvider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            
            // Check if user document exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document for Google sign-in
                const names = user.displayName.split(' ');
                const userData = {
                    firstName: names[0] || 'User',
                    lastName: names.slice(1).join(' ') || '',
                    fullName: user.displayName,
                    email: user.email,
                    phone: user.phoneNumber || '',
                    country: '',
                    balance: 0,
                    btcHoldings: 0,
                    totalProfit: 0,
                    registeredDate: firebase.firestore.FieldValue.serverTimestamp(),
                    emailVerified: user.emailVerified,
                    status: 'active'
                };
                
                await db.collection('users').doc(user.uid).set(userData);
                window.currentUser = { uid: user.uid, ...userData };
            } else {
                window.currentUser = { uid: user.uid, ...userDoc.data() };
            }
            
            alert(`Welcome, ${window.currentUser.firstName}!`);
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            alert('Google sign-in failed. Please try again.');
        }
    } else {
        alert(`${provider} login will be integrated soon. Please use email/password or Google for now.`);
    }
}

// Password Reset
async function resetPassword() {
    const email = prompt('Enter your email address:');
    
    if (!email) return;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent! Check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Error sending password reset email. Please check the email address.');
    }
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    // Redirect to dashboard if already logged in and on auth pages
    if ((currentPage === 'login.html' || currentPage === 'register.html') && auth.currentUser) {
        window.location.href = 'dashboard.html';
    }
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleRegister,
        handleLogin,
        handleLogout,
        socialLogin,
        resetPassword,
        getUserData
    };
}