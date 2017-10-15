var net = require('net');
var os = require( 'os' );

var parse = require('irc-message').parse;

var clientStore = require('./clients');
var chanels = require('./channels');
var replies = require('./replies').codes;

var networkInterfaces = os.networkInterfaces( );
var hostkeys = Object.keys(networkInterfaces);
var hostaddress = networkInterfaces[hostkeys[1]][0]["address"] || '127.0.0.1';

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
    lines.pop();  // remove empty

    for (var i = 0; i < lines.length; i++) {
        var message = parse(lines[i]);        

        switch (message.command) {
            case "PASS":
                if (clientStore.clients[socket.remoteAddress + ":" + socket.remotePort] == undefined){
                    if (message.params[0] == pass){
                        clientStore.buildClient(socket);
                    }
                } else {
                    var nick = clientStore.getClientName(socket).split("!")[0];                 
                    socket.write(":"+hostaddress+" "+ replies.ERR_ALREADYREGISTRED + " " + nick + " :Already registered\r\n");                              
                }
            break;
            case "NICK":
                if (message.params.length == 0){
                    socket.write(":"+hostaddress+" "+ replies.ERR_ERRONEUSNICKNAME+ " :No nickname given \r\n");
                } else {
                    if (clientStore.names().indexOf(message.params[0]) > -1) {
                        socket.write(":"+hostaddress+"  " + replies.ERR_NICKCOLLISION + " " + nick + " :Nick collision \r\n");
                    } else {
                        clientStore.buildClient(socket, "nick", message.params[0]);
                    }
                }
            break;
            case "USER":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
                if (clientStore.clients[socket.remoteAddress + ":" + socket.remotePort]["user"] != undefined){
                    socket.write(":"+hostaddress+" "+ replies.ERR_ALREADYREGISTRED + " " + nick + " :Already registered\r\n");                  
                    break;
                }
                clientStore.buildClient(socket, "user", message.params[0] + "@" + message.params[2]);
                socket.write("PING :" + Math.floor(Math.random()*10000).toString() + "\r\n");                
                socket.write(":"+hostaddress+" "+ replies.RPL_MOTDSTART + " " + nick + " :\r\n");  
                socket.write(":"+hostaddress+" "+ replies.RPL_MOTD +" " + nick + " :\r\n");  
                socket.write(":"+hostaddress+" "+ replies.RPL_ENDOFMOTD +" "+ nick + " :\r\n");  
                socket.write(":"+nick+" MODE " + nick + " :+xi\r\n");                                
            break;
            case "JOIN":
                var name = clientStore.getClientName(socket); 
                if (message.params[0].indexOf("#") != 0 && message.params[0].indexOf("&") != 0){
                    socket.write(":"+hostaddress+" "+ replies.ERR_BADCHANMASK +" "+ name.split("!")[0] + " " + message.params[0] + " :Cannot join channel\r\n");                    
                    break;
                }
                if (clientStore.joinChannel(socket, message.params[0])){
                    chanels.joinOrCreate(name.split("!")[0], message.params[0]);                    
                    broadcast(":" + name + " JOIN :" +message.params[0] + "\r\n");
                    socket.write(":"+hostaddress+" "+ replies.RPL_TOPIC +" "+ name.split("!")[0] + " " + message.params[0] + " :"+ chanels.list[message.params[0]].topic +"\r\n");
                    socket.write(":"+hostaddress+" "+ replies.RPL_NAMREPLY +" "+ name.split("!")[0] + " = " + message.params[0] + " :"+ clientStore.names().join(" ") +"\r\n");
                    socket.write(":"+hostaddress+" " + replies.RPL_ENDOFNAMES + " " + name.split("!")[0] + " " + message.params[0] + " :End of NAMES list\r\n");
                }
            break;
            case "LIST":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
            
                var chans = chanels.channelNames;
                for (var i = 0; i < chans.length; i++) {
                    socket.write(":"+hostaddress+" "+ replies.RPL_LIST +" "+ nick + " " + chans[i] + " " + chanels.list[chans[i]].users.length + " :"+chanels.list[chans[i]].topic+ "\r\n");                    
                }
                socket.write(":"+hostaddress+" "+ replies.RPL_LISTEND +" :End of LIST\r\n"); 
            break;    
            case "NAMES":
                var nick = clientStore.getClientName(socket).split("!")[0];             
                var reply = ":"+hostaddress+" "+ replies.RPL_NAMREPLY +" "+ nick + " = " + message.params[0] + " :"
                if (message.params[0] != undefined && chanels.list[message.params[0]] != undefined){
                    reply += chanels.list[message.params[0]].users.join(" ");
                } else {
                    reply += clientStore.names().join(" ");
                }
                socket.write(reply+"\r\n");
                socket.write(":"+hostaddress+" "+ replies.RPL_ENDOFNAMES +" "+ nick + " " + message.params[0] + " :End of NAMES list\r\n");
            break;
            case "PING":       
                socket.write(":"+hostaddress+" PONG " + hostaddress + " :" + message.params[0] + "\r\n");                
            break;
            case "PART":
                var nick = clientStore.getClientName(socket).split("!")[0];                         
                var leavingError = chanels.leave(nick, message.params[0]);
                clientStore.partChannel(socket, message.params[0]);
                if (leavingError){
                    socket.write(":"+hostaddress+ "  " + leavingError + "  " + nick + "\r\n");                
                }
            break;     
            case "PRIVMSG":
                var from = clientStore.getClientName(socket);
                var nick = from.split("!")[0];
                if (message.params[0].indexOf("#") == 0 || message.params[0].indexOf("&") == 0){
                    for (var i = 0; i < chanels.list[message.params[0]].users.length; i++) {
                        if (chanels.list[message.params[0]].users[i] != nick)
                            clientStore.getSocketByNick(chanels.list[message.params[0]].users[i]).write(":"+ from + " PRIVMSG " + message.params[0] + " : "+ message.params[1] +"\r\n");
                    }
                } else {
                    clientStore.getSocketByNick(message.params[0]).write(":"+ from + " PRIVMSG " + message.params[0] + " : "+ message.params[1] +"\r\n");
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