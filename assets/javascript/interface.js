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
