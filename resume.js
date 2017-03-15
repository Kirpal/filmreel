const fs = require('fs');
const path = require('path');
const torrent = require('./torrent');
const userData = require('electron').app.getPath('userData');

const downloads = {};
let storedDownloads;

// get stored downloads, or set to empty if they dont exist
try {
  storedDownloads = JSON.parse(fs.readFileSync(path.join(userData, 'downloads.json')));
} catch (err) {
  if (err.code === 'ENOENT') {
    storedDownloads = { complete: [], incomplete: [], movies: {} };
  }
}

// resume all incomplete downloads
module.exports = (win) => {
  storedDownloads.incomplete.forEach((id, index) => {
    if (Object.keys(storedDownloads.movies).indexOf(id) !== -1) {
      downloads[id] = torrent(storedDownloads.movies[id], true, win, index === 0);
    }
  });
  return downloads;
};
