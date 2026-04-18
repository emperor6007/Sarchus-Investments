// Profile Page JavaScript

let isEditMode = false;
let originalFormData = {};

// Initialize Profile Page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page DOM loaded');
    if (window.location.pathname.includes('profile.html')) {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkAuth);
                console.log('Firebase ready, initializing profile');
                initializeProfile();
            }
        }, 100);
    }
});

// Initialize Profile
function initializeProfile() {
    console.log('Initializing profile page...');
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            
            try {
                // Add retry mechanism for newly created users
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
                    const userData = userDoc.data();
                    console.log('Raw user data:', userData);
                    
                    window.currentUser = {
                        uid: user.uid,
                        ...userData
                    };
                    
                    console.log('User data loaded successfully:', window.currentUser);
                    
                    // Load profile data
                    loadProfileData(window.currentUser);
                    
                    // Load account activity stats
                    loadAccountActivity(user.uid);
                    
                    // Check email verification status
                    updateEmailVerificationStatus(user);
                    
                    console.log('Profile initialization complete');
                } else {
                    console.error('User document not found after retries');
                    alert('User data not found. Please contact support.');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                alert('Error loading profile. Please try again.\n\nError: ' + error.message);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }
        } else {
            console.log('No user authenticated');
            // Don't show alert - let user navigate naturally
            window.location.href = 'login.html';
        }
    });
}

// Load Profile Data
function loadProfileData(user) {
    console.log('Loading profile data...');
    
    try {
        // Update avatar initials
        const avatarInitials = document.getElementById('avatarInitials');
        if (avatarInitials) {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';
            avatarInitials.textContent = initials;
            console.log('Avatar initials set:', initials);
        }
        
        // Update header info
        const profileFullName = document.getElementById('profileFullName');
        if (profileFullName) {
            const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
            profileFullName.textContent = fullName;
            console.log('Full name set:', fullName);
        }
        
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.textContent = user.email || 'user@example.com';
            console.log('Email set:', user.email);
        }
        
        const accountStatus = document.getElementById('accountStatus');
        if (accountStatus) {
            const statusText = user.status === 'active' ? 'Active Account' : 
                              user.status === 'suspended' ? 'Suspended Account' : 'Account';
            accountStatus.textContent = statusText;
            accountStatus.style.background = user.status === 'active' ? 
                'rgba(255, 255, 255, 0.2)' : 'rgba(231, 76, 60, 0.3)';
            console.log('Account status set:', statusText);
        }
        
        // Update member since
        const memberSince = document.getElementById('memberSince');
        if (memberSince && user.registeredDate) {
            try {
                const date = user.registeredDate.toDate ? user.registeredDate.toDate() : new Date(user.registeredDate);
                memberSince.textContent = formatDate(date);
                console.log('Member since set:', formatDate(date));
            } catch (dateError) {
                console.warn('Could not parse date:', dateError);
                memberSince.textContent = 'Recently';
            }
        }
        
        // Update profile balance
        const profileBalance = document.getElementById('profileBalance');
        if (profileBalance) {
            profileBalance.textContent = formatCurrency(user.balance || 0);
            console.log('Balance set:', formatCurrency(user.balance || 0));
        }
        
        // Load form fields - use optional chaining to avoid errors
        const fieldsToLoad = [
            'firstName', 'lastName', 'email', 'phone', 'country'
        ];
        
        const optionalFields = [
            'username', 'gender', 'dateOfBirth', 'address', 'city', 'state', 'zipCode'
        ];
        
        // Load required fields
        fieldsToLoad.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (fieldId === 'email') {
                    field.value = user.email || '';
                } else {
                    field.value = user[fieldId] || '';
                }
            }
        });
        
        // Load optional fields
        optionalFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = user[fieldId] || '';
            }
        });
        
        console.log('Form fields populated');
        
        // Save original form data
        saveOriginalFormData();
        
        console.log('Profile data loaded successfully');
    } catch (error) {
        console.error('Error in loadProfileData:', error);
        throw error;
    }
}

// Save Original Form Data
function saveOriginalFormData() {
    try {
        const fieldsToSave = [
            'firstName', 'lastName', 'username', 'phone', 'gender', 
            'dateOfBirth', 'address', 'city', 'state', 'zipCode', 'country'
        ];
        
        originalFormData = {};
        
        fieldsToSave.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                originalFormData[fieldId] = field.value;
            }
        });
        
        console.log('Original form data saved:', originalFormData);
    } catch (error) {
        console.error('Error saving original form data:', error);
    }
}

// Toggle Edit Mode
function toggleEditMode() {
    try {
        isEditMode = !isEditMode;
        
        const fields = ['firstName', 'lastName', 'username', 'phone', 'gender', 'dateOfBirth', 
                       'address', 'city', 'state', 'zipCode', 'country'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = !isEditMode;
            }
        });
        
        const editBtnText = document.getElementById('editBtnText');
        const formActions = document.getElementById('formActions');
        
        if (isEditMode) {
            if (editBtnText) editBtnText.textContent = '❌ Cancel';
            if (formActions) formActions.style.display = 'flex';
            console.log('Edit mode enabled');
        } else {
            if (editBtnText) editBtnText.textContent = '✏️ Edit';
            if (formActions) formActions.style.display = 'none';
            // Restore original values
            restoreOriginalFormData();
            console.log('Edit mode disabled');
        }
    } catch (error) {
        console.error('Error toggling edit mode:', error);
    }
}

// Cancel Edit
function cancelEdit() {
    toggleEditMode();
}

// Restore Original Form Data
function restoreOriginalFormData() {
    try {
        Object.keys(originalFormData).forEach(key => {
            const field = document.getElementById(key);
            if (field) {
                field.value = originalFormData[key];
            }
        });
        console.log('Form data restored');
    } catch (error) {
        console.error('Error restoring form data:', error);
    }
}

// Handle Profile Form Submit
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
        console.log('Profile form listener attached');
    }
});

// Handle Profile Update
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    try {
        const user = window.currentUser;
        if (!user) {
            alert('Please login first.');
            window.location.href = 'login.html';
            return;
        }
        
        // Get form values
        const updatedData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            username: document.getElementById('username').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            gender: document.getElementById('gender').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            state: document.getElementById('state').value.trim(),
            zipCode: document.getElementById('zipCode').value.trim(),
            country: document.getElementById('country').value
        };
        
        // Validation
        if (!updatedData.firstName || !updatedData.lastName) {
            alert('First name and last name are required.');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        try {
            // Update user document in Firestore
            await firebase.firestore().collection('users').doc(user.uid).update({
                firstName: updatedData.firstName,
                lastName: updatedData.lastName,
                fullName: `${updatedData.firstName} ${updatedData.lastName}`,
                username: updatedData.username,
                phone: updatedData.phone,
                gender: updatedData.gender,
                dateOfBirth: updatedData.dateOfBirth,
                address: updatedData.address,
                city: updatedData.city,
                state: updatedData.state,
                zipCode: updatedData.zipCode,
                country: updatedData.country,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update window.currentUser
            window.currentUser = {
                ...window.currentUser,
                ...updatedData,
                fullName: `${updatedData.firstName} ${updatedData.lastName}`
            };
            
            console.log('Profile updated successfully');
            alert('Profile updated successfully! ✅');
            
            // Exit edit mode
            toggleEditMode();
            
            // Reload profile data to reflect changes
            loadProfileData(window.currentUser);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            
            let errorMessage = 'Failed to update profile. ';
            
            if (error.code === 'permission-denied') {
                errorMessage += 'You do not have permission to update this profile.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
            
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Outer error in handleProfileUpdate:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

// Load Account Activity
async function loadAccountActivity(userId) {
    try {
        console.log('Loading account activity for user:', userId);
        
        const transactionsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .get();
        
        console.log('Transactions snapshot received, count:', transactionsSnapshot.size);
        
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalInvestments = 0;
        let totalProfit = 0;
        
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const amount = transaction.usdAmount || transaction.amount || 0;
            
            if (transaction.type === 'deposit') {
                totalDeposits += amount;
            } else if (transaction.type === 'withdrawal') {
                totalWithdrawals += amount;
            } else if (transaction.type === 'investment') {
                totalInvestments += amount;
            } else if (transaction.type === 'profit' || transaction.type === 'investment_maturity') {
                totalProfit += (transaction.profit || 0);
            }
        });
        
        console.log('Activity stats calculated:', {
            totalDeposits,
            totalWithdrawals,
            totalInvestments,
            totalProfit
        });
        
        // Update UI
        const totalDepositsEl = document.getElementById('totalDeposits');
        if (totalDepositsEl) totalDepositsEl.textContent = formatCurrency(totalDeposits);
        
        const totalWithdrawalsEl = document.getElementById('totalWithdrawals');
        if (totalWithdrawalsEl) totalWithdrawalsEl.textContent = formatCurrency(totalWithdrawals);
        
        const totalInvestmentsEl = document.getElementById('totalInvestmentsAmount');
        if (totalInvestmentsEl) totalInvestmentsEl.textContent = formatCurrency(totalInvestments);
        
        const totalProfitEl = document.getElementById('totalProfitEarned');
        if (totalProfitEl) totalProfitEl.textContent = '+' + formatCurrency(totalProfit);
        
        console.log('Account activity loaded successfully');
        
    } catch (error) {
        console.error('Error loading account activity:', error);
    }
}

// Update Email Verification Status
function updateEmailVerificationStatus(user) {
    try {
        const emailVerificationStatus = document.getElementById('emailVerificationStatus');
        const verifyEmailBtn = document.getElementById('verifyEmailBtn');
        
        if (user.emailVerified) {
            if (emailVerificationStatus) {
                emailVerificationStatus.textContent = '✅ Email verified';
                emailVerificationStatus.style.color = '#27ae60';
            }
            if (verifyEmailBtn) {
                verifyEmailBtn.disabled = true;
                verifyEmailBtn.textContent = 'Verified';
                verifyEmailBtn.style.opacity = '0.6';
            }
            console.log('Email is verified');
        } else {
            if (emailVerificationStatus) {
                emailVerificationStatus.textContent = '⚠️ Email not verified';
                emailVerificationStatus.style.color = '#e74c3c';
            }
            console.log('Email is not verified');
        }
    } catch (error) {
        console.error('Error updating email verification status:', error);
    }
}

// Send Verification Email
async function sendVerificationEmail() {
    try {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            alert('Please login first.');
            return;
        }
        
        if (user.emailVerified) {
            alert('Your email is already verified! ✅');
            return;
        }
        
        await user.sendEmailVerification();
        alert('Verification email sent! 📧\n\nPlease check your inbox and spam folder.');
    } catch (error) {
        console.error('Error sending verification email:', error);
        
        if (error.code === 'auth/too-many-requests') {
            alert('Too many requests. Please try again later.');
        } else {
            alert('Failed to send verification email. Please try again.');
        }
    }
}

// Open Change Password Modal
function openChangePasswordModal() {
    try {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Change password modal opened');
        }
    } catch (error) {
        console.error('Error opening change password modal:', error);
    }
}

// Close Change Password Modal
function closeChangePasswordModal() {
    try {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'none';
            const form = document.getElementById('changePasswordForm');
            if (form) form.reset();
            console.log('Change password modal closed');
        }
    } catch (error) {
        console.error('Error closing change password modal:', error);
    }
}

// Handle Change Password
async function handleChangePassword(event) {
    event.preventDefault();
    
    try {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        // Validate passwords match
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match!');
            return;
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }
        
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        
        if (!hasUpperCase || !hasNumber) {
            alert('Password must contain at least one uppercase letter and one number!');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        
        try {
            const user = firebase.auth().currentUser;
            
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);
            
            // Update password
            await user.updatePassword(newPassword);
            
            console.log('Password updated successfully');
            
            alert('Password updated successfully! ✅');
            
            closeChangePasswordModal();
            
        } catch (error) {
            console.error('Error changing password:', error);
            
            let errorMessage = 'Failed to change password. ';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage += 'Current password is incorrect.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage += 'New password is too weak.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage += 'Please logout and login again before changing password.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }
            
            alert(errorMessage);
            
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Outer error in handleChangePassword:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

// Handle Dashboard Logout
async function handleDashboardLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            console.log('Logging out user...');
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

// Format Currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format Date
function formatDate(date) {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('changePasswordModal');
    if (event.target === modal) {
        closeChangePasswordModal();
    }
});

// Export functions to global scope
window.toggleEditMode = toggleEditMode;
window.cancelEdit = cancelEdit;
window.sendVerificationEmail = sendVerificationEmail;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handleChangePassword = handleChangePassword;
window.handleDashboardLogout = handleDashboardLogout;

console.log('Profile.js loaded successfully');
