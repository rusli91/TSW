var express = require('express');
var http = require('http');
var path = require('path');

var osm = express();
osm.configure(function() {
    osm.set('port', process.env.PORT || 3000);
    osm.use(express.favicon());
    osm.use(express.logger('dev'));
    osm.use(less({
        src: __dirname + '/public',
        compress: true
    }));
    osm.use(express.static(path.join(__dirname, 'client')));
});
var server = http.createServer(osm).listen(osm.get('port'), function() {
    console.log("Serwer http działa na porcie: " + osm.get('port'));
});  
