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

const cleanedSongs = songs.filter(song => {
    // Exclude Fabio, Chai, Crossfader
    const genre = song.genre || '';
    if (genre.match(/Fabio|Chai|Crossfader/i)) {
        return false;
    }
    return true;
}).map(song => {
    // Merge House Essential/Extract into House
    let genre = song.genre || 'Unsorted';
    if (genre.match(/House/i)) {
        genre = 'House';
    }
    return { ...song, genre };
});

console.log(`Cleaned list: ${cleanedSongs.length} songs.`);

fs.writeFileSync(songsPath, JSON.stringify(cleanedSongs, null, 4), 'utf8');

// Also update music_db.js
const jsPath = path.join(__dirname, 'js', 'music_db.js');
const jsContent = `window.generatedSongs = ${JSON.stringify(cleanedSongs)};`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Cleanup complete.');
