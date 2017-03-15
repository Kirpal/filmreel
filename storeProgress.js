const fs = require('fs');
const path = require('path');
const userData = require('electron').app.getPath('userData');

// read the stored progress or set to default (empty object)
let toStore;
try {
  toStore = JSON.parse(fs.readFileSync(path.join(userData, 'progress.json')));
} catch (err) {
  if (err.code === 'ENOENT') {
    toStore = { recent: [], progress: {} };
  }
}

// stores and retreives movies' progress by id (in progress.json)
module.exports = {
  // store progress based on movie id
  store: (progress, total, id) => {
    // get progress decimal amount
    toStore.progress[id] = progress / total;
    // add to recently watched
    if (toStore.recent.indexOf(id) === -1) {
      if (toStore.recent.length < 5) {
        toStore.recent.push(id);
      } else {
        for (let i = 4; i > 0; i -= 1) {
          toStore.recent[i] = toStore.recent[i - 1];
        }
        toStore.recent[0] = id;
      }
    }
    // store progress data
    fs.writeFileSync(path.join(userData, 'progress.json'), JSON.stringify(toStore));
  },
  // get progress of id
  get: id => toStore.progress[id],
  // get recently watched
  getRecent: () => toStore.recent,
};
