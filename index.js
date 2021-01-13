'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('../ssl/privkey.pem'),
  cert: fs.readFileSync('../ssl/cert.pem')
};
let app = https.createServer(options, (req,res)=>{
  fileServer.serve(req, res);
}).listen(3030);
// let app = http.createServer((req,res)=>{
//   fileServer.serve(req, res);
// }).listen(3030);
const io = require('socket.io')(app, {
  cors: {
    origin: '*',
  },
});


var fileServer = new(nodeStatic.Server)();
// let app = http.createServer((req,res)=>{
//   fileServer.serve(req, res);
// }).listen(3030);

console.log('Started chating server...');

// var io = socketIO.listen(app);

io.of('/').on('connection', (socket) => {
// io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
	
	if (message==="bye" && socket.rooms['foo']) {
		io.of('/').in('foo').clients((error, socketIds) => {
		if (error) throw error;

		socketIds.forEach(socketId => {
		//	if (socket.id===socketId) console.log('-------------------************');
    //	else socket.broadcast.emit('message', message);
			io.sockets.sockets[socketId].leave('foo');
		});

		});
	} //else {
		// for a real app, would be room-only (not broadcast)
		socket.broadcast.emit('message', message);
		
  });

  socket.on('create or join', function(room) {
    console.log('Received request to create or join room ' + room);

    
    var clientsInRoom = socket.adapter.rooms.get(room);
    console.log(clientsInRoom);
    console.log(socket.adapter.rooms);
    var numClients = clientsInRoom ? clientsInRoom.size : 0;
    console.log(numClients);
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
	  console.log('created');
    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
	  console.log('joined');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
