// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4epaAtKaoiJ476C9xf8naku4v34wiDjs",
  authDomain: "firsttest-8a6d1.firebaseapp.com",
  projectId: "firsttest-8a6d1",
  storageBucket: "firsttest-8a6d1.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}


