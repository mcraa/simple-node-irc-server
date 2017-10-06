var net = require('net');
var clientStore = require('./clients');
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
    var lines = data.toString().split("\r\n");

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(" ");
        
        switch (parts[0]) {
            case "CAP":
                if(parts[1] == "LS"){
                    socket.write("CAP * LS :\r\n")
                }
            break;
            case "NICK":
                clientStore.buildClient(socket, "NICK", parts[1]);
            break;
            case "USER":
                clientStore.buildClient(socket, "USER", parts[1]);
            break;
            case "JOIN":
                var name = clientStore.getClientName(socket); 
                if (clientStore.joinChannel(socket, parts[1])){
                    broadcast(":" + name + " JOIN " + parts[1]+ "\r\n");
                    socket.write(":127.0.0.1 332 " + name.split("!")[0] + " " + parts[1] + " :Dat topic\r\n");
                    socket.write(":127.0.0.1 353 " + name.split("!")[0] + " =" + parts[1] + " :\r\n");
                    socket.write(":127.0.0.1 366 " + name.split("!")[0] + " " + parts[1] + " :End of NAMES list\r\n");
                }
            break;
        }
    }
}

function broadcast(message){
    for (var i = 0; i < clientStore.clients.length; i++) {
        clientStore.clients[i].socket.write(message);        
    }
}