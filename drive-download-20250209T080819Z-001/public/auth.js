document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const authForm = document.getElementById('auth-form');
    const authContainer = document.getElementById('auth-container');
    const userContainer = document.getElementById('user-container');
    const userEmail = document.getElementById('user-email');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const toggleSignup = document.getElementById('toggle-signup');
    const googleSignin = document.getElementById('google-signin');
    const facebookSignin = document.getElementById('facebook-signin');
    const signOutBtn = document.getElementById('sign-out');

    let isSignUp = false;

    // Initialize Firebase Auth
    const auth = firebase.auth();
    
    // Configuration des providers avec personnalisation
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({
        prompt: 'select_account',
        // Forcer la redirection au lieu du popup pour éviter les problèmes de cookies tiers
        display: 'redirect'
    });

    const facebookProvider = new firebase.auth.FacebookAuthProvider();
    facebookProvider.setCustomParameters({
        // Forcer la redirection au lieu du popup
        display: 'redirect',
        // Demander les permissions email et profil public
        scope: 'email,public_profile'
    });

    // Show error message
    function showError(error) {
        let message = '';
        if (typeof error === 'string') {
            message = error;
        } else {
            // Personnaliser les messages d'erreur
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'La fenêtre de connexion a été fermée. Veuillez réessayer.';
                    break;
                case 'auth/cancelled-popup-request':
                    message = 'Une seule fenêtre de connexion peut être ouverte à la fois.';
                    break;
                case 'auth/popup-blocked':
                    message = 'La fenêtre popup a été bloquée par votre navigateur. Veuillez autoriser les popups pour ce site.';
                    break;
                default:
                    message = error.message;
            }
        }
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            hideError();
        }, 5000); // Cache le message d'erreur après 5 secondes
    }

    // Hide error message
    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Toggle between sign in and sign up
    toggleSignup.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        toggleSignup.textContent = isSignUp ? 'Already have an account?' : 'Create an account';
        authForm.querySelector('button[type="submit"]').textContent = isSignUp ? 'Sign Up' : 'Sign In';
        hideError();
    });

    // Handle Email/Password authentication
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            showError(error.message);
        }
    });

    // Handle Google Sign In
    googleSignin.addEventListener('click', async () => {
        hideError();
        try {
            // Utiliser signInWithRedirect au lieu de signInWithPopup
            await auth.signInWithRedirect(googleProvider);
        } catch (error) {
            console.error('Google sign in error:', error);
            showError(error);
        }
    });

    // Ajouter une fonction de vérification de la configuration
    function checkFacebookConfig() {
        const config = firebase.app().options;
        if (!config.authDomain) {
            showError('Erreur: authDomain manquant dans la configuration Firebase');
            return false;
        }
        return true;
    }

    // Handle Facebook Sign In
    facebookSignin.addEventListener('click', async () => {
        hideError();
        try {
            if (!checkFacebookConfig()) return;
            
            // Utiliser signInWithRedirect au lieu de signInWithPopup
            await auth.signInWithRedirect(facebookProvider);
        } catch (error) {
            console.error('Facebook sign in error:', error);
            if (error.code === 'auth/invalid-app-id') {
                showError('Erreur: ID d\'application Facebook invalide. Veuillez vérifier votre configuration Firebase.');
            } else {
                showError(error);
            }
        }
    });

    // Gérer le résultat de la redirection
    auth.getRedirectResult().then((result) => {
        if (result.user) {
            console.log('Sign in successful:', result.user.email);
        }
    }).catch((error) => {
        console.error('Redirect sign in error:', error);
        showError(error);
    });

    // Handle Sign Out
    signOutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
        } catch (error) {
            showError(error.message);
        }
    });

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            userEmail.textContent = user.email;
            authContainer.classList.add('hidden');
            userContainer.classList.remove('hidden');
        } else {
            // User is signed out
            authContainer.classList.remove('hidden');
            userContainer.classList.add('hidden');
            authForm.reset();
        }
    });
});
