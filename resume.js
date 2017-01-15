'use strict'
var fs = require("fs"),
  path = require("path"),
  torrent = require("./torrent"),
  appData = require("electron").app.getPath("appData"),
  downloads = {},
  storedDownloads;
try{
  storedDownloads = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "downloads.json")));
}catch(err){
  if(err.code === "ENOENT"){
    storedDownloads = {"complete": [], "incomplete": [], "movies": {}};
  }
}

//resume all incomplete downloads

module.exports = function(){
  Object.keys(storedDownloads.incomplete).forEach(function(id){
    movie = storedDownloads.incomplete[id];
    downloads[movie.id] = torrent(movie, true);
  })
  return downloads
}
