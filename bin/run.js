'use strict';

const request = require('superagent');
const service = require('../server/service');
const http = require('http');

const server = http.createServer(service);
server.listen();

server.on('listening',function(){
    console.log(`bothelper is listening on ${server.address().port} in ${service.get('env')}`);

    const announce = () => {
        request.put(`http://127.0.0.1:3020/service/token/${server.address().port}`,(err,res)=>{
            if(err){
                console.log(err);
                console.log("there is a error connecting to chat bot");
                return;
            }
            console.log(res.body);
        });
    };

    announce();
    setInterval(announce,15*1000);
});