// Fixed Firebase Configuration - Simplified Deposit System

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
if (!firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Main wallet addresses (same for all users)
const MAIN_WALLETS = {
  BTC: 'bc1q0wa4efcyfcpwsl8jfqww5emhdzgv4d64lgceem',
  ETH: '0xa7550Db929E8501f8c85e02cB70692652c1675Ab',
  USDT: 'TXC1MnuVbnr2yFETFxdEm1VmUUYhCA5xiQ'
};

// Store main wallets globally for access in other files
window.MAIN_WALLETS = MAIN_WALLETS;

// Convert cryptocurrency to USD
async function convertCryptoToUSD(cryptocurrency, amount) {
  try {
    const cryptoIds = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether'
    };
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds[cryptocurrency]}&vs_currencies=usd`
    );
    
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
    
    const fallbackRates = {
      'BTC': 98547.23,
      'ETH': 3421.45,
      'USDT': 1.00
    };
    
    return amount * fallbackRates[cryptocurrency];
  }
}

// Export for use in other files
window.auth = auth;
window.db = db;
window.convertCryptoToUSD = convertCryptoToUSD;

console.log('Firebase initialized with simplified deposit system');
console.log('Main wallets:', MAIN_WALLETS);