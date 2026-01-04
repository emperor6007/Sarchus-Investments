// Dashboard JavaScript - Fixed Version

// Wait for Firebase authentication
let dashboardInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        // Wait for Firebase to be ready
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
    
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.uid);
            
            // Load user data from Firestore
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    window.currentUser = {
                        uid: user.uid,
                        ...userData
                    };
                    
                    console.log('User data loaded:', window.currentUser);
                    
                    // Update dashboard UI
                    updateDashboardUI(window.currentUser);
                    dashboardInitialized = true;
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
    
    // Update user name in navigation
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        el.textContent = user.firstName || 'User';
    });
    
    // Update dashboard data
    updateDashboardData(user);
    
    // Fetch and update Bitcoin price
    fetchBitcoinPrice();
    setInterval(fetchBitcoinPrice, 60000);
}

// Fetch Bitcoin Price
async function fetchBitcoinPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const btcPrice = data.bitcoin.usd;
            
            // Update mini price display
            const btcPriceMini = document.getElementById('btcPriceMini');
            if (btcPriceMini) {
                btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
            }
            
            // Recalculate BTC value if user data exists
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
        let btcPrice = 98547.23; // Default fallback price
        
        // Try to fetch current Bitcoin price
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                btcPrice = data.bitcoin.usd;
            }
        } catch (fetchError) {
            console.log('Using fallback BTC price');
        }
        
        // Calculate values
        const btcValue = (user.btcHoldings || 0) * btcPrice;
        const totalBalance = (user.balance || 0) + btcValue;
        const totalProfit = user.totalProfit || 0;
        const initialInvestment = totalBalance - totalProfit;
        const profitPercent = initialInvestment > 0 ? (totalProfit / initialInvestment) * 100 : 0;
        const dayChangePercent = 2.3; // Demo value
        
        // Update total balance
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(totalBalance);
        }
        
        // Update balance change
        const balanceChangeEl = document.getElementById('balanceChange');
        if (balanceChangeEl) {
            balanceChangeEl.textContent = `+${dayChangePercent.toFixed(2)}% (24h)`;
            balanceChangeEl.className = dayChangePercent >= 0 ? 'balance-change positive' : 'balance-change negative';
        }
        
        // Update BTC holdings
        const btcHoldingsEl = document.getElementById('btcHoldings');
        if (btcHoldingsEl) {
            btcHoldingsEl.textContent = (user.btcHoldings || 0).toFixed(8) + ' BTC';
        }
        
        // Update BTC value
        const btcValueEl = document.getElementById('btcValue');
        if (btcValueEl) {
            btcValueEl.textContent = '≈ ' + formatCurrency(btcValue);
        }
        
        // Update total profit
        const totalProfitEl = document.getElementById('totalProfit');
        if (totalProfitEl) {
            const profitClass = totalProfit >= 0 ? 'positive' : 'negative';
            totalProfitEl.className = 'balance-amount ' + profitClass;
            totalProfitEl.textContent = (totalProfit >= 0 ? '+' : '') + formatCurrency(totalProfit);
        }
        
        // Update profit percentage
        const profitPercentEl = document.getElementById('profitPercent');
        if (profitPercentEl) {
            profitPercentEl.textContent = (profitPercent >= 0 ? '+' : '') + profitPercent.toFixed(2) + '%';
        }
        
        // Update available balance
        const availableBalanceEl = document.getElementById('availableBalance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = formatCurrency(user.balance || 0);
        }
        
        // Update Bitcoin price in mini display
        const btcPriceMini = document.getElementById('btcPriceMini');
        if (btcPriceMini) {
            btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
        }
        
        console.log('Dashboard data updated successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
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
        // Reset form
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
        alert('Insufficient balance! Please deposit funds first.');
        return;
    }
    
    if (amount < 100) {
        alert('Minimum investment amount is $100');
        return;
    }
    
    // Calculate fee based on plan
    let feePercent = 0.5;
    let planName = 'Starter';
    
    if (plan === 'professional') {
        feePercent = 0.3;
        planName = 'Professional';
    }
    if (plan === 'enterprise') {
        feePercent = 0.1;
        planName = 'Enterprise';
    }
    
    const fee = amount * (feePercent / 100);
    const investAmount = amount - fee;
    
    try {
        // Update user balance in Firestore
        const newBalance = user.balance - amount;
        
        await firebase.firestore().collection('users').doc(user.uid).update({
            balance: newBalance
        });
        
        // Update local user object
        user.balance = newBalance;
        window.currentUser = user;
        
        // Create transaction record
        const transaction = {
            type: 'investment',
            amount: amount,
            fee: fee,
            investAmount: investAmount,
            plan: planName,
            status: 'completed',
            date: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add transaction to Firestore
        await firebase.firestore().collection('users').doc(user.uid)
            .collection('transactions').add(transaction);
        
        // Show success message
        alert(`Investment successful!\n\nAmount: ${formatCurrency(amount)}\nFee: ${formatCurrency(fee)}\nInvested: ${formatCurrency(investAmount)}\nPlan: ${planName}`);
        
        // Close modal and refresh dashboard
        closeInvestModal();
        updateDashboardData(user);
        
    } catch (error) {
        console.error('Investment error:', error);
        alert('Investment failed. Please try again.');
    }
}
async function loadInvestments(user) {
    const list = document.getElementById('investmentList');
    list.innerHTML = '';

    const snap = await firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    let totalProfit = 0;

    snap.forEach(doc => {
        const inv = doc.data();
        const now = Date.now();

        const progress = Math.min(
            (now - inv.start) / (inv.end - inv.start),
            1
        );

        const earned = inv.profit * progress;
        totalProfit += earned;

        list.innerHTML += `
            <div class="transaction-item">
                <div>
                    <strong>${inv.plan.days} Days Plan</strong><br>
                    Invested: ${formatCurrency(inv.amount)}
                </div>
                <div class="transaction-amount positive">
                    +${formatCurrency(earned)}
                </div>
            </div>
        `;
    });

    document.getElementById('totalProfit').innerText =
        '+' + formatCurrency(totalProfit);
}

// Handle logout from dashboard
function handleDashboardLogout() {
    if (confirm('Are you sure you want to logout?')) {
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

// Export functions for global access
window.openInvestModal = openInvestModal;
window.closeInvestModal = closeInvestModal;
window.handleInvest = handleInvest;
window.handleDashboardLogout = handleDashboardLogout;

console.log('Dashboard.js loaded successfully');

