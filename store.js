'use strict'
var fs = require("fs"),
  path = require("path"),
  storeConfig = require("./storeConfig"),
  supportedFormats = ["mp4", "mkv", "avi"],
  userData = require("electron").app.getPath("userData"),
  libraryLocation = storeConfig.get("library").value,
  movies,
  library,
  toStore;

function reload(){
  libraryLocation = storeConfig.get("library").value;
  try{
    library = fs.readdirSync(libraryLocation).filter(function(val){
      return supportedFormats.indexOf(val.split(".")[1]) !== -1;
    }).map(function(val){
      return val.replace(new RegExp(".(" + supportedFormats.join("|") + ")", "gi"), "");
    });
  }catch(err){
    if(err.code === "ENOENT"){
      library = [];
    }
  }

  try{
    movies = JSON.parse(fs.readFileSync(path.join(userData, "downloads.json"))).movies;
  }catch(err){
    if(err.code === "ENOENT"){
      movies = {}
    }
  }
  toStore = {complete: library, incomplete: [], movies: movies};
}

reload();

//store current incomplete and complete torrents in downloads.json
module.exports = {
  //add incomplete torrent
  incomplete: function(movie){
    toStore.movies[movie.id] = movie;
    toStore.incomplete.push(movie.id.toString());
    fs.writeFileSync(path.join(userData, "downloads.json"), JSON.stringify(toStore));
  },
  //on completion add to complete and remove from incomplete
  complete: function(movie){
    toStore.movies[movie.id] = movie;
    toStore.complete.push(movie.id);
    delete toStore.incomplete[toStore.incomplete.indexOf(movie.id.toString())];
    fs.writeFileSync(path.join(userData, "downloads.json"), JSON.stringify(toStore));
  },
  //returns both complete and incomplete torrents
  get: function(){
    return toStore
  },
  getFormat: function(id){
    if(toStore.complete.indexOf(id) !== -1){
      return fs.readdirSync(libraryLocation).filter(function(val){return val.startsWith(id)}).filter(function(val){return supportedFormats.indexOf(val.split(".")[1]) !== -1})[0].split(".")[1];
    }else{
      return false;
    }
  },
  //reload library
  reload: reload,
  //remove library movie
  remove: function(id){
    try{
      var movieFile = fs.readdirSync(libraryLocation).filter(function(val){
        return supportedFormats.indexOf(val.split(".")[1]) !== -1;
      }).filter(function(val){
        return val.startsWith(id);
      });
      if(movieFile.length === 1){
        fs.unlinkSync(path.join(libraryLocation, movieFile[0]));
      }
    }catch(err){

    }
  }
}
