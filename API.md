# REST API

|Endpoint|Method|Response|
|----|----
|/current|GET|JSON|
|/controls/playback|POST|None|
|/controls/volume|POST|None|
|/controls/progress|POST|None|
|/controls/fullscreen|POST|None|

### Endpoints

#### /current
Returns the currently playing movie object, as well as the current control states, such as volume, progress, playback state, fullscreen state, and movie duration.

###### Method

`GET`

###### Response

`JSON`

#### /controls/playback

###### Method

`POST`

###### Data Parameters

|Parameter|Type|Description|Required?|Default
|---|
|state|`boolean`|Playback state (play/pause) to set.|No|Switches current state

#### /controls/volume

###### Method

`POST`

###### Data Parameters

|Parameter|Type|Description|Required?|Default
|---|
|volume|`float`|Volume to set out of 1.|Yes|N/A
|update|`boolean`|Whether or not to update the play volume bar|No|`true`

#### /controls/progress

###### Method

`POST`

###### Data Parameters

|Parameter|Type|Description|Required?|Default
|---|
|progress|`float`|Progress to set in seconds|Yes|N/A
|total|`float`|Total time of movie in seconds|Yes|N/A
|update|`boolean`|Whether or not to update the player progress bar|No|`true`

#### /controls/fullscreen

###### Method

`POST`

###### Data Parameters

|Parameter|Type|Description|Required?|Default
|---|
|state|`boolean`|Fullscreen state to set.|No|Switches current state
