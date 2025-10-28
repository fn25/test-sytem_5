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

app.use('/api/admin', require('./src/routes/admin'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', ({ code, username }) => {
        socket.join(code);
        console.log(`${username} joined room ${code}`);
        io.to(code).emit('user-joined', { username, timestamp: new Date() });
        
        const room = io.sockets.adapter.rooms.get(code);
        const participantCount = room ? room.size : 0;
        io.to(code).emit('participant-count', participantCount);
    });

    socket.on('admin-next-question', ({ code, questionIndex }) => {
        io.to(code).emit('show-question', { questionIndex });
    });
    
    socket.on('admin-pause', ({ code }) => {
        io.to(code).emit('quiz-paused');
    });
    
    socket.on('admin-resume', ({ code }) => {
        io.to(code).emit('quiz-resumed');
    });
    
    socket.on('admin-show-answer', ({ code, correctVariantId }) => {
        io.to(code).emit('show-correct-answer', { correctVariantId });
    });

    socket.on('startQuiz', async (code) => {
        io.to(code).emit('quizStarted');
    });
    
    socket.on('submitAnswer', (data) => {
    });
    
    socket.on('get-participants', (code) => {
        const room = io.sockets.adapter.rooms.get(code);
        const participantCount = room ? room.size : 0;
        socket.emit('participant-count', participantCount);
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
