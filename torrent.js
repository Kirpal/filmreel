'use strict'
var torrentStream = require("torrent-stream"),
    notifier = require("node-notifier"),
    path = require("path"),
    fs = require("fs"),
    mv = require("mv"),
    store = require("./store"),
    storeConfig = require("./storeConfig");

//modified from http://stackoverflow.com/a/32197381
function rmDir(rmPath){
  if(fs.existsSync(rmPath)){
    fs.readdirSync(rmPath).forEach(function(file){
      var newPath = path.join(rmPath, file);
      if(fs.lstatSync(newPath).isDirectory()){
        rmDir(newPath);
      }else{
        fs.unlinkSync(newPath);
      }
    });
    fs.rmdirSync(rmPath);
  }
}

module.exports = function(movie, download, win, showProgressBar){
  var chosenTorrent = false,
    magnet = "",
    opts = {},
    library = storeConfig.get("library").value;
  download = !!download;
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
    if(download){
      opts.path = path.join(library, movie.id.toString());
      if(!fs.existsSync(opts.path)){
        opts.path.split(path.sep).forEach(function(dir, idx, full){
          var parent = full.slice(0, idx).join(path.sep);
          var dirPath = path.join(parent, dir);
          if(!fs.existsSync(dirPath)){
            fs.mkdirSync(dirPath);
          }
        });
      }
    }
    var engine = torrentStream(magnet, opts);
    engine.once("ready", function(){
      var file = engine.files.reduce(function(a, b){
        return (a.length > b.length) ? a : b
      })
      file.select();
      engine.totalLength = engine.files.map(function(val){
        return val.length
      }).reduce(function(a, b){
        return a + b;
      });
      engine.file = file;
      if(download){
        store.incomplete(movie)
      }
    });
    engine.complete = false;
    engine.on("idle", function(){
      engine.complete = true;
      win.webContents.send("downloadFinished", {movie: movie, notify: storeConfig.get("notify").value});
      if(download){
        store.complete(movie);
        mv(path.join(opts.path, engine.file.path), path.join(library, (movie.id + "." + engine.file.name.split(".")[engine.file.name.split(".").length-1])), {mkdirp: false}, function(err){
          rmDir(opts.path);
        });
      }
    })
    engine.end = function(){
      engine.destroy();
      if(download && !engine.complete){
        rmDir(opts.path);
      }
    }
    engine.getProgress = function(){
      return engine.swarm.downloaded/engine.totalLength;
    }
    engine.on("download", function(){
      if(download){
        if(showProgressBar){
          win.setProgressBar(engine.getProgress());
        }
        win.webContents.send("downloadProgress", {id: movie.id, progress: engine.getProgress()});
      }
    });
    engine.download = download;
    engine.movie = movie
    return engine
  }
}
