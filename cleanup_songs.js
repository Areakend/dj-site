const fs = require('fs');
const path = require('path');

const songsPath = path.join(__dirname, 'songs.json');
let content = fs.readFileSync(songsPath, 'utf8');

// Strip BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

const songs = JSON.parse(content);

console.log(`Processing ${songs.length} songs...`);

const cleanedSongs = songs.map(song => {
    let genre = song.genre || 'Unsorted';
    
    // Merge House Essential/Extract into House
    if (genre.match(/House/i)) {
        genre = 'House';
    }
    
    // Move Fabio, Chai, Crossfader to "Unsorted"
    if (genre.match(/Fabio|Chai|Crossfader/i)) {
        genre = 'Unsorted';
    }
    
    return { ...song, genre };
});

console.log(`Updated list: ${cleanedSongs.length} songs.`);

fs.writeFileSync(songsPath, JSON.stringify(cleanedSongs, null, 4), 'utf8');

// Also update music_db.js
const jsPath = path.join(__dirname, 'js', 'music_db.js');
const jsContent = `window.generatedSongs = ${JSON.stringify(cleanedSongs)};`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Cleanup complete.');
