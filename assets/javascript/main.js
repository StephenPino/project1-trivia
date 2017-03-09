$(document).ready(function(){

  //main_game.fbPlayerInit();
  main_game.reset();

  $("#player1-name-submit").on("click", function(event){
    event.preventDefault();
    main_game.joinGame(1, $("#player1-name-input").val().trim());
    $("#player5-name-input").val("");
  });
  $("#player2-name-submit").on("click", function(event){
    event.preventDefault();
    main_game.joinGame(2, $("#player2-name-input").val().trim());
    $("#player5-name-input").val("");
  });
  $("#player3-name-submit").on("click", function(event){
    event.preventDefault();
    main_game.joinGame(3, $("#player3-name-input").val().trim());
    $("#player5-name-input").val("");
  });
  $("#player4-name-submit").on("click", function(event){
    event.preventDefault();
    main_game.joinGame(4, $("#player4-name-input").val().trim());
    $("#player5-name-input").val("");
  });
  $("#player5-name-submit").on("click", function(event){
    event.preventDefault();
    main_game.joinGame(5, $("#player5-name-input").val().trim());
    $("#player5-name-input").val("");
  });

  $("#chat-submit").on("click", function(event){
    event.preventDefault();
    main_game.sendChatMessage($("#chat-input").val().trim());
    $("#chat-input").val("");
  });

  $("#player-ready").on("click", function(event){
    event.preventDefault();
    main_game.windowReady();
  });


  database.ref("player/1").on("value", function(snapshot){
      if(snapshot.exists())
        main_game.updateSeatValues(snapshot.key, snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/2").on("value", function(snapshot){
      if(snapshot.exists())
        main_game.updateSeatValues(snapshot.key, snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/3").on("value", function(snapshot){
      if(snapshot.exists())
        main_game.updateSeatValues(snapshot.key, snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/4").on("value", function(snapshot){
      if(snapshot.exists())
        main_game.updateSeatValues(snapshot.key, snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/5").on("value", function(snapshot){
      if(snapshot.exists())
        main_game.updateSeatValues(snapshot.key, snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });

  database.ref("chat").on("child_added", function(snapshot){
      main_game.jqDisplayChatMessage(snapshot.val().msg);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });

  database.ref("game").on("value", function(snapshot){
      main_game.updateGameValues(snapshot.val());
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
});