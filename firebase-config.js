// Enhanced Firebase Configuration with Wallet Management

const firebaseConfig = {
  apiKey: "AIzaSyB_jAU2QLvl9hm2hWgqYU-N7XuxHr7JnT4",
  authDomain: "equity-finance.firebaseapp.com",
  projectId: "equity-finance",
  storageBucket: "equity-finance.firebasestorage.app",
  messagingSenderId: "299540341342",
  appId: "1:299540341342:web:107b759b72bad8da788acf",
  measurementId: "G-JJ70T5WSVY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Main wallet addresses (REPLACE WITH YOUR ACTUAL ADDRESSES)
const MAIN_WALLETS = {
  BTC: 'bc1q0wa4efcyfcpwsl8jfqww5emhdzgv4d64lgceem',
  ETH: '0xa7550Db929E8501f8c85e02cB70692652c1675Ab',
  USDT: 'TXC1MnuVbnr2yFETFxdEm1VmUUYhCA5xiQ'
};

// Generate unique user wallet address (deterministic)
function generateUserWalletAddress(userId, cryptocurrency) {
  // Create a deterministic hash from userId and crypto
  const hash = btoa(userId + cryptocurrency).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  
  switch(cryptocurrency) {
    case 'BTC':
      // Bitcoin address format (simplified for demo - use proper derivation in production)
      return 'bc1q' + hash.toLowerCase().substring(0, 39);
    case 'ETH':
      // Ethereum address format
      return '0x' + hash.substring(0, 40);
    case 'USDT':
      // Tron address format
      return 'T' + hash.substring(0, 33);
    default:
      return MAIN_WALLETS[cryptocurrency];
  }
}

// Create or get user wallet addresses
async function createUserWallets(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Check if user already has wallets
      if (userData.wallets) {
        console.log('User wallets already exist');
        return userData.wallets;
      }
    }
    
    // Generate new wallet addresses
    const wallets = {
      BTC: {
        address: generateUserWalletAddress(userId, 'BTC'),
        mainWallet: MAIN_WALLETS.BTC,
        balance: 0
      },
      ETH: {
        address: generateUserWalletAddress(userId, 'ETH'),
        mainWallet: MAIN_WALLETS.ETH,
        balance: 0
      },
      USDT: {
        address: generateUserWalletAddress(userId, 'USDT'),
        mainWallet: MAIN_WALLETS.USDT,
        balance: 0
      }
    };
    
    // Save wallets to user document
    await userRef.update({
      wallets: wallets,
      walletsCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('User wallets created:', wallets);
    return wallets;
    
  } catch (error) {
    console.error('Error creating user wallets:', error);
    throw error;
  }
}

// Simulate deposit detection (In production, use blockchain APIs or webhooks)
async function checkForDeposits(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('User not found');
      return;
    }
    
    const userData = userDoc.data();
    const wallets = userData.wallets;
    
    if (!wallets) {
      console.log('No wallets found for user');
      return;
    }
    
    // Check for pending deposits in Firestore
    const pendingDeposits = await db.collection('pendingDeposits')
      .where('userId', '==', userId)
      .where('processed', '==', false)
      .get();
    
    for (const doc of pendingDeposits.docs) {
      const deposit = doc.data();
      await processDeposit(userId, doc.id, deposit);
    }
    
  } catch (error) {
    console.error('Error checking deposits:', error);
  }
}

// Process detected deposit
async function processDeposit(userId, depositId, depositData) {
  try {
    const { cryptocurrency, amount, transactionHash } = depositData;
    
    console.log(`Processing deposit: ${amount} ${cryptocurrency} for user ${userId}`);
    
    const userRef = db.collection('users').doc(userId);
    
    // Get current exchange rate
    const usdAmount = await convertCryptoToUSD(cryptocurrency, amount);
    
    // Credit user account
    await userRef.update({
      balance: firebase.firestore.FieldValue.increment(usdAmount),
      [`wallets.${cryptocurrency}.balance`]: firebase.firestore.FieldValue.increment(amount)
    });
    
    // Create transaction record
    await userRef.collection('transactions').add({
      type: 'deposit',
      cryptocurrency: cryptocurrency,
      cryptoAmount: amount,
      usdAmount: usdAmount,
      transactionHash: transactionHash || 'N/A',
      status: 'completed',
      date: firebase.firestore.FieldValue.serverTimestamp(),
      processedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mark deposit as processed
    await db.collection('pendingDeposits').doc(depositId).update({
      processed: true,
      processedAt: firebase.firestore.FieldValue.serverTimestamp(),
      creditedAmount: usdAmount
    });
    
    console.log(`Deposit processed successfully: $${usdAmount}`);
    
    return {
      success: true,
      amount: usdAmount
    };
    
  } catch (error) {
    console.error('Error processing deposit:', error);
    throw error;
  }
}

// Convert cryptocurrency to USD
async function convertCryptoToUSD(cryptocurrency, amount) {
  try {
    const cryptoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether'
    };
    
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds[cryptocurrency]}&vs_currencies=usd`);
    
    if (response.ok) {
      const data = await response.json();
      const rate = data[cryptoIds[cryptocurrency]].usd;
      return amount * rate;
    }
    
    // Fallback rates if API fails
    const fallbackRates = {
      'BTC': 98547.23,
      'ETH': 3421.45,
      'USDT': 1.00
    };
    
    return amount * fallbackRates[cryptocurrency];
    
  } catch (error) {
    console.error('Error converting crypto to USD:', error);
    
    // Use fallback rates
    const fallbackRates = {
      'BTC': 98547.23,
      'ETH': 3421.45,
      'USDT': 1.00
    };
    
    return amount * fallbackRates[cryptocurrency];
  }
}

// Admin function to manually credit deposit
async function manualCreditDeposit(userId, cryptocurrency, amount, transactionHash) {
  try {
    console.log(`Manual deposit credit: ${amount} ${cryptocurrency} for user ${userId}`);
    
    const depositData = {
      userId: userId,
      cryptocurrency: cryptocurrency,
      amount: amount,
      transactionHash: transactionHash || 'Manual Credit',
      processed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      method: 'manual'
    };
    
    // Create pending deposit
    const depositRef = await db.collection('pendingDeposits').add(depositData);
    
    // Process immediately
    await processDeposit(userId, depositRef.id, depositData);
    
    console.log('Manual deposit credited successfully');
    
    return {
      success: true,
      depositId: depositRef.id
    };
    
  } catch (error) {
    console.error('Error with manual deposit:', error);
    throw error;
  }
}

// Export for use in other files
window.auth = auth;
window.db = db;
window.MAIN_WALLETS = MAIN_WALLETS;
window.createUserWallets = createUserWallets;
window.checkForDeposits = checkForDeposits;
window.processDeposit = processDeposit;
window.convertCryptoToUSD = convertCryptoToUSD;
window.manualCreditDeposit = manualCreditDeposit;
window.generateUserWalletAddress = generateUserWalletAddress;

console.log('Firebase initialized with wallet system');
