// Crypto-Only Deposit System with Dropdown - Complete Version

// Cryptocurrency wallet addresses (REPLACE WITH YOUR ACTUAL ADDRESSES)
const WALLET_ADDRESSES = {
    'BTC': 'bc1q0wa4efcyfcpwsl8jfqww5emhdzgv4d64lgceem',
    'ETH': '0xa7550Db929E8501f8c85e02cB70692652c1675Ab',
    'USDT': 'TXC1MnuVbnr2yFETFxdEm1VmUUYhCA5xiQ'
};

// Cryptocurrency details
const CRYPTO_INFO = {
    'BTC': {
        name: 'Bitcoin (BTC)',
        network: 'Bitcoin Network',
        icon: 'btc.png',
        minDeposit: '0.0001 BTC (~$10)',
        confirmations: '3 confirmations',
        estimatedTime: '30-60 minutes'
    },
    'ETH': {
        name: 'Ethereum (ETH)',
        network: 'ERC-20 Network',
        icon: 'eth.png',
        minDeposit: '0.005 ETH (~$10)',
        confirmations: '12 confirmations',
        estimatedTime: '5-10 minutes'
    },
    'USDT': {
        name: 'Tether (USDT)',
        network: 'TRC-20 Network',
        icon: 'usdt.png',
        minDeposit: '10 USDT',
        confirmations: '20 confirmations',
        estimatedTime: '3-5 minutes'
    }
};

let currentCrypto = 'BTC';

// Toggle dropdown menu
function toggleCryptoDropdown() {
    const menu = document.getElementById('cryptoDropdownMenu');
    const btn = document.querySelector('.crypto-dropdown-btn');
    
    if (menu && btn) {
        menu.classList.toggle('active');
        btn.classList.toggle('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.crypto-dropdown-container');
    const menu = document.getElementById('cryptoDropdownMenu');
    const btn = document.querySelector('.crypto-dropdown-btn');
    
    if (container && !container.contains(event.target)) {
        if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
            if (btn) btn.classList.remove('active');
        }
    }
});

// Select cryptocurrency
function selectCrypto(crypto) {
    currentCrypto = crypto;
    
    // Get crypto info
    const info = CRYPTO_INFO[crypto];
    const address = WALLET_ADDRESSES[crypto];
    
    // Update dropdown button display
    const selectedIcon = document.getElementById('selectedCryptoIcon');
    const selectedName = document.getElementById('selectedCryptoName');
    const selectedNetwork = document.getElementById('selectedCryptoNetwork');
    
    if (selectedIcon) selectedIcon.src = info.icon;
    if (selectedName) selectedName.textContent = info.name;
    if (selectedNetwork) selectedNetwork.textContent = info.network;
    
    // Update main content
    const elements = {
        selectedCrypto: info.name,
        cryptoAddress: address,
        minDeposit: info.minDeposit,
        confirmations: info.confirmations,
        estimatedTime: info.estimatedTime,
        warningCrypto: crypto
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = elements[id];
    });
    
    // Update QR code
    const qrCode = document.getElementById('qrCode');
    if (qrCode) {
        qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;
    }
    
    // Update selected state in dropdown
    const items = document.querySelectorAll('.crypto-dropdown-item');
    items.forEach(item => item.classList.remove('selected'));
    
    // Find and mark the selected item
    const selectedItem = Array.from(items).find(item => {
        const h3 = item.querySelector('h3');
        return h3 && h3.textContent.includes(crypto);
    });
    
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Close dropdown
    const menu = document.getElementById('cryptoDropdownMenu');
    const btn = document.querySelector('.crypto-dropdown-btn');
    if (menu) menu.classList.remove('active');
    if (btn) btn.classList.remove('active');
    
    console.log(`Selected cryptocurrency: ${crypto}`);
}

// Copy address to clipboard
function copyAddress() {
    const addressElement = document.getElementById('cryptoAddress');
    if (!addressElement) return;
    
    const address = addressElement.textContent;
    const copyIcon = document.getElementById('copyIcon');
    const copyBtn = document.querySelector('.copy-btn');
    
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(() => {
            showCopySuccess(copyIcon, copyBtn);
        }).catch(err => {
            console.error('Clipboard error:', err);
            fallbackCopyAddress(address, copyIcon, copyBtn);
        });
    } else {
        fallbackCopyAddress(address, copyIcon, copyBtn);
    }
}

// Fallback copy method
function fallbackCopyAddress(address, copyIcon, copyBtn) {
    const tempInput = document.createElement('input');
    tempInput.value = address;
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(copyIcon, copyBtn);
    } catch (err) {
        console.error('Copy failed:', err);
        alert('Failed to copy address. Please copy manually: ' + address);
    }
    
    document.body.removeChild(tempInput);
}

// Show copy success feedback
function showCopySuccess(copyIcon, copyBtn) {
    if (copyIcon) copyIcon.textContent = '✓';
    if (copyBtn) {
        const originalBg = copyBtn.style.background;
        copyBtn.style.background = '#27ae60';
        
        setTimeout(() => {
            if (copyIcon) copyIcon.textContent = '📋';
            copyBtn.style.background = originalBg;
        }, 2000);
    }
}

// Handle deposit notification
async function handleDepositNotification(event) {
    event.preventDefault();
    
    console.log('Deposit notification form submitted');
    
    // Check if user is authenticated
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login to submit a deposit notification.');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('User authenticated:', user.uid);
    
    // Get form values
    const txHashElement = document.getElementById('txHash');
    const amountElement = document.getElementById('depositAmount');
    const noteElement = document.getElementById('depositNote');
    
    if (!amountElement) {
        alert('Form error. Please refresh the page.');
        return;
    }
    
    const txHash = txHashElement ? txHashElement.value.trim() : '';
    const amount = parseFloat(amountElement.value);
    const note = noteElement ? noteElement.value.trim() : '';
    const address = WALLET_ADDRESSES[currentCrypto];
    
    console.log('Form data:', { amount, crypto: currentCrypto, txHash });
    
    // Validate amount
    if (isNaN(amount) || amount < 10) {
        alert('Minimum deposit amount is $10');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        console.log('Creating deposit record...');
        
        // Get user data
        let userName = 'User';
        let userEmail = user.email;
        
        if (window.currentUser) {
            userName = window.currentUser.fullName || `${window.currentUser.firstName} ${window.currentUser.lastName}` || 'User';
            userEmail = window.currentUser.email || user.email;
        }
        
        // Create deposit notification in Firestore
        const depositData = {
            userId: user.uid,
            userEmail: userEmail,
            userName: userName,
            cryptocurrency: currentCrypto,
            amount: amount,
            walletAddress: address,
            transactionHash: txHash || 'Not provided',
            note: note || 'None',
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            processedBy: null
        };
        
        console.log('Deposit data:', depositData);
        
        // Add to deposits collection
        const depositRef = await firebase.firestore().collection('deposits').add(depositData);
        console.log('Deposit created with ID:', depositRef.id);
        
        // Also add to user's transaction history
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('transactions')
            .add({
                type: 'deposit',
                cryptocurrency: currentCrypto,
                amount: amount,
                status: 'pending',
                transactionHash: txHash || 'Not provided',
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('Transaction record created');
        
        // Show success message
        alert(`Deposit Notification Submitted! 🎉\n\nAmount: $${amount.toFixed(2)}\nCryptocurrency: ${currentCrypto}\nAddress: ${address.substring(0, 20)}...\n\nOur team will verify and credit your account within 24 hours.\n\nThank you for your patience!`);
        
        // Reset form
        event.target.reset();
        
        // Reload pending deposits
        loadPendingDeposits();
        
    } catch (error) {
        console.error('Error submitting deposit:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        let errorMessage = 'Error submitting deposit notification. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check Firebase security rules.';
        } else if (error.code === 'not-found') {
            errorMessage += 'Collection not found. Please contact support.';
        } else {
            errorMessage += error.message || 'Please try again or contact support.';
        }
        
        alert(errorMessage);
        
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Load pending deposits
async function loadPendingDeposits() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user authenticated for loading deposits');
        return;
    }
    
    const container = document.getElementById('pendingDeposits');
    if (!container) return;
    
    try {
        console.log('Loading pending deposits for user:', user.uid);
        
        const depositsSnapshot = await firebase.firestore()
            .collection('deposits')
            .where('userId', '==', user.uid)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        
        console.log('Found deposits:', depositsSnapshot.size);
        
        if (depositsSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No pending deposits</p>
                    <small>Your deposits will appear here once submitted</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            const date = deposit.createdAt ? deposit.createdAt.toDate() : new Date();
            
            const depositItem = document.createElement('div');
            depositItem.className = 'transaction-item';
            depositItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-type deposit">${deposit.cryptocurrency} Deposit</span>
                    <span class="transaction-date">${formatDate(date)} - Pending Confirmation</span>
                    ${deposit.transactionHash !== 'Not provided' ? `<small style="color: #999;">TX: ${deposit.transactionHash.substring(0, 20)}...</small>` : ''}
                </div>
                <div class="transaction-amount">$${deposit.amount.toFixed(2)}</div>
            `;
            
            container.appendChild(depositItem);
        });
        
    } catch (error) {
        console.error('Error loading pending deposits:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p style="color: #e74c3c;">Error loading deposits</p>
                <small>Please refresh the page</small>
            </div>
        `;
    }
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Deposit page initialized');
    
    // Set BTC as default and mark as selected
    setTimeout(() => {
        const btcItem = document.querySelector('.crypto-dropdown-item');
        if (btcItem) {
            btcItem.classList.add('selected');
        }
    }, 100);
    
    // Wait for Firebase auth
    const checkAuth = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkAuth);
            
            // Load user data and deposits
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('User authenticated on deposit page:', user.uid);
                    
                    // Load pending deposits
                    await loadPendingDeposits();
                    
                    // Set up real-time listener for deposits
                    firebase.firestore()
                        .collection('deposits')
                        .where('userId', '==', user.uid)
                        .where('status', '==', 'pending')
                        .onSnapshot((snapshot) => {
                            console.log('Deposits updated:', snapshot.size);
                            loadPendingDeposits();
                        }, (error) => {
                            console.error('Deposit listener error:', error);
                        });
                } else {
                    console.log('No user authenticated - redirecting to login');
                    alert('Please login to access the deposit page.');
                    window.location.href = 'login.html';
                }
            });
        }
    }, 100);
});

// Export functions to global scope
window.toggleCryptoDropdown = toggleCryptoDropdown;
window.selectCrypto = selectCrypto;
window.copyAddress = copyAddress;
window.handleDepositNotification = handleDepositNotification;

console.log('Deposit.js loaded successfully');
