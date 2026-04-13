// Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "ender-lilies-api.firebaseapp.com",
  projectId: "ender-lilies-api",
  storageBucket: "ender-lilies-api.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();