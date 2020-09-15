let io;
module.exports = {
    init: httpServer => {
        io = require('socket.io')(httpServer, {
            cookie: true
        })
        return io;
    },
    getIO: logger => {
        if(!io){
            logger.error('Failed Socket Initialization')
            return
        }
        return io;
    }
}