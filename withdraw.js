// Crypto-Only Withdrawal System with Firebase

// Network fees
const NETWORK_FEES = {
    'BTC': 5,
    'ETH': 3,
    'USDT': 2
};

// Network options
const NETWORKS = {
    'BTC': '<option value="bitcoin">Bitcoin Mainnet</option>',
    'ETH': '<option value="ethereum">Ethereum Network (ERC-20)</option>',
    'USDT': '<option value="trc20">TRON Network (TRC-20)</option>'
};

// Initialize withdrawal page
async function initializeWithdrawPage() {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Please login to access this page.');
        window.location.href = 'login.html';
        return;
    }
    
    // Load user data
    if (!window.currentUser) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            window.currentUser = { uid: user.uid, ...userDoc.data() };
        }
    }
    
    // Update available balance
    const balance = window.currentUser?.balance || 0;
    const availableBalanceElements = document.querySelectorAll('#availableBalance, #maxAmount');
    availableBalanceElements.forEach(el => {
        el.textContent = formatCurrency(balance);
    });
    
    // Load withdrawal requests
    loadWithdrawalRequests();
}

// Update withdrawal info based on crypto selection
function updateWithdrawInfo() {
    const crypto = document.getElementById('withdrawCrypto').value;
    const networkSelect = document.getElementById('network');
    
    // Update network options
    networkSelect.innerHTML = NETWORKS[crypto];
    
    // Update summary
    updateWithdrawalSummary();
}

// Update withdrawal summary
async function updateWithdrawalSummary() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const crypto = document.getElementById('withdrawCrypto').value;
    const fee = NETWORK_FEES[crypto];
    const total = amount - fee;
    
    // Update USD amounts
    document.getElementById('summaryAmount').textContent = formatCurrency(amount);
    document.getElementById('summaryFee').textContent = formatCurrency(fee);
    document.getElementById('summaryTotal').textContent = formatCurrency(Math.max(0, total));
    
    // Calculate crypto amount
    try {
        let btcPrice = 98547.23; // Fallback
        
        try {
            const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
            if (response.ok) {
                const data = await response.json();
                btcPrice = parseFloat(data.bpi.USD.rate.replace(/,/g, ''));
            }
        } catch (e) {
            console.log('Using fallback BTC price');
        }
        
        // Simplified calculation (in reality, would need different exchange rates)
        const cryptoAmount = total / btcPrice;
        document.getElementById('summaryCrypto').textContent = cryptoAmount.toFixed(8) + ' ' + crypto;
        
    } catch (error) {
        console.error('Error calculating crypto amount:', error);
        document.getElementById('summaryCrypto').textContent = '0.00000000 ' + crypto;
    }
}

// Handle withdrawal request
async function handleWithdrawalRequest(event) {
    event.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to make a withdrawal request.');
        window.location.href = 'login.html';
        return;
    }
    
    const crypto = document.getElementById('withdrawCrypto').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const walletAddress = document.getElementById('walletAddress').value.trim();
    const network = document.getElementById('network').value;
    const confirmAddress = document.getElementById('confirmAddress').checked;
    
    // Validation
    if (amount < 20) {
        alert('Minimum withdrawal amount is $20');
        return;
    }
    
    const userBalance = window.currentUser?.balance || 0;
    if (amount > userBalance) {
        alert(`Insufficient balance! Available: ${formatCurrency(userBalance)}`);
        return;
    }
    
    if (!walletAddress || walletAddress.length < 26) {
        alert('Please enter a valid wallet address.');
        return;
    }
    
    if (!confirmAddress) {
        alert('Please confirm that your wallet address is correct.');
        return;
    }
    
    // Final confirmation
    const fee = NETWORK_FEES[crypto];
    const netAmount = amount - fee;
    
    const confirmed = confirm(
        `⚠️ WITHDRAWAL CONFIRMATION ⚠️\n\n` +
        `Amount: ${formatCurrency(amount)}\n` +
        `Network Fee: ${formatCurrency(fee)}\n` +
        `You'll Receive: ${formatCurrency(netAmount)}\n` +
        `Cryptocurrency: ${crypto}\n` +
        `Wallet Address: ${walletAddress}\n\n` +
        `This transaction CANNOT be reversed.\n\n` +
        `Click OK to submit withdrawal request.`
    );
    
    if (!confirmed) return;
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting Request...';
    submitBtn.disabled = true;
    
    try {
        // Create withdrawal request in Firestore
        const withdrawalData = {
            userId: user.uid,
            userEmail: window.currentUser.email,
            userName: window.currentUser.fullName,
            cryptocurrency: crypto,
            amount: amount,
            networkFee: fee,
            netAmount: netAmount,
            walletAddress: walletAddress,
            network: network,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            processedBy: null,
            transactionHash: null
        };
        
        await db.collection('withdrawals').add(withdrawalData);
        
        // Add to user's transaction history
        await db.collection('users').doc(user.uid).collection('transactions').add({
            type: 'withdrawal',
            cryptocurrency: crypto,
            amount: amount,
            status: 'pending',
            walletAddress: walletAddress,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(
            `Withdrawal Request Submitted!\n\n` +
            `Amount: ${formatCurrency(amount)}\n` +
            `Fee: ${formatCurrency(fee)}\n` +
            `Net Amount: ${formatCurrency(netAmount)}\n` +
            `Cryptocurrency: ${crypto}\n\n` +
            `Your request will be processed within 24 hours.\n` +
            `You will receive a notification once processed.`
        );
        
        // Reset form
        event.target.reset();
        document.getElementById('confirmAddress').checked = false;
        updateWithdrawalSummary();
        
        // Reload withdrawal requests
        loadWithdrawalRequests();
        
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        alert('Error submitting withdrawal request. Please try again or contact support.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Load withdrawal requests
async function loadWithdrawalRequests() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const withdrawalsRef = db.collection('withdrawals')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(10);
        
        const snapshot = await withdrawalsRef.get();
        
        const container = document.getElementById('withdrawalRequests');
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No withdrawal requests</p>
                    <small>Your withdrawal requests will appear here</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const withdrawal = doc.data();
            const date = withdrawal.createdAt ? withdrawal.createdAt.toDate() : new Date();
            
            let statusClass = 'pending';
            let statusText = 'Pending';
            
            if (withdrawal.status === 'completed') {
                statusClass = 'completed';
                statusText = 'Completed';
            } else if (withdrawal.status === 'rejected') {
                statusClass = 'rejected';
                statusText = 'Rejected';
            }
            
            const withdrawalItem = document.createElement('div');
            withdrawalItem.className = 'transaction-item';
            withdrawalItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-type ${statusClass}">${withdrawal.cryptocurrency} Withdrawal</span>
                    <span class="transaction-date">${formatDate(date)} - ${statusText}</span>
                    <small>To: ${withdrawal.walletAddress.substring(0, 15)}...${withdrawal.walletAddress.substring(withdrawal.walletAddress.length - 10)}</small>
                    ${withdrawal.transactionHash ? `<small>TX: ${withdrawal.transactionHash.substring(0, 20)}...</small>` : ''}
                </div>
                <div class="transaction-amount">$${withdrawal.amount.toFixed(2)}</div>
            `;
            
            container.appendChild(withdrawalItem);
        });
        
    } catch (error) {
        console.error('Error loading withdrawal requests:', error);
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

// Format currency
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('withdraw.html')) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await initializeWithdrawPage();
                
                // Update user name
                const userNameEl = document.getElementById('userName');
                if (userNameEl && window.currentUser) {
                    userNameEl.textContent = window.currentUser.firstName || 'User';
                }
                
                // Set up event listeners
                const amountInput = document.getElementById('withdrawAmount');
                if (amountInput) {
                    amountInput.addEventListener('input', updateWithdrawalSummary);
                }
                
                // Set up real-time listener for withdrawals
                db.collection('withdrawals')
                    .where('userId', '==', user.uid)
                    .onSnapshot(() => {
                        loadWithdrawalRequests();
                    });
            }
        });
    }
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleWithdrawalRequest,
        updateWithdrawInfo,
        initializeWithdrawPage
    };
}