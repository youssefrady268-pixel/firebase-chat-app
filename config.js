// Firebase Configuration
// Replace with your Firebase project credentials

const firebaseConfig = {
    apiKey: "AIzaSyBeRFiED1MQMJUrqDCL3c0DBBLQuc5qa0U",
    authDomain: "mypppphfgg.firebaseapp.com",
    databaseURL: "https://mypppphfgg-default-rtdb.firebaseio.com",
    projectId: "mypppphfgg",
    storageBucket: "mypppphfgg.firebasestorage.app",
    messagingSenderId: "77043426990",
    appId: "1:77043426990:web:1578509034f7bbc38b869",
    measurementId: "G-DZ1ROTMV53"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Get Firebase services
const auth = firebase.auth(app);
const database = firebase.database(app);

// Set Firebase persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error("Persistence error:", error);
    });

console.log("Firebase initialized successfully!");
