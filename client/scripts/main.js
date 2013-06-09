/*
 Po stronie klienta jest użyta biblioteka requireJS do rozwiązywania zależności między plikami JS
 */
require(['jquery', 'sockjs'], function() {
    var wynik = $('#wynik')
    var viewDiv = $('#view')
    var worldDiv = $('#world')
    var segments = {}
    var pajaks = {}
    var muszkas = {}
    var segmentSize = 11
    var myPajakId = null
    var camX = 0, camY = 0;

    /* Funkcja przesuająca kamere na zadaną pozycje
     */
    var moveCameraTo = function(x, y) {
        camX = x
        camY = y
        var xc = viewDiv[0].offsetWidth / 2
        var yc = viewDiv[0].offsetHeight / 2
        var xp = xc - x * segmentSize
        var yp = yc - y * segmentSize
        worldDiv.css('left', xp + 'px')
        worldDiv.css('top', yp + 'px')
    }

    /* Wrzuca element DOM pokazujący segment węża do elementu DOM świata gry
     */
    var putSegment = function(x, y, sid) {
       /* switch (pajaks[sid] % 5) {
            case 1:
                var color = "#606060";
                break;
            case 2:
                var color = "#005f5f";
                break;
            case 3:
                var color = "#025f00"
                break;
            case 4:
                var color = "#5f0000";
                break;
            case 0:
                var color = "#5f0055";
                break;
        } */
        var color=pajaks[sid].color ;
        if (segments[x + '_' + y])
            segments[x + '_' + y].remove()
        var seg = $('<div class="pajakSegment"></div>')
        seg.css('background-color', color)
        seg.css('left', (x * segmentSize) + 'px')
        seg.css('top', (y * segmentSize) + 'px')
        segments[x + '_' + y] = seg
        worldDiv.append(seg)
    }

    /* Funkcja usuwająca element DOM segmentu o podanej pozycji
     */
    var removeSegment = function(x, y) {
        if (segments[x + '_' + y]) {
            segments[x + '_' + y].remove()
            delete segments[x + '_' + y]
            
        }
    }

    /* Funkcja dodająca jabłko do gry
     */
    var putMuszka = function(x, y) {
        if (muszkas[x + '_' + y])
            muszkas[x + '_' + y].remove()
        var a = $('<div class="muszka"></div>')
        a.css('left', (x * segmentSize) + 'px')
        a.css('top', (y * segmentSize) + 'px')
        muszkas[x + '_' + y] = a
        worldDiv.append(a)
    }

    /* Funkcja usuwająca jabłko z gry
     */
    var removeMuszka = function(x, y) {
        if (muszkas[x + '_' + y]) {
            muszkas[x + '_' + y].remove()
            delete muszkas[x + '_' + y]
        }
    }

    var send = null

    /* Funkcja łącząca z serwerem
     */
    var connect = function() {
        var sock = new SockJS('/ws');

        sock.onopen = function() {
            send = function(msg) {
                sock.send(JSON.stringify(msg))
            }
            $('.loader').fadeOut()
            $('.info').slideDown()
            $('.info button').click(function() {
                if (myPajakId)
                    return;
                $('.info').fadeOut()
                send({type: 'joinGame'})
            })
        }
        /* Funkcja obsługująca zdarzenie otrzymania wiadomości od serwera
         */
        sock.onmessage = (function(data) {
            var msg = JSON.parse(data.data)
            switch (msg.type) {
                case 'gameState' :
                    for (var id in msg.pajaks) {
                        var pajak = msg.pajaks[id]
                        pajaks[pajak.id] = pajak
                        var segments = pajak.segments
                        segments.forEach(function(seg) {
                            putSegment(seg.x, seg.y, pajak.id)
                        })
                    }
                    msg.muszkas.forEach(function(p) {
                        putMuszka(p[0], p[1])
                    })
                    break;
                case 'joined' :
                    myPajakId = msg.pajakId
                    break;
                case 'addPajak' :
                    var segments = msg.pajak.segments
                    pajaks[msg.pajak.id] = msg.pajak
                    segments.forEach(function(seg) {
                        putSegment(seg.x, seg.y, msg.pajak.id)
                    })
                    if (msg.pajak.id == myPajakId)
                        moveCameraTo(segments[segments.length - 1].x, segments[segments.length - 1].y)
                    break;
                case 'addSegment' :
                    pajaks[msg.pajakId].segments.push(msg.segment)
                    putSegment(msg.segment.x, msg.segment.y, msg.pajakId)
                    if (msg.pajakId == myPajakId)
                        moveCameraTo(msg.segment.x, msg.segment.y)
                    break;
                case 'removeSegment' :
                    pajaks[msg.pajakId].segments.shift()
                    removeSegment(msg.segment.x, msg.segment.y)
                    break;
                case 'removePajak' :
                    var pajak = pajaks[msg.pajakId]
                    pajak.segments.forEach(function(seg) {
                        removeSegment(seg.x, seg.y)
                    })
                    delete pajaks[msg.pajakId]
                    if (msg.pajakId == myPajakId)
                        setTimeout(function() {
                            send({type: 'joinGame'})
                        }, 500)
                    break;
                case 'addMuszka' :
                    putMuszka(msg.x, msg.y)
                    break;
                case 'removeMuszka' :
                    removeMuszka(msg.x, msg.y)
                    break;
            }
        }).bind(this)
        sock.onclose = function() {
            document.location.reload()
        }
    }

    $(window).keydown(function(ev) {
        switch (ev.keyCode) {
            case 37:
                send({type: 'setDirection', dir: 3});
                break;
            case 38:
                send({type: 'setDirection', dir: 0});
                break;
            case 39:
                send({type: 'setDirection', dir: 1});
                break;
            case 40:
                send({type: 'setDirection', dir: 2});
                break;
        }
    })

    moveCameraTo(camX, camY)
    connect()

    $(window).resize(function() {
        moveCameraTo(camX, camY)
    })
})