const net = require("net");

const checkRequest = (req) =>  {

   const stringBuffer = req.toString('utf8').split('\n');
   const startLine = stringBuffer[0].split(' ');

   return {
    method : startLine[0],
    path: startLine[1],
    version: startLine[2]
   }


}

const server = net.createServer((socket) => {

    socket.on('data', (req)=>{
        const reqInfo = checkRequest(req);


        if (reqInfo.path == '/'){
          socket.write('HTTP/1.1 200 OK\r\n\r\n');
        
          socket.end();
          server.close();
        } else { 

          socket.write('HTTP/1.1 404 NOT FOUND\r\n\r\n');       
          socket.end();
          server.close();
        }





    }),

  socket.on("close", () => {
    socket.end();
    server.close();
  });
});

server.listen(4221, "localhost");
