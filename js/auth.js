// Firebase Auth Module
(function (global) {
    let auth = null;
    let currentUser = null;

    // --- Private Methods ---

    function onAuthStateChanged(user) {
        currentUser = user;
        console.log("Auth: User state changed", user ? user.email : "Logged out");

        // Notify app of auth change
        if (global.DJData && global.DJData.handleAuthChange) {
            global.DJData.handleAuthChange(user);
        }

        // Trigger UI update if main is ready
        if (global.updateView) {
            global.updateView();
        }
    }

    // --- Public API ---

    global.DJAuth = {
        init: function (firebaseApp) {
            const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged: fbOnAuthStateChanged } = global.firebaseAuth;
            auth = getAuth(firebaseApp);

            fbOnAuthStateChanged(auth, onAuthStateChanged);
        },

        login: async function () {
            console.log("Auth: Initiating Google Login...");
            const { GoogleAuthProvider, signInWithPopup } = global.firebaseAuth;
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                console.log("Auth: Login successful for", result.user.email);
                return result.user;
            } catch (error) {
                console.error("Auth: Login failed", error);
                const errorDiv = document.getElementById('authError');
                if (errorDiv) {
                    errorDiv.textContent = `Error: ${error.code} - ${error.message}`;
                    errorDiv.style.display = 'block';
                }
                throw error;
            }
        },

        logout: async function () {
            const { signOut } = global.firebaseAuth;
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Auth: Logout failed", error);
            }
        },

        getUser: () => currentUser,

        isAdmin: function () {
            if (!currentUser) return false;
            // Add your admin emails here
            const adminEmails = ['raphael.ohanian@telecomnancy.net']; // Replace with your actual email
            return adminEmails.includes(currentUser.email);
        }
    };

})(window);
