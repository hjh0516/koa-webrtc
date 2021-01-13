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

const io = socket(server, {
    cors: {
      origin: '*',
    },
  });
// const io = socket(server);
const users = {};
io.on('connection', socket => {
    // 해당 페이지는 고유 room number로 먼저 접속하고
    // 룸넘버로 api를 먼저 실행하여  환자와 / 의사가 맞는지 확인을 해야한다
    if (!users[socket.id]) {
        users[socket.id] = socket.id;
    }
    // 접속한 사람의 ID emit
    socket.emit("yourID", socket.id);
    // 최대 users는 2명이다. 의사와 환자
    // 의사와 환자가 다른 페이지로 새로 들어오면 기존 접속은 없앤다.
    io.sockets.emit("connectedUsers", users);
    socket.on('disconnect', () => {
        delete users[socket.id];
    })
    // 해당 부분은 현재 앞에서 보내지만.
    // 의사 및 환자가 접속이되면 백에서 자동으로 전화를 걸어주어야한다.
    // 해당 작업 끝내면 앞단 callUser 뺄 예정
    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit('meet', {signal: data.signalData, from: data.from});
    })
    // 여기도 마찬가지. 백에서 자동으로 해줘야함
    // acceptCall 은 뺄 예정
    socket.on("acceptCall", (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    })
});
// 추가로 iceServers 정보를 처음 api 송수신할때 주셔야함. 
// 예시 
// iceServers: [
//      {
//              urls: "stun:stun.l.google.com:19302",
 //             username: "sultan1640@gmail.com",
  //            credential: "98376683"
   //       },
    //      {
     //         urls: "stun:stun.l.google.com:19302",
      //        username: "sultan1640@gmail.com",
       //       credential: "98376683"
   //       }
    //   ] (편집됨) 
server.listen(3030, () => console.log('server is running on port 3030'));