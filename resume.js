'use strict'
var fs = require("fs"),
  path = require("path"),
  torrent = require("./torrent"),
  userData = require("electron").app.getPath("userData"),
  downloads = {},
  storedDownloads;
try{
  storedDownloads = JSON.parse(fs.readFileSync(path.join(userData, "downloads.json")));
  fs.writeFileSync(path.join(userData, "downloads.json"), JSON.stringify({complete: storedDownloads.complete, incomplete: [], movies: storedDownloads.movies}));
}catch(err){
  if(err.code === "ENOENT"){
    storedDownloads = {"complete": [], "incomplete": [], "movies": {}};
  }
}

//resume all incomplete downloads

module.exports = function(win){
  storedDownloads.incomplete.forEach(function(id){
    if(Object.keys(storedDownloads.movies).indexOf(id) !== -1){
      downloads[id] = torrent(storedDownloads.movies[id], true, win);
    }
  })
  return downloads
}
