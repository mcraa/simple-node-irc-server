var clients = {};

exports.clients = clients;

function makeSocketKey(socket){
    return socket.remoteAddress + ":" + socket.remotePort;
}

exports.buildClient = function(socket, msgType, msgContent){
    var key = makeSocketKey(socket);
    if (clients[key] == undefined){
        clients[key] = {};
        clients[key].channels = [];
        clients[key].socket = socket;
    }

    switch (msgType) {
        case "NICK":
            clients[key].nick = msgContent;
            break;
        case "USER":
            clients[key].user = msgContent;
            break;
        
    }
}

exports.joinChannel = function(socket, channel){
    var key = makeSocketKey(socket);
    if (clients[key].channels.indexOf(channel) < 0){
        clients[key].channels.push(channel);
        return true;
    }

    return false;
}

exports.getClientName = function(socket){
    var key = makeSocketKey(socket);    
    return clients[key].nick + "!" + clients[key].user;
}