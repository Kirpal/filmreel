'use strict'
var fs = require("fs"),
  path = require("path"),
  userData = require("electron").app.getPath("userData"),
  settings,
  template = {
    "port": {
        "name": "Remote Control Port",
        "type": "number",
        "value": 3000
    },
    "library": {
        "name": "Download Location",
        "type": "directory",
        "value": path.join(userData, "movies")
    },
    "notify": {
        "name": "Notifications",
        "type": "boolean",
        "value": true
    },
    "updates": {
        "name": "Auto Updates",
        "type": "boolean",
        "value": true
    }
};

try {
  settings = JSON.parse(fs.readFileSync(path.join(userData, "config.json")));
}catch(err){
  if(err.code === "ENOENT"){
    settings = template;
  }
}

Object.keys(template).filter(function(key){
  return (Object.keys(settings).indexOf(key) === -1);
}).forEach(function(key){
  settings[key] = template[key];
})


//store and retreive settings

module.exports = {
  //store setting to config.json
  store: function(setting, prop, value){
    settings[setting] = (typeof settings[setting] === 'undefined') ? {} : settings[setting];
    settings[setting][prop] = value;
    fs.writeFileSync(path.join(userData, "config.json"), JSON.stringify(settings));
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
