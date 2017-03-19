const torrentStream = require('torrent-stream');
const path = require('path');
const fs = require('fs');
const mv = require('mv');
const store = require('./store');
const storeConfig = require('./storeConfig');

// recursively delete folders, modified from http://stackoverflow.com/a/32197381
function rmDir(rmPath) {
  if (fs.existsSync(rmPath)) {
    fs.readdirSync(rmPath).forEach((file) => {
      const newPath = path.join(rmPath, file);
      if (fs.lstatSync(newPath).isDirectory()) {
        rmDir(newPath);
      } else {
        fs.unlinkSync(newPath);
      }
    });
    fs.rmdirSync(rmPath);
  }
}

module.exports = (movie, download = false, win, showProgressBar = false) => {
  let chosenTorrent = false;
  let magnet = '';
  const opts = {};
  const library = storeConfig.get('library').value;

  // select torrent based on smallest size, and not including 3d videos
  chosenTorrent = movie.torrents.reduce((a, b) => {
    if (a.quality.toUpperCase() !== '3D') {
      if (b.quality.toUpperCase() !== '3D') {
        return (a.size_bytes < b.size_bytes) ? a : b;
      }
      return false;
    }
    if (b.quality.toUpperCase() !== '3D') {
      return b;
    }
    return false;
  });

  if (chosenTorrent) {
    // create magnet link out of chosen torrent info
    magnet = `magnet:?xt=urn:btih:${chosenTorrent.hash}&dn=${movie.title}+%28${movie.year}%29+%5B${chosenTorrent.quality}%5D+%5BYTS.AG%5D&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337`;

    // set the download location and make sure the location exists
    opts.path = path.join(library, movie.id.toString());
    if (!fs.existsSync(opts.path)) {
      opts.path.split(path.sep).forEach((dir, idx, full) => {
        const parent = full.slice(0, idx).join(path.sep);
        const dirPath = path.join(parent, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath);
        }
      });
    }

    const engine = torrentStream(magnet, opts);
    engine.download = download;
    engine.movie = movie;
    engine.ready = false;
    engine.complete = false;

    const onReady = () => {
      // select largest file in torrent
      const file = engine.files.reduce((a, b) => ((a.length > b.length) ? a : b));
      file.select();
      engine.ready = true;

      // set total length and file properties
      engine.totalLength = engine.files.map(val => val.length).reduce((a, b) => a + b);
      engine.file = file;

      // add movie to incomplete list if it is being downloaded
      if (engine.download) {
        store.incomplete(engine.movie);
      }
    };

    const onIdle = () => {
      engine.complete = true;
      // tell render that download is finished, so it can send notification
      win.webContents.send('downloadFinished', { movie: engine.movie, notify: storeConfig.get('notify').value });
      if (engine.download) {
        store.complete(engine.movie);

        // move downloaded video from individual folder into library folder,
        // and rename it to it's id
        mv(path.join(opts.path, engine.file.path), path.join(library, `${engine.movie.id}.${engine.file.name.split('.')[engine.file.name.split('.').length - 1]}`), { mkdirp: false }, (err) => {
          if (!err) {
            rmDir(opts.path);
          }
        });
      } else {
        engine.end();
      }
    };

    const onDownload = () => {
      if (engine.download) {
        // show progress bar on icon (if supported by DE)
        if (showProgressBar) {
          win.setProgressBar(engine.getProgress());
        }

        // send to render to update progress bar
        win.webContents.send('downloadProgress', { id: engine.movie.id, progress: engine.getProgress() });
      }
    };

    // when torrent is ready to stream
    engine.once('ready', onReady);

    // when torrent has finished
    engine.on('idle', onIdle);

    // emitted on download progress change
    engine.on('download', onDownload);

    // used to end download
    engine.end = () => {
      // stop download
      engine.destroy();
      // remove downloaded pieces
      engine.remove((engine.download && engine.complete), () => {});
      if (!(engine.download && engine.complete)) {
        rmDir(opts.path);
      }
    };

    // makes streaming movie into downloading movie
    engine.makeDownload = () => {
      engine.download = true;
      if (engine.ready) {
        store.incomplete(engine.movie);
      }

      // reattach engine event listeners
      engine.once('ready', onReady);
      engine.on('idle', onIdle);
      engine.on('download', onDownload);
    };

    // download progress
    engine.getProgress = () => engine.swarm.downloaded / engine.totalLength;

    return engine;
  }
  return false;
};
