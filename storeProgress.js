'use strict'
var fs = require("fs"),
  path = require("path"),
  appData = require("electron").app.getPath("appData"),
  toStore = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "progress.json")));

//stores and retreives movies' progress by id (in progress.json)

module.exports = {
  store: function(progress, total, id){
    toStore[id] = progress/total;
    fs.writeFileSync(path.join(appData, "cascade", "progress.json"), JSON.stringify(toStore));
  },
  get: function(id){
    return toStore[id];
  }
}
