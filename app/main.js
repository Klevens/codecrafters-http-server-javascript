const net = require("net");
const fs = require("fs");
const { constants } = require("fs/promises");

const argv = process.argv.slice(2);

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

  console.log("startLine: " + startLine);

  return {
    method: startLine[0],
    path: startLine[1].split("/"),
    version: startLine[2],
    headers: headers,
    stringBuffer,
  };
};

const sendText = (text, status = 200, cType = "text/plain") => {
  if (status == 400) {
    return "HTTP/1.1 404 NOT FOUND\r\n\r\n";
  } else {
    return (
      `HTTP/1.1 200 OK\r\n` +
      `Content-Type: ${cType}\r\n` +
      `Content-Length: ${Buffer.byteLength(text)}\r\n` +
      `\r\n` +
      `${text}`
    );
  }
};
const formatBody = (rawBody) => {
  return sendText(rawBody.join("/"));
};

const sendFile = async (fileR) => {
  let klk;
  if (argv[0] == "--directory" && argv[1] !== "") {
    const fR = fileR[0];
    const dirR = argv[1];

    klk = await new Promise((resolve, reject) => {
      // console.log(`${dirR}${fR}`);
      fs.access(`${dirR}${fR}`, constants.F_OK, async (err) => {
        if (err) {
          const response = sendText("", 400);
          resolve(response);
        } else {
          fs.readFile(`${dirR}${fR}`, "utf8", (err, data) => {
            if (err) {
              return;
            } else {
              const response = sendText(
                `${data}`,
                200,
                "application/octet-stream"
              );
              resolve(response);
            }
          });
        }
      });
    });
  } else {
    const response = sendText("", 400);
    klk = response;
  }

  return klk;
};

const handlePost = async (reqInfo, socket, fileR) => {
  //console.log("Llamada: "+ reqInfo.stringBuffer)
  const emptyIndex = reqInfo.stringBuffer.indexOf("");
  const contentAfterEmpty =
    emptyIndex !== -1 ? reqInfo.stringBuffer.slice(emptyIndex + 1) : [];

  const content = contentAfterEmpty.join("");

  console.log(content);

  if (argv[0] == "--directory" && argv[1] !== "") {
    const fR = fileR[0];
    const dirR = argv[1];
    fs.writeFile(`${dirR}${fR}`, content, "utf-8", (err) => {
      if (err) {
        console.error("Error writing the file:", err);
      } else {
        console.log("File created successfully!");
      }
    });
  }

  socket.write(
  `HTTP/1.1 201 CREATED\r\n` +
  `Content-Type: text/plain\r\n` +
  `Content-Length: ${Buffer.byteLength(content)}\r\n` +
  `\r\n` +
  `${content}`
  );
  socket.end();

  //   const bodyData = reqInfo.headers.hasOwnProperty("Content-Length")
  //   ? req.toString.slice(req.indexOf("\r\n\r\n") + 4)
  //   : Buffer.from([]);
};

const server = net.createServer(async (socket) => {
  let requestData = Buffer.from([]);

  socket.on("data", async (chunk) => {
    requestData = Buffer.concat([requestData, chunk]);

    if (requestData.includes("\r\n\r\n")) {
      const reqInfo = checkRequest(requestData);

      if (reqInfo.method == "POST") {
        const fileR = reqInfo.path.slice(2);
        await handlePost(reqInfo, socket, fileR);
      } else if (reqInfo.method == "GET") {
        if (reqInfo.path[1] == "") {
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
          socket.end();
        } else if (reqInfo.path[1] == "echo") {
          const response = formatBody(reqInfo.path.slice(2));
          socket.write(response);
          socket.end();
        } else if (reqInfo.path[1] == "files") {
          const fileR = reqInfo.path.slice(2);
          const response = await sendFile(fileR);
          //socket.write("HTTP/1.1 200 OK\r\n\r\n");
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
      }
      requestData = Buffer.from([]);
    }
  }),
    socket.on("close", () => {
      console.log("Socket cerrado correctamente.");
    });
});

server.listen(4221, "localhost", "", () => {
  console.log("Port 4221, from localhost");
});
