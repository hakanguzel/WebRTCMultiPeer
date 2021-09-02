const port = process.env.PORT || 3000;
const express = require('express');
const app = express();
const http = require('http').Server(app);

app.use(express.static(__dirname + '/assets'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
// Socket.io ======================================================================
require('./controllers/socket.js')(http);

// Server listen
http.listen(port, function () {
    console.log('WebRTC Lab server running at ' + ':' + port);
});
