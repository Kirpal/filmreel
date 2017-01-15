'use strict'
var fs = require("fs"),
  path = require("path"),
  appData = require("electron").app.getPath("appData"),
  settings = JSON.parse(fs.readFileSync(path.join(appData, "cascade", "config.json")));

//store and retreive settings

module.exports = {
  //store setting to config.json
  store: function(setting, prop, value){
    settings[setting] = (typeof settings[setting] === 'undefined') ? {} : settings[setting];
    settings[setting][prop] = value;
    fs.writeFileSync(path.join(appData, "cascade", "config.json"), JSON.stringify(settings));
  },
  //get specific setting
  get: function(setting){
    return settings[setting];
  },
  //get all settings
  getAll: function(){
    return settings;
  }
}
