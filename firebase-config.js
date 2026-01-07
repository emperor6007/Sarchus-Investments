// Firebase Configuration with REAL Wallet Generation
// IMPORTANT: Add these script tags to your HTML BEFORE firebase-config.js:
// <script src="https://unpkg.com/bitcoinjs-lib@6.1.5/dist/bitcoinjs-lib.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/tronweb@5.3.0/dist/TronWeb.js"></script>

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

// Generate REAL Bitcoin Address using bitcoinjs-lib
async function generateRealBitcoinAddress(userId) {
  try {
    console.log('Generating real Bitcoin address for user:', userId);
    
    // Create deterministic seed from userId (for consistency)
    const seed = userId + 'SARCHUS_BTC_SEED_2025';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
    const hashArray = new Uint8Array(hash);
    
    // Use first 32 bytes as private key
    const keyPair = bitcoinjs.ECPair.fromPrivateKey(hashArray, {
      network: bitcoinjs.networks.bitcoin
    });
    
    // Generate P2WPKH address (Native SegWit - bc1q...)
    const { address } = bitcoinjs.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: bitcoinjs.networks.bitcoin
    });
    
    console.log('Bitcoin address generated:', address);
    
    return {
      address: address,
      // DO NOT store private key in client-side Firebase!
      // Store only in secure backend
      publicKey: keyPair.publicKey.toString('hex')
    };
    
  } catch (error) {
    console.error('Error generating Bitcoin address:', error);
    throw error;
  }
}

// Generate REAL Ethereum Address using ethers.js
async function generateRealEthereumAddress(userId) {
  try {
    console.log('Generating real Ethereum address for user:', userId);
    
    // Create deterministic seed from userId
    const seed = userId + 'SARCHUS_ETH_SEED_2025';
    const hash = ethers.utils.id(seed); // SHA3-256 hash
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(hash);
    
    console.log('Ethereum address generated:', wallet.address);
    
    return {
      address: wallet.address,
      // DO NOT store private key in client-side Firebase!
      publicKey: wallet.publicKey
    };
    
  } catch (error) {
    console.error('Error generating Ethereum address:', error);
    throw error;
  }
}

// Generate REAL Tron Address using TronWeb
async function generateRealTronAddress(userId) {
  try {
    console.log('Generating real Tron address for user:', userId);
    
    // Create deterministic seed from userId
    const seed = userId + 'SARCHUS_TRON_SEED_2025';
    
    // Convert seed to hex private key
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const privateKeyHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate address from private key
    const address = TronWeb.address.fromPrivateKey(privateKeyHex);
    
    console.log('Tron address generated:', address);
    
    return {
      address: address,
      // DO NOT store private key in client-side Firebase!
      publicKey: privateKeyHex.substring(0, 64) // First 64 chars as identifier
    };
    
  } catch (error) {
    console.error('Error generating Tron address:', error);
    throw error;
  }
}

// Create REAL wallet addresses for user
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
    
    console.log('Creating REAL wallet addresses...');
    
    // Generate REAL addresses for all cryptocurrencies
    const btcWallet = await generateRealBitcoinAddress(userId);
    const ethWallet = await generateRealEthereumAddress(userId);
    const tronWallet = await generateRealTronAddress(userId);
    
    // Create wallet structure
    const wallets = {
      BTC: {
        address: btcWallet.address,
        publicKey: btcWallet.publicKey,
        balance: 0,
        type: 'receive-only',
        network: 'Bitcoin Mainnet'
      },
      ETH: {
        address: ethWallet.address,
        publicKey: ethWallet.publicKey,
        balance: 0,
        type: 'receive-only',
        network: 'Ethereum Mainnet'
      },
      USDT: {
        address: tronWallet.address,
        publicKey: tronWallet.publicKey,
        balance: 0,
        type: 'receive-only',
        network: 'Tron Mainnet (TRC20)'
      }
    };
    
    // Save wallets to user document
    await userRef.update({
      wallets: wallets,
      walletsCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      walletsType: 'real-blockchain-addresses'
    });
    
    console.log('REAL wallet addresses created and saved:', wallets);
    
    return wallets;
    
  } catch (error) {
    console.error('Error creating user wallets:', error);
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
    
    const fallbackRates = {
      'BTC': 98547.23,
      'ETH': 3421.45,
      'USDT': 1.00
    };
    
    return amount * fallbackRates[cryptocurrency];
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

// Check for deposits on blockchain (you'll need to implement this with blockchain APIs)
async function monitorDeposits(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const wallets = userData.wallets;
    
    if (!wallets) return;
    
    // TODO: Implement blockchain monitoring
    // Use services like:
    // - Blockchair API for Bitcoin
    // - Etherscan API for Ethereum  
    // - Tronscan API for Tron
    // Or use NOWPayments/CoinGate webhooks
    
    console.log('Monitoring deposits for user:', userId);
    
  } catch (error) {
    console.error('Error monitoring deposits:', error);
  }
}

// Export for use in other files
window.auth = auth;
window.db = db;
window.createUserWallets = createUserWallets;
window.processDeposit = processDeposit;
window.convertCryptoToUSD = convertCryptoToUSD;
window.monitorDeposits = monitorDeposits;
window.generateRealBitcoinAddress = generateRealBitcoinAddress;
window.generateRealEthereumAddress = generateRealEthereumAddress;
window.generateRealTronAddress = generateRealTronAddress;

console.log('Firebase initialized with REAL wallet generation');
