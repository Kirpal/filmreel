'use strict'
const {remote, ipcRenderer} = require("electron");

var version = "v" + ipcRenderer.sendSync("getVersion");

$("#footer").html(version + " | Saved!");

var config = ipcRenderer.sendSync("getConfig");

$("#settings").html("");
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
    <div class="setting number" data-setting="' + setting + '">\
      <input id="' + setting + '" value="' + config[setting].value + '" type="number" required>\
      <label class="select-none" for="' + setting + '">' + config[setting].name + '</label>\
    </div>';
  }else if(config[setting].type === "directory"){
    settingHtml = '\
    <div class="setting directory" data-setting="' + setting + '">\
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
  $("#settings").append(settingHtml);
})
$(".directory .icon").click(function(){
  var $this = $(this)
  remote.dialog.showOpenDialog(remote.getCurrentWindow(), {"properties": ["openDirectory", "createDirectory"]}, function(filePaths){
    $this.parents(".directory").children("input[type='text']").val(filePaths[0]).change();
  });
});

$(".setting input").on("change", function(){
  $("#footer").html(version + " | Saving...");
  setTimeout(function(){
    $("#footer").html(version + " | Saved!");
  }, 300);
  if($(this).attr("type") != "checkbox"){
    $(this).val(ipcRenderer.sendSync("storeConfig", {"setting": $(this).parents(".setting").data("setting"), "value": $(this).val()}))
    $("#footer").html(version + " | Saved!");
  }else{
    if(ipcRenderer.sendSync("storeConfig", {"setting": $(this).parents(".setting").data("setting"), "value": this.checked})){
      $(this).attr("checked", "")
    }else{
      $(this).removeAttr("checked")
    }
  }
});
