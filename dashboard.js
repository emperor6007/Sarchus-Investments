// Enhanced Dashboard JavaScript with Total Investments Display

let dashboardInitialized = false;
let profitUpdateInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkAuth);
                initializeDashboard();
            }
        }, 100);
    }
});

// Initialize Dashboard
function initializeDashboard() {
    if (dashboardInitialized) return;
    
    console.log('Initializing dashboard...');
    
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
                    
                    // Initialize user wallets if not exists
                    if (!userData.wallets && typeof createUserWallets === 'function') {
                        await createUserWallets(user.uid);
                        const updatedDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                        window.currentUser = {
                            uid: user.uid,
                            ...updatedDoc.data()
                        };
                    }
                    
                    // Check and complete any matured investments FIRST
                    await checkAndCompleteMatureInvestments(user.uid);
                    
                    updateDashboardUI(window.currentUser);
                    dashboardInitialized = true;
                    
                    // Start real-time profit updates
                    startProfitSimulation(user.uid);
                    
                    // Load recent transactions
                    loadRecentTransactions(user.uid);
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
            if (!dashboardInitialized) {
                alert('Please login to access the dashboard.');
                window.location.href = 'login.html';
            }
        }
    });
}

// Update Dashboard UI
function updateDashboardUI(user) {
    console.log('Updating dashboard UI...');
    
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        el.textContent = user.firstName || 'User';
    });
    
    updateDashboardData(user);
    fetchBitcoinPrice();
    setInterval(fetchBitcoinPrice, 60000);
}

// Fetch Bitcoin Price
async function fetchBitcoinPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        
        if (response.ok) {
            const data = await response.json();
            const btcPrice = data.bitcoin.usd;
            
            const btcPriceMini = document.getElementById('btcPriceMini');
            if (btcPriceMini) {
                btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
            }
            
            if (window.currentUser) {
                updateDashboardData(window.currentUser);
            }
        }
    } catch (error) {
        console.log('Error fetching Bitcoin price:', error);
    }
}

// Calculate Total Investments (Locked Amount)
async function calculateTotalInvestments(uid) {
    try {
        const investmentsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(uid)
            .collection('investments')
            .where('status', '==', 'active')
            .get();
        
        let totalLockedAmount = 0;
        let activeCount = 0;
        
        investmentsSnapshot.forEach(doc => {
            const investment = doc.data();
            // Sum up the actual invested amounts that are locked
            totalLockedAmount += investment.amount || 0;
            activeCount++;
        });
        
        return {
            totalAmount: totalLockedAmount,
            activeCount: activeCount
        };
        
    } catch (error) {
        console.error('Error calculating total investments:', error);
        return {
            totalAmount: 0,
            activeCount: 0
        };
    }
}

// Update Dashboard Data
async function updateDashboardData(user) {
    try {
        let btcPrice = 98547.23;
        
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (response.ok) {
                const data = await response.json();
                btcPrice = data.bitcoin.usd;
            }
        } catch (fetchError) {
            console.log('Using fallback BTC price');
        }
        
        // Calculate total locked investments
        const totalInvestments = await calculateTotalInvestments(user.uid);
        
        // Total balance = Available balance + Locked investments
        const totalBalance = (user.balance || 0) + totalInvestments.totalAmount;
        
        // Update Total Balance
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(totalBalance);
        }
        
        // Update Total Investments (Locked Amount)
        const totalInvestmentsEl = document.getElementById('totalInvestments');
        if (totalInvestmentsEl) {
            totalInvestmentsEl.textContent = formatCurrency(totalInvestments.totalAmount);
        }
        
        // Update Active Investments Count
        const activeInvestmentsCountEl = document.getElementById('activeInvestmentsCount');
        if (activeInvestmentsCountEl) {
            const count = totalInvestments.activeCount;
            if (count === 0) {
                activeInvestmentsCountEl.textContent = 'No locked funds';
            } else {
                activeInvestmentsCountEl.textContent = `${count} active investment${count !== 1 ? 's' : ''} (locked)`;
            }
        }
        
        // Update Available Balance
        const availableBalanceEl = document.getElementById('availableBalance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = formatCurrency(user.balance || 0);
        }
        
        // Update BTC Price Mini
        const btcPriceMini = document.getElementById('btcPriceMini');
        if (btcPriceMini) {
            btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
        }
        
        // Load and display investments
        await loadActiveInvestments(user.uid);
        
        console.log('Dashboard data updated successfully');
        console.log('Locked Amount:', totalInvestments.totalAmount);
        console.log('Available Balance:', user.balance);
        console.log('Total Balance:', totalBalance);
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Load Recent Transactions
async function loadRecentTransactions(userId) {
    try {
        const transactionsContainer = document.getElementById('recentTransactions');
        if (!transactionsContainer) return;
        
        const transactionsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .orderBy('date', 'desc')
            .limit(5)
            .get();
        
        if (transactionsSnapshot.empty) {
            transactionsContainer.innerHTML = `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <span class="transaction-type">No transactions yet</span>
                        <span class="transaction-date">Start investing today!</span>
                    </div>
                    <div class="transaction-amount">$0.00</div>
                </div>
            `;
            return;
        }
        
        transactionsContainer.innerHTML = '';
        
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const date = transaction.date ? 
                (transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date)) : 
                new Date();
            
            const amount = transaction.usdAmount || transaction.amount || 0;
            const isPositive = ['deposit', 'profit', 'investment_maturity'].includes(transaction.type);
            
            const typeLabels = {
                'deposit': 'Deposit',
                'withdrawal': 'Withdrawal',
                'investment': 'Investment',
                'profit': 'Profit',
                'investment_maturity': 'Investment Maturity'
            };
            
            const typeLabel = typeLabels[transaction.type] || transaction.type;
            const typeClass = transaction.type;
            const amountClass = isPositive ? 'positive' : '';
            
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            transactionItem.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-type ${typeClass}">${typeLabel}</span>
                    <span class="transaction-date">${formatTransactionDate(date)}</span>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${isPositive ? '+' : '-'}${formatCurrency(Math.abs(amount))}
                </div>
            `;
            
            transactionsContainer.appendChild(transactionItem);
        });
        
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

// Format transaction date
function formatTransactionDate(date) {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// Check and Complete Matured Investments (called on dashboard load)
async function checkAndCompleteMatureInvestments(uid) {
    try {
        console.log('Checking for matured investments...');
        
        const investmentsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(uid)
            .collection('investments')
            .where('status', '==', 'active')
            .get();
        
        const now = Date.now();
        let completedCount = 0;
        
        for (const doc of investmentsSnapshot.docs) {
            const investment = doc.data();
            
            // Check if investment has matured and not yet credited
            if (now >= investment.endTime && !investment.credited) {
                const totalProfit = investment.amount * (investment.roiPercent / 100);
                await completeInvestment(uid, doc.id, investment, totalProfit);
                completedCount++;
            }
        }
        
        if (completedCount > 0) {
            console.log(`Completed ${completedCount} matured investment(s)`);
            // Refresh user data after completing investments
            const userDoc = await firebase.firestore().collection('users').doc(uid).get();
            if (userDoc.exists) {
                window.currentUser = { uid: uid, ...userDoc.data() };
            }
        }
        
    } catch (error) {
        console.error('Error checking matured investments:', error);
    }
}

// Start Profit Simulation (Updates every 10 seconds)
function startProfitSimulation(uid) {
    if (profitUpdateInterval) {
        clearInterval(profitUpdateInterval);
    }
    
    calculateLiveProfits(uid);
    
    profitUpdateInterval = setInterval(() => {
        calculateLiveProfits(uid);
    }, 10000);
}

// Calculate Live Profits from Active Investments
async function calculateLiveProfits(uid) {
    try {
        const investmentsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(uid)
            .collection('investments')
            .where('status', '==', 'active')
            .get();
        
        let totalLiveProfit = 0;
        const now = Date.now();
        
        for (const doc of investmentsSnapshot.docs) {
            const investment = doc.data();
            
            const startTime = investment.startTime;
            const endTime = investment.endTime;
            const durationMs = endTime - startTime;
            const elapsedMs = Math.min(now - startTime, durationMs);
            
            const totalProfitPotential = investment.amount * (investment.roiPercent / 100);
            const currentProfit = (elapsedMs / durationMs) * totalProfitPotential;
            
            totalLiveProfit += currentProfit;
            
            if (now >= endTime && !investment.credited) {
                await completeInvestment(uid, doc.id, investment, totalProfitPotential);
            }
        }
        
        const totalProfitEl = document.getElementById('totalProfit');
        if (totalProfitEl) {
            totalProfitEl.className = 'balance-amount positive';
            totalProfitEl.textContent = '+' + formatCurrency(totalLiveProfit);
        }
        
        const profitPercentEl = document.getElementById('profitPercent');
        if (profitPercentEl) {
            const totalInvestments = await calculateTotalInvestments(uid);
            const profitPercent = totalInvestments.totalAmount > 0 
                ? (totalLiveProfit / totalInvestments.totalAmount) * 100 
                : 0;
            profitPercentEl.textContent = '+' + profitPercent.toFixed(2) + '%';
        }
        
    } catch (error) {
        console.error('Error calculating live profits:', error);
    }
}

// Load and Display Active Investments
async function loadActiveInvestments(uid) {
    try {
        const investmentList = document.getElementById('investmentList');
        if (!investmentList) return;
        
        const investmentsSnapshot = await firebase.firestore()
            .collection('users')
            .doc(uid)
            .collection('investments')
            .orderBy('startTime', 'desc')
            .get();
        
        if (investmentsSnapshot.empty) {
            investmentList.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No active investments yet. Start investing today!</p>';
            return;
        }
        
        investmentList.innerHTML = '';
        const now = Date.now();
        
        investmentsSnapshot.forEach(doc => {
            const investment = doc.data();
            const startTime = investment.startTime;
            const endTime = investment.endTime;
            const durationMs = endTime - startTime;
            const elapsedMs = Math.min(now - startTime, durationMs);
            
            const progress = (elapsedMs / durationMs) * 100;
            const totalProfitPotential = investment.amount * (investment.roiPercent / 100);
            const currentProfit = (elapsedMs / durationMs) * totalProfitPotential;
            
            const daysRemaining = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
            const statusText = investment.status === 'completed' 
                ? 'Completed' 
                : daysRemaining > 0 
                    ? `${daysRemaining} days remaining`
                    : 'Maturing...';
            
            const statusClass = investment.status === 'completed' ? 'completed' : 'active';
            
            investmentList.innerHTML += `
                <div class="investment-card ${statusClass}">
                    <div class="investment-header">
                        <div>
                            <h4>${investment.planName} Plan</h4>
                            <span class="investment-status">${statusText}</span>
                        </div>
                        <div class="investment-amount">
                            ${formatCurrency(investment.amount)}
                        </div>
                    </div>
                    <div class="investment-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">${progress.toFixed(1)}%</div>
                    </div>
                    <div class="investment-details">
                        <div class="detail-item">
                            <span>ROI:</span>
                            <strong>${investment.roiPercent}%</strong>
                        </div>
                        <div class="detail-item">
                            <span>Duration:</span>
                            <strong>${investment.durationDays} days</strong>
                        </div>
                        <div class="detail-item">
                            <span>Current Profit:</span>
                            <strong class="profit-green">+${formatCurrency(currentProfit)}</strong>
                        </div>
                        <div class="detail-item">
                            <span>Expected Profit:</span>
                            <strong class="profit-green">+${formatCurrency(totalProfitPotential)}</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        
    } catch (error) {
        console.error('Error loading investments:', error);
    }
}

// Complete Investment
async function completeInvestment(uid, investmentId, investment, totalProfit) {
    try {
        console.log(`Completing investment ${investmentId}...`);
        
        const userRef = firebase.firestore().collection('users').doc(uid);
        const investmentRef = userRef.collection('investments').doc(investmentId);
        
        // Total payout = original investment + profit
        const totalPayout = investment.amount + totalProfit;
        
        // Update user balance (add back investment + profit)
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(totalPayout),
            totalProfit: firebase.firestore.FieldValue.increment(totalProfit)
        });
        
        // Mark investment as completed
        await investmentRef.update({
            status: 'completed',
            credited: true,
            completedAt: Date.now(),
            finalProfit: totalProfit,
            finalPayout: totalPayout
        });
        
        // Add transaction record
        await userRef.collection('transactions').add({
            type: 'investment_maturity',
            amount: totalPayout,
            profit: totalProfit,
            investmentAmount: investment.amount,
            description: `${investment.planName} investment matured`,
            status: 'completed',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Investment ${investmentId} completed successfully`);
        console.log(`Principal: ${investment.amount}, Profit: ${totalProfit}, Total Payout: ${totalPayout}`);
        
        // Refresh user data
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            window.currentUser = { uid: uid, ...userDoc.data() };
            updateDashboardData(window.currentUser);
            loadRecentTransactions(uid);
        }
        
    } catch (error) {
        console.error('Error completing investment:', error);
    }
}

// Format Currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Open Investment Modal
function openInvestModal() {
    const modal = document.getElementById('investModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close Investment Modal
function closeInvestModal() {
    const modal = document.getElementById('investModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('investForm');
        if (form) form.reset();
    }
}

// Handle Investment
async function handleInvest(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('investAmount').value);
    const plan = document.getElementById('investPlan').value;
    const user = window.currentUser;
    
    if (!user) {
        alert('Please login first.');
        return;
    }
    
    if (amount > user.balance) {
        alert(`Insufficient balance!\n\nAvailable: ${formatCurrency(user.balance)}\nRequired: ${formatCurrency(amount)}\n\nPlease deposit funds first.`);
        return;
    }
    
    if (amount < 100) {
        alert('Minimum investment amount is $100');
        return;
    }
    
    const planConfigs = {
        starter: { name: 'Silver', feePercent: 0.5, roiPercent: 15, durationDays: 7 },
        professional: { name: 'Gold', feePercent: 0.3, roiPercent: 20, durationDays: 14 },
        enterprise: { name: 'Diamond', feePercent: 0.1, roiPercent: 25, durationDays: 30 }
    };
    
    const config = planConfigs[plan];
    const fee = amount * (config.feePercent / 100);
    const investAmount = amount - fee;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    try {
        const newBalance = user.balance - amount;
        const now = Date.now();
        const endTime = now + (config.durationDays * 24 * 60 * 60 * 1000);
        
        const investmentData = {
            planName: config.name,
            amount: investAmount,
            originalAmount: amount,
            fee: fee,
            roiPercent: config.roiPercent,
            durationDays: config.durationDays,
            startTime: now,
            endTime: endTime,
            status: 'active',
            credited: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const investmentRef = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('investments')
            .add(investmentData);
        
        await firebase.firestore().collection('users').doc(user.uid).update({
            balance: newBalance
        });
        
        await firebase.firestore().collection('users').doc(user.uid)
            .collection('transactions').add({
                type: 'investment',
                amount: amount,
                fee: fee,
                investAmount: investAmount,
                plan: config.name,
                status: 'completed',
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        user.balance = newBalance;
        window.currentUser = user;
        
        alert(`Investment Successful! 🎉\n\nPlan: ${config.name}\nAmount: ${formatCurrency(amount)}\nFee: ${formatCurrency(fee)}\nInvested: ${formatCurrency(investAmount)}\nROI: ${config.roiPercent}%\nDuration: ${config.durationDays} days\n\nYour funds are now locked and earning profits!`);
        
        closeInvestModal();
        updateDashboardData(user);
        loadRecentTransactions(user.uid);
        
    } catch (error) {
        console.error('Investment error:', error);
        
        let errorMessage = 'Investment failed. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please contact support.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        alert(errorMessage);
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle logout
function handleDashboardLogout() {
    if (confirm('Are you sure you want to logout?')) {
        if (profitUpdateInterval) {
            clearInterval(profitUpdateInterval);
        }
        
        firebase.auth().signOut().then(() => {
            window.currentUser = null;
            dashboardInitialized = false;
            alert('You have been logged out successfully!');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        });
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('investModal');
    if (event.target === modal) {
        closeInvestModal();
    }
});

// Export functions
window.openInvestModal = openInvestModal;
window.closeInvestModal = closeInvestModal;
window.handleInvest = handleInvest;
window.handleDashboardLogout = handleDashboardLogout;
window.updateDashboardData = updateDashboardData;

console.log('Enhanced dashboard.js loaded successfully');
