const Koa = require('koa');
const app = new Koa();
const https = require('https');
const fs = require('fs');
const socket = require("socket.io");
const options = {
  key: fs.readFileSync('../ssl/privkey.pem'),
  cert: fs.readFileSync('../ssl/cert.pem')
};
let serverCallback = app.callback();
var server = https.createServer(options, serverCallback);

const io = socket(server, {
    cors: {
      origin: '*',
    },
  });

  const users = {};
const rooms = {};
io.on('connection', socket => {
    const room_no = socket.handshake.query.room_no;
    const type = socket.handshake.query.type;
    console.log('connected');

    if (!users[socket.id]) {
        users[socket.id] = {
            socket_id : socket.id, 
            room_no : room_no,
            type : type
        };
    }

    if (!rooms[room_no]) {
        console.log('empty');
        rooms[room_no] = {
            first_socket_id : socket.id,
            first_type : type,
            second_socket_id : null,
            second_type : null
        };
    }else{
        if (rooms[room_no].first_type == type){
            rooms[room_no].first_socket_id = socket.id;
            rooms[room_no].first_type = type;
        }else{
            rooms[room_no].second_socket_id = socket.id;
            rooms[room_no].second_type = type;
        }
    }
    socket.join(room_no);
    console.log(rooms[room_no]);

    socket.emit("yourID", socket.id);

    let send_users = {};

    send_users[rooms[room_no].first_socket_id] = rooms[room_no].first_socket_id;
    send_users[rooms[room_no].second_socket_id] = rooms[room_no].second_socket_id;

    if (rooms[room_no].second_socket_id)
        io.to(rooms[room_no].first_socket_id).emit('connectedUsers', rooms[room_no].second_socket_id);
    socket.on('disconnect', () => {
        if (rooms[room_no] != undefined){
            console.log('disconnect one');
            if (rooms[room_no].first_socket_id == socket.id){
                rooms[room_no].first_socket_id = null
            }
            if (rooms[room_no].second_socket_id == socket.id){
                rooms[room_no].second_socket_id = null
            }

            if (rooms[room_no].second_socket_id == null && rooms[room_no].first_socket_id == null)
                delete rooms[room_no];
        }
        delete users[socket.id];
    });

    socket.on("callUser", (data) => {
        console.log(data);
        io.to(data.userToCall).emit('meet', {signal: data.signalData, from: data.from});
    });

    socket.on("acceptCall", (data) => {
        console.log(data);
        io.to(data.to).emit('callAccepted', data.signal);
    });

});

server.listen(3030, () => {
    console.log('listening to port 3030');
  });