// Dashboard JavaScript

// Initialize Dashboard
function initializeDashboard() {
    // Try to get user from sessionStorage first
    let user = window.currentUser;
    
    if (!user) {
        try {
            const userStr = sessionStorage.getItem('currentUser');
            if (userStr) {
                user = JSON.parse(userStr);
                window.currentUser = user;
            }
        } catch (e) {
            console.log('Cannot load user from session');
        }
    }
    
    if (!user) {
        alert('Please login to access the dashboard.');
        window.location.href = 'login.html';
        return;
    }
    
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

// Update Dashboard Data
async function updateDashboardData(user) {
    try {
        let btcPrice = 98547.23; // Default fallback price
        
        // Try to fetch current Bitcoin price
        try {
            const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                btcPrice = parseFloat(data.bpi.USD.rate.replace(/,/g, ''));
            }
        } catch (fetchError) {
            console.log('Using fallback BTC price');
        }
        
        // Calculate values
        const btcValue = user.btcHoldings * btcPrice;
        const totalBalance = user.balance + btcValue;
        const initialInvestment = totalBalance - user.totalProfit;
        const profitPercent = initialInvestment > 0 ? (user.totalProfit / initialInvestment) * 100 : 0;
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
        }
        
        // Update BTC holdings
        const btcHoldingsEl = document.getElementById('btcHoldings');
        if (btcHoldingsEl) {
            btcHoldingsEl.textContent = user.btcHoldings.toFixed(8) + ' BTC';
        }
        
        // Update BTC value
        const btcValueEl = document.getElementById('btcValue');
        if (btcValueEl) {
            btcValueEl.textContent = '≈ ' + formatCurrency(btcValue);
        }
        
        // Update total profit
        const totalProfitEl = document.getElementById('totalProfit');
        if (totalProfitEl) {
            totalProfitEl.textContent = '+' + formatCurrency(user.totalProfit);
        }
        
        // Update profit percentage
        const profitPercentEl = document.getElementById('profitPercent');
        if (profitPercentEl) {
            profitPercentEl.textContent = '+' + profitPercent.toFixed(2) + '%';
        }
        
        // Update available balance
        const availableBalanceEl = document.getElementById('availableBalance');
        if (availableBalanceEl) {
            availableBalanceEl.textContent = formatCurrency(user.balance);
        }
        
        // Update Bitcoin price in mini display
        const btcPriceMini = document.getElementById('btcPriceMini');
        if (btcPriceMini) {
            btcPriceMini.textContent = 'BTC: ' + formatCurrency(btcPrice);
        }
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        alert('Error loading dashboard data. Please refresh the page.');
    }
}

// Format Currency
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
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
    }
}

// Handle Investment
function handleInvest(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('investAmount').value);
    const plan = document.getElementById('investPlan').value;
    const user = window.currentUser;
    
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
    if (plan === 'professional') feePercent = 0.3;
    if (plan === 'enterprise') feePercent = 0.1;
    
    const fee = amount * (feePercent / 100);
    const investAmount = amount - fee;
    
    // Update user balance
    user.balance -= amount;
    
    // Add transaction
    const transaction = {
        id: 'TXN' + Date.now(),
        type: 'investment',
        amount: amount,
        fee: fee,
        plan: plan,
        status: 'completed',
        date: new Date().toISOString(),
        method: 'balance'
    };
    
    user.transactions.unshift(transaction);
    
    // Show success message
    alert(`Investment successful!\n\nAmount: ${formatCurrency(amount)}\nFee: ${formatCurrency(fee)}\nInvested: ${formatCurrency(investAmount)}\nPlan: ${plan}`);
    
    // Close modal and refresh
    closeInvestModal();
    updateDashboardData(user);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        initializeDashboard();
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('investModal');
        if (event.target === modal) {
            closeInvestModal();
        }
    };
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDashboard,
        updateDashboardData,
        openInvestModal,
        closeInvestModal,
        handleInvest,
        formatCurrency
    };
}