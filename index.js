var net = require('net');
var server = net.createServer(function(socket) {
    socket.write('Connected to simple-node-irc-server\r\n');
    socket.pipe(socket);
    socket.on("data", function(d){
        console.log(d.toString());

        handleMessage(d, socket);
    })
});

server.listen(6667, '127.0.0.1');

function handleMessage(data, socket){
    var parts = data.toString().split(" ")

    switch (parts[0]) {
        case "JOIN":
            console.log("j");
            socket.write(":127.0.0.1 332\r\n")
    }
}