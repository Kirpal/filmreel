const { remote, ipcRenderer } = require('electron');

const movies = {};
let typingTimer;
let oldHomeTemplate = '';
let currentTab = 'home';
let downloaded = [];
let downloading = [];
let spacerLength = 0;

// Generates each movies html element from their movie object
function movieHtml(movie) {
  return (
  `<div class='movie' data-id='${movie.id}'>
    <div class='cover'>
      <img class='cover-image' src='${movie.large_cover_image}' alt='${movie.title} Cover'>
      <div class='play-circle' title='Play Movie'>
        <svg class='play-circle-icon' viewbox='0 0 182.5 235'>
          <path d='M 5,2.5 Q 0,5 0,10 L 0,222.5 Q 0,230 5,232.5 Q 10,235 15,232.5 L 175,127.5 Q 182.5,122.5 182.5,117.5 Q 182.5,112.5 175,107.5 L 15,2.5 Q 10,0 5,2.5 z' />
        </svg>
      </div>
      ${downloading.indexOf(parseInt(movie.id, 10)) === -1 && downloaded.indexOf(parseInt(movie.id, 10)) === -1
      ? `<div class='download-button' title='Download Movie'>
          <svg class='download-button-icon' viewbox='0 0 14 18'>
            <path d='M 7,0 L 7,14 z' />
            <path d='M 7,14 L 14,7 z' />
            <path d='M 7,14 L 0,7 z' />
            <path d='M 0,17 L 14,17 z'/>
          </svg>
        </div>` : ''}
      ${downloading.indexOf(parseInt(movie.id, 10)) === -1 && downloaded.indexOf(parseInt(movie.id, 10)) !== -1
      ? `<div class='delete-button' title='Delete Movie'>
          <svg class='delete-button-icon' viewbox='0 0 24 24'>
            <path d='M 0,0 L 24,24 z' />
            <path d='M 0,24 L 24,0 z' />
          </svg>
        </div>` : ''}
      <div class='download-progress-outer'>
        <div title='Downloading' ${downloading.indexOf(parseInt(movie.id, 10)) !== -1 ? 'style="display: block;"' : ''} class='download-progress-total'>
          <div class='download-progress'></div>
        </div>
      </div>
    </div>
    <h2 class='title'>${movie.title}</h2>
  </div>`);
}

// adds movie to list of movies
function addMovie(movie) {
  // add to movie list
  movies[movie.id] = movie;
  // add to page
  $('#contents').append(movieHtml(movie));
  // remove old click listeners and add new ones
  $('.play-circle').off('click');
  $('.download-button').off('click');
  $('.delete-button').off('click');

  $('.play-circle').click((event) => {
    ipcRenderer.send('stream', movies[$(event.currentTarget).parents('.movie').data('id')]);
  });
  $('.download-button').click((event) => {
    $(event.currentTarget).css('display', 'none');
    $(event.currentTarget).siblings('.download-progress-outer').css('display', 'block');
    ipcRenderer.send('download', movies[$(event.currentTarget).parents('.movie').data('id')]);
  });
  $('.delete-button').click((event) => {
    ipcRenderer.send('delete', movies[$(event.currentTarget).parents('.movie').data('id')]);
    downloaded.splice(downloaded.indexOf($(event.currentTarget).parents('.movie').data('id')));
    if (currentTab === 'library') {
      $(event.currentTarget).parents('.movie').css('display', 'none');
    } else {
      $(event.currentTarget).parents('.movie').replaceWith(movieHtml(movies[$(event.currentTarget).parents('.movie').data('id')]));
    }
  });
}

// add spacers to the end of the container so the last line is aligned left
function addSpacers(number) {
  let spacers = '';
  for (let i = 0; i < number; i += 1) {
    spacers += '<div class="movie-spacer"></div>';
  }
  $('#contents').append(spacers);
}

// changes tab and displayed page
function changeTab(tab) {
  // adds movies to home template and adds it to the page
  function addHomeHtml(homeTemplate, homeTab) { // scroll cards on an interval
    function movieCardScroll() {
      $('.movie-card-container').each((index, element) => {
        const movieCardWidth = $(element).children('.movie-card').width() + 60; // 60 is the left and right margins combined

        // don't scroll if user is hovering over any card
        if ($(':hover').filter($(element).children('.movie-card')).length === 0) {
          $(element).data('currentCard', $(element).data('currentCard') + 1);

          // if card is too far to the right
          if ($(element).data('currentCard') >= $(element).children('.movie-card').length - 3) {
            // scroll instantly to beginning and change to first card
            $(element).scrollLeft(movieCardWidth - (($(element).width() - movieCardWidth) / 2));
            $(element).data('currentCard', 1);
          }

          // scroll cards, change indicator
          $(element).animate({ scrollLeft: (($(element).data('currentCard') + 1) * movieCardWidth) - (($(element).width() - movieCardWidth) / 2) }, 600);
          $(element).siblings('.movie-card-indicator').children('.indicator').removeClass('selected');
          $(element).siblings('.movie-card-indicator').children('.indicator').filter(`[data-card='${$(element).data('currentCard')}']`)
            .addClass('selected');
        }
      });
    }

    if (homeTab === 'home') {
      // generate html from template
      const homeHtml = homeTemplate
      // replace markdown headers with html
      .replace(/# (.+)/g, '<h1 class="header">$1</h1>')
      // replace markdown new lines with html
      .replace(/\n\n/g, '<br>')
      // replace movie placeholders with the movie html
      .replace(/\{\{[0-9]+\}\}/g, (x) => {
        if (Object.keys(movies).indexOf(x.replace(/\{|\}/g, '')) === -1) {
          return '';
        }
        return movieHtml(movies[x.replace(/\{|\}/g, '')]);
      })
      // add gallery around blocks of movie cards
      .replace(/\[\[(?:[0-9]+\]\]\[\[)+[0-9]+\]\]/g, '<div class="gallery"><div class="movie-card-container">$&</div><div class="movie-card-indicator"></div></div>')
      // replace movie card placeholders with movie cards
      .replace(/\[\[([0-9]+)\]\]/g, '<img class="movie-card" data-id="$1" title="Play Movie" src="https://filmreelapp.com/cards/$1.png">');
      // add generated html to page
      $('#contents').html(homeHtml);
      $('#contents').css('justify-content', 'flex-start');

      $('.gallery').each((index, element) => {
        const $movieCardContainer = $(element).children('.movie-card-container');
        const $movieCardIndicator = $(element).children('.movie-card-indicator');
        const movieCardWidth = $movieCardContainer.children('.movie-card').width() + 60; // 60 is the left and right margins combined

        // add page indicators for every movie
        for (let i = 0; i < $(element).children('.movie-card-container').children('.movie-card').length; i += 1) {
          $movieCardIndicator.append(`<div data-card='${i + 1}' class='indicator'></div>`);
        }
        // add scroll arrows to page indicators
        $movieCardIndicator.prepend('<div class="movie-card-scroll left"></div>');
        $movieCardIndicator.append('<div class="movie-card-scroll right"></div>');

        // add duplicate movies at start and end to simulate infinite scrolling
        $movieCardContainer.prepend($movieCardContainer.children('.movie-card').slice(-2).clone(true));
        $movieCardContainer.append($movieCardContainer.children('.movie-card').slice(2, 4).clone(true));

        // set current page and move to that card and page indicator
        $movieCardContainer.data('currentCard', 1);
        $movieCardIndicator.children('.indicator').filter(`[data-card='${$movieCardContainer.data('currentCard')}']`).addClass('selected');
        $movieCardContainer.scrollLeft(
          (2 * movieCardWidth) - (($movieCardContainer.width() - movieCardWidth) / 2));
      });

      // remove old click listeners and add new ones
      $('.play-circle').off('click');
      $('.download-button').off('click');
      $('.delete-button').off('click');
      $('.movie-card').off('click');
      $('.movie-card-scroll').off('click');
      $('.movie-card-indicator .indicator').off('click');

      // play icon on movie
      $('.play-circle').click((event) => {
        ipcRenderer.send('stream', movies[$(event.currentTarget).parents('.movie').data('id')]);
      });

      // movie cards in home
      $('.movie-card').click((event) => {
        ipcRenderer.send('stream', movies[$(event.currentTarget).data('id')]);
      });

      // download icon on movie
      $('.download-button').click((event) => {
        $(event.currentTarget).css('display', 'none');
        $(event.currentTarget).siblings('.download-progress-outer').css('display', 'block');
        ipcRenderer.send('download', movies[$(event.currentTarget).parents('.movie').data('id')]);
      });

      // delete icon on movie
      $('.delete-button').click((event) => {
        changeTab(currentTab);
        ipcRenderer.send('delete', movies[$(event.currentTarget).parents('.movie').data('id')]);
      });

      window.movieCardScroll = setInterval(movieCardScroll, 5000);

      // arrows on side of page indicators
      $('.movie-card-scroll').click((event) => {
        // reset auto scrolling
        clearInterval(window.movieCardScroll);
        window.movieCardScroll = setInterval(movieCardScroll, 5000);

        const $movieCardContainer = $(event.currentTarget).parents('.movie-card-indicator').siblings('.movie-card-container');
        const movieCardWidth = $movieCardContainer.children('.movie-card').width() + 60; // 60 is the left and right margins combined

        // left arrow moves left, right arrow moves right
        if ($(event.currentTarget).hasClass('left')) {
          $movieCardContainer.data('currentCard', $movieCardContainer.data('currentCard') - 1);
        } else if ($(event.currentTarget).hasClass('right')) {
          $movieCardContainer.data('currentCard', $movieCardContainer.data('currentCard') + 1);
        }

        // if new card is too far right
        if ($movieCardContainer.data('currentCard') >= $movieCardContainer.children('.movie-card').length - 3) {
          // scroll to beginning instantly, change to first page
          $movieCardContainer.scrollLeft(
            movieCardWidth - (($movieCardContainer.width() - movieCardWidth) / 2));
          $movieCardContainer.data('currentCard', 1);
        // if new card is too far left
        } else if ($movieCardContainer.data('currentCard') < 1) {
          // scroll all the way right instantly, change to last page
          $movieCardContainer.scrollLeft(
            $movieCardContainer.get(0).scrollWidth
            - (2 * movieCardWidth) - (($movieCardContainer.width() - movieCardWidth) / 2));
          $movieCardContainer.data('currentCard', $movieCardContainer.children('.movie-card').length - 4);
        }

        // animate card slide, change page indicator
        $movieCardContainer.animate({ scrollLeft: (($movieCardContainer.data('currentCard') + 1) * movieCardWidth) - (($movieCardContainer.width() - movieCardWidth) / 2) }, 200);
        $(event.currentTarget).siblings('.indicator').removeClass('selected');
        $(event.currentTarget).siblings('.indicator').filter(`[data-card='${$movieCardContainer.data('currentCard')}']`).addClass('selected');
      });

      // click on page indicator
      $('.movie-card-indicator .indicator').click((event) => {
        // reset autoscroll timer
        clearInterval(window.movieCardScroll);
        window.movieCardScroll = setInterval(movieCardScroll, 5000);

        const $movieCardContainer = $(event.currentTarget).parents('.movie-card-indicator').siblings('.movie-card-container');
        const movieCardWidth = $movieCardContainer.children('.movie-card').width() + 60; // 60 is the left and right margins combined

        // change to the indicated card, animate scroll, change indicator
        $movieCardContainer.data('currentCard', $(event.currentTarget).data('card'));
        $movieCardContainer.animate({ scrollLeft: (($movieCardContainer.data('currentCard') + 1) * movieCardWidth) - (($movieCardContainer.width() - movieCardWidth) / 2) }, 200);
        $(event.currentTarget).siblings('.indicator').removeClass('selected');
        $(event.currentTarget).addClass('selected');
      });

      // change scroll amount on window resize to keep current card centered
      $(window).resize(() => {
        $('.gallery').each((index, element) => {
          const $movieCardContainer = $(element).children('.movie-card-container');
          const movieCardWidth = $movieCardContainer.children('.movie-card').width() + 60; // 60 is the left and right margins combined

          $movieCardContainer.scrollLeft((($movieCardContainer.data('currentCard') + 1) * movieCardWidth) - (($movieCardContainer.width() - movieCardWidth) / 2));
        });
      });
    }
  }
  function search() {
    // clear page contents
    $('#contents').html('');
    spacerLength = 0;
    // search for term
    $.get(`https://yts.ag/api/v2/list_movies.json?query_term=${$('#search-box').val()}`, (response) => {
      if (currentTab === 'search') {
        // clear page contents
        $('#contents').html('');
        spacerLength = 0;
        if (typeof response.data.movies !== 'undefined' && response.data.movies.length > 0) {
          response.data.movies.forEach((movie) => {
            // add all search results to page if there are any results
            addMovie(movie);
            spacerLength += 1;
          });
          addSpacers(spacerLength);
        }
      }
    }).fail(() => {
      // search library instead
      const libraryMovies = ipcRenderer.sendSync('getPage', 'library').movies;
      if (currentTab === 'search') {
        Object.keys(libraryMovies).filter(id => downloaded.indexOf(libraryMovies[id].id) !== -1 && libraryMovies[id].title.includes($('#search-box').val()))
        .forEach((id) => {
          addMovie(libraryMovies[id]);
          spacerLength += 1;
        });
        addSpacers(spacerLength);
      }
    });
  }
  currentTab = tab;
  // reset scroll
  $('body').scrollTop(0);
  // remove selection class from all tabs
  $('.nav-item').removeClass('selected');
  // add selectrion class to chosen tab
  $(`#nav-item-${tab}`).addClass('selected');
  // reset contents display to flex from block
  $('#contents').css('display', 'flex');
  // reset contents flex-justify to center from flex-start
  $('#contents').css('justify-content', 'center');
  if (tab === 'home') {
    // change header at the top of page to 'Home'
    $('#header').html('<h1>Home</h1>');
    // get home template
    const homeTemplate = ipcRenderer.sendSync('getPage', tab);
    // if the newly retrieved template is changed, get all the needed movie info
    if (homeTemplate !== oldHomeTemplate) {
      oldHomeTemplate = homeTemplate;
      // make list of movies in home template from {{ID}} or [[ID]]
      const homeList = homeTemplate.match(/\{\{[0-9]+\}\}|\[\[[0-9]+\]\]/g);
      let homeLength = 0;
      homeList.forEach((id) => {
        // get information on all movies in home template
        if (Object.keys(movies).indexOf(id.replace(/\{|\}/g, '')) === -1) {
          $.get(`https://yts.ag/api/v2/movie_details.json?movie_id=${id.replace(/\{|\}|\[|\]/g, '')}`, (response) => {
            // add movie to list
            movies[response.data.movie.id] = response.data.movie;
            homeLength += 1;
            // if it is the last movie in the template
            if (homeLength === homeList.length) {
              addHomeHtml(homeTemplate, currentTab);
            }
          });
        } else {
          homeLength += 1;
          // if it is the last movie in the template
          if (homeLength === homeList.length) {
            addHomeHtml(homeTemplate, currentTab);
          }
        }
      });
    } else {
      // if the newly retrieved template isn't changed, add the old template
      addHomeHtml(homeTemplate, currentTab);
    }
  } else if (tab === 'library') {
    // set top header to 'Library'
    $('#header').html('<h1>Library</h1>');
    // clear page contents
    $('#contents').html('');
    spacerLength = 0;
    // get library list
    const library = ipcRenderer.sendSync('getPage', tab);
    downloaded = [];
    downloading = [];
    if ((library.incomplete.length > 0 || library.complete.length > 0) && currentTab === 'library') {
      if (library.incomplete.length > 0) {
        // add downloading movies to the top
        library.incomplete.forEach((id) => {
          if (Object.keys(library.movies).indexOf(id) !== -1) {
            downloading.push(parseInt(id, 10));
            addMovie(library.movies[id]);
            spacerLength += 1;
          }
        });
        addSpacers(spacerLength);
      }
      if (library.complete.length > 0) {
        // add downloaded movies
        library.complete.sort((a, b) => {
          if (Object.keys(library.movies).indexOf(a) !== -1
          && Object.keys(library.movies).indexOf(b) !== -1) {
            // make titles lowercase, remove leading 'the'
            const titleA = library.movies[a].title.toLowerCase().replace(/^the\s*/g, '');
            const titleB = library.movies[b].title.toLowerCase().replace(/^the\s*/g, '');
            if (titleA < titleB) {
              return -1;
            }
            if (titleA > titleB) {
              return 1;
            }
            return 0;
          }
          return 0;
        }).forEach((id) => {
          if (Object.keys(library.movies).indexOf(id) !== -1) {
            downloaded.push(parseInt(id, 10));
            addMovie(library.movies[id]);
            spacerLength += 1;
          }
        });
        addSpacers(spacerLength);
      }
    } else if (currentTab === 'library') {
      // if the library is empty
      $('#contents').html("<h1 class='placeholder'>Nothing Found :(</h1>");
    }
  } else if (tab === 'search') {
    // set top header to search box
    $('#header').html("<input id='search-box' placeholder='Search'>");
    search();
    // search for term after 3 seconds of no typing or if enter is pressed
    $('#search-box').keyup((e) => {
      // check if pressed key is enter
      if (e.keyCode === 13) {
        // make search box inactive element
        $('#search-box').blur();
        // clear countdown
        clearTimeout(typingTimer);
        if ($('#search-box').val() !== '') {
          search();
        }
      } else {
        // clear previous countdown
        clearTimeout(typingTimer);
        if ($('#search-box').val()) {
          // search after 3s
          typingTimer = setTimeout(search(), 2000);
        }
      }
    });
  } else if (tab === 'settings') {
    // set top header to 'Settings'
    $('#header').html('<h1>Settings<span id="settings-info"></span></h1>');
    const version = `v${ipcRenderer.sendSync('getVersion')}`;

    $('#settings-info').html(`${version} | Saved!`);

    const config = ipcRenderer.sendSync('getConfig');

    $('#contents').html('');
    $('#contents').css('display', 'block');
    // add options to page based on config
    Object.keys(config).forEach((setting) => {
      let settingHtml = '';
      if (config[setting].type === 'text') {
        settingHtml = `<div class='setting text' data-setting='${setting}'>
          <input id='${setting}' value='${config[setting].value}' type='text' required>
          <label class='select-none' for='${setting}'>${config[setting].name}</label>
        </div>`;
      } else if (config[setting].type === 'number') {
        settingHtml = `<div class='setting number text' data-setting='${setting}'>
          <input id='${setting}' value='${config[setting].value}' type='number' required>
          <label class='select-none' for='${setting}'>${config[setting].name}</label>
        </div>`;
      } else if (config[setting].type === 'directory') {
        settingHtml = `<div class='setting directory text' data-setting='${setting}'>
          <input id='${setting}' value='${config[setting].value}' type='text' required>
          <label class='select-none' for='${setting}'>${config[setting].name}</label>
          <svg class='icon select-none' viewbox='0 0 300 250'>
            <polygon points='0,0 120,0 120,30 300,30 300,220 0,220'></polygon>
          </svg>
        </div>`;
      } else if (config[setting].type === 'boolean') {
        settingHtml = `<div class='setting boolean' data-setting='${setting}'>
          <h2 class='select-none'>${config[setting].name}</h2>
          <input type='checkbox ${config[setting].value ? 'checked' : ''}'>
        </div>`;
      }
      $('#contents').append(settingHtml);
    });
    // open file picker
    $('.directory .icon').click((event) => {
      remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory', 'createDirectory'] }, (filePaths) => {
        event.currentTarget.parents('.directory').children('input[type="text"]').val(filePaths[0]).change();
      });
    });

    // store settings on change
    $('.setting input').on('change', (event) => {
      $('#settings-info').html(`${version} | Saving...`);

      if ($(event.target).attr('type') !== 'checkbox') {
        const storeConfig = ipcRenderer.sendSync('storeConfig', { setting: $(event.target).parents('.setting').data('setting'), value: $(event.target).val() });
        if (storeConfig.success) {
          $(event.target).parents('.setting').removeClass('error');
          setTimeout(() => {
            $('#settings-info').html(`${version} | Saved!`);
          }, 300);
        } else {
          $(event.target).parents('.setting').addClass('error');
          $('#settings-info').html(`${version} | ERROR`);
        }
      } else if (!ipcRenderer.sendSync('storeConfig', { setting: $(event.target).parents('.setting').data('setting'), value: event.target.checked }).success) {
        $('#settings-info').html(`${version} | ERROR`);
        if (event.target.checked) {
          $(event.target).removeAttr('checked');
        } else {
          $(event.target).attr('checked', '');
        }
      } else {
        setTimeout(() => {
          $('#settings-info').html(`${version} | Saved!`);
        }, 300);
      }
    });
  }
}

// get list of downloaded and downloading movies
const library = ipcRenderer.sendSync('getPage', 'library');
downloaded = [];
downloading = [];
// update downloaded and downloading movies lists
Object.keys(library.movies).forEach((id) => {
  if (library.complete.indexOf(id) !== -1) {
    downloaded.push(parseInt(id, 10));
  }
  if (library.incomplete.indexOf(id) !== -1) {
    downloading.push(parseInt(id, 10));
  }
});
// start on 'home' tab
changeTab(currentTab);

// change to selected tab
$('.nav-item').click(() => {
  changeTab($(event.currentTarget).prop('id').replace('nav-item-', ''));
});

ipcRenderer.on('downloadProgress', (event, data) => {
  // update progress bar on download progress
  $(`[data-id='${data.id}']`).children('.cover').children('.download-progress-outer').css('display', 'block');
  $(`[data-id='${data.id}']`).children('.cover').children('.download-progress-outer').children('.download-progress-total')
    .children('.download-progress')
    .css('width', `${data.progress <= 1 ? (100 * data.progress) : 100}%`);
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
