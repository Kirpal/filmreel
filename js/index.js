'use strict'
const ipcRenderer = require('electron').ipcRenderer;

var typingTimer;
var movies = {};
var numbers = ["one", "two", "three", "four", "five"];
var oldRawHtml = "";
var currentTab = "home";
var downloaded = [];
var downloading = [];

function resize(){
	if(currentTab === "search"){
		var changeWidth = 500;
		var minWidth = 350;
	}else{
		var changeWidth = 400;
		var minWidth = 300;
	}

	$("body").css("min-width", minWidth + "px");
	if($(document).width() < changeWidth){
		$("#nav-item-home").html("<img src='icons/home.svg' alt='Home'>");
		$("#nav-item-library").html("<img src='icons/library.svg' alt='Library'>");
		$("#nav-item-search").html("<img src='icons/search.svg' alt='Search'>");
	}else{
		$("#nav-item-home").html("Home");
		$("#nav-item-library").html("Library");
		$("#nav-item-search").html("Search");
	}
}

resize();
$(window).resize(resize);

//returns each movie's html
var movieHtml = function(movie){
	return '\
	<div class="movie" data-id="' + movie.id + '">\
		<img src="' + movie.large_cover_image + '" alt="' + movie.title + ' Cover">\
		<svg class="play-circle" viewbox="0 0 500 500">\
			<g>\
				<circle cx="250" cy="250" r="235"/>\
				<path d="M 185,135 Q 180,140 180,145 L 180,355 Q 180,360 185,365 Q 190,367.5 195,365 L 355,260 Q 360,255 360,250 Q 360,245 355,240 L 195,135 Q 190,132.5 185,135 z" />\
			</g>\
		</svg>' +
		((downloading.indexOf(parseInt(movie.id)) === -1) ?
			((downloaded.indexOf(parseInt(movie.id)) === -1) ?
				'<svg class="download-circle" viewbox="0 0 50 50">\
					<circle cx="25" cy="25" r="25"/>\
					<rect x="22.5" y="7.5" width="5" height="25"/>\
					<rect x="20" y="17.5" transform="rotate(-45, 20, 32.5)" width="5" height="20"/>\
					<rect x="25" y="17.5" transform="rotate(45, 30, 32.5)" width="5" height="20"/>\
					<rect x="15" y="37.5" width="20" height="5"/>\
					<circle cx="25" cy="25" r="25" style="fill:transparent">\
						<title>Download</title>\
					</circle>\
				</svg>' :
				'<svg class="delete-circle" viewbox="0 0 50 50">\
					<circle cx="25" cy="25" r="25"/>\
					<rect x="22.5" y="10" transform="rotate(-45, 25, 25)" width="5" height="30"/>\
					<rect x="22.5" y="10" transform="rotate(45, 25, 25)" width="5" height="30"/>\
					<circle cx="25" cy="25" r="25" style="fill:transparent">\
						<title>Delete</title>\
					</circle>\
				</svg>') : ''
		) +
		'<div title="Downloading"' + ((downloading.indexOf(parseInt(movie.id)) !== -1)? 'style="display: block;"' : '') + 'class="download-progress-outer"><div class="download-progress"></div></div>\
		<div class="movie-info">\
			<h2 class="title">' + movie.title + '</h2>\
			<h3 class="subtitle">' + movie.mpa_rating+" / "+movie.year+" / "+movie.runtime+"m" + ' / <a class="imdb" target="_blank" href="http://www.imdb.com/title/' + movie.imdb_code + '">IMDB</a></h3><br>\
			<div class="stars ' + numbers[Math.round(Math.round(movie.rating)/2)-1] + '">\
				<svg class="star one" viewbox="0 0 269 251">\
					<polygon points="150,25  179,111 269,111 197,165 223,251 150,200 77,251 103,165 31,111 121,111"/>\
				</svg><svg class="star two" viewbox="0 0 269 251">\
					<polygon points="150,25  179,111 269,111 197,165 223,251 150,200 77,251 103,165 31,111 121,111"/>\
				</svg><svg class="star three" viewbox="0 0 269 251">\
					<polygon points="150,25  179,111 269,111 197,165 223,251 150,200 77,251 103,165 31,111 121,111"/>\
				</svg><svg class="star four" viewbox="0 0 269 251">\
					<polygon points="150,25  179,111 269,111 197,165 223,251 150,200 77,251 103,165 31,111 121,111"/>\
				</svg><svg class="star five" viewbox="0 0 269 251">\
					<polygon points="150,25  179,111 269,111 197,165 223,251 150,200 77,251 103,165 31,111 121,111"/>\
				</svg>\
			</div>\
		</div>\
	</div>';
}

//adds movie to list of movies
var addMovie = function(movie){
	//add to movie list
	movies[movie.id] = movie;
	//add to page
	$("#contents").append(movieHtml(movie));
	//remove old click listeners and add new ones
	$(".movie .play-circle").off("click");
	$(".movie .download-circle").off("click");
	$(".movie .delete-circle").off("click");

	$(".movie .play-circle").click(function(){
		ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
	});
	$(".movie .download-circle").click(function(){
		$(this).css("display", "none");
		$(this).siblings(".download-progress-outer").css("display", "block");
		ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
	});
	$(".movie .delete-circle").click(function(){
		ipcRenderer.send("delete", movies[$(this).parents(".movie").data("id")]);
		downloaded.splice(downloaded.indexOf($(this).parents(".movie").data("id")));
		if(currentTab === "library"){
			$(this).parents(".movie").css("display", "none");
		}else{
			$(this).parents(".movie").replaceWith(movieHtml(movies[$(this).parents(".movie").data("id")]))
		}
	});
}
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
		$(".movie .play-circle").off("click");
		$(".movie .download-circle").off("click");
		$(".movie .delete-circle").off("click");

		$(".movie .play-circle").click(function(){
			ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
		});
		$(".movie .download-circle").click(function(){
			$(this).css("display", "none");
			$(this).siblings(".download-progress-outer").css("display", "block");
			ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
		});
		$(".movie .delete-circle").click(function(){
			changeTab(currentTab);
			ipcRenderer.send("delete", movies[$(this).parents(".movie").data("id")]);
		});
	}
}
//changes tab and displayed page
var changeTab = function(tab){
	currentTab = tab;
	//remove selection class from all tabs
	$(".nav-item").removeClass("selected");
	//hide search tab
	if(tab !== "search"){
		$("#nav-item-search").fadeOut(200);
	}
	//show selected tab and give it selection class
	$("#nav-item-"+tab).fadeIn(200).addClass("selected");
	if(tab === "home"){
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
					if(homeLength === homeList.length){
						addHomeHtml(rawHtml, currentTab);
					}
				}
			});
		}else{
			addHomeHtml(rawHtml, currentTab);
		}
	}else if(tab === "library"){
		//clear page contents
		$("#contents").html("");
		$("#contents").scrollTop(0);
		var library = ipcRenderer.sendSync("getPage", tab);
		downloaded = [];
		downloading = [];
		if(library.incomplete.length > 0 || library.complete.length > 0 && currentTab === "library"){
			if(library.incomplete.length > 0){
				library.incomplete.forEach(function(id){
					if(Object.keys(library.movies).indexOf(id) !== -1){
						downloading.push(parseInt(id));
						addMovie(library.movies[id]);
					}
				});
			}
			if(library.complete.length > 0){
				library.complete.sort(function(a, b){
					if(Object.keys(library.movies).indexOf(a) !== -1 && Object.keys(library.movies).indexOf(b) !== -1){
						var titleA = library.movies[a].title.toLowerCase(), titleB = library.movies[b].title.toLowerCase();
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
					}
				});
			}
		}else if(currentTab === "library"){
			$("#contents").html("<h1 class='placeholder'>Nothing Found :(</h1>");
		}
	}else if(tab === "search"){
		//clear page contents
		$("#contents").html("");
		$("#contents").scrollTop(0);
		//search for term
		$.get("https://yts.ag/api/v2/list_movies.json?query_term=" + $("#search-box").val(), function(response){
			if(currentTab === "search"){
				//clear page contents
				$("#contents").html("");
				$("#contents").scrollTop(0);
				response.data.movies.forEach(function(movie){
					//add all search results to page
					addMovie(movie);
				});
			}
		}).fail(function(){
			var libraryMovies = ipcRenderer.sendSync("getPage", "library").movies
			if(currentTab === "search"){
				Object.keys(libraryMovies).filter(function(id){
					return downloaded.indexOf(libraryMovies[id].id) !== -1 && libraryMovies[id].title.includes($("#search-box").val());
				}).forEach(function(id){
					addMovie(libraryMovies[id]);
				});
			}
		});
	}
}

//hide search tab
$("#nav-item-search").fadeOut(0);
//get list of downloaded and downloading movies
var library = ipcRenderer.sendSync("getPage", "library");
downloaded = [];
downloading = [];
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
//open settings window
$("#settings").click(function(){
	ipcRenderer.send("openSettings");
})

//search for term after 3 seconds of no typing or if enter is pressed
$("#search-box").keyup(function(e){
	//check if pressed key is enter
	if(e.keyCode == 13){
		//make search box inactive element
		$("#search-box").blur();
		//clear countdown
		clearTimeout(typingTimer);
		if ($("#search-box").val()){
			//change to search tab
			changeTab("search");
		}
	}else{
		//clear previous countdown
		clearTimeout(typingTimer);
		if ($("#search-box").val()){
			//change to search tab after 3s
			typingTimer = setTimeout(changeTab("search"), 2000);
		}
	}
});

//change to search tab on click but dont search
$("#search-box").click(function(){
	if(currentTab !== "search"){
		currentTab = "search";
		//remove selection class from all tabs
		$(".nav-item").removeClass("selected");
		//show selected tab and give it selection class
		$("#nav-item-search").fadeIn(200).addClass("selected");
		//clear page contents
		$("#contents").html("");
		$("#contents").scrollTop(0);
		resize();
	}
})

ipcRenderer.on("downloadProgress", function(event, data){
	$("[data-id='" + data.id + "']").children(".download-progress-outer").css("display", "block");
	$("[data-id='" + data.id + "']").children(".download-progress-outer").children(".download-progress").css("width", ((data.progress <= 1) ? (100 * data.progress) : 100) + "%");
})
ipcRenderer.on("downloadFinished", function(event, data){
	$("[data-id='" + data.movie.id + "']").children(".download-progress-outer").css("display", "none");
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
