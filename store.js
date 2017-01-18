'use strict'
var fs = require("fs"),
  path = require("path"),
  storeConfig = require("./storeConfig"),
  supportedFormats = ["mp4", "mkv", "avi"],
  appData = require("electron").app.getPath("appData"),
  libraryLocation = storeConfig.get("library").value,
  movies,
  library;
try{
  library = fs.readdirSync(libraryLocation).filter(function(val){
    return supportedFormats.indexOf(val.split(".")[1]) !== -1;
  }).map(function(val){
    return val.replace(new RegExp(".(" + supportedFormats.join("|") + ")", "gi"), "");
  });
}catch(err){
  console.log(err);
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
    toStore.incomplete.push(movie.id.toString());
    fs.writeFileSync(path.join(appData, "cascade", "downloads.json"), JSON.stringify(toStore));
  },
  //on completion add to complete and remove from incomplete
  complete: function(movie){
    toStore.movies[movie.id] = movie;
    toStore.complete.push(movie.id);
    delete toStore.incomplete[toStore.incomplete.indexOf(movie.id.toString())];
    fs.writeFileSync(path.join(appData, "cascade", "downloads.json"), JSON.stringify(toStore));
  },
  //returns both complete and incomplete torrents
  get: function(){
    return toStore
  },
  getFormat: function(id){
    if(toStore.complete.indexOf(id) !== -1){
      return fs.readdirSync(libraryLocation).filter(function(val){return val.includes(id)}).filter(function(val){return supportedFormats.indexOf(val.split(".")[1]) !== -1})[0].split(".")[1];
    }else{
      return false;
    }
  }
}
