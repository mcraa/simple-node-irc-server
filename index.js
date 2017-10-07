var net = require('net');
var clientStore = require('./clients');
var chanels = require('./channels');
var server = net.createServer(function(socket) {
    socket.write('Connected to simple-node-irc-server\r\n');
    socket.pipe(socket);
    socket.on("data", function(d){
        console.log(d.toString());

        handleMessage(d, socket);
    })
});
var pass = "pwd";

server.listen(6667, '127.0.0.1');

function handleMessage(data, socket){
    var lines = data.toString().split("\r\n");

    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(" ");
        
        if (clientStore.clients[socket.remoteAddress + ":" + socket.remotePort] == undefined){
            if (parts[0] == "PASS"){
                if (parts[1] == pass){
                    clientStore.buildClient(socket);
                }
            }
        }

        switch (parts[0]) {
            case "CAP":
                if(parts[1] == "LS"){
                    socket.write("CAP * LS :\r\n")
                }
            break;
            case "NICK":
                clientStore.buildClient(socket, "nick", parts[1]);
            break;
            case "USER":
                clientStore.buildClient(socket, "user", parts[1]);
            break;
            case "JOIN":
                var name = clientStore.getClientName(socket); 
                if (clientStore.joinChannel(socket, parts[1])){
                    broadcast(":" + name + " JOIN " + parts[1]+ "\r\n");
                    socket.write(":127.0.0.1 332 " + name.split("!")[0] + " " + parts[1] + " :Dat topic\r\n");
                    socket.write(":127.0.0.1 353 " + name.split("!")[0] + " = " + parts[1] + " :"+name.split("!")[0]+"\r\n");
                    socket.write(":127.0.0.1 366 " + name.split("!")[0] + " " + parts[1] + " :End of NAMES list\r\n");
                }
            break;
            case "LIST":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
            
                var chans = chanels.names;
                for (var i = 0; i < chans.length; i++) {
                    socket.write(":127.0.0.1 322 " + nick + " " + chans[i] + " " + chanels.list[chans[i]].users.length + " :"+chanels.list[chans[i]].topic+ "\r\n");                    
                }
                socket.write(":127.0.0.1 323 :End of LIST\r\n"); 
            break;    
            case "NAMES":
                var nick = clientStore.getClientName(socket).split("!")[0];             
                socket.write(":127.0.0.1 353 " + nick + " = " + parts[1] + " :"+nick+"\r\n");
                socket.write(":127.0.0.1 366 " + nick + " " + parts[1] + " :End of NAMES list\r\n");
            break;
            case "PART":
                //leave
            break;
        

        }
    }
}

function broadcast(message){
    for (var i = 0; i < clientStore.clients.length; i++) {
        clientStore.clients[i].socket.write(message);        
    }
}