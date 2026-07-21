const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { checkIntersection, checkTeamExists } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingPlayer = null;
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_game', () => {
    if (waitingPlayer && waitingPlayer !== socket.id) {
      const roomId = 'room_' + Date.now();
      rooms[roomId] = {
        players: [waitingPlayer, socket.id],
        turn: waitingPlayer, // Player 1 picks first team
        team1: null,
        team2: null,
        state: 'countdown',
        lives: {
          [waitingPlayer]: 2,
          [socket.id]: 2
        }
      };

      io.to(waitingPlayer).emit('match_found', { roomId, playerIndex: 1 });
      io.to(socket.id).emit('match_found', { roomId, playerIndex: 2 });
      
      waitingPlayer = null;

      // Start countdown
      setTimeout(() => {
        if(rooms[roomId]) {
            rooms[roomId].state = 'team_selection';
            io.to(rooms[roomId].players[0]).emit('team_selection_start', { turn: rooms[roomId].players[0] });
            io.to(rooms[roomId].players[1]).emit('team_selection_start', { turn: rooms[roomId].players[0] });
        }
      }, 3000); // 3 sec countdown
    } else {
      waitingPlayer = socket.id;
      socket.emit('waiting_for_opponent');
    }
  });

  socket.on('select_team', async ({ roomId, team }) => {
    const room = rooms[roomId];
    if (!room || room.state !== 'team_selection') return;
    if (room.turn !== socket.id) return;

    // Optional: Validate team exists
    const validTeam = await checkTeamExists(team);
    if (!validTeam) {
        socket.emit('team_invalid', { message: 'Böyle bir takım bulunamadı. Lütfen tekrar dene.' });
        return;
    }

    if (!room.team1) {
      room.team1 = validTeam;
      room.turn = room.players[1];
      io.to(room.players[0]).emit('team_selected', { team1: room.team1, turn: room.turn });
      io.to(room.players[1]).emit('team_selected', { team1: room.team1, turn: room.turn });
    } else if (!room.team2) {
      room.team2 = validTeam;
      room.state = 'guessing';
      io.to(room.players[0]).emit('game_start', { team1: room.team1, team2: room.team2 });
      io.to(room.players[1]).emit('game_start', { team1: room.team1, team2: room.team2 });
    }
  });

  socket.on('make_guess', async ({ roomId, playerGuess }) => {
    const room = rooms[roomId];
    if (!room || room.state !== 'guessing') return;
    if (room.lives[socket.id] <= 0) return;

    try {
        const foundPlayer = await checkIntersection(playerGuess, room.team1, room.team2);
        if (foundPlayer) {
            // Correct guess!
            room.state = 'finished';
            io.to(room.players[0]).emit('game_over', { winner: socket.id, correctPlayer: foundPlayer });
            io.to(room.players[1]).emit('game_over', { winner: socket.id, correctPlayer: foundPlayer });
        } else {
            // Wrong guess
            room.lives[socket.id] -= 1;
            socket.emit('wrong_guess', { lives: room.lives[socket.id] });
            
            // Send opponent update
            const opponent = room.players.find(id => id !== socket.id);
            if(opponent) {
                io.to(opponent).emit('opponent_wrong_guess', { opponentLives: room.lives[socket.id] });
            }

            if (room.lives[room.players[0]] <= 0 && room.lives[room.players[1]] <= 0) {
                room.state = 'finished';
                io.to(room.players[0]).emit('game_over', { winner: 'draw', correctPlayer: null });
                io.to(room.players[1]).emit('game_over', { winner: 'draw', correctPlayer: null });
            } else if (room.lives[socket.id] <= 0) {
                // If one dies, does the other win? The rules say "Hakları biten veya doğru futbolcuyu ilk bulan oyunu bitirir."
                // Wait, if A dies, B can still try? Let's say if A dies, B wins.
                room.state = 'finished';
                io.to(room.players[0]).emit('game_over', { winner: opponent, correctPlayer: null });
                io.to(room.players[1]).emit('game_over', { winner: opponent, correctPlayer: null });
            }
        }
    } catch (e) {
        console.error(e);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingPlayer === socket.id) waitingPlayer = null;
    
    // Find if user was in a room
    for (const roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id) && rooms[roomId].state !== 'finished') {
        const opponent = rooms[roomId].players.find(id => id !== socket.id);
        io.to(opponent).emit('opponent_disconnected');
        delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
