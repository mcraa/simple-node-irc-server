var replies = require('./replies').codes;

var chanels = {
    "#default": {
        topic: "no topic",
        users: []
    },
    "#random": {
        topic: "no topic",
        users: []
    },
    "#general": {
        topic: "no topic",
        users: []
    }
};

exports.list = chanels;
exports.channelNames = Object.keys(chanels);
exports.joinOrCreate = function(nick, channel){
    if(chanels[channel] == undefined){
        chanels[channel] = {}
        chanels[channel].topic = "New channel";
        chanels[channel].users = [];
    }

    chanels[channel].users.push(nick);    
}

exports.leave = function(nick, channel){
    if (chanels[channel] == undefined)
        return replies.ERR_NOSUCHCHANNEL;

    if (chanels[channel].users.indexOf(nick) < 0)
        return replies.ERR_NOSUCHNICK;

    chanels[channel].users.splice(chanels[channel].users.indexOf(nick),1)
    return false;
}