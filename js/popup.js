/**
 Copyright (c) 2015, Austin Meyers & Mark Silliman
 All rights reserved.
 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 http://learn.turtlebot.com/

 *
 */

//MODIFY THE FOLLOWING VALUE!

myDomain = "http://ec2-54-200-33-28.us-west-2.compute.amazonaws.com"; //Modify this to be your EC2's public dns!

// -------------
//You shouldn't need to modify any of the following

if(localStorage['x'] && localStorage['y']){
    document.querySelector('#setCoordsView').style.display = 'none';
    document.querySelector('#orderView').style.display = 'block';
    isOrdered(); //decides which UI to show depending on pending state of coffeebot
}else{
    document.querySelector('#setCoordsView').style.display = 'block';
    document.querySelector('#orderView').style.display = 'none';
}

//Check coffeebot's status every second
setInterval(function() {
    if(localStorage['id']){
        statuscheck(myDomain,localStorage['id']);
    }
}, 1000);

//save the coordinates
saveCoordsButton.onclick = function(){
    //import the values from the fields
	var xCoord = document.querySelector('#xCoord').value
	var yCoord = document.querySelector('#yCoord').value

    //save the values to the browser's local storage
	localStorage["x"] = $.trim(xCoord);
	localStorage["y"] = $.trim(yCoord);

    //show the order view instead
	document.querySelector('#setCoordsView').style.display = 'none';
	document.querySelector('#orderView').style.display = 'block';
}

//edit coordinates
 editCoordsButton.onclick = function(){
 	document.querySelector('#xCoord').value = localStorage['x'];
 	document.querySelector('#yCoord').value = localStorage['y']; 	
	document.querySelector('#setCoordsView').style.display = 'block';
	document.querySelector('#orderView').style.display = 'none';
}

//show pending ui
function show_pending_ui() {
    document.querySelector('#orderButton').style.display = 'none';
    document.querySelector('#cancelButton').style.display = 'block';
    document.querySelector('#turtlebot-animation').style.display = 'block';
    document.querySelector('#turtlebot-still').style.display = 'none';
    document.querySelector('#editCoordsButton').style.display = 'none'; //don't let them modify coordinates while a coffee is pending
}

function show_waiting_for_order_to_be_pressed_ui() {
    document.querySelector('#turtlebot-animation').style.display = 'none';
    document.querySelector('#turtlebot-still').style.display = 'block';
    document.querySelector('#orderButton').style.display = 'block';
    document.querySelector('#cancelButton').style.display = 'none';
    document.querySelector('#editCoordsButton').style.display = 'block';
}

//is coffee pending? (ordered but not delivered)
function isOrdered(){
	if(localStorage['id']){
        show_pending_ui();
	}else{
        show_waiting_for_order_to_be_pressed_ui();
	}
}

//when they press "order" button push the coordinates to the server and monitor the status
orderButton.onclick = function(){
	push_xy(myDomain,localStorage["x"],localStorage["y"]);
	statuscheck(myDomain,localStorage["id"]);
}

//when the cancel button is pressed tell the server to cancel the request and update the UI
cancelButton.onclick = function(){
	cancel(myDomain,localStorage["id"]);
	chrome.browserAction.setBadgeText({text: ''});
	localStorage.removeItem('id');
	isOrdered();
}

//tell the server that we want coffee
function push_xy(domain,x,y) {
    var status;
	var id;
    var script = "/turtlebot-server/coffee_queue.php?push&quat_z=0.892&quat_w=-1.5&point_x=" + x + "&point_y=" + y;
    console.log(script);
	$.getJSON( domain + script, function( data ) {
		status = data["status"];
        //the server passes back a unique id for this coffee request.  That'll allow us to keep track of future coffee requests
		id = data["id"];
		console.log(id);
        localStorage['id'] = id;
	});
}

//check if the coffee has been delivered yet
function statuscheck(domain,id) {
    if( typeof domain === 'undefined' || domain === null ){
        return;
    }
    if( typeof id === 'undefined' || id === null ){
        return;
    }

	var howmanybeforeme;
	var status;
	$.getJSON( domain + "/turtlebot-server/coffee_queue.php?statuscheck&id=" + id + "", function( data ) {
		howmanybeforeme = data["how-many-are-pending-before-id"];
		status = data["status"];

        console.log(status);
		console.log(howmanybeforeme);

        if(status != "pending") {
            //we're either complete or failed so mark it as canceled
            localStorage.removeItem('id');
            chrome.browserAction.setBadgeText({text: ''}); //reset to blank
            isOrdered(); //reset the UI
        }
        else {
            //we're pending still
            //show the number of people before you on the badge
		    chrome.browserAction.setBadgeBackgroundColor({color:[96, 191, 86, 255]});
		    chrome.browserAction.setBadgeText({text: '' + howmanybeforeme});
        }
	});

    isOrdered();
}

//cancel your current coffee request
function cancel(domain,id) {
	$.getJSON( domain + "/turtlebot-server/coffee_queue.php?update&id=" + id + "&status=failed", function( data ) {
		$.each( data, function( key, val ) {
			if(data["updated"] == "1") {
				console.log("success");
			}
		});
	});
}
