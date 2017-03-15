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

// loading animation
function Animation($elm, $par) {
  const minTranslate = -160;
  let frameRate = 100;
  let translate = 0;
  let stop = false;

  function timeFrame() {
    $elm.attr('transform', `translate(${translate}, 0)`);
    translate -= 8;
    if (translate < minTranslate) {
      translate = 0;
    }
    if (stop) {
      frameRate -= 5;
    }
    if (frameRate >= 1) {
      setTimeout(timeFrame, 1000 / frameRate);
    } else {
      $par.fadeOut(200);
    }
  }
  timeFrame();
  this.stop = () => {
    stop = true;
  };
}

const loadingAnimation = new Animation($('#strip-hole-group'), $('#loading-animation'));

// keep an array of control hide time outs
const controlHide = [];
let moveCount = 1;

controlHide[0] = setTimeout(() => {
  if ($('#controls:hover')[0] === undefined) {
    $('#controls').slideUp(400);
    $('#controls').css('opacity', 0);
    $('html').css('cursor', 'none');
  }
}, 2000);

$('body').mousemove(() => {
  // end previous control hide timeout
  clearTimeout(controlHide[moveCount - 1]);
  // show controls
  $('#controls').slideDown(100);
  $('#controls').css('opacity', 1);
  // show cursor
  $('html').css('cursor', 'auto');
  // hide controls after 2s
  controlHide[moveCount] = setTimeout(() => {
    // if controls aren't being hovered over
    if ($('#controls:hover')[0] === undefined) {
      // hide controls and mouse
      $('#controls').slideUp(200);
      $('#controls').css('opacity', 0);
      $('html').css('cursor', 'none');
    }
  }, 2000);
  moveCount += 1;
});

// tell main that render is ready for movie info
ipcRenderer.send('playMovie');

// get streaming port from main
ipcRenderer.on('streamPort', (event, port) => {
  streamPort = port;
});
ipcRenderer.on('playMovie', (playMovieEvent, movie) => {
  // set title
  $('#title').html(movie.title);
  // set video source
  $('#video video').append(`<source src='http://localhost:${streamPort}/stream/${movie.id}'>`);
  $('#video video').on('loadedmetadata', () => {
    // call resize when metadata is ready
    resize();
    // hide loading animation
    loadingAnimation.stop();
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
        $('#playback').removeClass('pause').addClass('play');
      } else {
        $video.play();
        playing = true;
        $('#playback').removeClass('play').addClass('pause');
      }
    } else if (state) {
      // change playback to specific state
      $video.play();
      playing = true;
      $('#playback').removeClass('play').addClass('pause');
    } else {
      $video.pause();
      playing = false;
      $('#playback').removeClass('pause').addClass('play');
    }
  });

  function setVolume(volume, update) {
    // send volume to main
    ipcRenderer.send('volume', { volume, update });
  }
  $('#volume').on('input change', () => {
    // change volume on volume slider change
    setVolume($('#volume').val(), false);
  });

  // main tells render to change volume
  ipcRenderer.on('volume', (event, data) => {
    const volume = data.volume;
    const update = data.update;
    // set video volume
    $video.volume = volume;
    // change to mute icon if volume is zero
    if (volume === 0) {
      $('.volume-icon-waves').attr('style', 'stroke-opacity: 0');
    } else {
      $('.volume-icon-waves').attr('style', 'stroke-opacity: 1');
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
    $('#progress-elapsed').css('width', `${percentage}%`);
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
  let progressMouseOver = false;
  // mouse moved
  function progressTextMove(e) {
    // set progress if mouse is down
    if (progressMouseDown) {
      setProgress(e.clientX, $(e.currentTarget).width(), true);
    }
    // set seeking marker centered over mouseX
    $('#progress-marker').css('left', `${e.clientX}px`);
    // set time label text
    $('#progress-text').html(timeFormat($video.duration * (e.clientX / $('#progress').width())));
    // set time label position to mouseX, unless that makes it off the screen
    let progressTextPos = 5;
    if (e.clientX > (($('#progress-text').width() + 12) / 2) + 5) {
      if (e.clientX < $(window).width() - (($('#progress-text').width() + 12) / 2) - 5) {
        progressTextPos = e.clientX - (($('#progress-text').width() + 12) / 2);
      } else {
        progressTextPos = $(window).width() - $('#progress-text').width() - 12 - 5;
      }
    }
    $('#progress-text').css('left', `${progressTextPos}px`);
    // set time label arrow position to mouseX, unluss that is off screen
    let progressArrowPos = 9;
    if (e.clientX > 14) {
      if (e.clientX < $(window).width() - 14) {
        progressArrowPos = e.clientX - 5;
      } else {
        progressArrowPos = $(window).width() - 19;
      }
    }
    $('#progress-marker-arrow').css('left', `${progressArrowPos}px`);
  }

  // show time label
  function progressTextShow() {
    // show that mouse is over progress bar
    progressMouseOver = true;
    $('#progress-marker').css('opacity', 1);
    $('#progress-marker-arrow polygon').css('fill-opacity', 1);
    $('#progress-text').css('opacity', 1);
  }
  // hide time label
  function progressTextHide() {
    // show that mouse isn't over progress bar
    progressMouseOver = false;
    $('#progress-marker').css('opacity', 0);
    $('#progress-marker-arrow polygon').css('fill-opacity', 0);
    $('#progress-text').css('opacity', 0);
  }

  $('body').mousemove(progressTextMove);
  $('#progress').mouseenter(progressTextShow);
  $('#progress').mouseleave(progressTextHide);

  $('#progress').mousedown((e) => {
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
    // show time label
    progressTextShow();
    // if mouse leaves progress bar, don't hide time label
    $('#progress').off('mouseenter');
    $('#progress').off('mouseleave');
    $('#progress').mouseenter(() => {
      progressMouseOver = true;
    });
    $('#progress').mouseleave(() => {
      progressMouseOver = false;
    });
    // set progress
    setProgress(e.clientX, $(e.currentTarget).width(), true);
  });
  $('body').mouseup(() => {
    // show that mouse is released
    progressMouseDown = false;
    if (playing) {
      // if video should be playing, play it
      $video.play();
    }
    // hide time label if mouse has left the progress bar since it was pressed
    if (!progressMouseOver) {
      progressTextHide();
    }
    // allow time label to hide if mouse leaves progress bar
    $('#progress').mouseenter(progressTextShow);
    $('#progress').mouseleave(progressTextHide);
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
        $('#fullscreen').removeClass('exit').addClass('enter');
      } else {
        isFullscreen = true;
        $('#fullscreen').removeClass('enter').addClass('exit');
      }
    } else if (state) {
      isFullscreen = true;
      $('#fullscreen').removeClass('enter').addClass('exit');
    } else {
      isFullscreen = false;
      $('#fullscreen').removeClass('exit').addClass('enter');
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
});

ipcRenderer.on('downloadFinished', (event, data) => {
  // remove progress bar and send notification on download finish
  $(`[data-id='${data.movie.id}']`).children('.cover').children('.download-progress-outer').css('display', 'none');
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
