const Koa = require('koa');
const app = new Koa();
const https = require('https');
const http = require('http');
const fs = require('fs');
const socket = require("socket.io");
const options = {
  key: fs.readFileSync('../ssl/privkey.pem'),
  cert: fs.readFileSync('../ssl/cert.pem')
};
const database = require('./src/common/database.js');
const { Config, setDomain } = require('./src/common/config.js');

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


    if (!rooms[room_no]) {
        if (!users[socket.id]) {
            users[socket.id] = {
                socket_id : socket.id, 
                room_no : room_no,
                type : type
            };
        }
        console.log('empty');
        rooms[room_no] = {
            first_socket_id : socket.id,
            first_type : type,
            second_socket_id : null,
            second_type : null
        };
    }else if(rooms[room_no].second_socket_id == null){
        if (!users[socket.id]) {
            users[socket.id] = {
                socket_id : socket.id, 
                room_no : room_no,
                type : type
            };
        }
        if (rooms[room_no].first_type == type){
            rooms[room_no].first_socket_id = socket.id;
            rooms[room_no].first_type = type;
        }else{
            rooms[room_no].second_socket_id = socket.id;
            rooms[room_no].second_type = type;
        }
    }else{
        socket.emit("proceeding", socket.id);
        console.log('duplicate');
        return
    }
    socket.join(room_no);
    console.log(rooms[room_no]);

    socket.emit("yourID", socket.id);

    let send_users = {};

    send_users[rooms[room_no].first_socket_id] = rooms[room_no].first_socket_id;
    send_users[rooms[room_no].second_socket_id] = rooms[room_no].second_socket_id;

    if (rooms[room_no].second_socket_id && rooms[room_no].first_socket_id){
        io.to(rooms[room_no].first_socket_id).emit('connectedUsers', rooms[room_no].second_socket_id);
        io.to(rooms[room_no].second_socket_id).emit('connectedUsers', rooms[room_no].first_socket_id);
    }
    socket.on('disconnect', () => {
        setDomain(Config.database, true);
        update_end(room_no);
        if (rooms[room_no] != undefined){
            console.log('disconnect one');
            if (rooms[room_no].first_socket_id == socket.id){
                rooms[room_no].first_socket_id = null
                io.to(rooms[room_no].second_socket_id).emit('connectedUsers', null);
            }
            if (rooms[room_no].second_socket_id == socket.id){
                rooms[room_no].second_socket_id = null
                io.to(rooms[room_no].first_socket_id).emit('connectedUsers', null);
            }

            if (rooms[room_no].second_socket_id == null && rooms[room_no].first_socket_id == null)
                delete rooms[room_no];
        }
        delete users[socket.id];
    });

    socket.on("callUser", (data) => {
        console.log( 'meet');
        console.log( data.from);
        console.log( data.userToCall);
        io.to(data.userToCall).emit('meet', {signal: data.signalData, from: data.from, to:data.userToCall});
    });

    socket.on("acceptCall", (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
        console.log('acceptCall');
        console.log(data.to);
        if (users[data.to].type == 'user'){
            setDomain(Config.database, true);
            const room_no = users[data.to].room_no;
            const check_qry = `SELECT AES_DECRYPT(unhex(?), ?) as room_no;`;
            const check_condition = [room_no, 'dolbodaWebRTC'];
            database.excutReader(check_qry, check_condition).then((res) => {
                if(res[0].room_no === null){
                    console.log('wrong room number');
                }else{
                    console.log('add');
                    const descrypt_room_no = res[0].room_no.toString();
                    const [domain, reserve_no] = descrypt_room_no.split('_');
                    setDomain(domain);
        
                    const check_diagnosis = `SELECT 1 FROM diagnosis WHERE reserve_id = ?;`;
                    database.excutReader(check_diagnosis, [reserve_no]).then((res) => {
                        if(res == null){
                            const insert_qry = `INSERT INTO diagnosis (reserve_id, user_id, account_id, room_no, 
                                type, started_at, status) 
                                SELECT r.id, r.user_id, r.account_id, ?, 1, now(), 1 FROM reserves r
                                    LEFT OUTER JOIN diagnosis d ON d.reserve_id = r.id 
                                WHERE r.id = ? AND d.id IS NULL;
                            `;
                            const insert_conditions = [descrypt_room_no, reserve_no];
                            database.excutNonQuery(insert_qry, insert_conditions);
                        }
                    });
                }
            });
        }
    });

    socket.on("callOff", (data) => {
        if (rooms[room_no] != undefined){
            console.log('disconnect one');
            update_end(room_no);
            if (rooms[room_no].first_socket_id == data.from.id){
                rooms[room_no].first_socket_id = null
                io.to(rooms[room_no].second_socket_id).emit('connectedUsers', null);
            }
            if (rooms[room_no].second_socket_id == data.from.id){
                rooms[room_no].second_socket_id = null
                io.to(rooms[room_no].first_socket_id).emit('connectedUsers', null);
            }

            if (rooms[room_no].second_socket_id == null && rooms[room_no].first_socket_id == null)
                delete rooms[room_no];
        }
        delete users[socket.id];
    });
});

function update_end(room_no) {
    setDomain(Config.database, true);
    const check_qry = `SELECT AES_DECRYPT(unhex(?), ?) as room_no;`;
    const check_condition = [room_no, 'dolbodaWebRTC'];
    database.excutReader(check_qry, check_condition).then((res) => {
        if(res[0].room_no === null){
            console.log('wrong room number');
        }else{
            console.log('update');
            const descrypt_room_no = res[0].room_no.toString();
            const [domain, reserve_no] = descrypt_room_no.split('_');
            setDomain(domain);
                    
            const update_qry = `UPDATE diagnosis SET ended_at = now()
                WHERE reserve_id = ? AND ended_at IS NULL;
            `;
            const update_conditions = [reserve_no];
            database.excutNonQuery(update_qry, update_conditions);
        }
    }); 
}
server.listen(3030, () => {
    console.log('listening to port 3030');
  });