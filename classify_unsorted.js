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
        'Tropical', 'Beach', 'Summer', 'Petit Biscuit', 'Polo & Pan', 'Ofenbach', 'John Summit',
        'Kungs', 'Feder', 'Synapson', 'The Avener', 'Petit Biscuit', 'Inna'
    ],
    'EDM': [
        'Alok', 'David Guetta', 'Tiesto', 'Tiësto', 'Garrix', 'Avicii', 'Galantis', 
        'Dillon Francis', 'Marshmello', 'Don Diablo', 'Afrojack', 'Zedd', 'Skrillex',
        'Swedish House Mafia', 'Axwell', 'Ingrosso', 'Hardwell', 'Morten', 'Kshmr',
        'Eric Prydz', 'Alan Walker', 'Steve Aoki', 'Major Lazer', 'DJ Snake', 'Calvin Harris',
        'Livsey', 'Ben Rainey', 'Dots Per Inch', 'Ryan Murray', 'Understate', 'Mike D-Fekt',
        'BEAUZ', 'Fred again'
    ],
    'House': [
        'Honey Dijon', 'Fisher', 'Vintage Culture', 'Franky Rizardo', 'Purple Disco Machine',
        'Tech House', 'Deep House', 'Groove', 'Solomun', 'Black Coffee', 'Camelphat', 
        'Dom Dolla', 'Meduza', 'Gorgon City', 'Chris Lake', 'Jamie Jones', 'Black Coffee',
        'Carl Cox', 'Claptone', 'Duke Dumont', 'Madison Mars', 'Joel Corry', 'Lawrence James',
        'Belfort', 'Dante Rives', 'Da Hool', 'Hannah Laing', 'Jayron'
    ],
    'Drum & Bass': [
        'Pendulum', 'Chase & Status', 'Sub Focus', 'Netsky', 'D&B', 'Drum Bass', 
        'Wilkinson', 'High Contrast', 'Camo & Krooked', 'Dimension', 'Kanine', 'Rudimental'
    ],
    'Techno': [
        'Adam Beyer', 'Amelie Lens', 'Charlotte de Witte', 'Techno', 'Acid', 
        'Boris Brejcha', 'Enrico Sangiuliano', 'Deborah De Luca', 'Carl Cox', 'I Hate Models'
    ],
    'Psytrance': [
        'Vini Vici', 'Infected Mushroom', 'Psytrance', 'Psy', 'Neelix', 'Astrix', 'Timmy Trumpet'
    ],
    'Hardstyle & Tech': [
        'Headhunterz', 'Wildstylez', 'Hardstyle', 'Hardcore', 'Angerfist', 'Brennan Heart', 
        'Sub Zero Project', 'Sefa', 'Dr. Peacock', 'Brutalismus 3000', 'Creeds', 'APHØTIC', 'Carv'
    ],
    'Rap FR': [
        'Gims', 'Diam\'s', 'Sexion d\'Assaut', 'Soprano', 'Jul', 'Ninho', 'PLK', 'Damso',
        'PNL', 'Booba', 'Orelsan', 'SCH', 'Hamza', 'Gazo', 'Heuss', 'Vald', 'Gradur'
    ],
    'Rock / Classics': [
        'Queen', 'AC/DC', 'Ac Dc', 'Green Day', 'Shaka Ponk', 'Linkin Park', 'Nirvana', 'Red Hot',
        'Imagine Dragons', 'Coldplay', 'U2', 'The Killers', 'Bon Jovi', 'Guns N Roses',
        'Metallica', 'Daft Punk', 'Jean-Jacques Goldman', 'Indochine', 'Telephone', 'Téléphone',
        'Beat It', 'Michael Jackson'
    ],
    'Pop': [
        'Eminem', 'Justin Timberlake', 'Flo Rida', 'Pitbull', 'Rihanna', 'Shakira', 'Dua Lipa',
        'Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Justin Bieber', 'Ariana Grande', 'Post Malone',
        'Lady Gaga', 'Katy Perry', 'Bruno Mars', 'Beyonce', 'Beyoncé', 'Sean Paul', 'Inna',
        'Gala', 'Pussycat Dolls', 'Jessie J', 'Eve', 'Teddy Swims', 'Shaka Ponk', 'Dassin', 'Aznavour',
        'Black Eyed Peas', 'Maroon 5', 'Billie Eilish', 'Britney Spears', 'Jason Derulo', 'Destiny\'s Child', '50 Cent'
    ]
};

console.log(`Deep analyzing ${songs.length} songs...`);

let count = 0;
const classifiedSongs = songs.map(song => {
    // Only target "Unsorted" for this pass
    if (song.genre === 'Unsorted') {
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

console.log(`Successfully re-classified ${count} tracks from Unsorted.`);

fs.writeFileSync(songsPath, JSON.stringify(classifiedSongs, null, 4), 'utf8');

// Update music_db.js
const jsPath = path.join(__dirname, 'js', 'music_db.js');
const jsContent = `window.generatedSongs = ${JSON.stringify(classifiedSongs)};`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Deep classification complete.');
