// ================= DASHBOARD.JS — FINAL DEFINITIVE FIX =================

let dashboardInitialized = false;
let profitUpdateInterval = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!location.pathname.includes('dashboard.html')) return;

    const wait = setInterval(() => {
        if (window.firebase && firebase.auth && firebase.firestore) {
            clearInterval(wait);
            initializeDashboard();
        }
    }, 100);
});

// ================= INITIALIZE DASHBOARD =================
function initializeDashboard() {
    if (dashboardInitialized) return;

    firebase.auth().onAuthStateChanged(async (authUser) => {
        if (!authUser) {
            location.href = 'login.html';
            return;
        }

        try {
            const userRef = firebase.firestore().collection('users').doc(authUser.uid);

            // 1️⃣ LOAD USER SAFELY
            await reloadUser(userRef, authUser.uid);

            // 2️⃣ PROCESS MATURED INVESTMENTS
            await processMaturedInvestments(authUser.uid);

            // 3️⃣ RELOAD USER AFTER CREDIT (CRITICAL)
            await reloadUser(userRef, authUser.uid);

            // 4️⃣ RENDER UI
            updateDashboardUI();
            startProfitSimulation(authUser.uid);
            loadRecentTransactions(authUser.uid);

            dashboardInitialized = true;

        } catch (err) {
            console.error('Dashboard init failed:', err);
        }
    });
}

// ================= SAFE USER RELOAD =================
async function reloadUser(userRef, uid) {
    const snap = await userRef.get();
    if (!snap.exists) throw new Error('User document missing');

    const data = snap.data();

    // 🔐 NORMALIZE — NEVER ALLOW UNDEFINED
    currentUser = {
        uid,
        balance: Number(data.balance || 0),
        totalProfit: Number(data.totalProfit || 0),
        firstName: data.firstName || 'User'
    };
}

// ================= PROCESS MATURED INVESTMENTS =================
async function processMaturedInvestments(uid) {
    const invSnap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    const now = Date.now();

    for (const doc of invSnap.docs) {
        const inv = doc.data();

        if (now >= inv.endTime && !inv.credited) {
            const profit = inv.amount * (inv.roiPercent / 100);
            await creditInvestment(uid, doc.id, inv, profit);
        }
    }
}

// ================= CREDIT INVESTMENT =================
async function creditInvestment(uid, invId, inv, profit) {
    const userRef = firebase.firestore().collection('users').doc(uid);

    await userRef.update({
        balance: firebase.firestore.FieldValue.increment(inv.amount + profit),
        totalProfit: firebase.firestore.FieldValue.increment(profit)
    });

    await userRef.collection('investments').doc(invId).update({
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

// ================= DASHBOARD UI =================
function updateDashboardUI() {
    document.querySelectorAll('#userName').forEach(el => {
        el.textContent = currentUser.firstName;
    });

    updateBalances();
    loadActiveInvestments(currentUser.uid);
}

// ================= UPDATE BALANCES =================
async function updateBalances() {
    const locked = await calculateLockedFunds(currentUser.uid);
    const total = currentUser.balance + locked.amount;

    safeSet('availableBalance', formatCurrency(currentUser.balance));
    safeSet('totalBalance', formatCurrency(total));
    safeSet('totalInvestments', formatCurrency(locked.amount));
    safeSet(
        'activeInvestmentsCount',
        locked.count ? `${locked.count} active investment(s)` : 'No locked funds'
    );
}

// ================= LOCKED FUNDS =================
async function calculateLockedFunds(uid) {
    const snap = await firebase.firestore()
        .collection('users').doc(uid)
        .collection('investments')
        .where('status', '==', 'active')
        .get();

    let amount = 0;
    snap.forEach(d => amount += Number(d.data().amount || 0));

    return { amount, count: snap.size };
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

    let live = 0;
    const now = Date.now();

    snap.forEach(doc => {
        const i = doc.data();
        const dur = i.endTime - i.startTime;
        const el = Math.min(now - i.startTime, dur);
        live += (el / dur) * (i.amount * i.roiPercent / 100);
    });

    safeSet('totalProfit', '+' + formatCurrency(live));
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
    snap.forEach(d => {
        const i = d.data();
        box.innerHTML += `
        <div class="investment-card ${i.status}">
            <h4>${i.planName} Plan</h4>
            <p>Status: ${i.status}</p>
            <p>Amount: ${formatCurrency(i.amount)}</p>
            <p>ROI: ${i.roiPercent}%</p>
        </div>`;
    });
}

// ================= LOGOUT =================
function handleDashboardLogout() {
    if (profitUpdateInterval) clearInterval(profitUpdateInterval);
    firebase.auth().signOut().then(() => location.href = 'login.html');
}
window.handleDashboardLogout = handleDashboardLogout;

// ================= UTIL =================
function safeSet(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

console.log('✅ Dashboard.js — FINAL DEFINITIVE FIX LOADED');
