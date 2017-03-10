'use strict'
var fs = require("fs"),
  path = require("path"),
  request = require("request"),
  storeConfig = require("./storeConfig"),
  supportedFormats = ["mp4", "mkv", "avi"],
  userData = require("electron").app.getPath("userData"),
  libraryLocation = storeConfig.get("library").value,
  movies,
  incomplete,
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
    var downloads = JSON.parse(fs.readFileSync(path.join(userData, "downloads.json")));
    movies = downloads.movies;
    incomplete = downloads.incomplete;
  }catch(err){
    if(err.code === "ENOENT"){
      movies = {};
      incomplete = [];
    }
  }

  var needInfo = library.filter(function(id){
    return (Object.keys(movies).indexOf(id) === -1);
  });

  var library = library.filter(function(id){
    return (Object.keys(movies).indexOf(id) !== -1);
  })

  toStore = {complete: library, incomplete: incomplete, movies: movies};

  var infoCount = 0;

  if(needInfo.length > 0){
    for(var i = 0; i < needInfo.length; i++){
      request("https://yts.ag/api/v2/movie_details.json?movie_id=" + needInfo[i], function(error, response, body){
        if(!error && response.statusCode == 200){
          body = JSON.parse(body);
          toStore.movies[body.data.movie.id] = body.data.movie;
          infoCount += 1;

          if(infoCount === needInfo.length){
            fs.writeFileSync(path.join(userData, "downloads.json"), JSON.stringify(toStore));
          }
        }
      })
    }
  }
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
