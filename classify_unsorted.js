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
    'Tropical & Beach': [
        'Hugel', 'Robin Schulz', 'Kygo', 'Lost Frequencies', 'Bakermat', 'Klingande', 
        'Tropical', 'Beach', 'Summer', 'Petit Biscuit', 'Polo & Pan', 'Ofenbach', 'John Summit'
    ],
    'EDM': [
        'Alok', 'David Guetta', 'Tiesto', 'Tiësto', 'Garrix', 'Avicii', 'Galantis', 
        'Dillon Francis', 'Marshmello', 'Don Diablo', 'Afrojack', 'Zedd', 'Skrillex',
        'Swedish House Mafia', 'Axwell', 'Ingrosso', 'Hardwell', 'Morten', 'Kshmr'
    ],
    'House': [
        'Honey Dijon', 'Fisher', 'Vintage Culture', 'Franky Rizardo', 'Purple Disco Machine',
        'Tech House', 'Deep House', 'Groove', 'Solomun', 'Black Coffee', 'Camelphat', 
        'Dom Dolla', 'Meduza', 'Gorgon City', 'Chris Lake', 'Jamie Jones'
    ],
    'Drum & Bass': [
        'Pendulum', 'Chase & Status', 'Sub Focus', 'Netsky', 'D&B', 'Drum Bass', 
        'Wilkinson', 'High Contrast', 'Camo & Krooked', 'Dimension', 'Kanine'
    ],
    'Techno': [
        'Adam Beyer', 'Amelie Lens', 'Charlotte de Witte', 'Techno', 'Acid', 
        'Boris Brejcha', 'Enrico Sangiuliano', 'Deborah De Luca', 'Carl Cox'
    ],
    'Psytrance': [
        'Vini Vici', 'Infected Mushroom', 'Psytrance', 'Psy', 'Neelix', 'Astrix'
    ],
    'Hardstyle & Tech': [
        'Headhunterz', 'Wildstylez', 'Hardstyle', 'Hardcore', 'Angerfist', 'Brennan Heart', 'Sub Zero Project'
    ],
    'Pop': [
        'Artemas', 'Dua Lipa', 'Rihanna', 'Beyonce', 'Beyoncé', 'Taylor Swift', 'The Weeknd',
        'Ed Sheeran', 'Justin Bieber', 'Ariana Grande', 'Post Malone', 'Pop', 'Remix'
    ]
};

console.log(`Analyzing ${songs.length} songs...`);

let count = 0;
const classifiedSongs = songs.map(song => {
    // Only target specific generic genres
    if (song.genre.match(/Unsorted|Crossfader|Top 20|All/i)) {
        const fullText = (song.artist + ' ' + song.title).toLowerCase();
        
        for (const [genre, keywords] of Object.entries(mapping)) {
            for (const keyword of keywords) {
                if (fullText.includes(keyword.toLowerCase())) {
                    count++;
                    return { ...song, genre: genre };
                }
            }
        }
    }
    return song;
});

console.log(`Re-classified ${count} tracks based on metadata.`);

fs.writeFileSync(songsPath, JSON.stringify(classifiedSongs, null, 4), 'utf8');

// Update music_db.js
const jsPath = path.join(__dirname, 'js', 'music_db.js');
const jsContent = `window.generatedSongs = ${JSON.stringify(classifiedSongs)};`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Classification complete.');
