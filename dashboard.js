// ================= DASHBOARD.JS (FINAL FIXED VERSION) =================

let dashboardInitialized = false;
let profitUpdateInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                clearInterval(checkAuth);
                initializeDashboard();
            }
        }, 100);
    }
});

// ================= INITIALIZE DASHBOARD =================
function initializeDashboard() {
    if (dashboardInitialized) return;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userRef = firebase.firestore().collection('users').doc(user.uid);

            // Load user
            let userDoc = await userRef.get();
            if (!userDoc.exists) {
                alert('User data not found');
                return;
            }

            window.currentUser = { uid: user.uid, ...userDoc.data() };

            // 🔥 PROCESS MATURITY
            await processMaturedInvestments(user.uid);

            // 🔥 RELOAD USER AFTER CREDIT (CRITICAL FIX)
            userDoc = await userRef.get();
            window.currentUser = { uid: user.uid, ...userDoc.data() };

            updateDashboardUI(window.currentUser);
            startProfitSimulation(user.uid);
            loadRecentTransactions(user.uid);

            dashboardInitialized = true;

        } catch (error) {
            console.error('Dashboard init error:', error);
        }
    });
}

// ================= PROCESS MATURED INVESTMENTS =================
async function processMaturedInvestments(uid) {
    const snapshot = await firebase.firestore()
        .collection('users')
        .doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    const now = Date.now();

    for (const doc of snapshot.docs) {
        const investment = doc.data();

        if (now >= investment.endTime && !investment.credited) {
            const profit = investment.amount * (investment.roiPercent / 100);
            await completeInvestment(uid, doc.id, investment, profit, false);
        }
    }
}

// ================= DASHBOARD UI =================
function updateDashboardUI(user) {
    document.querySelectorAll('#userName').forEach(el => {
        el.textContent = user.firstName || 'User';
    });

    updateDashboardData(user);
}

// ================= DASHBOARD DATA =================
async function updateDashboardData(user) {
    const totals = await calculateTotalInvestments(user.uid);
    const totalBalance = (user.balance || 0) + totals.totalAmount;

    const availableBalanceEl = document.getElementById('availableBalance');
    if (availableBalanceEl) {
        availableBalanceEl.textContent = formatCurrency(user.balance || 0);
    }

    const totalBalanceEl = document.getElementById('totalBalance');
    if (totalBalanceEl) {
        totalBalanceEl.textContent = formatCurrency(totalBalance);
    }

    const totalInvestmentsEl = document.getElementById('totalInvestments');
    if (totalInvestmentsEl) {
        totalInvestmentsEl.textContent = formatCurrency(totals.totalAmount);
    }

    await loadActiveInvestments(user.uid);
}

// ================= CALCULATE LOCKED INVESTMENTS =================
async function calculateTotalInvestments(uid) {
    const snapshot = await firebase.firestore()
        .collection('users')
        .doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    let total = 0;
    snapshot.forEach(doc => total += doc.data().amount || 0);

    return {
        totalAmount: total,
        activeCount: snapshot.size
    };
}

// ================= PROFIT SIMULATION =================
function startProfitSimulation(uid) {
    if (profitUpdateInterval) clearInterval(profitUpdateInterval);
    calculateLiveProfits(uid);
    profitUpdateInterval = setInterval(() => calculateLiveProfits(uid), 10000);
}

async function calculateLiveProfits(uid) {
    const snapshot = await firebase.firestore()
        .collection('users')
        .doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    const now = Date.now();
    let totalLiveProfit = 0;

    for (const doc of snapshot.docs) {
        const inv = doc.data();
        const duration = inv.endTime - inv.startTime;
        const elapsed = Math.min(now - inv.startTime, duration);
        const profit = (elapsed / duration) * (inv.amount * inv.roiPercent / 100);
        totalLiveProfit += profit;
    }

    const totalProfitEl = document.getElementById('totalProfit');
    if (totalProfitEl) {
        totalProfitEl.textContent = '+' + formatCurrency(totalLiveProfit);
    }
}

// ================= LOAD INVESTMENTS =================
async function loadActiveInvestments(uid) {
    const list = document.getElementById('investmentList');
    if (!list) return;

    const snapshot = await firebase.firestore()
        .collection('users')
        .doc(uid)
        .collection('investments')
        .orderBy('startTime', 'desc')
        .get();

    list.innerHTML = '';
    const now = Date.now();

    snapshot.forEach(doc => {
        const inv = doc.data();
        const completed = inv.status === 'completed';

        const duration = inv.endTime - inv.startTime;
        const elapsed = Math.min(now - inv.startTime, duration);
        const progress = Math.min((elapsed / duration) * 100, 100);

        list.innerHTML += `
        <div class="investment-card ${completed ? 'completed' : 'active'}">
            <h4>${inv.planName} Plan</h4>
            <p>Status: ${completed ? 'Completed' : 'Active'}</p>
            <p>Amount: ${formatCurrency(inv.amount)}</p>
            <p>ROI: ${inv.roiPercent}%</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${progress}%"></div>
            </div>
        </div>`;
    });
}

// ================= COMPLETE INVESTMENT =================
async function completeInvestment(uid, investmentId, investment, profit, refreshUI = true) {
    const userRef = firebase.firestore().collection('users').doc(uid);
    const invRef = userRef.collection('investments').doc(investmentId);

    const payout = investment.amount + profit;

    await userRef.update({
        balance: firebase.firestore.FieldValue.increment(payout),
        totalProfit: firebase.firestore.FieldValue.increment(profit)
    });

    await invRef.update({
        status: 'completed',
        credited: true,
        completedAt: Date.now()
    });

    await userRef.collection('transactions').add({
        type: 'investment_maturity',
        amount: payout,
        profit: profit,
        status: 'completed',
        date: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (refreshUI) {
        const updatedUser = await userRef.get();
        window.currentUser = { uid, ...updatedUser.data() };
        updateDashboardData(window.currentUser);
        loadRecentTransactions(uid);
    }
}

// ================= TRANSACTIONS =================
async function loadRecentTransactions(uid) {
    const box = document.getElementById('recentTransactions');
    if (!box) return;

    const snap = await firebase.firestore()
        .collection('users')
        .doc(uid)
        .collection('transactions')
        .orderBy('date', 'desc')
        .limit(5)
        .get();

    box.innerHTML = '';
    snap.forEach(doc => {
        const t = doc.data();
        box.innerHTML += `<div>${t.type} — ${formatCurrency(t.amount)}</div>`;
    });
}

// ================= UTIL =================
function formatCurrency(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

console.log('✅ Dashboard.js loaded — FINAL FIX');
