'use strict'
var fs = require("fs"),
  path = require("path"),
  storeConfig = require("./storeConfig"),
  libraryLocation = storeConfig.get("library").value,
  library = fs.readdirSync(libraryLocation).filter(function(val){return val.split(".")[1] == "mp4"}).map(function(val){return val.replace(".mp4", "")}),
  appData = require("electron").app.getPath("appData"),
  movies = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "downloads.json"))).movies,
  toStore = {complete: library, incomplete: [], movies: movies};

//store current incomplete and complete torrents in downloads.json
module.exports = {
  //add incomplete torrent
  incomplete: function(movie){
    toStore.movies[movie.id] = movie;
    toStore.incomplete.push(movie.id);
  },
  //on completion add to complete and remove from incomplete
  complete: function(movie){
    toStore.movies[movie.id] = movie;
    delete toStore.incomplete[toStore.incomplete.indexOf(movie.id)];
  },
  //save to downloads.json
  save: function(){
    fs.writeFileSync(path.join(appData, "cascade", "downloads.json"), JSON.stringify(toStore));
  },
  //returns both complete and incomplete torrents
  get: function(){
    return toStore
  }
}
