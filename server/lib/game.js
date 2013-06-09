/*
  Funkcja konwertująca kolory HSL na kolory RGB
  Została wykorzystana do wyliczania losowych kolorów węży
 */
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

/*
  Klasa węża
 */
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

/* Metoda do zmiany kierunku węża
 */
Pajak.prototype.setDirection = function(dir) {
  if(Math.abs(this.lastDir-dir)==2) return; 
  this.dir=dir 
}

/* Metoda wydłużająca węża od zadaną liczbę jabłek
 */
Pajak.prototype.incraseLength = function(by) {
  this.length+=by 
  $('wynik').text(this.length);
}

/* Metoda wykonująca ruch węża, wykonywana co klatkę gry
 */
Pajak.prototype.move = function() {
  this.x+=dirVec[this.dir].x 
  this.y+=dirVec[this.dir].y 

  if(this.game.getSegment(this.x,this.y)) { 
    this.game.killPajak(this.id) 
    return; 
  }
  if(this.game.getMuszka(this.x,this.y)){ 
    this.game.removeMuszka(this.x,this.y) 
    this.length+=1 
  }
  var newSegment={x:this.x,y:this.y} 
  this.game.addSegment(newSegment.x,newSegment.y,this.id) 
  this.segments.push(newSegment) 

  if(this.segments.length>this.length) { 
    var segment=this.segments[0]  
    this.game.addSegment(newSegment.x,newSegment.y,this.id) 
  this.segments.push(newSegment) 
    this.segments.shift() 
  }

  this.lastDir=this.dir 
}

/* Metoda zwraca dane węża które są przydatne dla klienta do wyświetlenia go
 */
Pajak.prototype.getNetInfo = function() {
  return {
    id:this.id, 
    color:this.color, 
    segments:this.segments 
  }
}

/* Metoda po cichu usuwa węża z gry
 */
Pajak.prototype.remove = function() {
  this.segments.forEach((function(segment) { 
    this.game.removeSegment(segment.x,segment.y,this.id,true) 
  }).bind(this))
}

/*
  Klasa gry, zawiera wszystkie węże i wszystkie jabłka i wszystkich obserwatorów
 */
var Game = function() {
  this.pajaks={} 
  this.deadPajaks={} 
  this.newSegments={} 
  this.oldSegments={} 
  this.lastPajakId=0 
  this.observers={} 
  this.muszkas={} 
//  this.muszkasPerPajak=2 

  for(var i=0; i<10; i++) this.addRandomMuszka() 
}    

/* Metoda dodaje segment do gry i wysyła informacje o nim do obserwatorów
 */
Game.prototype.addSegment = function(x,y,pajakId) {
  this.broadcastEvent({type:"addSegment", pajakId:pajakId, segment:{x:x,y:y}}) 
  this.newSegments[x+'_'+y]=pajakId 
}

/* Metoda usuwa segment z gry i wysyła informacje o tym do obserwatorów
 */
Game.prototype.removeSegment = function(x,y,pajakId,quiet) {
  if(!quiet) this.broadcastEvent({type:"removeSegment", pajakId:pajakId, segment:{x:x,y:y}}) 
  delete this.newSegments[x+'_'+y] 
}

/* Metoda do pobierania segmentów wg. pozycji, jest wykorzystywana do wykrywania kolizji
 */
Game.prototype.getSegment = function(x,y) {
  return this.oldSegments[x+'_'+y] 
}

/* Metoda wyliczająca rozrzucenie pojawiąjących się węży - zależy ono od ilości węży w grze
 */
Game.prototype.getPajakSpread = function() {
  return Object.keys(this.pajaks).length*7+5
}

/* Metoda wyliczająca rozrzucenie pojawiąjących się jabłek - zależy ono od ilości węży w grze
 */
Game.prototype.getMuszkaSpread = function() {
  return Object.keys(this.pajaks).length*15+25
}

/* Metoda dodająca losowe jabłko
 */
Game.prototype.addRandomMuszka = function() {
  var x, y, rc=0 
  var as=this.getMuszkaSpread() 
  do { 
    x=Math.floor(Math.random()*(as*2+1))-as 
    y=Math.floor(Math.random()*(as*2+1))-as
    rc++ 
    if(rc>1000) return; 
  } while(this.getSegment(x,y) || this.muszkas[x+'_'+y]) 
  this.broadcastEvent({type:"addMuszka", x:x, y:y}) 
  this.muszkas[x+'_'+y]=true 
}

/* Metoda usuwająca jabłko o podanej pozycji
 */
Game.prototype.removeMuszka = function(x,y) {
  this.broadcastEvent({type:"removeMuszka", x:x, y:y}) 
  delete this.muszkas[x+'_'+y] 
}

/* Metoda pobierająca jabłko o podanej pozycji - służy do wykrywania jabłek na drodze węża
 */
Game.prototype.getMuszka = function(x,y) {
  return this.muszkas[x+'_'+y] 
}

/* Metoda do generowania kolejnych unikalnych ID węży
 */
Game.prototype.nextPajakId = function() {
  return ++this.lastPajakId 
}

/* Metoda dodająca losowego węża i zwracająca jego ID
 */
Game.prototype.addRandomPajak = function() {
  var ss=this.getPajakSpread() 
  var x=Math.floor(Math.random()*(ss*2+1))-ss 
  var y=Math.floor(Math.random()*(ss*2+1))-ss

  var rgb=hslToRgb(Math.random(),0.5,0.5) 
  var color='rgb('+rgb.join(',')+')' 

  var pajak=new Pajak(this,this.nextPajakId(),x,y,Math.floor(Math.random()*4),5,color) 
  this.pajaks[pajak.id]=pajak 
  this.broadcastEvent({type:"addPajak", pajak:pajak.getNetInfo()}) 
  return pajak.id 
}

/* Metoda zabijająca węża z opóźnieniem.
   Konieczne jest usuwanie węża po zakończeniu klatki gry, a nie w czasie jej trwania.
 */
Game.prototype.killPajak = function(id) {

  this.deadPajaks[id]=true 
}

/* Metoda przetwarzająca klatkę logiki gry
 */
Game.prototype.processFrame = function() {
  this.oldSegments=this.newSegments 
  this.newSegments=JSON.parse(JSON.stringify(this.oldSegments)) 

  for(var id in this.pajaks) { 
    this.pajaks[id].move() 
  }
  for(var id in this.deadPajaks) { 
    this.broadcastEvent({type:"removePajak", pajakId:id, segments:this.pajaks[id].segments}) /
    this.pajaks[id].remove() 
    delete this.pajaks[id] 
  }
  this.deadPajaks={} 

  if(Object.keys(this.muszkas).length<Object.keys(this.pajaks).length*this.muszkasPerPajak) { 
    this.addRandomMuszka()
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
  var pajakInfo={} 
  var muszkaInfo=[] 
  for(var k in this.pajaks) { 
    pajakInfo[k]=this.pajaks[k].getNetInfo() 
  }
  for(var k in this.muszkas) { 
    muszkaInfo.push(k.split('_')) 
  }
  ob({ 
    type:'gameState', 
    pajaks:pajakInfo, 
    muszkas:muszkaInfo 
  })
}

/* Metoda usuwająca obseratora
 */
Game.prototype.removeObserver=function(id) {
  delete this.observers[id] 
}

exports.Game=Game