const express = require('express');
const { Server } = require("socket.io");
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

require('dotenv').config();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/quizzes', require('./src/routes/quizzes'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinRoom', ({ code, username }) => {
        socket.join(code);
        console.log(`${username} joined room ${code}`);
        socket.to(code).emit('userJoined', `${username} has joined the quiz.`);
    });

    socket.on('startQuiz', async (code) => {
        io.to(code).emit('quizStarted');
    });
    
    socket.on('submitAnswer', (data) => {
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
