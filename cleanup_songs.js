const fs = require('fs');
const path = require('path');

const songsPath = path.join(__dirname, 'songs.json');
let content = fs.readFileSync(songsPath, 'utf8');

// Strip BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

const songs = JSON.parse(content);

const mapping = {
    'Tropical & Beach': ['Hugel', 'Robin Schulz', 'Kygo', 'Lost Frequencies', 'Bakermat', 'Klingande', 'Tropical', 'Beach', 'Summer', 'Polo & Pan', 'Ofenbach', 'John Summit'],
    'EDM': ['Alok', 'David Guetta', 'Tiesto', 'Tiësto', 'Garrix', 'Avicii', 'Galantis', 'Dillon Francis', 'Marshmello', 'Don Diablo', 'Afrojack', 'Zedd', 'Skrillex', 'Swedish House Mafia', 'Axwell', 'Ingrosso', 'Hardwell', 'Morten', 'Kshmr'],
    'House': ['Honey Dijon', 'Fisher', 'Vintage Culture', 'Franky Rizardo', 'Purple Disco Machine', 'Tech House', 'Deep House', 'Groove', 'Solomun', 'Black Coffee', 'Camelphat', 'Dom Dolla', 'Meduza', 'Gorgon City', 'Chris Lake', 'Jamie Jones'],
    'Drum & Bass': ['Pendulum', 'Chase & Status', 'Sub Focus', 'Netsky', 'D&B', 'Drum Bass', 'Wilkinson', 'High Contrast', 'Camo & Krooked', 'Dimension', 'Kanine'],
    'Techno': ['Adam Beyer', 'Amelie Lens', 'Charlotte de Witte', 'Techno', 'Acid', 'Boris Brejcha', 'Enrico Sangiuliano', 'Deborah De Luca', 'Carl Cox'],
    'Psytrance': ['Vini Vici', 'Infected Mushroom', 'Psytrance', 'Psy', 'Neelix', 'Astrix'],
    'Hardstyle & Tech': ['Headhunterz', 'Wildstylez', 'Hardstyle', 'Hardcore', 'Angerfist', 'Brennan Heart', 'Sub Zero Project'],
    'Pop': ['Artemas', 'Dua Lipa', 'Rihanna', 'Beyonce', 'Beyoncé', 'Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Justin Bieber', 'Ariana Grande', 'Post Malone', 'Pop', 'Remix']
};

console.log(`Deep cleaning ${songs.length} songs...`);

let reclassified = 0;
let movedToUnsorted = 0;

const cleanedSongs = songs.map(song => {
    let genre = song.genre;
    
    // 1. Merge House variations
    if (genre.match(/House/i)) {
        genre = 'House';
    }

    // 2. Target problematic/generic genres for re-classification or Unsorted
    if (genre.match(/Unsorted|CorssFader|Crossfader|Top 20|All|Fabio|Chai/i)) {
        const fullText = (song.artist + ' ' + song.title).toLowerCase();
        let found = false;

        for (const [newGenre, keywords] of Object.entries(mapping)) {
            for (const keyword of keywords) {
                if (fullText.includes(keyword.toLowerCase())) {
                    genre = newGenre;
                    reclassified++;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        // 3. If still generic, move to "Unsorted"
        if (!found && genre.match(/CorssFader|Crossfader|Top 20|All|Fabio|Chai/i)) {
            genre = 'Unsorted';
            movedToUnsorted++;
        }
    }
    
    return { ...song, genre };
});

console.log(`Summary:`);
console.log(`- Re-classified: ${reclassified} tracks`);
console.log(`- Moved to Unsorted: ${movedToUnsorted} tracks`);

fs.writeFileSync(songsPath, JSON.stringify(cleanedSongs, null, 4), 'utf8');

// Update music_db.js
const jsPath = path.join(__dirname, 'js', 'music_db.js');
const jsContent = `window.generatedSongs = ${JSON.stringify(cleanedSongs)};`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Deep cleanup complete.');
