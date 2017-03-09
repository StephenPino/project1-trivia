function Seat(num=0, name="", joined=false, points=0, ready=false){
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
  this.refSetValues = function(){
    this.ref.set({name: this.name, joined: this.joined, ready: this.ready, points: this.points});
  };
  this.refDisconnectAttach = function(){
    this.ref.onDisconnect().set({name: "", joined: false, ready: false, points: 0});
  };
  this.getAnswer = function() {
    main_game.setAnswer("The Princess Bride");
  };
}