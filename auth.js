// Complete Firebase Authentication System with $2 Referral Program

// REFERRAL BONUS CONSTANTS - UPDATED TO $2
const REFERRER_BONUS = 2; // $2 for the person who refers
const REFEREE_BONUS = 2;  // $2 for the new user who signs up

// Wait for DOM and Firebase to be ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeAuth();
    }, 500);
});

// Generate unique referral code
function generateReferralCode(userId) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SARCHUS${random}`;
}

// Validate referral code
// Checks the public 'referralCodes' collection (no auth required) so this works
// on the registration page before the user has signed in.
async function validateReferralCode(referralCode) {
    if (!referralCode) return false;
    const code = referralCode.toUpperCase().trim();
    try {
        // Primary check: public referralCodes collection (document ID = the code itself)
        const refDoc = await firebase.firestore()
            .collection('referralCodes')
            .doc(code)
            .get();
        if (refDoc.exists) return true;

        // Fallback: query users collection (works if Firestore rules allow it)
        const snapshot = await firebase.firestore()
            .collection('users')
            .where('referralCode', '==', code)
            .limit(1)
            .get();
        return !snapshot.empty;
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

// Process referral rewards - UPDATED TO $2 BONUSES
async function processReferral(referralCode, newUserId) {
    try {
        console.log('Processing referral for code:', referralCode);
        
        // Find the referrer
        const usersRef = firebase.firestore().collection('users');
        const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();
        
        if (snapshot.empty) {
            console.log('Invalid referral code');
            return { success: false, message: 'Invalid referral code' };
        }
        
        const referrerDoc = snapshot.docs[0];
        const referrerId = referrerDoc.id;
        
        console.log('Found referrer:', referrerId);
        
        // Create referral record
        await firebase.firestore().collection('referrals').add({
            referrerId: referrerId,
            referredUserId: newUserId,
            referralCode: referralCode,
            referrerBonus: REFERRER_BONUS,
            refereeBonus: REFEREE_BONUS,
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update referrer's stats and balance
        await firebase.firestore().collection('users').doc(referrerId).update({
            referralCount: firebase.firestore.FieldValue.increment(1),
            referralEarnings: firebase.firestore.FieldValue.increment(REFERRER_BONUS),
            balance: firebase.firestore.FieldValue.increment(REFERRER_BONUS)
        });
        
        // Add transaction for referrer
        await firebase.firestore().collection('users').doc(referrerId)
            .collection('transactions').add({
                type: 'referral_bonus',
                amount: REFERRER_BONUS,
                usdAmount: REFERRER_BONUS,
                description: 'Referral bonus - New user signup',
                status: 'completed',
                referredUserId: newUserId,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Give bonus to new user
        await firebase.firestore().collection('users').doc(newUserId).update({
            referralEarnings: REFEREE_BONUS,
            balance: firebase.firestore.FieldValue.increment(REFEREE_BONUS),
            referredBy: referrerId
        });
        
        // Add transaction for new user
        await firebase.firestore().collection('users').doc(newUserId)
            .collection('transactions').add({
                type: 'referral_bonus',
                amount: REFEREE_BONUS,
                usdAmount: REFEREE_BONUS,
                description: 'Welcome bonus - Referred signup',
                status: 'completed',
                referrerId: referrerId,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('Referral processed successfully');
        return { 
            success: true, 
            referrerBonus: REFERRER_BONUS, 
            newUserBonus: REFEREE_BONUS 
        };
        
    } catch (error) {
        console.error('Referral processing error:', error);
        return { success: false, error: error.message };
    }
}

// Initialize authentication system
function initializeAuth() {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded. Please check your Firebase script tags.');
        return;
    }

    if (!firebase.apps || firebase.apps.length === 0) {
        console.error('Firebase app is not initialized. Please check firebase-config.js');
        return;
    }

    console.log('Firebase initialized successfully');

    // Get current page
    const currentPage = window.location.pathname.split('/').pop();
    const isAuthPage = currentPage === 'login.html' || currentPage === 'register.html';
    const isDashboardPage = currentPage === 'dashboard.html';

    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    if (referralCode) {
        localStorage.setItem('pendingReferralCode', referralCode);
        console.log('Referral code detected:', referralCode);
    }

    // Monitor authentication state changes
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            
            try {
                // Add a small retry mechanism for newly created users
                let userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                let retries = 0;
                
                // If document doesn't exist, retry up to 3 times with 500ms delays
                while (!userDoc.exists && retries < 3) {
                    console.log(`User document not found, retrying... (${retries + 1}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    retries++;
                }
                
                if (userDoc.exists) {
                    window.currentUser = {
                        uid: user.uid,
                        ...userDoc.data()
                    };
                    console.log('User data loaded');
                    
                    // Redirect from auth pages to dashboard
                    if (isAuthPage) {
                        console.log('Redirecting to dashboard...');
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    console.error('User document still not found after retries');
                    // Don't redirect away - allow user to try again
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        } else {
            console.log('No user authenticated');
            
            // Only redirect to login if on a protected page
            if (isDashboardPage) {
                console.log('Redirecting to login...');
                window.location.href = 'login.html';
            }
        }
    });

    // Attach event listeners to forms
    attachFormListeners();
}

// Attach form event listeners
function attachFormListeners() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form listener attached');
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form listener attached');
    }
    
    // Display referral code if present
    const referralCodeInput = document.getElementById('referralCode');
    const pendingCode = localStorage.getItem('pendingReferralCode');
    if (referralCodeInput && pendingCode) {
        referralCodeInput.value = pendingCode;
        // Validate the code
        validateReferralCode(pendingCode).then(isValid => {
            const referralMessage = document.getElementById('referralMessage');
            if (referralMessage) {
                if (isValid) {
                    referralMessage.textContent = `✓ Valid referral code! You'll get $${REFEREE_BONUS} bonus on signup.`;
                    referralMessage.className = 'referral-message valid';
                } else {
                    referralMessage.textContent = '✗ Invalid referral code';
                    referralMessage.className = 'referral-message invalid';
                }
                referralMessage.style.display = 'block';
            }
        });
    }
}

// Handle user registration
async function handleRegister(event) {
    event.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const country = document.getElementById('country').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const referralCode = document.getElementById('referralCode')?.value.trim() || 
                        localStorage.getItem('pendingReferralCode');
    
    // Validate password match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Validate password length
    if (password.length < 8) {
        alert('Password must be at least 8 characters long!');
        return;
    }
    
    // Validate terms agreement
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
    
    // Validate referral code if provided
    if (referralCode) {
        const isValid = await validateReferralCode(referralCode);
        if (!isValid) {
            const proceed = confirm('The referral code you entered is invalid. Do you want to continue registration without it?');
            if (!proceed) return;
        }
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    try {
        console.log('Creating user account...');
        
        // Create user with Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User created:', user.uid);
        
        // Send email verification (non-blocking)
        user.sendEmailVerification().catch(err => {
            console.warn('Could not send verification email:', err);
        });
        
        // Generate referral code for new user
        const userReferralCode = generateReferralCode(user.uid);
        
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
            referralCode: userReferralCode,
            referredBy: referralCode || null,
            referralCount: 0,
            referralEarnings: 0,
            registeredDate: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            status: 'active'
        };
        
        // Wait for user document to be created with retry mechanism
        await firebase.firestore().collection('users').doc(user.uid).set(userData);
        console.log('User data saved to Firestore');

        // Register the new user's referral code in the public referralCodes collection
        // so that unauthenticated visitors can validate codes during registration
        try {
            await firebase.firestore().collection('referralCodes').doc(userReferralCode).set({
                userId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Referral code registered in public collection:', userReferralCode);
        } catch (rcErr) {
            console.warn('Could not write to referralCodes collection:', rcErr);
        }
        
        // Small delay to ensure Firestore write is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Process referral if code was provided
        let referralResult = null;
        if (referralCode) {
            try {
                referralResult = await processReferral(referralCode, user.uid);
                if (referralResult.success) {
                    console.log('Referral processed:', referralResult);
                }
            } catch (refError) {
                console.warn('Referral processing failed but registration succeeded:', refError);
                referralResult = null;
            }
        }
        
        // Clear pending referral code
        localStorage.removeItem('pendingReferralCode');
        
        // Set current user in memory
        window.currentUser = {
            uid: user.uid,
            ...userData
        };
        
        // Success message with referral info - UPDATED TO $2
        let welcomeMessage = `Welcome to Sarchus, ${firstName}!\n\nYour account has been created successfully.\n\nYour referral code: ${userReferralCode}\nShare it with friends to earn $${REFERRER_BONUS} per referral!`;
        
        if (referralResult && referralResult.success) {
            welcomeMessage += `\n\n🎉 Bonus: You've received $${referralResult.newUserBonus} for using a referral code!`;
        }
        
        alert(welcomeMessage);
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        // Handle specific error codes
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login or use a different email.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Account creation is currently disabled. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many registration attempts. Please try again later.';
        } else if (error.message) {
            errorMessage = `Registration failed: ${error.message}`;
        }
        
        alert(errorMessage);
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle user login
async function handleLogin(event) {
    event.preventDefault();
    
    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Basic validation
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        console.log('Attempting login...');
        
        // Sign in with Firebase
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Login successful:', user.uid);
        
        // Load user data from Firestore with retry mechanism
        let userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        let retries = 0;
        
        // If document doesn't exist, retry up to 3 times with 500ms delays
        while (!userDoc.exists && retries < 3) {
            console.log(`User document not found on login, retrying... (${retries + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            retries++;
        }
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Check account status
            if (userData.status === 'suspended') {
                await firebase.auth().signOut();
                alert('Your account has been suspended. Please contact support.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            // Set current user
            window.currentUser = {
                uid: user.uid,
                ...userData
            };
            
            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }
            
            console.log('User data loaded');
            
            // Welcome message
            alert(`Welcome back, ${userData.firstName}!`);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } else {
            console.error('User document not found after retries');
            
            // Sign out the user since their data doesn't exist
            await firebase.auth().signOut();
            
            alert('User account data is missing. Please contact support or try registering again.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        // Handle specific error codes
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email. Please register first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address format.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password. Please check your credentials.';
        } else {
            errorMessage = `Login failed: ${error.message}`;
        }
        
        alert(errorMessage);
        
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle user logout
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await firebase.auth().signOut();
            window.currentUser = null;
            console.log('User logged out successfully');
            alert('You have been logged out successfully!');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    }
}

// Handle social login (Google)
async function socialLogin(provider) {
    if (provider === 'google') {
        try {
            console.log('Initiating Google sign-in...');
            
            const googleProvider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(googleProvider);
            const user = result.user;
            
            console.log('Google sign-in successful:', user.uid);
            
            // Check if user document exists
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document for first-time Google users
                const names = user.displayName ? user.displayName.split(' ') : ['User', ''];
                const userReferralCode = generateReferralCode(user.uid);
                
                // Check for pending referral code
                const referralCode = localStorage.getItem('pendingReferralCode');
                
                const userData = {
                    firstName: names[0] || 'User',
                    lastName: names.slice(1).join(' ') || '',
                    fullName: user.displayName || 'User',
                    email: user.email,
                    phone: user.phoneNumber || '',
                    country: '',
                    balance: 0,
                    btcHoldings: 0,
                    totalProfit: 0,
                    referralCode: userReferralCode,
                    referredBy: referralCode || null,
                    referralCount: 0,
                    referralEarnings: 0,
                    registeredDate: firebase.firestore.FieldValue.serverTimestamp(),
                    emailVerified: user.emailVerified,
                    status: 'active'
                };
                
                await firebase.firestore().collection('users').doc(user.uid).set(userData);

                // Register the new user's referral code in the public referralCodes collection
                try {
                    await firebase.firestore().collection('referralCodes').doc(userReferralCode).set({
                        userId: user.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('Google signup: referral code registered:', userReferralCode);
                } catch (rcErr) {
                    console.warn('Could not write to referralCodes collection:', rcErr);
                }
                
                // Small delay before processing referral
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Process referral if code exists
                if (referralCode) {
                    try {
                        await processReferral(referralCode, user.uid);
                        localStorage.removeItem('pendingReferralCode');
                    } catch (refError) {
                        console.warn('Referral processing failed but signup succeeded:', refError);
                    }
                }
                
                window.currentUser = { uid: user.uid, ...userData };
                console.log('New user document created');
            } else {
                window.currentUser = { uid: user.uid, ...userDoc.data() };
                console.log('Existing user document loaded');
            }
            
            alert(`Welcome, ${window.currentUser.firstName}!`);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                alert('Sign-in cancelled.');
            } else if (error.code === 'auth/popup-blocked') {
                alert('Pop-up blocked. Please allow pop-ups for this site.');
            } else {
                alert('Google sign-in failed. Please try again.');
            }
        }
    } else if (provider === 'facebook') {
        alert('Facebook login will be integrated soon. Please use email/password or Google for now.');
    }
}

// Handle password reset
async function resetPassword() {
    const email = prompt('Enter your email address:');
    
    if (!email) return;
    
    if (!email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        
        if (error.code === 'auth/user-not-found') {
            alert('No account found with this email address.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Invalid email address format.');
        } else {
            alert('Error sending password reset email. Please try again.');
        }
    }
}

// Export functions for global use
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.socialLogin = socialLogin;
window.resetPassword = resetPassword;
window.validateReferralCode = validateReferralCode;

console.log('Auth.js with $2 referral system loaded successfully');
