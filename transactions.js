// Transactions Page JavaScript

let allTransactions = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Transactions page initialized');
    
    const checkAuth = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkAuth);
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('User authenticated:', user.uid);
                    await loadAllTransactions(user.uid);
                } else {
                    console.log('No user authenticated - redirecting to login');
                    alert('Please login to view transactions.');
                    window.location.href = 'login.html';
                }
            });
        }
    }, 100);
});

// Load all transactions
async function loadAllTransactions(userId) {
    try {
        console.log('Loading transactions for user:', userId);
        
        const transactionsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .orderBy('date', 'desc')
            .get();
        
        allTransactions = [];
        
        if (!transactionsSnapshot.empty) {
            transactionsSnapshot.forEach(doc => {
                allTransactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }
        
        console.log('Loaded transactions:', allTransactions.length);
        
        // Calculate statistics
        calculateStatistics();
        
        // Display transactions
        displayTransactions(allTransactions);
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        
        const container = document.getElementById('transactionsList');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #e74c3c;">
                    <p>Error loading transactions</p>
                    <small>Please refresh the page or contact support</small>
                </div>
            `;
        }
    }
}

// Calculate transaction statistics
function calculateStatistics() {
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let totalInvested = 0;
    
    allTransactions.forEach(transaction => {
        const amount = transaction.usdAmount || transaction.amount || 0;
        
        switch(transaction.type) {
            case 'deposit':
                if (transaction.status === 'completed') {
                    totalDeposited += amount;
                }
                break;
            case 'withdrawal':
                if (transaction.status === 'completed') {
                    totalWithdrawn += amount;
                }
                break;
            case 'investment':
                if (transaction.status === 'completed') {
                    totalInvested += amount;
                }
                break;
        }
    });
    
    // Update stats display
    const totalTransactionsEl = document.getElementById('totalTransactions');
    if (totalTransactionsEl) {
        totalTransactionsEl.textContent = allTransactions.length;
    }
    
    const totalDepositedEl = document.getElementById('totalDeposited');
    if (totalDepositedEl) {
        totalDepositedEl.textContent = formatCurrency(totalDeposited);
    }
    
    const totalWithdrawnEl = document.getElementById('totalWithdrawn');
    if (totalWithdrawnEl) {
        totalWithdrawnEl.textContent = formatCurrency(totalWithdrawn);
    }
    
    const totalInvestedEl = document.getElementById('totalInvested');
    if (totalInvestedEl) {
        totalInvestedEl.textContent = formatCurrency(totalInvested);
    }
}

// Display transactions
function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #999;">
                <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">No transactions found</p>
                <small>Start investing to see your transaction history!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    transactions.forEach(transaction => {
        const transactionCard = createTransactionCard(transaction);
        container.appendChild(transactionCard);
    });
}

// Create transaction card element
function createTransactionCard(transaction) {
    const card = document.createElement('div');
    card.className = `transaction-card ${transaction.type}`;
    
    const date = transaction.date ? 
        (transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date)) : 
        new Date();
    
    const amount = transaction.usdAmount || transaction.amount || 0;
    const isPositive = ['deposit', 'profit', 'investment_maturity'].includes(transaction.type);
    const amountSign = isPositive ? '+' : '-';
    const amountClass = isPositive ? 'positive' : 'negative';
    
    // Type labels and badges
    const typeLabels = {
        'deposit': 'Deposit',
        'withdrawal': 'Withdrawal',
        'investment': 'Investment',
        'profit': 'Profit',
        'investment_maturity': 'Investment Maturity'
    };
    
    const typeLabel = typeLabels[transaction.type] || transaction.type;
    
    // Status badges
    const statusColors = {
        'pending': '#f39c12',
        'completed': '#27ae60',
        'failed': '#e74c3c',
        'processing': '#3498db'
    };
    
    const statusColor = statusColors[transaction.status] || '#999';
    
    card.innerHTML = `
        <div class="transaction-header">
            <div>
                <span class="transaction-type-badge ${transaction.type}">${typeLabel}</span>
                ${transaction.cryptocurrency ? `<span style="font-size: 0.9rem; color: #666; margin-left: 0.5rem;">(${transaction.cryptocurrency})</span>` : ''}
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #999;">
                    ${formatTransactionDate(date)}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="transaction-amount-large ${amountClass}">
                    ${amountSign}${formatCurrency(Math.abs(amount))}
                </div>
                <div style="font-size: 0.85rem; color: ${statusColor}; font-weight: 600; margin-top: 0.3rem;">
                    ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </div>
            </div>
        </div>
        
        <div class="transaction-details">
            ${transaction.cryptocurrency ? `
                <div class="transaction-detail-item">
                    <span>Cryptocurrency</span>
                    <strong>${transaction.cryptocurrency}</strong>
                </div>
            ` : ''}
            
            ${transaction.cryptoAmount ? `
                <div class="transaction-detail-item">
                    <span>Crypto Amount</span>
                    <strong>${transaction.cryptoAmount} ${transaction.cryptocurrency}</strong>
                </div>
            ` : ''}
            
            ${transaction.fee ? `
                <div class="transaction-detail-item">
                    <span>Fee</span>
                    <strong>${formatCurrency(transaction.fee)}</strong>
                </div>
            ` : ''}
            
            ${transaction.plan ? `
                <div class="transaction-detail-item">
                    <span>Plan</span>
                    <strong>${transaction.plan}</strong>
                </div>
            ` : ''}
            
            ${transaction.profit ? `
                <div class="transaction-detail-item">
                    <span>Profit</span>
                    <strong class="profit-green">+${formatCurrency(transaction.profit)}</strong>
                </div>
            ` : ''}
            
            ${transaction.walletAddress ? `
                <div class="transaction-detail-item">
                    <span>Wallet Address</span>
                    <div class="transaction-hash">${transaction.walletAddress}</div>
                </div>
            ` : ''}
            
            ${transaction.transactionHash && transaction.transactionHash !== 'N/A' && transaction.transactionHash !== 'Not provided' ? `
                <div class="transaction-detail-item">
                    <span>Transaction Hash</span>
                    <div class="transaction-hash">${transaction.transactionHash}</div>
                </div>
            ` : ''}
            
            ${transaction.description ? `
                <div class="transaction-detail-item">
                    <span>Description</span>
                    <strong>${transaction.description}</strong>
                </div>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Filter transactions
function filterTransactions(type) {
    currentFilter = type;
    
    // Update active button
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(type) || 
            (type === 'all' && btn.textContent.toLowerCase() === 'all')) {
            btn.classList.add('active');
        }
    });
    
    // Filter transactions
    let filteredTransactions = allTransactions;
    
    if (type !== 'all') {
        filteredTransactions = allTransactions.filter(transaction => {
            return transaction.type === type;
        });
    }
    
    // Display filtered transactions
    displayTransactions(filteredTransactions);
    
    console.log(`Filtered transactions (${type}):`, filteredTransactions.length);
}

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format transaction date
function formatTransactionDate(date) {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export functions
window.filterTransactions = filterTransactions;

console.log('Transactions.js loaded successfully');