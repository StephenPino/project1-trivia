$("#player-ready").on("click", function() {
	$("#player-ready").hide();
	$("#player-unready").show();
});

$("#player-unready").on("click", function() {
	$("#player-ready").show();
	$("#player-unready").hide();
});