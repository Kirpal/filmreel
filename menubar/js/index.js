const { ipcRenderer } = require('electron');

function hideMovie($movie) {
  $movie.animate({ height: 0, opacity: 0, 'padding-top': 0, 'padding-bottom': 0 }, 200, () => {
    $movie.hide();
  });
}

const library = ipcRenderer.sendSync('getPage', 'library');

$('body').html('');
library.incomplete.forEach((id) => {
  if (Object.keys(library.movies).indexOf(id) !== -1) {
    $('body').append(`<div class='movie' data-id='${id}'>
      <img class='cover' src='${library.movies[id].large_cover_image}' alt='${library.movies[id].title} Cover'/>
      <div class='info'>
        <h3 class='title'>${library.movies[id].title}</h3>
        <div class='progress-total'>
          <div class='progress'></div>
        </div>
        <svg class='stop-button' viewbox='0 0 24 24'>
          <path d='M 0,0 L 24,24 z' />
          <path d='M 0,24 L 24,0 z' />
        </svg>
      </div>
    </div>`);
  }
});

$('.stop-button').click((e) => {
  ipcRenderer.send('delete', $(e.currentTarget).parents('.movie').data('id'));
  hideMovie($(e.currentTarget).parents('.movie'));
});

ipcRenderer.on('downloadProgress', (event, data) => {
  // update progress bar on download progress
  $(`[data-id='${data.id}']`).children('.progress-total').children('.download-progress')
    .css('width', `${data.progress <= 1 ? (100 * data.progress) : 100}%`);
});

ipcRenderer.on('downloadFinished', (event, data) => {
  // remove progress bar and send notification on download finish
  hideMovie($(`[data-id='${data.movie.id}']`));

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
