let selectedPlan = null;

const plans = {
    silver: { min: 100, max: 999, roi: 15, days: 14 },
    gold: { min: 1000, max: 4999, roi: 20, days: 21 },
    diamond: { min: 5000, max: 24999, roi: 25, days: 30 }
};

firebase.auth().onAuthStateChanged(async user => {
    if (!user) location.href = "login.html";
});

function selectPlan(plan) {
    selectedPlan = plans[plan];
    document.getElementById('investmentForm').style.display = 'block';
    document.getElementById('selectedPlan').innerText =
        `${plan.toUpperCase()} PLAN — ${selectedPlan.roi}% ROI`;
}

document.getElementById('investmentForm').addEventListener('submit', async e => {
    e.preventDefault();

    const amount = Number(document.getElementById('amount').value);
    const user = firebase.auth().currentUser;
    const ref = firebase.firestore().collection('users').doc(user.uid);
    const snap = await ref.get();

    const balance = snap.data().balance;

    if (amount < selectedPlan.min || amount > selectedPlan.max) {
        alert("Amount not within plan limits");
        return;
    }

    if (amount > balance) {
        alert("Insufficient balance");
        return;
    }

    const profit = amount * (selectedPlan.roi / 100);
    const start = Date.now();
    const end = start + selectedPlan.days * 86400000;

    await ref.update({
        balance: balance - amount
    });

    await ref.collection('investments').add({
        plan: selectedPlan,
        amount,
        profit,
        start,
        end,
        status: "active"
    });

    alert("Investment successful");
    location.href = "dashboard.html";
});

await ref.collection('investments').add({
    planName: plan.toUpperCase(),
    amount,
    roiPercent: selectedPlan.roi,
    durationDays: selectedPlan.days,
    startTime: Date.now(),
    endTime: Date.now() + selectedPlan.days * 86400000,
    status: "active",
    credited: false
});
