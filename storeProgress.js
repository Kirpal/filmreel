'use strict'
var fs = require("fs"),
  path = require("path"),
  userData = require("electron").app.getPath("userData"),
  toStore;
try{
  toStore = JSON.parse(fs.readFileSync(path.join(userData, "progress.json")));
}catch(err){
  if(err.code === "ENOENT"){
    toStore = {"recent":[], "progress":{}};
  }
}

//stores and retreives movies' progress by id (in progress.json)

module.exports = {
  store: function(progress, total, id){
    toStore.progress[id] = progress/total;
    if(toStore.recent.indexOf(id) === -1){
      if(toStore.recent.length < 5){
        toStore.recent.push(id);
      }else{
        for(var i = 4; i > 0; i--){
          toStore.recent[i] = toStore.recent[i-1];
        }
        toStore.recent[0] = id;
      }
    }
    fs.writeFileSync(path.join(userData, "progress.json"), JSON.stringify(toStore));
  },
  get: function(id){
    return toStore.progress[id];
  },
  getRecent: function(){
    return toStore.recent;
  }
}
