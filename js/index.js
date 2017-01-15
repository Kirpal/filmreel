'use strict'
const ipcRenderer = require('electron').ipcRenderer;

var typingTimer;
var movies = {};
var numbers = ["one", "two", "three", "four", "five"];
var oldRawHtml = "";
var homeHtml = {};
var downloaded = [];

//returns each movie's html
var movieHtml = function(movie){
	return '\
	<div class="movie" data-id="' + movie.id + '">\
		<img src="' + movie.large_cover_image + '" alt="' + movie.title + ' Cover">\
		<svg class="play-circle" viewbox="0 0 500 500">\
			<g>\
				<circle cx="250" cy="250" r="250"/>\
				<path d="M 180,115 Q 175,120 175,125 L 175,375 Q 175,380 180,385 Q 185,387.5 190,385 L 340,260 Q 345,255 345,250 Q 345,245 340,240 L 190,115 Q 185,112.5 180,115 z" />\
			</g>\
		</svg>' +
		((downloaded.indexOf(parseInt(movie.id)) === -1)? '<svg class="download-circle" viewbox="0 0 50 50">\
			<circle cx="25" cy="25" r="25"/>\
			<rect x="22.5" y="7.5" width="5" height="25"/>\
			<rect x="20" y="17.5" transform="rotate(-45, 20, 32.5)" width="5" height="20"/>\
			<rect x="25" y="17.5" transform="rotate(45, 30, 32.5)" width="5" height="20"/>\
			<rect x="15" y="37.5" width="20" height="5"/>\
		</svg>' : '') +
		'<div class="movie-info">\
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

	$(".movie .play-circle").click(function(){
		ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
	});
	$(".movie .download-circle").click(function(){
		ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
	});
}
//changes tab and displayed page
var changeTab = function(tab){
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
			homeHtml = {};
			homeList.forEach(function(id, index){
				//get information on all movies in home template
				$.get("https://yts.ag/api/v2/movie_details.json?movie_id=" + id.replace(/\{|\}/g, ""), function(response){
					//make movie's html
					homeHtml[response.data.movie.id] = movieHtml(response.data.movie);
					//add movie to list
					movies[response.data.movie.id] = response.data.movie;
					//if it is the last movie in the template
					if(Object.keys(homeHtml).length === homeList.length){
						//replace placeholders with movies' html
						var newHtml = rawHtml.replace(/\{\{[0-9]+\}\}/g, function(x){return homeHtml[x.replace(/\{|\}/g, "")]});
						$("#contents").html(newHtml);
						//remove old click listeners and add new ones
						$(".movie .play-circle").off("click");
						$(".movie .download-circle").off("click");

						$(".movie .play-circle").click(function(){
							ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
						});
						$(".movie .download-circle").click(function(){
							ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
						});
					}
				});
			});
		}else{
			//replace placeholders with movies' html
			var newHtml = rawHtml.replace(/\{\{[0-9]+\}\}/g, function(x){return homeHtml[x.replace(/\{|\}/g, "")]});
			$("#contents").html(newHtml);
			//remove old click listeners and add new ones
			$(".movie .play-circle").off("click");
			$(".movie .download-circle").off("click");

			$(".movie .play-circle").click(function(){
				ipcRenderer.send("stream", movies[$(this).parents(".movie").data("id")]);
			});
			$(".movie .download-circle").click(function(){
				ipcRenderer.send("download", movies[$(this).parents(".movie").data("id")]);
			});
		}
	}else if(tab === "library"){
		//clear page contents
		$("#contents").html("");
		var library = ipcRenderer.sendSync("getPage", tab);
		downloaded = [];
		Object.keys(library.movies).forEach(function(id){
			if(library.complete.indexOf(id) == -1){
				delete library.movies[id]
			}
		})
		if(Object.keys(library.movies).length > 0){
			Object.keys(library.movies).forEach(function(id){
				downloaded.push(parseInt(id));
				addMovie(library.movies[id]);
			});
		}else{
			$("#contents").html("<h1>Nothing Found :(</h1>");
		}
	}else if(tab === "search"){
		//clear page contents
		$("#contents").html("");
		//search for term
		$.get("https://yts.ag/api/v2/list_movies.json?query_term=" + $("#search-box").val(), function(response){
			//clear page contents
			$("#contents").html("");
			response.data.movies.forEach(function(movie){
				//add all search results to page
				addMovie(movie);
			});
		});
	}
}

//hide search tab
$("#nav-item-search").fadeOut(0);
//get list of downloaded movies
var library = ipcRenderer.sendSync("getPage", "library");
downloaded = [];
Object.keys(library.movies).forEach(function(id){
	if(library.complete.indexOf(id) !== -1){
		downloaded.push(parseInt(id));
	}
})
//start on "home" tab
changeTab("home")

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
	if(!$("#nav-item-search").hasClass("selected")){
		//remove selection class from all tabs
		$(".nav-item").removeClass("selected");
		//show selected tab and give it selection class
		$("#nav-item-search").fadeIn(200).addClass("selected");
		//clear page contents
		$("#contents").html("");
	}
})
