var clients = {};

exports.clients = clients;
exports.names = function(){
    var keys = Object.keys(clients);
    var res = [];
    for (var i = 0; i < keys.length; i++) {
         res.push(clients[keys[i]].nick);        
    }
    return res;
}

function makeSocketKey(socket){
    return socket.remoteAddress + ":" + socket.remotePort;
}

exports.buildClient = function(socket, prop, msgContent){
    var key = makeSocketKey(socket);
    if (clients[key] == undefined){
        clients[key] = {};
        clients[key].channels = [];
        clients[key].socket = socket;
    } 

    if (prop != undefined)
         clients[key][prop] = msgContent;   
         
    return true;
}

exports.joinChannel = function(socket, channel){
    var key = makeSocketKey(socket);
    if (clients[key].channels.indexOf(channel) < 0){
        clients[key].channels.push(channel);
        return true;
    }

    return false;
}

exports.partChannel = function(socket, channel){
    var key = makeSocketKey(socket);    
    clients[key].channels.splice(clients[key].channels.indexOf(clients[key].nick, 1));
}

exports.getSocketByNick = function(nick){
    var keys = Object.keys(clients);
    for (var i = 0; i < keys.length; i++) {
         if (clients[keys[i]].nick == nick) {
             return clients[keys[i]].socket;
         }   
    }
}

exports.getClientName = function(socket){
    var key = makeSocketKey(socket);    
    return clients[key].nick + "!" + clients[key].user;
}