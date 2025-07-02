const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// In-memory boards
const boards = {};

function createBoard(id = uuidv4()) {
  const snakes = {};
  const ladders = {};
  // generate 5 snakes and 5 ladders
  function randPos() { return Math.floor(Math.random() * 98) + 2; } // between 2 and 99
  let used = new Set();
  while(Object.keys(snakes).length < 5) {
    let from = randPos();
    let to = Math.floor(Math.random() * (from - 1)) + 1; // less than from
    if (from === to || used.has(from) || used.has(to)) continue;
    snakes[from] = to;
    used.add(from); used.add(to);
  }
  while(Object.keys(ladders).length < 5) {
    let from = randPos();
    let to = Math.floor(Math.random() * (100 - from)) + from + 1; // greater than from
    if (from === to || used.has(from) || used.has(to) || to > 100) continue;
    ladders[from] = to;
    used.add(from); used.add(to);
  }
  boards[id] = {
    id,
    snakes,
    ladders,
    players: {}, // socket.id -> {name, position}
    turnOrder: [],
    currentTurn: 0
  };
  return boards[id];
}

app.get('/new', (req, res) => {
  const board = createBoard();
  res.redirect(`/board/${board.id}`);
});

app.get('/board/:id', (req, res) => {
  const { id } = req.params;
  if (!boards[id]) createBoard(id);
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  socket.on('join', ({ boardId, name }) => {
    if (!boards[boardId]) return;
    const board = boards[boardId];
    board.players[socket.id] = { name, position: 0 };
    board.turnOrder.push(socket.id);
    socket.join(boardId);
    io.to(boardId).emit('state', board);
  });

  socket.on('roll', ({ boardId }) => {
    const board = boards[boardId];
    if (!board) return;
    const playerIds = board.turnOrder;
    if (playerIds.length === 0) return;
    const currentPlayerId = playerIds[board.currentTurn % playerIds.length];
    if (socket.id !== currentPlayerId) return; // not your turn
    const player = board.players[socket.id];
    if (!player) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    io.to(boardId).emit('message', `${player.name} rolled a ${roll}`);
    let newPos = player.position + roll;
    if (newPos > 100) newPos = 100 - (newPos - 100); // bounce back
    if (board.snakes[newPos]) newPos = board.snakes[newPos];
    if (board.ladders[newPos]) newPos = board.ladders[newPos];
    player.position = newPos;
    if (newPos === 100) {
      io.to(boardId).emit('message', `${player.name} wins!`);
      board.currentTurn = 0;
      Object.values(board.players).forEach(p => p.position = 0);
    } else {
      board.currentTurn = (board.currentTurn + 1) % playerIds.length;
    }
    io.to(boardId).emit('state', board);
  });

  socket.on('disconnect', () => {
    for (const id in boards) {
      const board = boards[id];
      if (board.players[socket.id]) {
        delete board.players[socket.id];
        board.turnOrder = board.turnOrder.filter(p => p !== socket.id);
        if (board.currentTurn >= board.turnOrder.length) board.currentTurn = 0;
        io.to(id).emit('state', board);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
