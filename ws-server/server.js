const WebSocket = require('ws');

console.log("starting server now!");

const wss = new WebSocket.Server({ port: 8080 });

let rooms = {};
let next_roomid = 0;

wss.on('connection', ws => {
  ws.on('message', msg => {
    console.log(msg);
  });
 
  ws.send('something');
});
wss.on("error", err => {
    console.log(err);
});