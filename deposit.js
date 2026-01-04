// Crypto-Only Deposit System with Firebase

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
        minDeposit: '0.0001 BTC (~$10)',
        confirmations: '3 confirmations',
        estimatedTime: '30-60 minutes'
    },
    'ETH': {
        name: 'Ethereum (ETH)',
        network: 'ERC-20 Network',
        minDeposit: '0.005 ETH (~$10)',
        confirmations: '12 confirmations',
        estimatedTime: '5-10 minutes'
    },
    'USDT': {
        name: 'Tether (USDT)',
        network: 'TRC-20 Network',
        minDeposit: '10 USDT',
        confirmations: '20 confirmations',
        estimatedTime: '3-5 minutes'
    }
};

// Select cryptocurrency
function selectCrypto(crypto) {
    // Update radio button
    document.getElementById(`crypto${crypto}`).checked = true;
    
    // Get crypto info
    const info = CRYPTO_INFO[crypto];
    const address = WALLET_ADDRESSES[crypto];
    
    // Update display
    document.getElementById('selectedCrypto').textContent = info.name;
    document.getElementById('cryptoAddress').textContent = address;
    document.getElementById('minDeposit').textContent = info.minDeposit;
    document.getElementById('confirmations').textContent = info.confirmations;
    document.getElementById('estimatedTime').textContent = info.estimatedTime;
    document.getElementById('warningCrypto').textContent = crypto;
    
    // Update QR code
    const qrCode = document.getElementById('qrCode');
    qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`;
}

// Copy address to clipboard
function copyAddress() {
    const address = document.getElementById('cryptoAddress').textContent;
    const copyIcon = document.getElementById('copyIcon');
    
    // Create temporary input
    const tempInput = document.createElement('input');
    tempInput.value = address;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        copyIcon.textContent = '✓';
        
        // Show feedback
        const copyBtn = document.querySelector('.copy-btn');
        copyBtn.style.background = '#27ae60';
        
        setTimeout(() => {
            copyIcon.textContent = '📋';
            copyBtn.style.background = '';
        }, 2000);
        
    } catch (err) {
        alert('Failed to copy address. Please copy manually.');
    }
    
    document.body.removeChild(tempInput);
}

// Handle deposit notification
async function handleDepositNotification(event) {
    event.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to submit a deposit notification.');
        window.location.href = 'login.html';
        return;
    }
    
    const txHash = document.getElementById('txHash').value.trim();
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const note = document.getElementById('depositNote').value.trim();
    const selectedCrypto = document.querySelector('input[name="crypto"]:checked').value;
    const address = WALLET_ADDRESSES[selectedCrypto];
    
    if (amount < 10) {
        alert('Minimum deposit amount is $10');
        return;
    }
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Create deposit notification in Firestore
        const depositData = {
            userId: user.uid,
            userEmail: window.currentUser.email,
            userName: window.currentUser.fullName,
            cryptocurrency: selectedCrypto,
            amount: amount,
            walletAddress: address,
            transactionHash: txHash || 'Not provided',
            note: note || 'None',
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            processedBy: null
        };
        
        await db.collection('deposits').add(depositData);
        
        // Also add to user's transaction history
        await db.collection('users').doc(user.uid).collection('transactions').add({
            type: 'deposit',
            cryptocurrency: selectedCrypto,
            amount: amount,
            status: 'pending',
            transactionHash: txHash || 'Not provided',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`Deposit notification submitted successfully!\n\nAmount: $${amount.toFixed(2)}\nCryptocurrency: ${selectedCrypto}\n\nOur team will verify and credit your account within 24 hours.`);
        
        // Reset form
        event.target.reset();
        
        // Reload pending deposits
        loadPendingDeposits();
        
    } catch (error) {
        console.error('Error submitting deposit:', error);
        alert('Error submitting deposit notification. Please try again or contact support.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Load pending deposits
async function loadPendingDeposits() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const depositsRef = db.collection('deposits')
            .where('userId', '==', user.uid)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc');
        
        const snapshot = await depositsRef.get();
        
        const container = document.getElementById('pendingDeposits');
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No pending deposits</p>
                    <small>Your deposits will appear here once submitted</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const deposit = doc.data();
            const date = deposit.createdAt ? deposit.createdAt.toDate() : new Date();
            
            const depositItem = document.createElement('div');
            depositItem.className = 'transaction-item';
            depositItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-type deposit">${deposit.cryptocurrency} Deposit</span>
                    <span class="transaction-date">${formatDate(date)} - Pending Confirmation</span>
                    ${deposit.transactionHash !== 'Not provided' ? `<small>TX: ${deposit.transactionHash.substring(0, 20)}...</small>` : ''}
                </div>
                <div class="transaction-amount">$${deposit.amount.toFixed(2)}</div>
            `;
            
            container.appendChild(depositItem);
        });
        
    } catch (error) {
        console.error('Error loading pending deposits:', error);
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
    // Load user name
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userNameEl = document.getElementById('userName');
            if (userNameEl && window.currentUser) {
                userNameEl.textContent = window.currentUser.firstName || 'User';
            }
            
            // Load pending deposits
            loadPendingDeposits();
            
            // Set up real-time listener for deposits
            db.collection('deposits')
                .where('userId', '==', user.uid)
                .where('status', '==', 'pending')
                .onSnapshot(() => {
                    loadPendingDeposits();
                });
        }
    });
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        selectCrypto,
        copyAddress,
        handleDepositNotification
    };
}
