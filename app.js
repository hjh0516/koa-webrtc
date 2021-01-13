// const Koa = require('koa');
// const app = new Koa();
const https = require('https');
const fs = require('fs');
const options = {
  key: fs.readFileSync('../ssl/privkey.pem'),
  cert: fs.readFileSync('../ssl/cert.pem')
};
let server = https.createServer(options, (req,res)=>{
  fileServer.serve(req, res);
});
const socket = require("socket.io");
const io = socket(server);
const users = {};
io.on('connection', socket => {
    if (!users[socket.id]) {
        users[socket.id] = socket.id;
    }
    socket.emit("conectedUser", socket.id);
    io.sockets.emit("allUsers", users);
    socket.on('disconnect', () => {
        delete users[socket.id];
    })
    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit('handshake', {signal: data.signalData, from: data.from});
    })
    socket.on("acceptCall", (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    })
});
server.listen(3030, () => console.log('server is running on port 3030'));