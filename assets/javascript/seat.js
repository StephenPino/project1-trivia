function Seat(num=0, name="Empty", joined=false, points=0, ready=false){
  this.number=num;
  this.name=name;
  this.joined=joined;
  this.points=points;
  this.ready=ready;
  this.state=seatStates.waitingForPlayer;
  this.ref=database.ref("player/"+num);

  this.updateValues = function(snapshot){
    var val=snapshot.val();
    this.name=val.name;
    this.points=val.points;
    this.joined=val.joined;
  };
  this.sendAnswer = function(message){
    //main_game.checkAnswer(message, this.number);
  };
  this.fbSetSeat = function(){
    this.ref.set({name: this.name, joined: this.joined, ready: this.ready, points: this.points});
  };
  this.fbDisconnectAttach = function(){
    this.ref.onDisconnect().set({name: "Empty", joined: false, ready: false, points: 0});
  };
  //this method will call the ajax to get the random movie, and some logic if they want to skip the movie.
  this.getAnswer = function() {
    //main_game.setAnswer("The Princess Bride");
    main_game.setAnswer(prompt("What is the Answer?"));
  };
  this.jqDisplayName = function() {
    $("#player"+num+"-name").text(this.name);
  };
  this.jqDisplayPoints = function() {
    $("#player"+num+"-points").text(this.points);
  };
  this.jqDisplayAll = function() {
    this.jqDisplayName();
    this.jqDisplayPoints();
  };
}