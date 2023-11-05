const net = require("net");

const checkRequest = (req) => {
  const stringBuffer = req.toString("utf8").split("\r\n");
  const startLine = stringBuffer.shift().split(" ");
  const headers = {};

  for (let i = 0; i < stringBuffer.length; i++) {
    const header = stringBuffer[i];
    if (header == "") {
      continue;
    }
    const [rKey, rValue] = header.split(": ");
    headers[rKey] = rValue;
  }

  return {
    method: startLine[0],
    path: startLine[1].split("/"),
    version: startLine[2],
    headers: headers,
  };
};

const sendText = (text) => {
  return (
    `HTTP/1.1 200 OK\r\n` +
    `Content-Type: text/plain\r\n` +
    `Content-Length: ${Buffer.byteLength(text)}\r\n` +
    `\r\n` +
    `${text}`
  );
};
const formatBody = (rawBody) => {
  return sendText(rawBody.join("/"));
};

const server = net.createServer((socket) => {
  socket.on("data", (req) => {
    const reqInfo = checkRequest(req);

    // console.log(reqInfo);

    if (reqInfo.path[1] == "") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      socket.end();
    } else if (reqInfo.path[1] == "echo") {
      const response = formatBody(reqInfo.path.slice(2));
      socket.write(response);
      socket.end();
    } else if (reqInfo.path[1] == "user-agent") {
      if (reqInfo.headers.hasOwnProperty("User-Agent")) {
        socket.write(sendText(reqInfo.headers["User-Agent"]));
        socket.end();
      } else {
        socket.write("HTTP/1.1 404 NOT FOUND\r\n\r\n");
        socket.end();
      }
    } else {
      socket.write("HTTP/1.1 404 NOT FOUND\r\n\r\n");
      socket.end();
    }
  }),
    socket.on("close", () => {
      socket.end();
      server.close();
    });
});

server.listen(4221, "localhost", "", () => {
  console.log("Port 4221, from localhost");
});
