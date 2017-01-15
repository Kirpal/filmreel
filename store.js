'use strict'
var fs = require("fs"),
  path = require("path"),
  storeConfig = require("./storeConfig"),
  appData = require("electron").app.getPath("appData"),
  libraryLocation = storeConfig.get("library").value,
  movies,
  library;
try{
  library = fs.readdirSync(libraryLocation).filter(function(val){return val.split(".")[1] == "mp4"}).map(function(val){return val.replace(".mp4", "")});
}catch(err){
  if(err.code === "ENOENT"){
    library = [];
  }
}

try{
  movies = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "downloads.json"))).movies;
}catch(err){
  if(err.code === "ENOENT"){
    movies = {}
  }
}
var toStore = {complete: library, incomplete: [], movies: movies};

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
