'use strict'
var torrentStream = require("torrent-stream"),
    request = require("request"),
    notifier = require("node-notifier"),
    path = require("path"),
    store = require("./store"),
    storeConfig = require("./storeConfig"),
    chosenTorrent = false,
    magnet = "",
    opts = {},
    library = storeConfig.get("library").value;

module.exports = function(movie, download){
  download = (typeof download === "undefined") ? true : false;
  chosenTorrent = movie.torrents.reduce(function(a, b){
    if(a.quality.toUpperCase() != "3D"){
      if(b.quality.toUpperCase() != "3D"){
        return (a.size_bytes < b.size_bytes) ? a : b
      }else{
        return false
      }
    }else{
      if(b.quality.toUpperCase() != "3D"){
        return b
      }else{
        return false
      }
    }
  })
  if(chosenTorrent){
    magnet = "magnet:?xt=urn:btih:" + chosenTorrent.hash +
    "&dn=" + movie.title + "+%28" +
    movie.year + "%29+%5B" +
    chosenTorrent.quality + "%5D+%5BYTS.AG%5D\
    &tr=udp://glotorrents.pw:6969/announce\
    &tr=udp://tracker.opentrackr.org:1337/announce\
    &tr=udp://torrent.gresille.org:80/announce\
    &tr=udp://tracker.openbittorrent.com:80\
    &tr=udp://tracker.coppersurfer.tk:6969\
    &tr=udp://tracker.leechers-paradise.org:6969\
    &tr=udp://p4p.arenabg.ch:1337\
    &tr=udp://tracker.internetwarriors.net:1337";
    if(download) opts.tmp = library
    var engine = torrentStream(magnet, opts);
    engine.once("ready", function(){
      var file = engine.files.reduce(function(a, b){
        return (a.length > b.length) ? a : b
      })
      file.select();
      engine.file = file;
      console.log(file)
      if(download){
        store.incomplete(movie)
      }
    });
    engine.complete = false;
    engine.on("idle", function(){
      engine.complete = true;
      if(download){
        store.complete(movie);
        if(storeConfig.get("notify").value){
          notifier.notify({
            title: "Movie Downloaded",
            message: movie.title + " has finished downloading!",
            icon: path.join(__dirname, "images", "icon.png")
          })
        }
      }
    })
    engine.download = download;
    engine.movie = movie
    return engine
  }
}
