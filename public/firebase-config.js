// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyD5M8ALX8T48jb15VRTSp4F_9Y0_RXiExE",
  authDomain: "ender-lilies-api.firebaseapp.com",
  projectId: "ender-lilies-api",
  storageBucket: "ender-lilies-api.appspot.com", // corrected
  messagingSenderId: "511479857369",
  appId: "1:511479857369:web:c0d9727977f63096f4bec8",
  databaseURL: "https://ender-lilies-api-default-rtdb.firebaseio.com" // add this for Realtime DB
};

// Initialize Firebase (compat style)
firebase.initializeApp(firebaseConfig);

// Make services available globally
window.firebaseAuth = firebase.auth();
window.firebaseDb   = firebase.database();



// import { initializeApp } from "firebase/app";
// import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
// import { getDatabase, ref, set } from "firebase/database";

// const firebaseConfig = {
//   apiKey: "AIzaSyD5M8ALX8T48jb15VRTSp4F_9Y0_RXiExE",
//   authDomain: "ender-lilies-api.firebaseapp.com",
//   projectId: "ender-lilies-api",
//   storageBucket: "ender-lilies-api.appspot.com",
//   messagingSenderId: "511479857369",
//   appId: "1:511479857369:web:c0d9727977f63096f4bec8"
// };

// // ✅ Initialize Firebase once
// const app = initializeApp(firebaseConfig);

// // ✅ Services
// const auth = getAuth(app);
// const db = getDatabase(app);

// // Example login with demo account
// signInWithEmailAndPassword(auth, "bob@mail.com", "bobpass")
//   .then((userCredential) => {
//     console.log("Logged in:", userCredential.user);
//   })
//   .catch((error) => {
//     console.error("Login failed:", error.message);
//   });






// //New Addition:
// import { initializeApp } from "firebase/app";
// import { getDatabase, ref, set } from "firebase/database";
// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyD5M8ALX8T48jb15VRTSp4F_9Y0_RXiExE",
//   authDomain: "ender-lilies-api.firebaseapp.com",
//   projectId: "ender-lilies-api",
//   storageBucket: "ender-lilies-api.firebasestorage.app", //what was there before - ender-lilies-api.firebasestorage.app
//   messagingSenderId: "511479857369",
//   appId: "1:511479857369:web:c0d9727977f63096f4bec8"
// };

// // Initialize Firebase
// firebase.initializeApp(firebaseConfig);

// // Initialize services
// const auth = firebase.auth();
// const db = firebase.firestore();

// window.firebaseAuth = auth;
// window.firebaseDb = db;

// //new addition:
// const app = intializeApp(firebaseConfig);
// const db = getDatabase();
// const reference = ref(db, 'users/' + userId);

// set(reference, {
//   username: name,
//   email: email,
//   password: password;
// });