'use strict'
const ipcRenderer = require('electron').ipcRenderer;

//video element
var $video = $("#video video").get(0);
//global streaming port
var streamPort = 3000;

//format time in seconds to HH:MM:SS
function timeFormat(seconds){
  var hours = Math.floor(seconds/3600);
  var minutes = Math.floor((seconds - hours * 3600)/60);
  seconds = Math.round(seconds - (minutes * 60) - (hours * 3600));

  hours = (hours !== 0) ? (hours < 10) ? "0" + hours + ":": hours + ":" : "";
  minutes = (minutes < 10) ? "0" + minutes + ":": minutes + ":";
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + minutes + seconds
}

//resize and repostion elements
function resize(){
	$("#video").height($(window).height());
	$("#video").width($(window).width());
	$("#video video").width($(window).width());
	$("#video video").height($(window).height());
	$("#video video").css("top", (($("#video").height() - $("#video video").height())/2) + "px");
	$("#video video").css("left", (($("#video").width() - $("#video video").width())/2) + "px");
}

//call resize on window resize
$(window).resize(resize)

function animation($elm, $par){
  var translate = 0;
  var minTranslate = -160;
  var frameRate = 100;
  var stop = false;
  function timeFrame(){
    $elm.attr("transform", "translate(" + translate + ", 0)");
    translate -= 8;
    if(translate < minTranslate){
      translate = 0;
    }
    if(stop){
      frameRate -= 5;
    }
    if(frameRate >= 1){
      setTimeout(timeFrame, 1000/frameRate);
    }else{
      $par.fadeOut(200);
    }
  }
  timeFrame();
  this.stop = function(){
    stop = true;
  }
}

var loadingAnimation = new animation($("#strip-hole-group"), $("#loading-animation"));

//array of control hide timeouts
var moveCount = 1;
var controlHide = [];
controlHide[0] = setTimeout(function(){
  if($("#controls:hover")[0] == undefined){
    $("#controls").slideUp(400);
    $("#controls").css("opacity", 0);
    $("html").css("cursor", "none");
  }
}, 2000);

$("body").mousemove(function(){
  //end previous control hide timeout
  clearTimeout(controlHide[moveCount-1]);
  //show controls
  $("#controls").slideDown(100);
  $("#controls").css("opacity", 1);
  //show cursor
  $("html").css("cursor", "auto");
  //hide controls after 2s
  controlHide[moveCount] = setTimeout(function(){
    //if controls aren't being hovered over
    if($("#controls:hover")[0] == undefined){
      //hide controls and mouse
      $("#controls").slideUp(200);
      $("#controls").css("opacity", 0);
      $("html").css("cursor", "none");
    }
  }, 2000);
  moveCount += 1;
});

//tell main that render is ready for movie info
ipcRenderer.send("playMovie")
ipcRenderer.on("streamPort", function(event, port){
  streamPort = port;
})
ipcRenderer.on("playMovie", function(event, movie){
  //set title
  $("#title").html(movie.title);
  //set video source
  $("#video video").append("<source src='http://localhost:" + streamPort + "/stream/" + movie.id + "'>");
  $("#video video").on("loadedmetadata", function(){
    //call resize when metadata is ready
    resize()
    //hide loading animation
    loadingAnimation.stop();
    //tell main that metadata is ready
    ipcRenderer.send("metadata", $video.duration);
  })

  function exit(){
    ipcRenderer.send("exitStreaming");
  }
  $("#exit").click(exit);

  //whether or not the movie is currently playing
  var playing = false;
  function playback (state){
    //tell main to play/pause
  	ipcRenderer.send("playback", state)
  }
  //toggle playback on play/pause button press or space key press
  $("#playback").click(function(){
  	playback()
  })
  $("body").keyup(function(e){
  	if(e.keyCode == 32){
      e.preventDefault ? e.preventDefault() : e.returnValue = false
  		playback()
  	}
  });

  //when main tells render to play/pause
  ipcRenderer.on("playback", function(event, state){
  	if(state === null){
      //change playback state to opposite
  		if(playing){
        $video.pause()
        playing = false;
        $("#playback").removeClass("pause").addClass("play");
  		}else{
    		$video.play()
    		playing = true;
    		$("#playback").removeClass("play").addClass("pause");
  		}
  	}else{
      //change playback specifically
    	if(state){
    		$video.play()
    		playing = true;
    		$("#playback").removeClass("play").addClass("pause");
    	}else{
        $video.pause()
        playing = false;
        $("#playback").removeClass("pause").addClass("play");
    	}
  	}
  })

  function volume(volume, update){
    //send volume to main
  	ipcRenderer.send("volume", {volume: volume, update: update})
  }
  $("#volume").on("input change", function(){
    //change volume on volume slider change
  	volume($("#volume").val(), false);
  })

  //main tells render to change volume
  ipcRenderer.on("volume", function(event, data){
    var volume = data.volume, update = data.update;
    //set video volume
  	$video.volume = volume;
    //change to mute icon if volume is zero
    if(volume == 0){
      $(".volume-icon-waves").attr("style", "stroke-opacity: 0");
    }else{
      $(".volume-icon-waves").attr("style", "stroke-opacity: 1");
    }
    //set volume slider position if told to
    if(update){
      $("#volume").val(volume);
    }
  })

  function progress(progress, total, update) {
    //send new progress to main
  	ipcRenderer.send("progress", {progress: progress, total: total, update: update, id: movie.id})
  }

  ipcRenderer.on("progress", function(event, data){
    //progress event
  	var progress = data.progress, total = data.total, update = data.update;
    //find progress percent
  	var percentage = (progress/total) * 100;
    //set progress bar width
  	$("#progress-elapsed").css("width", percentage + "%");
    //set time display
    $("#time-elapsed").html(timeFormat($video.duration * (progress/total)))
    $("#time-duration").html(timeFormat($video.duration))
  	if(update){
      //update video time if told
  		$video.currentTime = $video.duration * (progress/total)
  	}
  })

  //if mouse is pressed/over the progress bar
  var progressMouseDown = false;
  var progressMouseOver = false;
  //mouse moved
  function progressTextMove(e){
    //set progress if mouse is down
    if(progressMouseDown){
  		progress(e.clientX, $(this).width(), true)
    }
    //set seeking marker centered over mouseX
    $("#progress-marker").css("left", e.clientX + "px");
    //set time label text
    $("#progress-text").html(timeFormat($video.duration * (e.clientX/$("#progress").width())));
    //set time label position to mouseX, unless that makes it off the screen
    if(e.clientX > ($("#progress-text").width() + 12)/2 + 5){
      if(e.clientX < $(window).width() - ($("#progress-text").width() + 12)/2 - 5){
        var progressTextPos = e.clientX - ($("#progress-text").width() + 12)/2;
      }else{
        var progressTextPos = $(window).width() - $("#progress-text").width() - 12 - 5;
      }
    }else{
      var progressTextPos = 5;
    }
    $("#progress-text").css("left", progressTextPos + "px");
    //set time label arrow position to mouseX, unluss that is off screen
    if(e.clientX > 14){
      if(e.clientX < $(window).width() - 14){
        var progressArrowPos = e.clientX - 5;
      }else{
        var progressArrowPos = $(window).width() - 19;
      }
    }else{
      var progressArrowPos = 9;
    }
    $("#progress-marker-arrow").css("left", progressArrowPos + "px");
  }

  //show time label
  function progressTextShow(){
    //show that mouse is over progress bar
    progressMouseOver = true;
    $("#progress-marker").css("opacity", 1);
    $("#progress-marker-arrow polygon").css("fill-opacity", 1);
    $("#progress-text").css("opacity", 1);
  }
  //hide time label
  function progressTextHide(){
    //show that mouse isn't over progress bar
    progressMouseOver = false;
    $("#progress-marker").css("opacity", 0);
    $("#progress-marker-arrow polygon").css("fill-opacity", 0);
    $("#progress-text").css("opacity", 0);
  }

  $("body").mousemove(progressTextMove)
  $("#progress").mouseenter(progressTextShow);
  $("#progress").mouseleave(progressTextHide);

  $("#progress").mousedown(function(e){
    e.preventDefault ? e.preventDefault() : e.returnValue = false;
    progressMouseDown = true;
  	if(playing){
      //pause video while seeking
  		$video.pause();
  	}
    //show time label
    progressTextShow()
    //if mouse leaves progress bar, don't hide time label
    $("#progress").off("mouseenter");
    $("#progress").off("mouseleave");
    $("#progress").mouseenter(function(){
      progressMouseOver = true
    });
    $("#progress").mouseleave(function(){
      progressMouseOver = false;
    });
    //set progress
  	progress(e.clientX, $(this).width(), true)
  });
  $("body").mouseup(function(e){
    //show that mouse is released
    progressMouseDown = false;
  	if(playing){
      //if video should be playing, play it
  		$video.play()
  	}
    //hide time label if mouse has left the progress bar since it was pressed
    if(!progressMouseOver){
      progressTextHide()
    }
    //allow time label to hide if mouse leaves progress bar
    $("#progress").mouseenter(progressTextShow);
    $("#progress").mouseleave(progressTextHide);
  });
  $("#video video").on("timeupdate", function(){
    //set progress when video progress moves
  	progress($video.currentTime, $video.duration)
  })
  //fullscreen state
  var isFullscreen = false;
  function fullscreen(state){
    //tell main to enter fullscreen
  	ipcRenderer.send("fullscreen", state)
  }
  ipcRenderer.on("fullscreen", function(event, state){
    //change button based on fullscreen state
  	if(state === null){
  		if(isFullscreen){
        isFullscreen = false;
        $("#fullscreen").removeClass("exit").addClass("enter");
  		}else{
    		isFullscreen = true;
    		$("#fullscreen").removeClass("enter").addClass("exit");
  		}
  	}else{
    	if(state){
    		isFullscreen = true;
    		$("#fullscreen").removeClass("enter").addClass("exit");
    	}else{
        isFullscreen = false;
        $("#fullscreen").removeClass("exit").addClass("enter");
    	}
  	}
  })
  //fullscreen on button press or double click
  $("#fullscreen").click(function(){
  	fullscreen();
  })
  $("video").dblclick(function(){
  	fullscreen();
  })
  //exit fullscreen on escape press
  $("body").keyup(function(e){
    if(e.keyCode === 27){
      e.preventDefault ? e.preventDefault() : e.returnValue = false
      fullscreen(false)
    }
  })
});
