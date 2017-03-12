// Update this in code
function hideNameDisplay(num){
	$("#player" + num + "-name-input").addClass("hidden");
	$("#player" + num + "-name-submit").addClass("hidden");
	$("#player" + num + "-points-p").removeClass("hidden");
}

function showNameDisplay(num){
	$("#player" + num + "-name-input").removeClass("hidden");
	$("#player" + num + "-name-submit").removeClass("hidden");
	$("#player" + num + "-points-p").addClass("hidden");
}

function buttonReadyState(ready){
	if(!ready) {
		$("#player-ready").html("Ready?");
		$(this).attr("data-state", "unready");
	}
	else {
		$("#player-ready").html("Unready?");
		$(this).attr("data-state", "ready");
	}

}

// Ready / Unready Status
$("#player-ready").on("click", function() {

	var ready=main_game.windowReady();
	buttonReadyState(ready);

});
