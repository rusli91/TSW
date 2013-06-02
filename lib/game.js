
function hslToRgb(h, s, l){
  var r, g, b;
  if(s == 0){
    r = g = b = l;
  }else{
    function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

var dirVec=[{x:0, y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}] // Tablica wektorów ruchu odpowiadających kierunkom: n,e,s,w


var Pajak = function(game,id,sx,sy,dir,len,color) {
  this.game=game 
  this.id=id 
  this.x=sx 
  this.y=sy
  this.dir=dir 
  this.length=len 
  this.segments=[{x:sx,y:sy}] 
  this.color=color 
  this.lastDir=dir 
}

/* Metoda do zmiany kierunku pajaka
 */
Pajak.prototype.setDirection = function(dir) {
  if(Math.abs(this.lastDir-dir)==2) return; 
  this.dir=dir 
}



/* Metoda wykonująca ruch oahaj, wykonywana co klatkę gry
 */
Pajak.prototype.move = function() {
  this.x+=dirVec[this.dir].x 
  this.y+=dirVec[this.dir].y 

  if(this.game.getSegment(this.x,this.y)) { 
    this.game.killPajak(this.id) 
    return; 
  }
  if(this.game.getApple(this.x,this.y)){ 
    this.game.removeApple(this.x,this.y) 
    this.length+=1 
  }
  var newSegment={x:this.x,y:this.y} 
  this.game.addSegment(newSegment.x,newSegment.y,this.id) 
  this.segments.push(newSegment) 

  if(this.segments.length>this.length) { 
    var segment=this.segments[0] 
    this.game.removeSegment(segment.x,segment.y,this.id) 
    this.segments.shift() 
  }

  this.lastDir=this.dir 
}

/* Metoda zwraca dane pjąka które są przydatne dla klienta do wyświetlenia go
 */
Pajak.prototype.getNetInfo = function() {
  return {
    id:this.id, 
    color:this.color, 
    segments:this.segments 
  }
}

/* Metoda po cichu usuwa pająka z gry
 */
Pajak.prototype.remove = function() {
  this.segments.forEach((function(segment) { 
    this.game.removeSegment(segment.x,segment.y,this.id,true) 
  }).bind(this))
}

/*
  Klasa gry, zawiera wszystkie pająki i wszystkie jabłka i wszystkich obserwatorów
 */
var Game = function() {
  this.Pajaks={} 
  this.deadPajaks={} 
  this.newSegments={} 
  this.oldSegments={} 
  this.lastPajakId=0 
  this.observers={} 
  this.apples={} 
  this.applesPerPajak=2 

  for(var i=0; i<10; i++) this.addRandomApple() 
}    

/* Metoda dodaje segment do gry i wysyła informacje o nim do obserwatorów
 */
Game.prototype.addSegment = function(x,y,PajakId) {
  this.broadcastEvent({type:"addSegment", PajakId:PajakId, segment:{x:x,y:y}}) 
  this.newSegments[x+'_'+y]=PajakId 
}

Game.prototype.removeSegment = function(x,y,PajakId,quiet) {
  if(!quiet) this.broadcastEvent({type:"removeSegment", PajakId:PajakId, segment:{x:x,y:y}}) 
  delete this.newSegments[x+'_'+y] 
}

/* Metoda do pobierania segmentów wg. pozycji, jest wykorzystywana do wykrywania kolizji
 */
Game.prototype.getSegment = function(x,y) {
  return this.oldSegments[x+'_'+y] 
}

Game.prototype.getPajakSpread = function() {
  return Object.keys(this.Pajaks).length*7+5
}

/* Metoda wyliczająca rozrzucenie pojawiąjących się jabłek - zależy ono od ilości pakąjy w grze
 */
Game.prototype.getAppleSpread = function() {
  return Object.keys(this.Pajaks).length*15+25
}


/* Metoda usuwająca jabłko o podanej pozycji
 */
Game.prototype.removeApple = function(x,y) {
  this.broadcastEvent({type:"removeApple", x:x, y:y}) 
  delete this.apples[x+'_'+y] 
}

/* Metoda pobierająca jabłko o podanej pozycji - służy do wykrywania jabłek na drodze pakąja
 */
Game.prototype.getApple = function(x,y) {
  return this.apples[x+'_'+y] 
}

/* Metoda do generowania kolejnych unikalnych ID pająków
 */
Game.prototype.nextPajakId = function() {
  return ++this.lastPajakId 
}

/* Metoda dodająca losowego pająka i zwracająca jego ID
 */
Game.prototype.addRandomPajak = function() {
  var ss=this.getPajakSpread() 
  var x=Math.floor(Math.random()*(ss*2+1))-ss 
  var y=Math.floor(Math.random()*(ss*2+1))-ss

  var rgb=hslToRgb(Math.random(),0.5,0.5) 
  var color='rgb('+rgb.join(',')+')' 

  var Pajak=new Pajak(this,this.nextPajakId(),x,y,Math.floor(Math.random()*4),5,color) 
  this.Pajaks[Pajak.id]=Pajak 
  this.broadcastEvent({type:"addPajak", Pajak:Pajak.getNetInfo()}) 
  return Pajak.id 
}

/* Metoda zabijająca pająka z opóźnieniem.
 */
Game.prototype.killPajak = function(id) {
  this.deadPajaks[id]=true 
}


Game.prototype.processFrame = function() {
  this.oldSegments=this.newSegments 
  this.newSegments=JSON.parse(JSON.stringify(this.oldSegments)) 

  for(var id in this.Pajaks) { 
    this.Pajaks[id].move() 
  }
  for(var id in this.deadPajaks) { 
    this.broadcastEvent({type:"removePajak", PajakId:id, segments:this.Pajaks[id].segments}) /
    this.Pajaks[id].remove() 
    delete this.Pajaks[id] 
  }
  this.deadPajaks={} 

  if(Object.keys(this.apples).length<Object.keys(this.Pajaks).length*this.applesPerPajak) { 
    this.addRandomApple()
  }
}

/* Metoda rozsyłająca zdarzenie do wszystkich obserwatorów
 */
Game.prototype.broadcastEvent=function(ev) {
  for(var id in this.observers) { 
    this.observers[id](ev) 
  }
}

/* Metoda dodająca obseratora i wysyłająca mu stan gry
 */
Game.prototype.addObserver=function(id,ob) {
  this.observers[id]=ob 
  var PajakInfo={} 
  var appleInfo=[] 
  for(var k in this.Pajaks) { 
    PajakInfo[k]=this.Pajaks[k].getNetInfo() 
  }
  for(var k in this.apples) { 
    appleInfo.push(k.split('_')) 
  }
  ob({ 
    type:'gameState', 
    Pajaks:PajakInfo, 
    apples:appleInfo 
  })
}

/* Metoda usuwająca obseratora
 */
Game.prototype.removeObserver=function(id) {
  delete this.observers[id] 
}

exports.Game=Game