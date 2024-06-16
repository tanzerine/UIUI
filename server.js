const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('newWord', (data) => {
        io.emit('newWord', data);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
