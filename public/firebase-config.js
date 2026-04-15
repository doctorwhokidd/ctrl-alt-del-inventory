// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5M8ALX8T48jb15VRTSp4F_9Y0_RXiExE",
  authDomain: "ender-lilies-api.firebaseapp.com",
  projectId: "ender-lilies-api",
  storageBucket: "ender-lilies-api.firebasestorage.app",
  messagingSenderId: "511479857369",
  appId: "1:511479857369:web:c0d9727977f63096f4bec8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

window.firebaseAuth = auth;
window.firebaseDb = db;