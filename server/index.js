require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tavernRoutes = require('./routes/tavern');
const dungeonRoutes = require('./routes/dungeon');
const boardRoutes = require('./routes/board');
const { initDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/tavern', tavernRoutes);
app.use('/dungeon', dungeonRoutes);
app.use('/board', boardRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
initDb();
app.listen(PORT, () => {
  console.log(`TavernKeeper listening on port ${PORT}`);
});