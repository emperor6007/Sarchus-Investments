// Portfolio Demo Data
const portfolioData = {
    totalValue: 125000.00,
    btcHoldings: 2.45678900,
    initialInvestment: 100000.00,
    dayChange: 2450.00,
    dayChangePercent: 2.0
};

// Initialize Portfolio Dashboard
function initializePortfolio() {
    // Update portfolio summary
    updatePortfolioSummary();
    
    // Load Bitcoin price
    updateBitcoinPrice();
}

// Update Portfolio Summary Cards
async function updatePortfolioSummary() {
    try {
        // Fetch current Bitcoin price
        const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
        const data = await response.json();
        const btcPrice = parseFloat(data.bpi.USD.rate.replace(/,/g, ''));
        
        // Calculate portfolio values based on BTC holdings
        const totalValue = portfolioData.btcHoldings * btcPrice;
        const allTimeReturn = totalValue - portfolioData.initialInvestment;
        const returnPercent = (allTimeReturn / portfolioData.initialInvestment) * 100;
        
        // Update DOM elements
        document.getElementById('totalValue').textContent = formatCurrency(totalValue);
        document.getElementById('btcHoldings').textContent = portfolioData.btcHoldings.toFixed(8) + ' BTC';
        document.getElementById('btcValue').textContent = formatCurrency(totalValue);
        document.getElementById('dayChange').textContent = formatCurrency(portfolioData.dayChange);
        document.getElementById('dayChangePercent').textContent = portfolioData.dayChangePercent.toFixed(2) + '%';
        document.getElementById('allTimeReturn').textContent = formatCurrency(allTimeReturn);
        document.getElementById('returnPercent').textContent = '+' + returnPercent.toFixed(2) + '%';
        
        // Update change indicators
        const dayChangeElement = document.getElementById('dayChangePercent');
        if (portfolioData.dayChangePercent >= 0) {
            dayChangeElement.classList.add('positive');
            dayChangeElement.classList.remove('negative');
        } else {
            dayChangeElement.classList.add('negative');
            dayChangeElement.classList.remove('positive');
        }
        
    } catch (error) {
        console.error('Error updating portfolio:', error);
        // Use fallback values
        document.getElementById('totalValue').textContent = formatCurrency(portfolioData.totalValue);
        document.getElementById('btcHoldings').textContent = portfolioData.btcHoldings.toFixed(8) + ' BTC';
        document.getElementById('btcValue').textContent = formatCurrency(portfolioData.totalValue);
        document.getElementById('dayChange').textContent = formatCurrency(portfolioData.dayChange);
        document.getElementById('dayChangePercent').textContent = portfolioData.dayChangePercent.toFixed(2) + '%';
    }
}

// Update Bitcoin Price Display
async function updateBitcoinPrice() {
    try {
        const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
        const data = await response.json();
        const price = data.bpi.USD.rate;
        
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement) {
            currentPriceElement.textContent = '$' + price;
        }
    } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
    }
}

// Investment Calculator
function calculateInvestment() {
    const investAmount = parseFloat(document.getElementById('investAmount').value);
    const investPeriod = parseFloat(document.getElementById('investPeriod').value);
    const returnRate = parseFloat(document.getElementById('returnRate').value);
    
    // Validate inputs
    if (!investAmount || !investPeriod || !returnRate) {
        alert('Please fill in all fields');
        return;
    }
    
    if (investAmount < 1000) {
        alert('Minimum investment amount is $1,000');
        return;
    }
    
    // Calculate compound interest
    const monthlyRate = returnRate / 100 / 12;
    const finalValue = investAmount * Math.pow(1 + monthlyRate, investPeriod);
    const profit = finalValue - investAmount;
    const profitPercent = (profit / investAmount) * 100;
    
    // Display results
    document.getElementById('resultInitial').textContent = formatCurrency(investAmount);
    document.getElementById('resultFinal').textContent = formatCurrency(finalValue);
    document.getElementById('resultProfit').textContent = formatCurrency(profit);
    document.getElementById('resultPercent').textContent = profitPercent.toFixed(2) + '%';
    
    // Show results section
    document.getElementById('calculatorResult').style.display = 'block';
    
    // Scroll to results
    document.getElementById('calculatorResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Format Currency
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the portfolio page
    if (document.getElementById('totalValue')) {
        initializePortfolio();
        
        // Update portfolio every 60 seconds
        setInterval(updatePortfolioSummary, 60000);
    }
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateInvestment,
        updatePortfolioSummary,
        formatCurrency
    };
}