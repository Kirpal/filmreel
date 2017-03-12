'use strict'
const {remote, ipcRenderer} = require('electron');

var typingTimer;
var movies = {};
var numbers = ["one", "two", "three", "four", "five"];
var oldRawHtml = "";
var currentTab = "home";
var downloaded = [];
var downloading = [];
var spacerLength = 0;

//Generates each movies html element from their movie object
var movieHtml = function(movie){
	return '\
	<div class="movie" data-id="' + movie.id + '">\
		<div class="cover">\
			<img class="cover-image" src="' + movie.large_cover_image + '" alt="' + movie.title + ' Cover">\
			<div class="play-circle" title="Play Movie">\
				<svg class="play-circle-icon" viewbox="0 0 182.5 235">\
						<path d="M 5,2.5 Q 0,5 0,10 L 0,222.5 Q 0,230 5,232.5 Q 10,235 15,232.5 L 175,127.5 Q 182.5,122.5 182.5,117.5 Q 182.5,112.5 175,107.5 L 15,2.5 Q 10,0 5,2.5 z" />\
				</svg>\
			</div>' +
		((downloading.indexOf(parseInt(movie.id)) === -1) ?
			((downloaded.indexOf(parseInt(movie.id)) === -1) ?
			//if the movie isn't downloaded or downloading
				'<div class="download-button" title="Download Movie">\
					<svg class="download-button-icon" viewbox="0 0 14 18">\
						<path d="M 7,0 L 7,14 z" />\
						<path d="M 7,14 L 14,7 z" />\
						<path d="M 7,14 L 0,7 z" />\
						<path d="M 0,17 L 14,17 z"/>\
					</svg>\
				</div>' :
				//if the movie is downloaded
				'<div class="delete-button" title="Delete Movie">\
					<svg class="delete-button-icon" viewbox="0 0 24 24">\
						<path d="M 0,0 L 24,24 z" />\
						<path d="M 0,24 L 24,0 z" />\
					</svg>\
				</div>') : '') +
		//show progress bar if the movie is downloading
		'<div class="download-progress-outer"><div title="Downloading"' + ((downloading.indexOf(parseInt(movie.id)) !== -1)? 'style="display: block;"' : '') + 'class="download-progress-total"><div class="download-progress"></div></div></div></div>\
		<h2 class="title">' + movie.title + '</h2>\
	</div>';
}

//adds movie to list of movies
var addMovie = function(movie){
	//add to movie list
	movies[movie.id] = movie;
	//add to page
	$("#contents").append(movieHtml(movie));
	//remove old click listeners and add new ones
	$(".play-circle").off("click");
	$(".download-button").off("click");
	$(".delete-button").off("click");

	$(".play-circle").click(function(){
		ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
	});
	$(".download-button").click(function(){
		$(this).css("display", "none");
		$(this).siblings(".download-progress-outer").css("display", "block");
		ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
	});
	$(".delete-button").click(function(){
		ipcRenderer.send("delete", movies[$(this).parents(".movie").data("id")]);
		downloaded.splice(downloaded.indexOf($(this).parents(".movie").data("id")));
		if(currentTab === "library"){
			$(this).parents(".movie").css("display", "none");
		}else{
			$(this).parents(".movie").replaceWith(movieHtml(movies[$(this).parents(".movie").data("id")]))
		}
	});
}

//add spacers to the end of the container so the last line is aligned left
var addSpacers = function(number){
	var spacers = "";
	for(var i = 0; i < number; i++){
		spacers += "<div class='movie-spacer'></div>";
	}
	$("#contents").append(spacers);
}

//adds movies to home template and adds it to the page
var addHomeHtml = function(rawHtml, currentTab){
	if(currentTab === "home"){
		//replace placeholders with movies' html
		var newHtml = rawHtml.replace(/\{\{[0-9]+\}\}/g, function(x){
			if(Object.keys(movies).indexOf(x.replace(/\{|\}/g, "")) === -1){
				return "";
			}
			return movieHtml(movies[x.replace(/\{|\}/g, "")]);
		});
		$("#contents").html(newHtml);

		//remove old click listeners and add new ones
		$(".play-circle").off("click");
		$(".download-button").off("click");
		$(".delete-button").off("click");

		$(".play-circle").click(function(){
			ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
		});
		$(".download-button").click(function(){
			$(this).css("display", "none");
			$(this).siblings(".download-progress-outer").css("display", "block");
			ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
		});
		$(".delete-button").click(function(){
			changeTab(currentTab);
			ipcRenderer.send("delete", movies[$(this).parents(".movie").data("id")]);
		});
	}
}

//changes tab and displayed page
var changeTab = function(tab){
	currentTab = tab;
	//reset scroll
	$("body").scrollTop(0);
	//remove selection class from all tabs
	$(".nav-item").removeClass("selected");
	//add selectrion class to chosen tab
	$("#nav-item-"+tab).addClass("selected");
	//reset contents display to flex from block
	$("#contents").css("display", "flex");
	if(tab === "home"){
		//change header at the top of page to "Home"
		$("#header").html("<h1>Home</h1>");
		//get template html
		var rawHtml = ipcRenderer.sendSync("getPage", tab);
		if(rawHtml != oldRawHtml){
			oldRawHtml = rawHtml;
			//list of movies in home template
			var homeList = rawHtml.match(/\{\{[0-9]+\}\}/g);
			var homeLength = 0;
			homeList.forEach(function(id, index){
				//get information on all movies in home template
				if(Object.keys(movies).indexOf(id.replace(/\{|\}/g, "")) === -1){
					$.get("https://yts.ag/api/v2/movie_details.json?movie_id=" + id.replace(/\{|\}/g, ""), function(response){
						//add movie to list
						movies[response.data.movie.id] = response.data.movie;
						homeLength += 1;
						//if it is the last movie in the template
						if(homeLength === homeList.length){
							addHomeHtml(rawHtml, currentTab);
						}
					});
				}else{
					homeLength += 1;
					//if it is the last movie in the template
					if(homeLength === homeList.length){
						addHomeHtml(rawHtml, currentTab);
					}
				}
			});
		}else{
			//if the newly retrieved template isn't changed, add the old template
			addHomeHtml(rawHtml, currentTab);
		}
	}else if(tab === "library"){
		//set top header to "Library"
		$("#header").html("<h1>Library</h1>");
		//clear page contents
		$("#contents").html("");
		spacerLength = 0;
		//get library list
		var library = ipcRenderer.sendSync("getPage", tab);
		downloaded = [];
		downloading = [];
		if(library.incomplete.length > 0 || library.complete.length > 0 && currentTab === "library"){
			if(library.incomplete.length > 0){
				//add downloading movies to the top
				library.incomplete.forEach(function(id){
					if(Object.keys(library.movies).indexOf(id) !== -1){
						downloading.push(parseInt(id));
						addMovie(library.movies[id]);
						spacerLength += 1;
					}
				});
				addSpacers(spacerLength);
			}
			if(library.complete.length > 0){
				//add downloaded movies
				library.complete.sort(function(a, b){
					if(Object.keys(library.movies).indexOf(a) !== -1 && Object.keys(library.movies).indexOf(b) !== -1){
						//make titles lowercase, remove leading "the"
						var titleA = library.movies[a].title.toLowerCase().replace(/^the\s*/g, ""), titleB = library.movies[b].title.toLowerCase().replace(/^the\s*/g, "");
						if(titleA < titleB)
							return -1;
						if(titleA > titleB)
							return 1;
						return 0;
					}
					return 0;
				}).forEach(function(id){
					if(Object.keys(library.movies).indexOf(id) !== -1){
						downloaded.push(parseInt(id));
						addMovie(library.movies[id]);
						spacerLength += 1;
					}
				});
				addSpacers(spacerLength);
			}
		}else if(currentTab === "library"){
			//if the library is empty
			$("#contents").html("<h1 class='placeholder'>Nothing Found :(</h1>");
		}
	}else if(tab === "search"){
		//set top header to search box
		$("#header").html("<input id='search-box' placeholder='Search'>");
		function search(){
			//clear page contents
			$("#contents").html("");
			spacerLength = 0;
			//search for term
			$.get("https://yts.ag/api/v2/list_movies.json?query_term=" + $("#search-box").val(), function(response){
				if(currentTab === "search"){
					//clear page contents
					$("#contents").html("");
					spacerLength = 0;
					if(typeof response.data.movies !== "undefined" && response.data.movies.length > 0){
						response.data.movies.forEach(function(movie){
							//add all search results to page if there are any results
							addMovie(movie);
							spacerLength += 1;
						});
						addSpacers(spacerLength);
					}
				}
			}).fail(function(){
				//search library instead
				var libraryMovies = ipcRenderer.sendSync("getPage", "library").movies
				if(currentTab === "search"){
					Object.keys(libraryMovies).filter(function(id){
						return downloaded.indexOf(libraryMovies[id].id) !== -1 && libraryMovies[id].title.includes($("#search-box").val());
					}).forEach(function(id){
						addMovie(libraryMovies[id]);
						spacerLength += 1;
					});
					addSpacers(spacerLength);
				}
			});
		}
		search();
		//search for term after 3 seconds of no typing or if enter is pressed
		$("#search-box").keyup(function(e){
			//check if pressed key is enter
			if(e.keyCode == 13){
				//make search box inactive element
				$("#search-box").blur();
				//clear countdown
				clearTimeout(typingTimer);
				if ($("#search-box").val() !== ""){
					search()
				}
			}else{
				//clear previous countdown
				clearTimeout(typingTimer);
				if ($("#search-box").val()){
					//search after 3s
					typingTimer = setTimeout(search(), 2000);
				}
			}
		});
	}else if(tab === "settings"){
		//set top header to "Settings"
		$("#header").html("<h1>Settings<span id='settings-info'></span></h1>");
		var version = "v" + ipcRenderer.sendSync("getVersion");

		$("#settings-info").html(version + " | Saved!");

		var config = ipcRenderer.sendSync("getConfig");

		$("#contents").html("");
		$("#contents").css("display", "block");
		//add options to page based on config
		Object.keys(config).forEach(function(setting){
		  var settingHtml = "";
		  if(config[setting].type === "text"){
		    settingHtml = '\
		    <div class="setting text" data-setting="' + setting + '">\
		      <input id="' + setting + '" value="' + config[setting].value + '" type="text" required>\
		      <label class="select-none" for="' + setting + '">' + config[setting].name + '</label>\
		    </div>';
		  }else if(config[setting].type === "number"){
		    settingHtml = '\
		    <div class="setting number text" data-setting="' + setting + '">\
		      <input id="' + setting + '" value="' + config[setting].value + '" type="number" required>\
		      <label class="select-none" for="' + setting + '">' + config[setting].name + '</label>\
		    </div>';
		  }else if(config[setting].type === "directory"){
		    settingHtml = '\
		    <div class="setting directory text" data-setting="' + setting + '">\
		      <input id="' + setting + '" value="' + config[setting].value + '" type="text" required>\
		      <label class="select-none" for="' + setting + '">' + config[setting].name + '</label>\
		      <svg class="icon select-none" viewbox="0 0 300 250">\
		        <polygon points="0,0 120,0 120,30 300,30 300,220 0,220"></polygon>\
		      </svg>\
		    </div>';
		  }else if(config[setting].type === "boolean"){
		    settingHtml = '\
		    <div class="setting boolean" data-setting="' + setting + '">\
		      <h2 class="select-none">' + config[setting].name + '</h2>\
		      <input type="checkbox" ' + ((config[setting].value) ? 'checked' : '') + '>\
		    </div>';
		  }
		  $("#contents").append(settingHtml);
		})
		//open file picker
		$(".directory .icon").click(function(){
		  var $this = $(this)
		  remote.dialog.showOpenDialog(remote.getCurrentWindow(), {"properties": ["openDirectory", "createDirectory"]}, function(filePaths){
		    $this.parents(".directory").children("input[type='text']").val(filePaths[0]).change();
		  });
		});

		//store settings on change
		$(".setting input").on("change", function(){
		  $("#settings-info").html(version + " | Saving...");

		  if($(this).attr("type") !== "checkbox"){
		    var storeConfig = ipcRenderer.sendSync("storeConfig", {"setting": $(this).parents(".setting").data("setting"), "value": $(this).val()});
		    if(storeConfig.success){
		      $(this).parents(".setting").removeClass("error");
		      setTimeout(function(){
		        $("#settings-info").html(version + " | Saved!");
		      }, 300);
		    }else{
		      $(this).parents(".setting").addClass("error");
		      $("#settings-info").html(version + " | ERROR");
		    }
		  }else{
		    if(!ipcRenderer.sendSync("storeConfig", {"setting": $(this).parents(".setting").data("setting"), "value": this.checked}).success){
		      $("#settings-info").html(version + " | ERROR");
		      if(this.checked){
		        $(this).removeAttr("checked");
		      }else{
		        $(this).attr("checked", "");
		      }
		    }else{
		      setTimeout(function(){
		        $("#settings-info").html(version + " | Saved!");
		      }, 300);
		    }
		  }
		});
	}
}

//get list of downloaded and downloading movies
var library = ipcRenderer.sendSync("getPage", "library");
downloaded = [];
downloading = [];
//update downloaded and downloading movies lists
Object.keys(library.movies).forEach(function(id){
	if(library.complete.indexOf(id) !== -1){
		downloaded.push(parseInt(id));
	}
	if(library.incomplete.indexOf(id) !== -1){
		downloading.push(parseInt(id));
	}
})
//start on "home" tab
changeTab(currentTab);

//change to selected tab
$(".nav-item").click(function(){
	changeTab($(this).prop("id").replace("nav-item-", ""))
})

ipcRenderer.on("downloadProgress", function(event, data){
	//update progress bar on download progress
	$("[data-id='" + data.id + "']").children(".cover").children(".download-progress-outer").css("display", "block");
	$("[data-id='" + data.id + "']").children(".cover").children(".download-progress-outer").children(".download-progress-total").children(".download-progress").css("width", ((data.progress <= 1) ? (100 * data.progress) : 100) + "%");
})
ipcRenderer.on("downloadFinished", function(event, data){
	//remove progress bar and send notification on download finish
	$("[data-id='" + data.movie.id + "']").children(".cover").children(".download-progress-outer").css("display", "none");
	if(data.notify){
		var notification = new window.Notification("Download Complete", {
			body: data.movie.title,
			icon: data.movie.small_cover_image
		});
		notification.onclick(function(){
			ipcRenderer.send("stream", data.movie);
		})
	}
})
