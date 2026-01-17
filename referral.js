// Referral Dashboard JavaScript

let referralInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('referral.html')) {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkAuth);
                initializeReferralDashboard();
            }
        }, 100);
    }
});

// Initialize Referral Dashboard
function initializeReferralDashboard() {
    if (referralInitialized) return;
    
    console.log('Initializing referral dashboard...');
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    window.currentUser = {
                        uid: user.uid,
                        ...userData
                    };
                    
                    console.log('User data loaded:', window.currentUser);
                    
                    // Load referral data
                    await loadReferralData(user.uid, userData);
                    referralInitialized = true;
                    
                } else {
                    console.error('User document not found');
                    alert('User data not found. Please contact support.');
                    await firebase.auth().signOut();
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                alert('Error loading user data. Please try again.');
                window.location.href = 'login.html';
            }
        } else {
            console.log('No user authenticated');
            if (!referralInitialized) {
                alert('Please login to access the referral program.');
                window.location.href = 'login.html';
            }
        }
    });
}

// Load Referral Data
async function loadReferralData(userId, userData) {
    try {
        // Display referral code
        const referralCodeEl = document.getElementById('referralCode');
        if (referralCodeEl) {
            referralCodeEl.textContent = userData.referralCode || 'N/A';
        }
        
        // Generate and display referral link
        const baseUrl = window.location.origin;
        const referralLink = `${baseUrl}/register.html?ref=${userData.referralCode}`;
        const referralLinkEl = document.getElementById('referralLink');
        if (referralLinkEl) {
            referralLinkEl.value = referralLink;
        }
        
        // Display stats
        const totalReferralsEl = document.getElementById('totalReferrals');
        if (totalReferralsEl) {
            totalReferralsEl.textContent = userData.referralCount || 0;
        }
        
        const totalEarningsEl = document.getElementById('totalEarnings');
        if (totalEarningsEl) {
            totalEarningsEl.textContent = formatCurrency(userData.referralEarnings || 0);
        }
        
        // Load referral list
        await loadReferralsList(userId);
        
        // Calculate monthly referrals
        await calculateMonthlyReferrals(userId);
        
    } catch (error) {
        console.error('Error loading referral data:', error);
    }
}

// Load Referrals List
async function loadReferralsList(userId) {
    try {
        const referralsListEl = document.getElementById('referralsList');
        if (!referralsListEl) return;
        
        const referralsSnapshot = await firebase.firestore()
            .collection('referrals')
            .where('referrerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (referralsSnapshot.empty) {
            referralsListEl.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #999;">
                    <p>No referrals yet. Start sharing your code!</p>
                </div>
            `;
            return;
        }
        
        referralsListEl.innerHTML = '';
        
        for (const doc of referralsSnapshot.docs) {
            const referral = doc.data();
            
            // Get referred user's name
            let referredUserName = 'New User';
            try {
                const referredUserDoc = await firebase.firestore()
                    .collection('users')
                    .doc(referral.referredUserId)
                    .get();
                
                if (referredUserDoc.exists) {
                    const referredUserData = referredUserDoc.data();
                    referredUserName = referredUserData.firstName + ' ' + (referredUserData.lastName?.charAt(0) || '') + '.';
                }
            } catch (error) {
                console.log('Could not fetch referred user name');
            }
            
            const date = referral.createdAt ? 
                (referral.createdAt.toDate ? referral.createdAt.toDate() : new Date(referral.createdAt)) : 
                new Date();
            
            const referralItem = document.createElement('div');
            referralItem.className = 'referral-item';
            referralItem.innerHTML = `
                <div class="referral-info">
                    <div class="referral-name">${referredUserName}</div>
                    <div class="referral-date">${formatDate(date)}</div>
                </div>
                <div class="referral-reward">+${formatCurrency(referral.referrerBonus || 50)}</div>
            `;
            
            referralsListEl.appendChild(referralItem);
        }
        
    } catch (error) {
        console.error('Error loading referrals list:', error);
    }
}

// Calculate Monthly Referrals
async function calculateMonthlyReferrals(userId) {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const referralsSnapshot = await firebase.firestore()
            .collection('referrals')
            .where('referrerId', '==', userId)
            .where('createdAt', '>=', firstDayOfMonth)
            .get();
        
        const monthlyReferralsEl = document.getElementById('monthlyReferrals');
        if (monthlyReferralsEl) {
            monthlyReferralsEl.textContent = referralsSnapshot.size;
        }
        
    } catch (error) {
        console.error('Error calculating monthly referrals:', error);
    }
}

// Copy Referral Code
function copyReferralCode() {
    const referralCode = document.getElementById('referralCode').textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(referralCode).then(() => {
            showCopySuccess('Code copied!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            fallbackCopy(referralCode);
        });
    } else {
        fallbackCopy(referralCode);
    }
}

// Copy Referral Link
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink').value;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(referralLink).then(() => {
            showCopySuccess('Link copied!');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            fallbackCopy(referralLink);
        });
    } else {
        fallbackCopy(referralLink);
    }
}

// Fallback copy method
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess('Copied!');
    } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
        alert('Could not copy. Please copy manually: ' + text);
    }
    
    document.body.removeChild(textArea);
}

// Show copy success message
function showCopySuccess(message) {
    const btns = document.querySelectorAll('.copy-btn');
    btns.forEach(btn => {
        const originalText = btn.textContent;
        btn.textContent = message;
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Share via WhatsApp
function shareViaWhatsApp() {
    const referralCode = document.getElementById('referralCode').textContent;
    const referralLink = document.getElementById('referralLink').value;
    const message = `Join me on Sarchus Investments and earn $25 bonus! Use my referral code: ${referralCode} or sign up here: ${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Share via Twitter
function shareViaTwitter() {
    const referralCode = document.getElementById('referralCode').textContent;
    const referralLink = document.getElementById('referralLink').value;
    const message = `Join me on Sarchus Investments and get $25 bonus! Use code: ${referralCode}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`;
    window.open(twitterUrl, '_blank');
}

// Share via Email
function shareViaEmail() {
    const referralCode = document.getElementById('referralCode').textContent;
    const referralLink = document.getElementById('referralLink').value;
    const subject = 'Join Sarchus Investments - Get $25 Bonus!';
    const body = `Hi!

I'm using Sarchus Investments for cryptocurrency trading and investment, and I think you'd love it too!

Sign up using my referral code: ${referralCode}
Or use this link: ${referralLink}

You'll get $25 bonus when you sign up, and I'll earn a reward too!

Happy investing!`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
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
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Handle logout
function handleDashboardLogout() {
    if (confirm('Are you sure you want to logout?')) {
        firebase.auth().signOut().then(() => {
            window.currentUser = null;
            referralInitialized = false;
            alert('You have been logged out successfully!');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        });
    }
}

// Export functions
window.copyReferralCode = copyReferralCode;
window.copyReferralLink = copyReferralLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaTwitter = shareViaTwitter;
window.shareViaEmail = shareViaEmail;
window.handleDashboardLogout = handleDashboardLogout;

console.log('referral.js loaded successfully');