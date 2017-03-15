const fs = require('fs');
const path = require('path');
const request = require('request');
const storeConfig = require('./storeConfig');
const userData = require('electron').app.getPath('userData');

// types of movies that are supported
const supportedFormats = ['mp4', 'mkv', 'avi'];
let libraryLocation = storeConfig.get('library').value;
let toStore;
let complete;

// reload object (for after downloads, deletions, etc)
function reload() {
  // get complete from library directory
  libraryLocation = storeConfig.get('library').value;
  try {
    complete = fs.readdirSync(libraryLocation).filter(val => (supportedFormats.indexOf(val.split('.')[1]) !== -1)).map(val => val.replace(new RegExp(`.(${supportedFormats.join('|')})`, 'gi'), ''));
  } catch (err) {
    if (err.code === 'ENOENT') {
      complete = [];
    }
  }

  // get movies and incomplete from stored object in downloads.json
  let movies;
  let incomplete;
  try {
    const downloads = JSON.parse(fs.readFileSync(path.join(userData, 'downloads.json')));
    movies = downloads.movies;
    incomplete = downloads.incomplete;
  } catch (err) {
    if (err.code === 'ENOENT') {
      movies = {};
      incomplete = [];
    }
  }

  // list of downloaded movies that aren't in the movie information object
  const needInfo = complete.filter(id => (Object.keys(movies).indexOf(id) === -1));

  // remove downloaded movies that aren't in the movie information object
  complete = complete.filter(id => (Object.keys(movies).indexOf(id) !== -1));

  // set toStore to the new values
  toStore = { incomplete, movies, complete };

  // get information for all the movies that aren't in the movie information object
  let infoCount = 0;
  if (needInfo.length > 0) {
    needInfo.forEach((id) => {
      request(`https://yts.ag/api/v2/movie_details.json?movie_id=${id}`, (error, response, rawBody) => {
        if (!error && response.statusCode === 200) {
          const body = JSON.parse(rawBody);
          toStore.movies[body.data.movie.id] = body.data.movie;
          infoCount += 1;

          // after all info is gotten, save object to downloads.json
          if (infoCount === needInfo.length) {
            fs.writeFileSync(path.join(userData, 'downloads.json'), JSON.stringify(toStore));
          }
        }
      });
    });
  }
}

reload();

module.exports = {
  // add incomplete torrent
  incomplete: (movie) => {
    // add movie info to movies object
    toStore.movies[movie.id] = movie;

    // add movie to incomplete if it isn't already (make id's into strings to match other objects)
    if (toStore.incomplete.indexOf(movie.id.toString()) === -1) {
      toStore.incomplete.push(movie.id.toString());
    }

    // save to downloads.json
    fs.writeFileSync(path.join(userData, 'downloads.json'), JSON.stringify(toStore));
  },
  // on completion add to complete and remove from incomplete
  complete: (movie) => {
    // add movie info to movies object
    toStore.movies[movie.id] = movie;

    // add movie to complete downloads if it isn't already there
    if (toStore.complete.indexOf(movie.id) === -1) {
      toStore.complete.push(movie.id);
    }

    // remove movie from incomplete
    delete toStore.incomplete[toStore.incomplete.indexOf(movie.id.toString())];

    // save to downloads.json
    fs.writeFileSync(path.join(userData, 'downloads.json'), JSON.stringify(toStore));
  },
  // returns both complete and incomplete torrents
  get: () => toStore,
  // returns format of downloaded movie
  getFormat: (id) => {
    if (toStore.complete.indexOf(id) !== -1) {
      return fs.readdirSync(libraryLocation).filter(val => val.startsWith(id)).filter(val => supportedFormats.indexOf(val.split('.')[1]) !== -1)[0].split('.')[1];
    }
    return false;
  },
  // reload library
  reload,
  // remove library movie
  remove: (id) => {
    try {
      const movieFile = fs.readdirSync(libraryLocation)
      .filter(val => supportedFormats.indexOf(val.split('.')[1]) !== -1)
      .filter(val => val.startsWith(id));

      if (movieFile.length === 1) {
        fs.unlinkSync(path.join(libraryLocation, movieFile[0]));
      }
      return false;
    } catch (err) {
      return err;
    }
  },
};
