// Dashboard JavaScript - Complete Investment System

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
                    
                    updateDashboardUI(window.currentUser);
                    dashboardInitialized = true;
                    
                    // Start real-time profit updates
                    startProfitSimulation(user.uid);
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
        
        const btcValue = (user.btcHoldings || 0) * btcPrice;
        const totalBalance = (user.balance || 0) + btcValue;
        
        // Update balance displays
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(totalBalance);
        }
        
        const btcHoldingsEl = document.getElementById('btcHoldings');
        if (btcHoldingsEl) {
            btcHoldingsEl.textContent = (user.btcHoldings || 0).toFixed(8) + ' BTC';
        }
        
        const btcValueEl = document.getElementById('btcValue');
        if (btcValueEl) {
            btcValueEl.textContent = '≈ ' + formatCurrency(btcValue);
        }
        
        const availableBalanceEl = document.getElementById('availableBalance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = formatCurrency(user.balance || 0);
        }
        
        const btcPriceMini = document.getElementById('btcPriceMini');
        if (btcPriceMini) {
            btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
        }
        
        // Load and display investments
        await loadActiveInvestments(user.uid);
        
        console.log('Dashboard data updated successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Start Profit Simulation (Updates every 10 seconds)
function startProfitSimulation(uid) {
    // Clear any existing interval
    if (profitUpdateInterval) {
        clearInterval(profitUpdateInterval);
    }
    
    // Update immediately
    calculateLiveProfits(uid);
    
    // Then update every 10 seconds
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
            
            // Calculate elapsed time
            const startTime = investment.startTime;
            const endTime = investment.endTime;
            const durationMs = endTime - startTime;
            const elapsedMs = Math.min(now - startTime, durationMs);
            
            // Calculate current profit based on time elapsed
            const totalProfitPotential = investment.amount * (investment.roiPercent / 100);
            const currentProfit = (elapsedMs / durationMs) * totalProfitPotential;
            
            totalLiveProfit += currentProfit;
            
            // Auto-complete investment if time is up
            if (now >= endTime && !investment.credited) {
                await completeInvestment(uid, doc.id, investment, totalProfitPotential);
            }
        }
        
        // Update total profit display
        const totalProfitEl = document.getElementById('totalProfit');
        if (totalProfitEl) {
            totalProfitEl.className = 'balance-amount positive';
            totalProfitEl.textContent = '+' + formatCurrency(totalLiveProfit);
        }
        
        const profitPercentEl = document.getElementById('profitPercent');
        if (profitPercentEl) {
            const profitPercent = window.currentUser.balance > 0 
                ? (totalLiveProfit / window.currentUser.balance) * 100 
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

// Complete Investment (Auto-credit when matured)
async function completeInvestment(uid, investmentId, investment, totalProfit) {
    try {
        console.log(`Completing investment ${investmentId}...`);
        
        const userRef = firebase.firestore().collection('users').doc(uid);
        const investmentRef = userRef.collection('investments').doc(investmentId);
        
        const totalPayout = investment.amount + totalProfit;
        
        // Credit balance and update total profit
        await userRef.update({
            balance: firebase.firestore.FieldValue.increment(totalPayout),
            totalProfit: firebase.firestore.FieldValue.increment(totalProfit)
        });
        
        // Mark investment as completed
        await investmentRef.update({
            status: 'completed',
            credited: true,
            completedAt: Date.now()
        });
        
        // Add transaction record
        await userRef.collection('transactions').add({
            type: 'investment_maturity',
            amount: totalPayout,
            profit: totalProfit,
            description: `${investment.planName} investment matured`,
            status: 'completed',
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Investment ${investmentId} completed successfully`);
        
        // Refresh user data
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            window.currentUser = { uid: uid, ...userDoc.data() };
            updateDashboardData(window.currentUser);
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
    
    console.log('Investment attempt:', {
        amount: amount,
        userBalance: user.balance,
        plan: plan
    });
    
    if (amount > user.balance) {
        alert(`Insufficient balance!\n\nAvailable: ${formatCurrency(user.balance)}\nRequired: ${formatCurrency(amount)}\n\nPlease deposit funds first.`);
        return;
    }
    
    if (amount < 100) {
        alert('Minimum investment amount is $100');
        return;
    }
    
    // Plan configurations
    const planConfigs = {
        starter: { name: 'Silver', feePercent: 0.5, roiPercent: 15, durationDays: 7 },
        professional: { name: 'Gold', feePercent: 0.3, roiPercent: 20, durationDays: 14 },
        enterprise: { name: 'Diamond', feePercent: 0.1, roiPercent: 25, durationDays: 30 }
    };
    
    const config = planConfigs[plan];
    const fee = amount * (config.feePercent / 100);
    const investAmount = amount - fee;
    
    // Show loading
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    try {
        const newBalance = user.balance - amount;
        const now = Date.now();
        const endTime = now + (config.durationDays * 24 * 60 * 60 * 1000);
        
        console.log('Creating investment...');
        
        // Create investment record first
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
        
        console.log('Investment data:', investmentData);
        
        const investmentRef = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('investments')
            .add(investmentData);
        
        console.log('Investment created with ID:', investmentRef.id);
        
        // Update user balance
        await firebase.firestore().collection('users').doc(user.uid).update({
            balance: newBalance
        });
        
        console.log('Balance updated');
        
        // Add transaction record
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
        
        console.log('Transaction recorded');
        
        // Update local user object
        user.balance = newBalance;
        window.currentUser = user;
        
        // Show success message
        alert(`Investment Successful! 🎉\n\nPlan: ${config.name}\nAmount: ${formatCurrency(amount)}\nFee: ${formatCurrency(fee)}\nInvested: ${formatCurrency(investAmount)}\nROI: ${config.roiPercent}%\nDuration: ${config.durationDays} days\n\nYour profits will start accumulating immediately!`);
        
        // Close modal and refresh
        closeInvestModal();
        updateDashboardData(user);
        
    } catch (error) {
        console.error('Investment error:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        let errorMessage = 'Investment failed. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Please contact support.';
        } else if (error.code === 'not-found') {
            errorMessage += 'User not found. Please login again.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        alert(errorMessage);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle logout
function handleDashboardLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear profit update interval
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

console.log('Dashboard.js loaded successfully');
