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
                    socket.write(respondMessage(hostaddress, [replies.ERR_ALREADYREGISTRED, nick], "Already registered"));                              
                }
            break;
            case "NICK":
                if (message.params.length == 0){
                    socket.write(respondMessage(hostaddress, [replies.ERR_ERRONEUSNICKNAME], "No nickname given"));
                } else {
                    if (clientStore.names().indexOf(message.params[0]) > -1) {
                        var nick = clientStore.getClientName(socket).split("!")[0]; 
                        socket.write(respondMessage(hostaddress, [replies.ERR_NICKCOLLISION, nick], "Nick collision"));
                    } else {
                        clientStore.buildClient(socket, "nick", message.params[0]);
                    }
                }
            break;
            case "USER":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
                if (clientStore.clients[socket.remoteAddress + ":" + socket.remotePort]["user"] != undefined){
                    socket.write(respondMessage(hostaddress,[replies.ERR_ALREADYREGISTRED, nick], "Already registered"));                       
                    break;
                }
                clientStore.buildClient(socket, "user", message.params[0] + "@" + message.params[2]);
                socket.write(respondMessage(null, ["PING"], Math.floor(Math.random()*10000).toString()));                
                socket.write(respondMessage(hostaddress, [replies.RPL_MOTDSTART, nick], ""));  
                socket.write(respondMessage(hostaddress, [replies.RPL_MOTD, nick], ""));  
                socket.write(respondMessage(hostaddress, [replies.RPL_ENDOFMOTD, nick], ""));  
                socket.write(respondMessage(nick, ["MODE", nick], "+xi"));                                
            break;
            case "JOIN":
                var name = clientStore.getClientName(socket); 
                var nick = name.split("!")[0];
                if (message.params[0].indexOf("#") != 0 && message.params[0].indexOf("&") != 0){
                    socket.write(respondMessage(hostaddress, [replies.ERR_BADCHANMASK, nick, message.params[0]], "Cannot join channel"));                    
                    break;
                }
                if (clientStore.joinChannel(socket, message.params[0])){
                    chanels.joinOrCreate(nick, message.params[0]);                    
                    broadcast(respondMessage(name, ["JOIN", message.params[0]]));                    
                    socket.write(respondMessage(hostaddress, [replies.RPL_TOPIC, nick, message.params[0]], chanels.list[message.params[0]].topic));
                    socket.write(respondMessage(hostaddress, [replies.RPL_NAMREPLY, nick, "=", message.params[0]], clientStore.names().join(" ")));
                    socket.write(respondMessage(hostaddress, [replies.RPL_ENDOFNAMES, nick, message.params[0]], "End of NAMES list"));
                }
            break;
            case "LIST":
                var nick = clientStore.getClientName(socket).split("!")[0]; 
            
                var chans = chanels.channelNames();
                for (var i = 0; i < chans.length; i++) {
                    socket.write(respondMessage(hostaddress, [replies.RPL_LIST, nick, chans[i], chanels.list[chans[i]].users.length], chanels.list[chans[i]].topic));                    
                }
                socket.write(respondMessage(hostaddress, [replies.RPL_LISTEND], "End of LIST")); 
            break;    
            case "NAMES":
                var nick = clientStore.getClientName(socket).split("!")[0];             
                var reply = respondMessage(hostaddress, [replies.RPL_NAMREPLY, nick, "=", message.params[0]], " :")
                if (message.params[0] != undefined && chanels.list[message.params[0]] != undefined){
                    socket.write(respondMessage(hostaddress, [replies.RPL_NAMREPLY, nick, "=", message.params[0]], chanels.list[message.params[0]].users.join(" ")))
                } else {
                    socket.write(respondMessage(hostaddress, [replies.RPL_NAMREPLY, nick, "=", message.params[0]], clientStore.names().join(" ")))
                }
                socket.write(respondMessage(hostaddress, [replies.RPL_ENDOFNAMES, nick, message.params[0]], "End of NAMES list"));
            break;
            case "PING":       
                socket.write(respondMessage(hostaddress, ["PONG", hostaddress], message.params[0]));                
            break;
            case "PART":
                var nick = clientStore.getClientName(socket).split("!")[0];                         
                var leavingError = chanels.leave(nick, message.params[0]);
                clientStore.partChannel(socket, message.params[0]);
                if (leavingError){
                    socket.write(respondMessage(hostaddress, [leavingError, nick]));                
                }
            break;     
            case "PRIVMSG":
                var from = clientStore.getClientName(socket);
                var nick = from.split("!")[0];
                if (message.params[0].indexOf("#") == 0 || message.params[0].indexOf("&") == 0){
                    if (chanels.list[message.params[0]] == undefined){
                        socket.write(hostaddress, [replies.ERR_NOSUCHNICK, nick], "No such channel")                        
                    }
                    for (var i = 0; i < chanels.list[message.params[0]].users.length; i++) {
                        if (chanels.list[message.params[0]].users[i] != nick)
                            clientStore.getSocketByNick(chanels.list[message.params[0]].users[i]).write(respondMessage(from, ["PRIVMSG", message.params[0]], message.params[1]));
                    }
                } else {
                    var recipient = clientStore.getSocketByNick(message.params[0]);
                    if (recipient == null) {
                        socket.write(hostaddress, [replies.ERR_NOSUCHNICK, nick], "No such nick")                                                
                    }

                    recipient.write(respondMessage(from, ["PRIVMSG", message.params[0]], message.params[1]));
                }
            break;     
        }
    }
}

function respondMessage(prefix, args, trailing){
    if (prefix){
        args.unshift(":"+prefix);
    }
    if (trailing){
        args.push(":"+trailing)
    }
    args.push("\r\n");
    return args.join(" ");
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