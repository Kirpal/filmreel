'use strict'
var fs = require("fs"),
  path = require("path"),
  torrent = require("./torrent"),
  appData = require("electron").app.getPath("appData"),
  downloads = {},
  storedDownloads = {};

//resume all incomplete downloads

module.exports = function(){
  storedDownloads = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "downloads.json")));

  Object.keys(storedDownloads.incomplete).forEach(function(id){
    movie = storedDownloads.incomplete[id];
    downloads[movie.id] = torrent(movie, true);
  })
  return downloads
}
