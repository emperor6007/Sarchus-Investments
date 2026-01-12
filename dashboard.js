// ================= DASHBOARD.JS — STABLE FINAL VERSION =================

let dashboardInitialized = false;
let profitUpdateInterval = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('dashboard.html')) return;

    const check = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(check);
            initializeDashboard();
        }
    }, 100);
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

            // 1️⃣ Load user
            let userDoc = await userRef.get();
            if (!userDoc.exists) return alert('User data missing');

            currentUser = { uid: user.uid, ...userDoc.data() };

            // 2️⃣ Process matured investments
            await processMaturedInvestments(user.uid);

            // 3️⃣ Reload user AFTER credit
            userDoc = await userRef.get();
            currentUser = { uid: user.uid, ...userDoc.data() };

            // 4️⃣ Render UI
            updateDashboardUI(currentUser);
            startProfitSimulation(user.uid);
            loadRecentTransactions(user.uid);

            dashboardInitialized = true;

        } catch (err) {
            console.error('Dashboard init failed:', err);
        }
    });
}

// ================= PROCESS MATURED INVESTMENTS =================
async function processMaturedInvestments(uid) {
    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    const now = Date.now();

    for (const doc of snap.docs) {
        const inv = doc.data();
        if (now >= inv.endTime && !inv.credited) {
            const profit = inv.amount * (inv.roiPercent / 100);
            await completeInvestment(uid, doc.id, inv, profit);
        }
    }
}

// ================= UI UPDATE =================
function updateDashboardUI(user) {
    document.querySelectorAll('#userName').forEach(el => {
        el.textContent = user.firstName || 'User';
    });
    updateDashboardData(user);
}

// ================= DASHBOARD DATA =================
async function updateDashboardData(user) {
    try {
        const totals = await calculateLockedFunds(user.uid);
        const totalBalance = (user.balance || 0) + totals.amount;

        safeSet('availableBalance', formatCurrency(user.balance || 0));
        safeSet('totalBalance', formatCurrency(totalBalance));
        safeSet('totalInvestments', formatCurrency(totals.amount));
        safeSet('activeInvestmentsCount',
            totals.count ? `${totals.count} active investment(s)` : 'No locked funds'
        );

        await loadActiveInvestments(user.uid);

    } catch (err) {
        console.error('Dashboard data error:', err);
    }
}

// ================= LOCKED FUNDS =================
async function calculateLockedFunds(uid) {
    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    let total = 0;
    snap.forEach(d => total += d.data().amount || 0);

    return { amount: total, count: snap.size };
}

// ================= PROFIT SIMULATION =================
function startProfitSimulation(uid) {
    if (profitUpdateInterval) clearInterval(profitUpdateInterval);
    profitUpdateInterval = setInterval(() => calculateLiveProfit(uid), 10000);
    calculateLiveProfit(uid);
}

async function calculateLiveProfit(uid) {
    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    let liveProfit = 0;
    const now = Date.now();

    snap.forEach(doc => {
        const inv = doc.data();
        const duration = inv.endTime - inv.startTime;
        const elapsed = Math.min(now - inv.startTime, duration);
        liveProfit += (elapsed / duration) * (inv.amount * inv.roiPercent / 100);
    });

    safeSet('totalProfit', '+' + formatCurrency(liveProfit));
}

// ================= LOAD INVESTMENTS =================
async function loadActiveInvestments(uid) {
    const box = document.getElementById('investmentList');
    if (!box) return;

    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .orderBy('startTime', 'desc')
        .get();

    box.innerHTML = '';
    snap.forEach(doc => {
        const i = doc.data();
        const completed = i.status === 'completed';

        box.innerHTML += `
        <div class="investment-card ${completed ? 'completed' : 'active'}">
            <h4>${i.planName} Plan</h4>
            <p>Status: ${completed ? 'Completed' : 'Active'}</p>
            <p>Amount: ${formatCurrency(i.amount)}</p>
            <p>ROI: ${i.roiPercent}%</p>
        </div>`;
    });
}

// ================= COMPLETE INVESTMENT =================
async function completeInvestment(uid, id, inv, profit) {
    const userRef = firebase.firestore().collection('users').doc(uid);

    await userRef.update({
        balance: firebase.firestore.FieldValue.increment(inv.amount + profit),
        totalProfit: firebase.firestore.FieldValue.increment(profit)
    });

    await userRef.collection('investments').doc(id).update({
        status: 'completed',
        credited: true,
        completedAt: Date.now()
    });

    await userRef.collection('transactions').add({
        type: 'investment_maturity',
        amount: inv.amount + profit,
        profit,
        date: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ================= TRANSACTIONS =================
async function loadRecentTransactions(uid) {
    const box = document.getElementById('recentTransactions');
    if (!box) return;

    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('transactions')
        .orderBy('date', 'desc')
        .limit(5)
        .get();

    box.innerHTML = '';
    snap.forEach(d => {
        const t = d.data();
        box.innerHTML += `<div>${t.type} — ${formatCurrency(t.amount)}</div>`;
    });
}

// ================= LOGOUT (FIXED) =================
function handleDashboardLogout() {
    if (profitUpdateInterval) clearInterval(profitUpdateInterval);
    firebase.auth().signOut().then(() => {
        window.location.href = 'login.html';
    });
}
window.handleDashboardLogout = handleDashboardLogout;

// ================= UTIL =================
function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

console.log('✅ Dashboard loaded — STABLE VERSION');
