# Snakes and Ladders

This is a simple web-based multiplayer Snakes and Ladders game built with Node.js, Express and Socket.IO.

## Running the game

```bash
npm install
node server.js
```

Open your browser and navigate to `http://localhost:3000/new` to create a new board. Share the resulting URL with friends to play together.

On load, you'll be prompted for your name. Click **Roll Dice** to play. A board can be played solo or with multiple players. Each board is identified by a unique ID in the URL. Squares that begin a snake show a `↓` followed by the destination square, while ladders show an `↑` and their destination.

