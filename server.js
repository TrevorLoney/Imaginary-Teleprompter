var server = require('websocket').server;
var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');
var connections = [];

var socket = new server({  
    httpServer: http.createServer().listen(1337)
});

socket.on('request', function(request) { 

    var connection = request.accept(null, request.origin);
    connection.resourceId = request.resource;
    connection.on('message', function(message) {
        socket.connections.map(x=>{
            if(connection.resourceId !== x.resourceId){
                x.sendUTF(message.utf8Data);
            }
        });
    });

    connection.on('close', function(conn) {
        console.log('connection closed');
        socket.connections.map(x=>{
            if(connection.resourceId !== x.resourceId){
                x.sendUTF('{"request":14}');
            }
        });
    });
});



http.createServer(function (request, response) {
    if(request.method==="GET"){
        
        var filePath = './prompt' + url.parse(request.url).pathname + (path.basename(request.url) == ''? 'index.html': '');
        
        var extname = path.extname(filePath);
        var contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;      
            case '.jpg':
                contentType = 'image/jpg';
                break;
            case '.wav':
                contentType = 'audio/wav';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
        }

        fs.readFile(filePath, function(error, content) {
            if (error) {
                if(error.code == 'ENOENT'){
                    fs.readFile('./404.html', function(error, content) {
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.end(content, 'utf-8');
                    });
                }
                else {
                    response.writeHead(500);
                    response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                    response.end(); 
                }
            }
            else {
                response.writeHead(200, { 'Content-Type': contentType });
                response.end(content, 'utf-8');
            }
        });
        
    }
    else{
        
        let data = '';
        request.on('data', chunk => {
            try{
                data += chunk;
            }
            catch(e){
                console.log("chunk error");
                console.log(chunk);
            }
        });
        request.on('end', () => {
            sessionStorage[path.basename(request.url)] = JSON.parse(data || null);
            response.end('success', 'utf-8');
        });
    }    
}).listen(8125);    


console.log('Server running at http://127.0.0.1:8125/');