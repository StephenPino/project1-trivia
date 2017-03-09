var main_game = {
  seats: [new Seat(0),new Seat(1),new Seat(2),new Seat(3),new Seat(4),new Seat(5)],
  gameState: gameStates.waitingForPlayers,
  lastGameState: null,
  round:0,
  windowSeat: null,
  currentSeat: null,
  questioner: 0,
  question: "",
  answer: "",
  answerer: 0,
  chatRef: database.ref("chat"),
  gameRef: database.ref("game"),

  fbPlayerInit: function() {
    for(var i=1; i<this.seats.length; ++i)
      this.seats[i].refSetValues();

    this.gameRef.set({gameState: gameStates.waitingForPlayers, questioner: 0, question: "", answerer: 0, answer: ""});

  },

  refSetValues: function() {
    this.refSetValuesHelper(this.gameState, this.question, this.questioner, this.answer, this.answerer);
  },

  refSetValuesHelper: function (g, q, q1, a, a1) {
    this.gameRef.set({gameState: g, question: q, questioner: q1, answer: a, answerer: a1});
  },

  reset: function() {
    this.windowSeat=this.seats[0];
  },
  
  joinGame: function(num, name){
    if(this.seats[num].joined) {
      alert("This seat is taken");
    }
    else {
      this.seats[num]= new Seat(num, name, true);
      this.windowSeat=this.seats[num];
      this.windowSeat.state=seatStates.waitingForGameToStart;
      this.windowSeat.refSetValues();
      this.windowSeat.refDisconnectAttach();

      var tempMsg = name+" has taken seat "+num
      this.chatRef.push({msg: tempMsg});
    }
  },

  updateGameValues: function(val) {
    this.gameState=val.gameState;
    this.questioner=val.questioner;
    this.question=val.question;
    this.answer=val.answer;
    this.answerer=val.answerer;
    main_game.checkGameState();
  },

  updateSeatValues: function(num, val) {
    var tempSeat=this.seats[num];
    tempSeat.name=val.name;
    tempSeat.joined=val.joined;
    tempSeat.points=val.points;
    tempSeat.ready=val.ready;

    main_game.checkSeatState(num);
    main_game.checkGameState();
  },

  checkSeatState: function(num) {
    var tempSeat=this.seats[num];
    if(!tempSeat.joined)
      tempSeat.state=seatStates.waitingForPlayer;
    else if(this.gameState===gameStates.waitingForPlayers || this.gameState===gameStates.readyToStart)
      tempSeat.state=seatStates.waitingForGameToStart;
    else if(this.gameState===gameStates.waitingForQuestion || this.gameState===gameStates.waitingForAnswers)
      if(this.questioner!=null && this.questioner.number===tempSeat.number)
        tempSeat.state=seatStates.questioner;
      else
        tempSeat.state=seatStates.answerer;

  },

  checkGameState: function() {
    if(this.lastGameState!==this.gameState) {
      this.lastGameState=this.gameState;

      switch(this.gameState) {
        case gameStates.waitingForPlayers:
          this.jqGameText1("Waiting for players");
          break;
        case gameStates.readyToStart:
          this.startRound();
          this.setAllSeatsUnReady();
          break;
        case gameStates.waitingForQuestion:
          this.displayGetQuestion();
          break;
        case gameStates.waitingForAnswer:
          this.displayQuestion();
          break;
        case gameStates.questionAnswered:
          this.displayResults();
          this.calculatePoints();
          this.startRound();
          break;
        case gameStates.roundOver:
          this.displayGameOver();
          break;
      }
    }
  },

  startRound: function() {
    this.questioner=this.getQuestioner();
    if(this.questioner===-1){
      this.questioner=0;
      this.gameState=gameStates.roundOver;
      this.checkGameState();
      return;
    }
    if(this.windowSeat.number === this.questioner)
        this.windowSeat.getAnswer();
  },

  getQuestioner: function() {
    var temp=this.questioner;
    ++temp;
    while(temp<this.seats.length && !this.seats[temp].joined)
      ++temp;
    if(temp<this.seats.length)
      return temp;
    else
      return -1;
  },

  displayGetQuestion: function() {
    this.jqGameText1("The Questioner is "+this.seats[this.questioner].name);
    if(this.questioner===this.windowSeat.number) {
      this.jqGameText2("Please enter in a question in the chat box");
    }
    else {
      this.jqGameText2("Waiting on Questiner to enter in a question");
    }
  },

  displayQuestion: function() {
    this.jqGameText1("The Question is: "+this.question);
     if(this.questioner===this.windowSeat.number) {
      this.jqGameText2("You may offer hints if you want");
    }
    else {
      this.jqGameText2("The chat box is also used as your submit answer box");
    }
  },

  displayResults: function() {
    this.jqGameText1(this.seats[this.answerer].name+" has answered the question!");
    this.jqGameText2("The answer was: "+this.answer);
  },

  calculatePoints: function() {
    if(this.answerer!==0) {
      if(this.windowSeat.number===this.questioner){
        this.windowSeat.points+=1;
        this.windowSeat.refSetValues();
      }
      else if(this.windowSeat.number===this.answerer) {
        this.windowSeat.points+=3;
        this.windowSeat.refSetValues();
      }
    }

  },

  setAllSeatsUnReady: function() {
    for(var i=1; i<this.seats.length; ++i){
      this.seats[i].ready=false;
    }
  },

  setAllSeatsPoints: function() {

  },

  allSeatsJoinedReady: function() {
    var numReady=0;
    var allReady=true;
    for(var i=1; i<this.seats.length; ++i)
      if(this.seats[i].joined)
        if(this.seats[i].ready)
          ++numReady;
        else
          allReady=false;
    return allReady && (numReady>1);
  },

  sendChatMessage: function(message) {
    if(this.windowSeat.number!==0) {
      if(this.gameState===gameStates.waitingForQuestion && this.windowSeat.number===this.questioner)
        this.setQuestion(message);
      else if(this.gameState===gameStates.waitingForAnswer && this.windowSeat.number!==this.questioner)
        this.checkAnswer(message);

      var tempMsg = this.windowSeat.name+": "+message;
      this.chatRef.push({msg: tempMsg});
    }

  },

  jqDisplayChatMessage: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox=$("#chat-history");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  windowReady: function() {
    if(this.gameState===gameStates.waitingForPlayers) {
      if(this.windowSeat!==null){
        if(this.windowSeat.ready){
          this.windowSeat.ready=false;
          this.windowSeat.refSetValues();
          this.jqGameText2("You are not ready.");
        } else {
          this.windowSeat.ready=true;
          this.windowSeat.refSetValues();
          this.jqGameText2("You are Ready!");
          //the Last person to be able to be ready clicks ready
          if(this.allSeatsJoinedReady()) {
            this.gameState=gameStates.readyToStart;
            this.refSetValues();
          }
        }
      }
    }
  },

  displayGameOver: function() {
    var win=this.getWinner();
    this.jqGameText1(win+" is the Winner!");
    this.jqGameText2("Waiting for all people to be ready to start again");
    this.gameState=gameStates.waitingForPlayers;
    this.checkGameState();
  },

  getWinner: function() {
    return this.seats[1].name;
  },

  setAnswer: function(str) {
    this.answer=str;
    this.gameState=gameStates.waitingForQuestion;
    this.refSetValues();
  },

  setQuestion: function(str) {
    this.question=str;
    this.gameState=gameStates.waitingForAnswer;
    this.refSetValues();
  },

  checkAnswer: function(str) {
    if(str===this.answer){
      this.answerer=this.windowSeat.number;
      this.gameState=gameStates.questionAnswered;
      this.refSetValues();
    }
  },

  jqGameText1: function(str){
    $("#game-text-1").text(str);
  },
  jqGameText2: function(str){
    $("#game-text-2").text(str);
  },
};

