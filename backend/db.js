const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'futbolcular.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

function checkIntersection(playerName, teamA, teamB) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.name 
            FROM Players p
            JOIN Career c1 ON p.id = c1.player_id
            JOIN Career c2 ON p.id = c2.player_id
            WHERE p.name LIKE ?
              AND c1.team_name LIKE ?
              AND c2.team_name LIKE ?
            LIMIT 1;
        `;
        
        const pName = '%' + playerName.trim() + '%';
        const tA = '%' + teamA.trim() + '%';
        const tB = '%' + teamB.trim() + '%';

        db.get(query, [pName, tA, tB], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.name : null);
            }
        });
    });
}

function checkTeamExists(teamName) {
    return new Promise((resolve, reject) => {
        const query = `SELECT DISTINCT team_name FROM Career WHERE team_name LIKE ? LIMIT 1;`;
        db.get(query, ['%' + teamName.trim() + '%'], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.team_name : null);
            }
        });
    });
}

module.exports = {
    checkIntersection,
    checkTeamExists
};
