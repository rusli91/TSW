var serverPort=3000
var http=require('http') 
var sockjs=require('sockjs') 
var httpStatic=require('node-static') 
var Game=require('./game').Game 
var game = new Game() 
var lastObserverId=0 
var socket = sockjs.createServer(); 

/*Obsługa zdarzenia połączenia SockJS
*/
socket.on('connection', function(conn) { 
  var send=function(msg) { conn.write(JSON.stringify(msg)) } 
  var controlledPajakId = null 
  var observerId=++lastObserverId 
  game.addObserver(observerId,function(ev) { 

    if(ev.type=="removePajak" && ev.pajakId==controlledPajakId) { 
      controlledPajakId=null 
    }
    send(ev) 
  })

/* Obsługa zdarzenia odebrania danych od klienta
*/
  conn.on('data', function(message) { 
    try { 

      var obj=JSON.parse(message); 

      if(!controlledPajakId) { 
        switch(obj.type) { 
          case 'joinGame' : 
            controlledPajakId=game.addRandomPajak() 
            send({type:'joined', pajakId:controlledPajakId}) 
          break;
        }
      } else { 
        switch(obj.type) {
          case 'setDirection' : 
            game.pajaks[controlledPajakId].setDirection(obj.dir) 
          break;
        }
      }
    } catch(err) { 
      console.log(err); 

    }
  });
  conn.on('close', function() {  
    game.removeObserver(observerId) 
    if(controlledPajakId) { 
      game.killPajak(controlledPajakId) 
    }
  });
});

var file = new(httpStatic.Server)('../client'); 

var server = http.createServer(function (request, response) { 
  request.addListener('end', function () { 
    file.serve(request, response); 
  });
  request.resume() 
});

socket.installHandlers(server, { 
  websocket:false, 
  prefix:'/ws' 
});

server.listen(serverPort); 
console.log('Server Pajak stoi na porcie port: '+serverPort)

setInterval(function() { 
  game.processFrame() 
},150)