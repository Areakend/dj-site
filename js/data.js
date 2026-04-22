(function (global) {
    const channel = new BroadcastChannel('dj-voting-sync');
    const subscribers = [];
    let db = null;

    // --- State ---
    let songs = [];
    let currentPlaying = null;
    let userVoteIds = {}; // Map of song IDs this user voted for: { songId: timestamp }
    let userVotesUnsubscribe = null; // Store the unsubscribe function

    // Load votes from localStorage on init
    try {
        const savedVotes = localStorage.getItem('dj_user_votes');
        if (savedVotes) {
            userVoteIds = JSON.parse(savedVotes);
            console.log("Data: Loaded", Object.keys(userVoteIds).length, "votes from localStorage");
        }
    } catch (err) {
        console.warn("Data: Failed to load votes from localStorage:", err);
    }

    // --- Initialization ---
    function init() {
        console.log("Data: init() called");

        // Init Firestore
        if (global.firebaseApp) {
            db = global.firebaseApp.firestore();
            
            // Fetch initial song list from Firestore if available
            db.collection('votes').doc('song_list').get().then(doc => {
                if (doc.exists && doc.data().songs) {
                    console.log("Data: Loaded", doc.data().songs.length, "songs from Firestore");
                    songs = doc.data().songs.map(s => ({ ...s, votes: 0 }));
                    setupFirestoreSync();
                    notifySubscribers();
                } else {
                    console.log("Data: No song_list found in Firestore, falling back to local music_db.js");
                    const baseSongs = global.generatedSongs || [];
                    songs = baseSongs.map(s => ({ ...s, votes: s.votes || 0 }));
                    setupFirestoreSync();
                }
            }).catch(err => {
                console.error("Data: Firestore error fetching song list:", err);
                const baseSongs = global.generatedSongs || [];
                songs = baseSongs.map(s => ({ ...s, votes: s.votes || 0 }));
                setupFirestoreSync();
            });

            // Check if user is already authenticated
            const currentUser = global.DJAuth?.getUser();
            if (currentUser) {
                console.log("Data: User already authenticated on init, setting up user sync");
                handleAuthChange(currentUser);
            }

            // Delayed check in case auth loads after data module
            setTimeout(() => {
                const user = global.DJAuth?.getUser();
                if (user && Object.keys(userVoteIds).length === 0) {
                    console.log("Data: Delayed auth check - user found but votes not synced");
                    handleAuthChange(user);
                }
            }, 1000);
        } else {
            // Fallback for local testing without Firebase
            const baseSongs = global.generatedSongs || [];
            songs = baseSongs.map(s => ({ ...s, votes: s.votes || 0 }));
        }

        // Setup local broadcast channel for non-db updates (navigation sync etc)
        channel.onmessage = (event) => {
            if (event.data?.type === 'NOW_PLAYING_SYNC') {
                currentPlaying = event.data.currentPlaying;
                notifySubscribers();
            }
        };
    }

    function handleAuthChange(user) {
        console.log("Data: Auth change received", user ? user.email : "none");

        // Unsubscribe from previous listener if it exists
        if (userVotesUnsubscribe) {
            console.log("Data: Unsubscribing from previous user votes listener");
            userVotesUnsubscribe();
            userVotesUnsubscribe = null;
        }

        if (user) {
            if (!db) {
                console.warn("Data: db not initialized in handleAuthChange, retrying...");
                db = global.firebaseApp.firestore();
            }

            console.log("Data: Setting up user votes listener for", user.uid);

            userVotesUnsubscribe = db.collection('user_votes').doc(user.uid).onSnapshot(doc => {
                console.log("Data: User votes snapshot received, exists:", doc.exists);

                if (doc.exists) {
                    const data = doc.data();
                    console.log("Data: Raw user votes data:", data);

                    const firestoreVotes = (data && data.votes) ? data.votes : {};
                    const firestoreVoteCount = Object.keys(firestoreVotes).length;
                    const localVoteCount = Object.keys(userVoteIds).length;

                    console.log(`Data: Firestore has ${firestoreVoteCount} votes, local has ${localVoteCount} votes`);

                    // Only overwrite if Firestore has more votes, or if local is empty
                    if (firestoreVoteCount > 0 || localVoteCount === 0) {
                        userVoteIds = firestoreVotes;
                        console.log("Data: Using Firestore votes:", userVoteIds, "Count:", Object.keys(userVoteIds).length);
                    } else {
                        console.log("Data: Preserving local optimistic votes, Firestore is empty");
                    }

                    // Migration/Compatibility for old single-vote records
                    if (data && data.songId && !userVoteIds[data.songId]) {
                        userVoteIds[data.songId] = data.timestamp || Date.now();
                        console.log("Data: Migrated old vote format for song", data.songId);
                    }
                } else {
                    console.log("Data: No user votes document found");

                    // Only initialize to empty if we don't have any optimistic updates
                    if (Object.keys(userVoteIds).length === 0) {
                        console.log("Data: Initializing empty user votes");
                        // Initialize the document with empty votes so future updates work
                        db.collection('user_votes').doc(user.uid).set({
                            votes: {}
                        }).then(() => {
                            console.log("Data: Initialized empty user votes document");
                        }).catch(err => {
                            console.warn("Data: Failed to initialize user votes document:", err);
                        });
                    } else {
                        console.log("Data: Preserving", Object.keys(userVoteIds).length, "optimistic vote(s)");
                    }
                }

                notifySubscribers();
            }, err => {
                console.error("Data: User votes sync error:", err);
            });
        } else {
            console.log("Data: No user, clearing votes");
            userVoteIds = {};
            notifySubscribers();
        }
    }

    function setupFirestoreSync() {
        // Sync Songs & Votes
        db.collection('votes').doc('global_state').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.votes) {
                    songs.forEach(s => {
                        if (data.votes[s.id] !== undefined) s.votes = data.votes[s.id];
                    });
                }
                if (data.currentPlayingId) {
                    currentPlaying = songs.find(s => s.id === data.currentPlayingId) || null;
                }
                notifySubscribers();
            }
        });
    }

    function notifySubscribers() {
        subscribers.forEach(cb => cb(songs, currentPlaying));
    }

    // --- Public API ---

    global.DJData = {
        getAllSongs: () => songs,
        getCurrentPlaying: () => currentPlaying,
        getGenres: () => Array.from(new Set(songs.map(s => s.genre).filter(Boolean))).sort(),
        getSongById: (id) => songs.find(s => s.id === id),
        getTopSongs: (count = 10) => [...songs].sort((a, b) => b.votes - a.votes).slice(0, count),
        getUserVotes: () => userVoteIds,
        hasUserVoted: (id) => {
            const result = !!userVoteIds[id];
            console.log(`Data: hasUserVoted(${id}) = ${result}, all votes:`, Object.keys(userVoteIds));
            return result;
        },

        playSong: async function (id) {
            if (!global.DJAuth.isAdmin()) return false;
            const song = this.getSongById(id);
            if (song) {
                const resetVotes = {};
                songs.forEach(s => {
                    resetVotes[`votes.${s.id}`] = (s.id === id) ? 0 : s.votes;
                });

                await db.collection('votes').doc('global_state').update({
                    currentPlayingId: id,
                    ...resetVotes
                });
                return true;
            }
            return false;
        },

        voteForSong: async function (id) {
            const user = global.DJAuth.getUser();
            if (!user) return false;
            if (userVoteIds[id]) return false; // Already voted for this specific song

            const song = this.getSongById(id);
            if (song) {
                try {
                    console.log("Voting for song:", id);

                    // Optimistically update local state immediately
                    userVoteIds[id] = Date.now();
                    song.votes = (song.votes || 0) + 1;

                    // Save to localStorage for persistence across page loads
                    try {
                        localStorage.setItem('dj_user_votes', JSON.stringify(userVoteIds));
                        console.log("Data: Saved votes to localStorage");
                    } catch (err) {
                        console.warn("Data: Failed to save to localStorage:", err);
                    }

                    notifySubscribers(); // Update UI immediately

                    // Build complete votes object from local state
                    const allVotes = {};
                    songs.forEach(s => {
                        allVotes[s.id] = s.votes || 0;
                    });

                    // 1. Update global votes
                    const stateRef = db.collection('votes').doc('global_state');
                    await stateRef.set({
                        votes: allVotes
                    }, { merge: true });

                    console.log("Global vote updated");

                    // 2. Update user votes
                    const allUserVotes = { ...userVoteIds };

                    const userRef = db.collection('user_votes').doc(user.uid);
                    await userRef.set({
                        votes: allUserVotes
                    }, { merge: true });

                    console.log("User vote updated");

                    return true;
                } catch (err) {
                    console.error("Vote failed:", err);
                    // Rollback optimistic update on error
                    delete userVoteIds[id];
                    song.votes = Math.max(0, (song.votes || 0) - 1);
                    notifySubscribers();
                    return false;
                }
            }
            return false;
        },

        unvoteForSong: async function (id) {
            const user = global.DJAuth.getUser();
            if (!user) return false;
            if (!userVoteIds[id]) return false; // Haven't voted for this song

            const song = this.getSongById(id);
            if (song) {
                try {
                    console.log("Unvoting for song:", id);

                    // Optimistically update local state immediately
                    delete userVoteIds[id];
                    song.votes = Math.max(0, (song.votes || 0) - 1);

                    // Save to localStorage for persistence across page loads
                    try {
                        localStorage.setItem('dj_user_votes', JSON.stringify(userVoteIds));
                        console.log("Data: Saved votes to localStorage after unvote");
                    } catch (err) {
                        console.warn("Data: Failed to save to localStorage:", err);
                    }

                    notifySubscribers(); // Update UI immediately

                    // Build complete votes object from local state
                    const allVotes = {};
                    songs.forEach(s => {
                        allVotes[s.id] = s.votes || 0;
                    });

                    // 1. Update global votes
                    const stateRef = db.collection('votes').doc('global_state');
                    await stateRef.set({
                        votes: allVotes
                    }, { merge: true });

                    // 2. Update user votes
                    const allUserVotes = { ...userVoteIds };

                    const userRef = db.collection('user_votes').doc(user.uid);
                    await userRef.set({
                        votes: allUserVotes
                    }, { merge: true });

                    return true;
                } catch (err) {
                    console.error("Unvote failed:", err);
                    // Rollback optimistic update on error
                    userVoteIds[id] = Date.now();
                    song.votes = (song.votes || 0) + 1;
                    notifySubscribers();
                    return false;
                }
            }
            return false;
        },

        searchSongs: function (query, genreFilter) {
            let filtered = songs;
            if (genreFilter && genreFilter !== 'All') {
                filtered = filtered.filter(s => s.genre === genreFilter);
            }
            if (!query) return filtered;
            const q = query.toLowerCase();
            return filtered.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
        },

        fetchArtwork: async function (song) {
            if (song.artworkUrl) return song.artworkUrl;
            try {
                const term = encodeURIComponent(`${song.artist} ${song.title}`);
                const response = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&limit=1`);
                const data = await response.json();
                if (data.results?.length > 0) {
                    song.artworkUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
                    return song.artworkUrl;
                }
            } catch (err) { console.warn("Artwork fail", err); }
            return null;
        },

        handleAuthChange,
        subscribe: (cb) => subscribers.push(cb),

        // Admin
        resetAllVotes: async function () {
            if (!global.DJAuth.isAdmin()) return;
            const resetVotes = {};
            songs.forEach(s => resetVotes[s.id] = 0);

            try {
                await db.collection('votes').doc('global_state').set({
                    votes: resetVotes,
                    currentPlayingId: null
                });
            } catch (err) {
                console.error("Failed to reset votes", err);
            }
        },

        simulateRandomVotes: async function () {
            if (!global.DJAuth.isAdmin()) return;
            const randomVotes = {};
            songs.forEach(s => randomVotes[s.id] = 0);
            const selected = [...songs].sort(() => 0.5 - Math.random()).slice(0, 15);
            selected.forEach(s => randomVotes[s.id] = Math.floor(Math.random() * 40) + 5);

            try {
                await db.collection('votes').doc('global_state').set({
                    votes: randomVotes
                }, { merge: true });
            } catch (err) {
                console.error("Failed to simulate votes", err);
            }
        }
    };

    init();

})(window);
