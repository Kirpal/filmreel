const ipcRenderer = require('electron').ipcRenderer;

// video element
const $video = $('#video video').get(0);
// global streaming port
let streamPort = 3000;

// format time in seconds to HH:MM:SS
function timeFormat(totalSeconds) {
  let hours = Math.floor(totalSeconds / 3600);
  let minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
  let seconds = Math.round(totalSeconds - (minutes * 60) - (hours * 3600));

  if (hours !== 0 && hours < 10) {
    hours = `0${hours}:`;
  } else if (hours !== 0) {
    hours = `${hours}:`;
  } else {
    hours = '';
  }
  minutes = (minutes < 10) ? `0${minutes}:` : `${minutes}:`;
  seconds = (seconds < 10) ? `0${seconds}` : seconds;

  return hours + minutes + seconds;
}

// resize and repostion elements to match window size
function resize() {
  $('#video').height($(window).height());
  $('#video').width($(window).width());
  $('#video video').width($(window).width());
  $('#video video').height($(window).height());
  $('#video video').css('top', `${($('#video').height() - $('#video video').height()) / 2}px`);
  $('#video video').css('left', `${($('#video').width() - $('#video video').width()) / 2}px`);
}

$(window).resize(resize);

// keep an array of control hide time outs
const controlHide = [];
let moveCount = 1;

function hideControls() {
  // end previous control hide timeout
  clearTimeout(controlHide[moveCount - 1]);
  // show controls
  $('.control').css('opacity', 1);
  $('#control-overlay').css('opacity', 1);
  // show cursor
  $('html').css('cursor', 'auto');
  // hide controls after 2s
  controlHide[moveCount] = setTimeout(() => {
    // if controls aren't being hovered over
    if ($('.control:hover').length === 0 && $('.control:active').length === 0) {
      // hide controls and mouse
      $('.control').css('opacity', 0);
      $('#control-overlay').css('opacity', 0);
      $('html').css('cursor', 'none');
    } else {
      hideControls();
    }
  }, 2000);
  moveCount += 1;
}

// tell main that render is ready for movie info
ipcRenderer.send('playMovie');

// get streaming port from main
ipcRenderer.on('streamPort', (event, port) => {
  streamPort = port;
});
ipcRenderer.on('playMovie', (playMovieEvent, { movie, downloaded }) => {
  // set download or checkmark icon
  if (downloaded) {
    $('#download-container').html('<img src="../icons/player/check.svg" alt="Check Icon" id="check-icon" title="In Library">');
  } else {
    $('#download-container').html('<img src="../icons/player/download.svg" alt="Download Icon" id="download-icon" title="Download Movie">');
  }
  // set title
  $('#title').html(movie.title);
  // set video source
  $('#video video').append(`<source src='http://localhost:${streamPort}/stream/${movie.id}'>`);
  $('#video video').on('loadedmetadata', () => {
    // call resize when metadata is ready
    resize();
    // hide loading animation
    $('#loading').fadeOut(200);

    // start hiding controls and mouse
    controlHide[0] = setTimeout(hideControls, 2000);

    $('body').mousemove(hideControls);

    // tell main that metadata is ready
    ipcRenderer.send('metadata', $video.duration);
  });

  // exit player
  function exit() {
    ipcRenderer.send('exitStreaming');
  }
  $('#exit').click(exit);

  // whether or not the movie is currently playing
  let playing = false;
  function playback(state) {
    // tell main to play/pause
    ipcRenderer.send('playback', state);
  }
  // toggle playback on play/pause button press or space key press
  $('#playback').click(() => {
    playback();
  });
  $('body').keyup((e) => {
    if (e.keyCode === 32) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
      playback();
    }
  });

  // when main tells render to play/pause
  ipcRenderer.on('playback', (event, state) => {
    if (state === null) {
      // change playback state to opposite
      if (playing) {
        $video.pause();
        playing = false;
        $('#playback')
          .attr('src', '../icons/player/play.svg')
          .attr('alt', 'Play Icon')
          .attr('title', 'Play');
      } else {
        $video.play();
        playing = true;
        $('#playback')
          .attr('src', '../icons/player/pause.svg')
          .attr('alt', 'Pause Icon')
          .attr('title', 'Pause');
      }
    } else if (state) {
      // change playback to specific state
      $video.play();
      playing = true;
      $('#playback')
        .attr('src', '../icons/player/pause.svg')
        .attr('alt', 'Pause Icon')
        .attr('title', 'Pause');
    } else {
      $video.pause();
      playing = false;
      $('#playback')
        .attr('src', '../icons/player/play.svg')
        .attr('alt', 'Play Icon')
        .attr('title', 'Play');
    }
  });

  $('#volume').on('input change', () => {
    // send volume to main
    ipcRenderer.send('volume', { volume: $('#volume').val(), update: false });
  });

  // main tells render to change volume
  ipcRenderer.on('volume', (event, data) => {
    const volume = parseFloat(data.volume);
    const update = data.update;
    // set video volume
    $video.volume = volume;
    // change to mute icon if volume is zero
    if (volume === 0) {
      $('#volume-icon').attr('src', '../icons/player/volume-empty.svg');
    } else if (volume > 0 && volume <= 0.25) {
      $('#volume-icon').attr('src', '../icons/player/volume-low.svg');
    } else if (volume > 0.25 && volume <= 0.75) {
      $('#volume-icon').attr('src', '../icons/player/volume-medium.svg');
    } else {
      $('#volume-icon').attr('src', '../icons/player/volume-high.svg');
    }
    // set volume slider position if told to
    if (update) {
      $('#volume').val(volume);
    }
  });

  function setProgress(progress, total, update) {
    // send new progress to main
    ipcRenderer.send('progress', { progress, total, update, id: movie.id });
  }

  ipcRenderer.on('progress', (event, data) => {
    // progress event
    const progress = data.progress;
    const total = data.total;
    const update = data.update;
    // find progress percent
    const percentage = (progress / total) * 100;
    // set progress bar width
    $('#progress').css('width', `${percentage}%`);
    // set time display
    $('#time-elapsed').html(timeFormat($video.duration * (progress / total)));
    $('#time-duration').html(timeFormat($video.duration));
    if (update) {
      // update video time if told
      $video.currentTime = $video.duration * (progress / total);
    }
  });

  // if mouse is pressed/over the progress bar
  let progressMouseDown = false;
  // mouse moved
  function progressTextMove(e) {
    // set progress if mouse is down
    if (progressMouseDown) {
      setProgress(e.clientX - $('#progress-total').offset().left, $('#progress-total').width(), true);
    }
  }

  $('body').mousemove(progressTextMove);

  $('#progress-total').mousedown((e) => {
    if (e.preventDefault) {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    progressMouseDown = true;
    if (playing) {
      // pause video while seeking
      $video.pause();
    }
    // set progress
    setProgress(e.clientX - $('#progress-total').offset().left, $('#progress-total').width(), true);
  });
  $('body').mouseup(() => {
    // show that mouse is released
    progressMouseDown = false;
    if (playing) {
      // if video should be playing, play it
      $video.play();
    }
  });

  $('#video video').on('timeupdate', () => {
    // set progress when video progress moves
    setProgress($video.currentTime, $video.duration);
  });

  // fullscreen state
  let isFullscreen = false;
  function fullscreen(state) {
    // tell main to enter fullscreen
    ipcRenderer.send('fullscreen', state);
  }

  ipcRenderer.on('fullscreen', (event, state) => {
    // change button based on fullscreen state
    if (state === null) {
      if (isFullscreen) {
        isFullscreen = false;
        $('#fullscreen')
          .attr('src', '../icons/player/fullscreen-enter.svg')
          .attr('title', 'Enter Fullscreen');
      } else {
        isFullscreen = true;
        $('#fullscreen')
          .attr('src', '../icons/player/fullscreen-exit.svg')
          .attr('title', 'Exit Fullscreen');
      }
    } else if (state) {
      isFullscreen = true;
      $('#fullscreen')
        .attr('src', '../icons/player/fullscreen-exit.svg')
        .attr('title', 'Exit Fullscreen');
    } else {
      isFullscreen = false;
      $('#fullscreen')
        .attr('src', '../icons/player/fullscreen-enter.svg')
        .attr('title', 'Enter Fullscreen');
    }
  });

  // fullscreen on button press or double click
  $('#fullscreen').click(() => {
    fullscreen();
  });
  $('video').dblclick(() => {
    fullscreen();
  });

  // exit fullscreen on escape press
  $('body').keyup((e) => {
    if (e.keyCode === 27) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
      fullscreen(false);
    }
  });

  $('#download-icon').click((event) => {
    ipcRenderer.send('player-download', movie.id);
    $(event.currentTarget).parents('#download-container').html('<img src="../icons/player/check.svg" alt="Check Icon" id="check-icon" title="In Library">');
  });
});

ipcRenderer.on('downloadFinished', (event, data) => {
  // send notification on download finish
  if (data.notify) {
    const notification = new window.Notification('Download Complete', {
      body: data.movie.title,
      icon: data.movie.small_cover_image,
    });
    notification.onclick(() => {
      ipcRenderer.send('stream', data.movie);
    });
  }
});
