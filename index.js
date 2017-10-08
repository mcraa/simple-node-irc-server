var net = require('net');
var dns = require('dns');
var os = require( 'os' );

var networkInterfaces = os.networkInterfaces( );
var hostkeys = Object.keys(networkInterfaces);
var hostaddress = networkInterfaces[hostkeys[1]][0]["address"] || '127.0.0.1';

var clientStore = require('./clients');
var chanels = require('./channels');
var server = net.createServer(function(socket) {
    socket.write('Connected to simple-node-irc-server\r\n');
    socket.on("data", function(d){
        console.log(d.toString());
        handleMessage(d, socket);
    })
});

var pass = "pwd";
server.listen(6667);

function handleMessage(data, socket){
    var lines = data.toString().split("\r\n");

    for (var i = 0; i < lines.length; i++) {
        var params = lines[i].split(":");
        var parts = params[0].split(" ");
        
        if (clientStore.clients[socket.remoteAddress + ":" + socket.remotePort] == undefined){
            if (parts[0] == "PASS"){
                if (parts[1] == pass){
                    clientStore.buildClient(socket);
                }
            }
        }

        switch (parts[0]) {
            case "NICK":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
                if (parts[1] == undefined || parts[1] == ""){
                    socket.write(":"+hostaddress+" 431 " + nick + " :No nickname given \r\n");
                } else {
                    if (clientStore.names().indexOf(parts[1]) > -1) {
                        socket.write(":"+hostaddress+" 436 " + nick + " :Nick collision \r\n");
                    } else {
                        clientStore.buildClient(socket, "nick", parts[1]);
                    }
                }
            break;
            case "USER":  
                clientStore.buildClient(socket, "user", parts[1] + "@" + parts[3]);
                var nick = clientStore.getClientName(socket).split("!")[0]; 
                socket.write("PING :" + Math.floor(Math.random()*10000).toString() + "\r\n");
                socket.write(":"+hostaddress+" 001 " + nick + " :Welcome \r\n");                
                socket.write(":"+hostaddress+" 002 " + nick + " :\r\n");                
                socket.write(":"+hostaddress+" 003 " + nick + " :\r\n");                
                socket.write(":"+hostaddress+" 004 " + nick + " :\r\n");                
                socket.write(":"+hostaddress+" 005 " + nick + " :\r\n");  
                socket.write(":"+hostaddress+" 375 " + nick + " :\r\n");  
                socket.write(":"+hostaddress+" 372 " + nick + " :\r\n");  
                socket.write(":"+hostaddress+" 376 " + nick + " :\r\n");  
                socket.write(":"+nick+" MODE " + nick + " :+xi\r\n");                                
            break;
            case "JOIN":
                var name = clientStore.getClientName(socket); 
                if (clientStore.joinChannel(socket, parts[1])){
                    chanels.joinOrCreate(name.split("!")[0], parts[1]);
                    broadcast(":" + name + " JOIN :" + parts[1]+ "\r\n");
                    console.log(":" + name + " JOIN :" + parts[1]+ "\r\n");
                    socket.write(":"+hostaddress+" 332 " + name.split("!")[0] + " " + parts[1] + " :Dat topic\r\n");
                    socket.write(":"+hostaddress+" 353 " + name.split("!")[0] + " = " + parts[1] + " :"+name.split("!")[0]+"\r\n");
                    socket.write(":"+hostaddress+" 366 " + name.split("!")[0] + " " + parts[1] + " :End of NAMES list\r\n");
                }
            break;
            case "LIST":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
            
                var chans = chanels.channelNames;
                for (var i = 0; i < chans.length; i++) {
                    socket.write(":"+hostaddress+" 322 " + nick + " " + chans[i] + " " + chanels.list[chans[i]].users.length + " :"+chanels.list[chans[i]].topic+ "\r\n");                    
                }
                socket.write(":"+hostaddress+" 323 :End of LIST\r\n"); 
            break;    
            case "NAMES":
                var nick = clientStore.getClientName(socket).split("!")[0];             
                var reply = ":"+hostaddress+" 353 " + nick + " = " + parts[1] + " :"
                if (parts[1] != undefined && parts[1].indexOf("#") == 0){
                    reply += chanels.list[parts[1]].users.join(" ");
                } else {
                    reply += clientStore.names().join(" ");
                }
                socket.write(reply+"\r\n");
                socket.write(":"+hostaddress+" 366 " + nick + " " + parts[1] + " :End of NAMES list\r\n");
            break;
            case "PING":       
                socket.write(":"+hostaddress+" PONG " + hostaddress + " :" + parts[1] + "\r\n");                
            break;
            case "PART":
                var nick = clientStore.getClientName(socket).split("!")[0];                         
                var leavingError = chanels.leave(nick, parts[1]);
                clientStore.partChannel(socket, parts[1]);
                if (leavingError){
                    socket.write(":"+hostaddress+ "  " + leavingError + "  " + nick + "\r\n");                
                }
            break;     
            case "PRIVMSG":
                var from = clientStore.getClientName(socket);
                if (parts[1].indexOf("#") == 0){
                    for (var i = 0; i < chanels.list[parts[1]].users.length; i++) {
                        if (chanels.list[parts[1]].users[i] != parts[1])
                            clientStore.getSocketByNick(chanels.list[parts[1]].users[i]).write(":"+ from + " PRIVMSG " + parts[1] + " : "+ params[1] +"\r\n");
                    }
                } else {
                    clientStore.getSocketByNick(parts[1]).write(":"+ from + " PRIVMSG " + parts[1] + " : "+ params[1] +"\r\n");
                }
            break;     
        }
    }
}

function broadcast(message){
    var keys = Object.keys(clientStore.clients)
    for (var i = 0; i < keys.length; i++) {
        clientStore.clients[keys[i]].socket.write(message);        
    }
}

process.on('SIGTERM', function () {
    console.log("Bye");
    server.close(function () {
      process.exit(0);
    });
});