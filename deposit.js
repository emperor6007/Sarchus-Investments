// Enhanced Deposit System with Unique User Wallets - Complete Version

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
let userWallets = null;
let depositListener = null;

// Initialize page and load user wallet
document.addEventListener('DOMContentLoaded', function() {
    console.log('Deposit page initialized');
    
    const checkAuth = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkAuth);
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('User authenticated on deposit page:', user.uid);
                    
                    try {
                        // Initialize or get user wallets
                        await initializeUserWallets(user.uid);
                        
                        // Load pending deposits
                        await loadPendingDeposits();
                        
                        // Set up real-time listener
                        setupDepositListener(user.uid);
                    } catch (error) {
                        console.error('Error initializing deposit page:', error);
                        alert('Error loading deposit information. Please refresh the page.');
                    }
                    
                } else {
                    console.log('No user authenticated - redirecting to login');
                    alert('Please login to access the deposit page.');
                    window.location.href = 'login.html';
                }
            });
        }
    }, 100);
});

// Initialize user wallets
async function initializeUserWallets(userId) {
    try {
        console.log('Initializing user wallets...');
        
        // Get user document
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            throw new Error('User document not found');
        }
        
        const userData = userDoc.data();
        
        // Check if wallets exist
        if (!userData.wallets) {
            console.log('Creating wallets for user...');
            
            // Create wallets if they don't exist
            if (typeof createUserWallets === 'function') {
                userWallets = await createUserWallets(userId);
            } else {
                userWallets = await createWalletsForUser(userId);
            }
        } else {
            userWallets = userData.wallets;
        }
        
        console.log('User wallets loaded:', userWallets);
        
        // Display the wallet address for current crypto
        displayWalletAddress(currentCrypto);
        
        // Mark BTC as selected
        setTimeout(() => {
            const btcItem = document.querySelector('.crypto-dropdown-item');
            if (btcItem) {
                btcItem.classList.add('selected');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing wallets:', error);
        alert('Error loading wallet information. Please refresh the page or contact support.');
        throw error;
    }
}

// Create wallets for user (fallback function)
async function createWalletsForUser(userId) {
    try {
        const hash = btoa(userId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        
        const mainWallets = {
            BTC: window.MAIN_WALLETS?.BTC || 'bc1q0wa4efcyfcpwsl8jfqww5emhdzgv4d64lgceem',
            ETH: window.MAIN_WALLETS?.ETH || '0xa7550Db929E8501f8c85e02cB70692652c1675Ab',
            USDT: window.MAIN_WALLETS?.USDT || 'TXC1MnuVbnr2yFETFxdEm1VmUUYhCA5xiQ'
        };
        
        const wallets = {
            BTC: {
                address: 'bc1q' + hash.toLowerCase().substring(0, 39),
                mainWallet: mainWallets.BTC,
                balance: 0
            },
            ETH: {
                address: '0x' + hash.substring(0, 40),
                mainWallet: mainWallets.ETH,
                balance: 0
            },
            USDT: {
                address: 'T' + hash.substring(0, 33),
                mainWallet: mainWallets.USDT,
                balance: 0
            }
        };
        
        // Save to Firestore
        await firebase.firestore().collection('users').doc(userId).update({
            wallets: wallets,
            walletsCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Wallets created and saved:', wallets);
        return wallets;
        
    } catch (error) {
        console.error('Error creating wallets:', error);
        throw error;
    }
}

// Display wallet address for selected crypto
function displayWalletAddress(crypto) {
    if (!userWallets || !userWallets[crypto]) {
        console.error('Wallet not found for', crypto);
        return;
    }
    
    const wallet = userWallets[crypto];
    const address = wallet.address;
    
    console.log(`Displaying ${crypto} wallet:`, address);
    
    // Update address display
    const addressElement = document.getElementById('cryptoAddress');
    if (addressElement) {
        addressElement.textContent = address;
    }
    
    // Update QR code
    const qrCode = document.getElementById('qrCode');
    if (qrCode) {
        qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
        qrCode.alt = `${crypto} QR Code`;
    }
}

// Toggle dropdown menu
function toggleCryptoDropdown() {
    const menu = document.getElementById('cryptoDropdownMenu');
    const btn = document.querySelector('.crypto-dropdown-btn');
    
    if (menu && btn) {
        const isActive = menu.classList.contains('active');
        menu.classList.toggle('active');
        btn.classList.toggle('active');
        
        console.log('Dropdown toggled:', !isActive);
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
    console.log('Selecting cryptocurrency:', crypto);
    
    currentCrypto = crypto;
    
    const info = CRYPTO_INFO[crypto];
    
    if (!info) {
        console.error('Crypto info not found for:', crypto);
        return;
    }
    
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
        minDeposit: info.minDeposit,
        confirmations: info.confirmations,
        estimatedTime: info.estimatedTime,
        warningCrypto: crypto
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Display user's wallet address for selected crypto
    displayWalletAddress(crypto);
    
    // Update selected state in dropdown
    const items = document.querySelectorAll('.crypto-dropdown-item');
    items.forEach(item => item.classList.remove('selected'));
    
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
}

// Copy address to clipboard
function copyAddress() {
    const addressElement = document.getElementById('cryptoAddress');
    if (!addressElement) {
        console.error('Address element not found');
        return;
    }
    
    const address = addressElement.textContent;
    const copyIcon = document.getElementById('copyIcon');
    const copyBtn = document.querySelector('.copy-btn');
    
    console.log('Copying address:', address);
    
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(() => {
            console.log('Address copied successfully');
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
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('Fallback copy successful');
            showCopySuccess(copyIcon, copyBtn);
        } else {
            throw new Error('Copy command failed');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
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
            if (copyBtn) copyBtn.style.background = originalBg;
        }, 2000);
    }
}

// Handle deposit notification
async function handleDepositNotification(event) {
    event.preventDefault();
    
    console.log('Deposit notification form submitted');
    
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login to submit a deposit notification.');
        window.location.href = 'login.html';
        return;
    }
    
    const txHashElement = document.getElementById('txHash');
    const amountElement = document.getElementById('depositAmount');
    const noteElement = document.getElementById('depositNote');
    
    if (!amountElement) {
        alert('Form error. Please refresh the page.');
        return;
    }
    
    const txHash = txHashElement ? txHashElement.value.trim() : '';
    const usdAmount = parseFloat(amountElement.value);
    const note = noteElement ? noteElement.value.trim() : '';
    
    // Validate wallet
    if (!userWallets || !userWallets[currentCrypto]) {
        alert('Wallet not found. Please refresh the page.');
        return;
    }
    
    const walletAddress = userWallets[currentCrypto].address;
    const mainWalletAddress = userWallets[currentCrypto].mainWallet;
    
    console.log('Form data:', { 
        amount: usdAmount, 
        crypto: currentCrypto, 
        wallet: walletAddress,
        txHash: txHash 
    });
    
    // Validate amount
    if (isNaN(usdAmount) || usdAmount < 10) {
        alert('Minimum deposit amount is $10');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Get user data
        let userName = 'User';
        let userEmail = user.email;
        
        if (window.currentUser) {
            userName = window.currentUser.fullName || 
                       `${window.currentUser.firstName || ''} ${window.currentUser.lastName || ''}`.trim() || 
                       'User';
            userEmail = window.currentUser.email || user.email;
        }
        
        console.log('Creating deposit notification...');
        
        // Create deposit notification
        const depositData = {
            userId: user.uid,
            userEmail: userEmail,
            userName: userName,
            cryptocurrency: currentCrypto,
            usdAmount: usdAmount,
            userWalletAddress: walletAddress,
            mainWalletAddress: mainWalletAddress,
            transactionHash: txHash || 'Not provided',
            note: note || 'None',
            status: 'pending',
            processed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            notifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Deposit data:', depositData);
        
        // Add to pendingDeposits collection
        const depositRef = await firebase.firestore()
            .collection('pendingDeposits')
            .add(depositData);
        
        console.log('Deposit notification created with ID:', depositRef.id);
        
        // Also add to user's transaction history
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('transactions')
            .add({
                type: 'deposit',
                cryptocurrency: currentCrypto,
                usdAmount: usdAmount,
                status: 'pending',
                transactionHash: txHash || 'Not provided',
                walletAddress: walletAddress,
                depositId: depositRef.id,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log('Transaction record created');
        
        // Show success message
        alert(
            `Deposit Notification Submitted! 🎉\n\n` +
            `Amount: $${usdAmount.toFixed(2)}\n` +
            `Cryptocurrency: ${currentCrypto}\n` +
            `Your Wallet: ${walletAddress.substring(0, 20)}...\n\n` +
            `Our team will verify and credit your account within 24 hours.\n\n` +
            `Thank you for your patience!`
        );
        
        // Reset form
        event.target.reset();
        
        // Reload pending deposits
        await loadPendingDeposits();
        
    } catch (error) {
        console.error('Error submitting deposit:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        let errorMessage = 'Error submitting deposit notification. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please check your internet connection and try again.';
        } else if (error.code === 'not-found') {
            errorMessage += 'Service not available. Please contact support.';
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
            .collection('pendingDeposits')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
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
            const statusText = deposit.processed ? 
                (deposit.rejected ? 'Rejected' : 'Completed') : 
                'Pending Verification';
            const statusClass = deposit.processed ? 
                (deposit.rejected ? 'withdrawal' : 'profit') : 
                'deposit';
            
            const depositItem = document.createElement('div');
            depositItem.className = 'transaction-item';
            depositItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-type ${statusClass}">${deposit.cryptocurrency} Deposit</span>
                    <span class="transaction-date">${formatDate(date)} - ${statusText}</span>
                    ${deposit.transactionHash !== 'Not provided' ? 
                        `<small style="color: #999; font-size: 0.8rem;">TX: ${deposit.transactionHash.substring(0, 20)}...</small>` : 
                        ''}
                </div>
                <div class="transaction-amount ${deposit.processed && !deposit.rejected ? 'positive' : ''}">
                    $${deposit.usdAmount.toFixed(2)}
                </div>
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

// Setup real-time deposit listener
function setupDepositListener(userId) {
    // Clear existing listener if any
    if (depositListener) {
        depositListener();
        depositListener = null;
    }
    
    console.log('Setting up deposit listener for user:', userId);
    
    depositListener = firebase.firestore()
        .collection('pendingDeposits')
        .where('userId', '==', userId)
        .onSnapshot((snapshot) => {
            console.log('Deposit snapshot received, changes:', snapshot.docChanges().length);
            
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const deposit = change.doc.data();
                    
                    console.log('Deposit modified:', change.doc.id, deposit);
                    
                    // Check if deposit was just processed
                    if (deposit.processed && !deposit.rejected && !deposit.notificationShown) {
                        // Mark as notified to prevent duplicate alerts
                        change.doc.ref.update({ notificationShown: true })
                            .catch(err => console.error('Error updating notification flag:', err));
                        
                        const creditedAmount = deposit.creditedAmount || deposit.usdAmount;
                        
                        // Show success notification
                        alert(
                            `Deposit Credited! 🎉\n\n` +
                            `Amount: $${creditedAmount.toFixed(2)}\n` +
                            `Cryptocurrency: ${deposit.cryptocurrency}\n\n` +
                            `Your account has been credited successfully!`
                        );
                        
                        // Reload dashboard if function available
                        if (window.updateDashboardData && window.currentUser) {
                            window.updateDashboardData(window.currentUser);
                        }
                    }
                }
            });
            
            // Reload pending deposits display
            loadPendingDeposits();
            
        }, (error) => {
            console.error('Deposit listener error:', error);
        });
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

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (depositListener) {
        depositListener();
    }
});

// Export functions to global scope
window.toggleCryptoDropdown = toggleCryptoDropdown;
window.selectCrypto = selectCrypto;
window.copyAddress = copyAddress;
window.handleDepositNotification = handleDepositNotification;

console.log('Enhanced deposit.js loaded successfully');
