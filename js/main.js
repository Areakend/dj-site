// Encapsulate in IIFE to avoid polluting global scope (though we consume globals)
(function () {
    // --- Dependencies ---
    // Ensure scripts are loaded in order in HTML
    const Data = window.DJData;
    const UI = window.DJUI;

    if (!Data || !UI) {
        console.error("DJ App Error: Dependencies not loaded. Check script tags.");
        return;
    }

    // --- DOM Elements ---
    const bubbleContainer = document.getElementById('bubbleContainer');
    const searchInput = document.getElementById('searchInput');
    const trendingList = document.getElementById('trendingList');
    const nowPlayingContainer = document.getElementById('nowPlayingContainer');

    // --- Handlers ---

    function updateView(songs, currentPlaying) {
        // Use local state if not passed
        const playing = currentPlaying || Data.getCurrentPlaying();

        // Update Now Playing (Global)
        if (nowPlayingContainer) {
            UI.renderNowPlaying(nowPlayingContainer, playing);
        }

        // If we are on Display Page (Bubble Container exists)
        if (bubbleContainer) {
            const topSongs = Data.getTopSongs();
            UI.renderBubbles(bubbleContainer, topSongs, null, handlePlay);
        }

        // If we are on Vote Page (Trending List exists)
        if (trendingList) {
            const genreSelect = document.getElementById('genreSelect');
            const genre = genreSelect ? genreSelect.value : 'All';
            const query = searchInput ? searchInput.value : '';

            if (genre === 'All' && query === '') {
                UI.renderList(trendingList, Data.getTopSongs(10), "Current Top 10", handleVote, handleUnvote);
            } else {
                const results = Data.searchSongs(query, genre).sort((a, b) => b.votes - a.votes);
                const title = genre !== 'All' ? `All ${genre} Songs` : "Search Results";
                UI.renderList(trendingList, results, title, handleVote, handleUnvote);
            }
        }
    }

    function handlePlay(id) {
        const success = Data.playSong(id);
        if (success) updateView();
    }

    function handleVote(id) {
        console.log("Voting for song:", id);
        Data.voteForSong(id).then(success => {
            console.log("Vote result:", success);
            if (success) updateView();
        }).catch(err => {
            console.error("Vote error:", err);
        });
    }

    function handleUnvote(id) {
        console.log("Unvoting for song:", id);
        Data.unvoteForSong(id).then(success => {
            console.log("Unvote result:", success);
            if (success) updateView();
        }).catch(err => {
            console.error("Unvote error:", err);
        });
    }

    // --- Handlers ---
    // Defined inside scope to access elements

    let searchTimeout = null;
    function handleSearch(e) {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            updateView();
        }, 300);
    }

    // --- initialization ---

    function setupAuthListeners() {
        const authBtn = document.getElementById('authBtn');
        const googleBtn = document.getElementById('googleLoginBtn');
        const authOverlay = document.getElementById('authOverlay');

        if (authBtn) {
            authBtn.addEventListener('click', () => {
                if (window.DJAuth.getUser()) window.DJAuth.logout();
                else authOverlay.classList.add('visible');
            });
        }

        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                await window.DJAuth.login();
                authOverlay.classList.remove('visible');
                updateView();
            });
        }

        if (authOverlay) {
            authOverlay.addEventListener('click', (e) => {
                if (e.target === authOverlay) authOverlay.classList.remove('visible');
            });
        }
    }

    let genresLoaded = false;
    function setupSearchListeners() {
        const genreSelect = document.getElementById('genreSelect');
        if (genreSelect && !genresLoaded) {
            const genres = Data.getGenres();
            if (genres.length > 0) {
                // Clear existing options except the first one ("All Genres")
                while (genreSelect.options.length > 1) {
                    genreSelect.remove(1);
                }
                genres.forEach(g => {
                    // Skip if the genre is named "All" (case insensitive) to avoid duplication with "All Genres"
                    if (g.toLowerCase() === 'all') return;
                    
                    const opt = document.createElement('option');
                    opt.value = g;
                    opt.textContent = g;
                    genreSelect.appendChild(opt);
                });
                genresLoaded = true;
            }
            // Always attach the listener once
            if (!genreSelect.dataset.listenerAttached) {
                genreSelect.addEventListener('change', handleSearch);
                genreSelect.dataset.listenerAttached = "true";
            }
        }

        if (searchInput) {
            if (!searchInput.dataset.listenerAttached) {
                searchInput.addEventListener('input', handleSearch);
                searchInput.addEventListener('focus', handleSearch);
                searchInput.dataset.listenerAttached = "true";
            }
        }
    }

    function setupDebugListeners() {
        const btnRandom = document.getElementById('btnRandomVotes');
        const btnReset = document.getElementById('btnResetVotes');
        if (btnRandom) btnRandom.addEventListener('click', () => Data.simulateRandomVotes());
        if (btnReset) btnReset.addEventListener('click', () => Data.resetAllVotes());
    }

    // --- initialization ---

    function init() {
        // Init Auth
        if (window.DJAuth) {
            window.DJAuth.init(window.firebaseApp);
        }

        // Subscribe to data updates
        Data.subscribe((updatedSongs, currentPlaying) => {
            setupSearchListeners(); // Re-populate genres if they just loaded
            updateView(updatedSongs, currentPlaying);
        });

        // Setup UI Listeners
        setupAuthListeners();
        setupSearchListeners();
        setupDebugListeners();

        updateView();
    }

    // Export updateView for Auth module
    window.updateView = updateView;
    init();
})();
