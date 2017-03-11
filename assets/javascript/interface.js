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

$("#player2-name-submit").on("click", function() {
hideNameDisplay(2);

});


// Ready / Unready Status
$("#player-ready").on("click", function() {

	if($(this).attr("data-state") === "ready") {
		$("#player-ready").html("Ready?");
		$(this).attr("data-state", "unready");
		// main_game.windowSetReady(true);
	}
	else {
		$("#player-ready").html("Unready?");
		$(this).attr("data-state", "ready");
		// main_game.windowSetReady(false);
	}
});
