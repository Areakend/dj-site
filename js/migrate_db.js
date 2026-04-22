async function migrateDatabase(songs) {
    if (!window.firebaseApp) {
        console.error("Firebase not initialized");
        return;
    }
    const db = window.firebaseApp.firestore();
    console.log("Migration: Starting...");

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

    // 2. Clear user votes (optional, but requested "clean previous database")
    console.log("Migration: Note - user_votes are NOT automatically cleared to preserve user history, unless manually deleted in dashboard.");

    // 3. (Optional) If we decide to move songs to Firestore collection:
    /*
    const BATCH_SIZE = 500;
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = songs.slice(i, i + BATCH_SIZE);
        chunk.forEach(song => {
            const ref = db.collection('songs').doc(String(song.id));
            batch.set(ref, song);
        });
        await batch.commit();
        console.log(`Migration: Uploaded songs ${i} - ${i + chunk.length}`);
    }
    */

    console.log("Migration: Complete! Votes have been reset and synced with the new song list.");
}

// Automatically load the JSON if this script is included
/*
fetch('songs.json')
    .then(r => r.json())
    .then(songs => {
        window.migrateDatabase = () => migrateDatabase(songs);
        console.log("Migration: Script loaded. Run migrateDatabase() in console to start.");
    });
*/
