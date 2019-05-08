/**
 * Created by Lanbin Tang on 2019/5/8.
 */
var http = require("http");
http.createServer(function(request, response) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write("Hello World!");
    response.end();
}).listen(8080);
console.log("Server running at http://localhost:8080/");
