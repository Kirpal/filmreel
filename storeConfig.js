const fs = require('fs');
const path = require('path');
const userData = require('electron').app.getPath('userData');

// default settings
const template = {
  port: {
    name: 'Remote Control Port',
    type: 'number',
    value: 3000,
  },
  library: {
    name: 'Download Location',
    type: 'directory',
    value: path.join(userData, 'movies'),
  },
  notify: {
    name: 'Notifications',
    type: 'boolean',
    value: true,
  },
  updates: {
    name: 'Auto Updates',
    type: 'boolean',
    value: true,
  },
};

// get stored settings or set to default
let settings;
try {
  settings = JSON.parse(fs.readFileSync(path.join(userData, 'config.json')));
} catch (err) {
  if (err.code === 'ENOENT') {
    settings = template;
  }
}

// if the template has any settings not in the stored settings add them and set to default
Object.keys(template).filter(key => (Object.keys(settings).indexOf(key) === -1))
.forEach((key) => {
  settings[key] = template[key];
});

// store and retreive settings
module.exports = {
  // store setting to config.json
  store: (setting, prop, value) => {
    settings[setting] = (typeof settings[setting] === 'undefined') ? {} : settings[setting];
    settings[setting][prop] = value;
    fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify(settings));
  },
  // get specific setting
  get: setting => settings[setting],
  // get all settings
  getAll: () => settings,
};
