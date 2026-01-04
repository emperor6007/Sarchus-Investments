// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Export for use in other files
window.auth = auth;
window.db = db;

console.log('Firebase initialized successfully');