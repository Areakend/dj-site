async function runMigration() {
    if (!window.firebaseApp) {
        console.error("Migration: Firebase not initialized");
        return;
    }
    const db = window.firebaseApp.firestore();
    console.log("Migration: Fetching songs.json...");
    
    try {
        const response = await fetch('songs.json');
        const songs = await response.json();
        console.log(`Migration: Loaded ${songs.length} songs. Starting Firestore sync...`);

        // 1. Reset global state
        console.log("Migration: Resetting global state...");
        const resetVotes = {};
        songs.forEach(s => resetVotes[s.id] = 0);
        
        await db.collection('votes').doc('global_state').set({
            votes: resetVotes,
            currentPlayingId: null,
            lastUpdated: Date.now()
        });

        // 2. Upload song list as a single document
        console.log("Migration: Uploading song list metadata...");
        await db.collection('votes').doc('song_list').set({
            songs: songs,
            count: songs.length,
            lastUpdated: Date.now()
        });

        // 3. Clear all user votes to ensure consistency
        console.log("Migration: Clearing user votes...");
        const userVotesQuery = await db.collection('user_votes').get();
        const batch = db.batch();
        userVotesQuery.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Migration: Cleared ${userVotesQuery.size} user vote records.`);

        // 4. Force browser to clear local storage if possible (will advise user)
        localStorage.removeItem('dj_user_votes');

        console.log("Migration: Complete! Your database is now up to date and clean.");
    } catch (err) {
        console.error("Migration: Failed!", err);
    }
}

console.log("Migration: Script loaded. Type 'runMigration()' and press Enter to start.");
window.runMigration = runMigration;
