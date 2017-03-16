var main_game = {
  seats: [new Seat(0), new Seat(1), new Seat(2), new Seat(3), new Seat(4), new Seat(5)],
  gameState: gameStates.waitingForPlayers,
  lastGameState: null,

  windowSeat: null,
  windowState: windowStates.spectator,

  round: 0,
  timeLeft: 30,
  hostSeat: 0,
  hinter: 0,
  hint: "",
  answer: "",
  answerer: 0,
  answerMask: null,
  posterUrl: "",
  movieYear: "",

  fuzzyCompare: null,

  intervalId: null,
  timeoutId: null,
  maskIntervalId: null,

  chatRef: database.ref("chat"),
  chatRefDisc: null,
  hChatRef: database.ref("q-chat"),
  hChatRefDisc: null,
  gameRef: database.ref("game"),
  gameRefDisc: null,
  maskRef: database.ref("mask"),
  maskRefDisc: null,



  reset: function() {
    this.windowSeat = this.seats[0];
  },

  fbReset: function() {
    for (var i = 1; i < this.seats.length; ++i)
      this.seats[i].fbReset();

    this.gameRef.set({ gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: "", poster: "", year: "" });

  },

  fbSetGame: function() {
    this.gameRef.set({ gameState: this.gameState, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer, poster: this.posterUrl, year: this.movieYear});
  },

  fbUpdateMask: function(val) {
    //console.log(val.str);
    this.answerMask = JSON.parse(val.str);
    if (this.gameState === gameStates.waitingForAnswer)
      this.jqDisplayHiddenAnswer();
  },

  fbUpdateGame: function(val) {
    this.gameState = val.gameState;
    this.hinter = val.hinter;
    this.hint = val.hint;
    this.answer = val.answer;
    this.answerer = val.answerer;
    this.posterUrl = val.poster;
    this.movieYear = val.year;
    this.checkGameState();
  },

  fbUpdateSeat: function(num, val) {
    var tempSeat = this.seats[num];
    if (tempSeat.joined === true && val.joined === false)
      if (this.gameState !== gameStates.waitingForPlayers)
        this.playerLeftDuringGame(tempSeat.name);

    tempSeat.name = val.name;
    tempSeat.joined = val.joined;
    tempSeat.points = val.points;
    tempSeat.ready = val.ready;
    tempSeat.jqDisplayAll();

    if (tempSeat.joined === true)
      hideNameDisplay(num);
    else
      showNameDisplay(num);

    var lastCon = this.getLastConnected();
    if (lastCon !== 0)
      this.fbDisconnectAttach(lastCon);
    else
      this.fbCancelDisconnect();
  },

  playerLeftDuringGame: function(name) {
    this.gameStopTimers();
    this.jqHideAllModals();
    this.hinter = 0;
    this.answer = "";
    this.answerer = 0;
    this.jqGameText1(name + " has left during an active game!");
    this.jqGameText2("Restarting Game");
    this.fbSetState(0, gameStates.waitingForPlayers);
  },

  getTempHost: function() {
    for (var i = 1; i < this.seats.length; ++i) {
      if (this.seats[i].joined)
        return this.seats[i];
    }
  },

  getLastConnected: function() {
    var result = true;
    var num = 0;
    for (var i = 1; i < this.seats.length; ++i) {
      if (result && this.seats[i].joined) {
        num = i;
        result = false;
      } else if (this.seats[i].joined)
        num = 0;
    }
    return num;
  },

  fbDisconnectAttach: function(num) {
    if (num === this.windowSeat.number) {
      this.gameRefDisc = this.gameRef.onDisconnect();
      this.gameRefDisc.set({ gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: "", poster: "", year: ""});
      this.hChatRefDisc = this.hChatRef.onDisconnect();
      this.hChatRefDisc.remove();
      this.chatRefDisc = this.chatRef.onDisconnect();
      this.chatRefDisc.remove();
      this.maskRefDisc = this.maskRef.onDisconnect();
      this.maskRefDisc.remove();
    }
  },

  fbCancelDisconnect: function() {
    if (this.gameRefDisc !== null) {
      this.gameRefDisc.cancel();
      this.gameRefDisc = null;
    }
    if (this.hChatRefDisc !== null) {
      this.hChatRefDisc.cancel();
      this.hChatRefDisc = null;
    }
    if (this.chatRefDisc !== null) {
      this.chatRefDisc.cancel();
      this.chatRefDisc = null;
    }
    if (this.maskRefDisc !== null) {
      this.maskRefDisc.cancel();
      this.maskRefDisc = null;
    }
  },

  fbTempHostSetGame: function() {
    var tempSeat = this.getTempHost();
    if (tempSeat.number === this.windowSeat.number)
      this.fbSetGame();
  },

  fbSetState: function(num, state) {
    //console.log("fb Set State "+num+" "+state);
    var tempSeat = null;
    if (num === 0)
      tempSeat = this.getTempHost();
    else
      tempSeat = this.seats[num];

    if (this.windowSeat.number === tempSeat.number) {
      console.log("This Window is changing state to: " + state);
      this.gameRef.set({ gameState: state, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer, poster: this.posterUrl, year: this.movieYear});
    }
  },

  fbSetMask: function(num, string) {
    //console.log("fb Set Mask "+num);
    var tempSeat = null;
    if (num === 0)
      tempSeat = this.getTempHost();
    else
      tempSeat = this.seats[num];

    if (this.windowSeat.number === tempSeat.number) {
      console.log("This Window is setting mask");
      database.ref("mask").set({ str: string });
    }
  },

  joinGame: function(num, name) {
    if (this.seats[num].joined) {
      alert("This seat is taken");
    } else if (this.windowSeat.number !== 0)
      alert("You already are in a seat!");
    else if (this.gameState !== gameStates.waitingForPlayers)
      alert("Can't join in the middle of the game");
    else {
      this.seats[num] = new Seat(num, name, true);
      this.windowSeat = this.seats[num];
      this.windowSeat.fbSetSeat();
      this.windowSeat.fbDisconnectAttach();
      this.windowState = windowStates.player;

      var tempMsg = name + " has taken seat " + num
      this.chatRef.push({ msg: tempMsg });
    }
  },

  windowReady: function() {
    if (this.windowState !== windowStates.spectator) {
      if (this.gameState === gameStates.waitingForPlayers || this.gameState === gameStates.readyToStartGame) {
        if (this.windowSeat.ready) {
          this.windowSeat.ready = false;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are not ready.");

          //you set unready when timer is going, need to stop it if the timer 
          //This will happen for the first person to click unready after all players have cliked ready.
          if (this.gameState === gameStates.readyToStartGame) {
            this.fbSetState(this.windowSeat.number, gameStates.waitingForPlayers);
          }
          return false;
        } else {
          this.windowSeat.ready = true;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are Ready!");
          //the Last person to be able to be ready clicks ready
          if (this.allSeatsJoinedReady()) {
            this.fbSetState(this.windowSeat.number, gameStates.readyToStartGame);
          }
          return true;
        }
      }
    }

    return this.windowSeat.ready;
  },

  allSeatsJoinedReady: function() {
    var numReady = 0;
    var allReady = true;
    for (var i = 1; i < this.seats.length; ++i)
      if (this.seats[i].joined)
        if (this.seats[i].ready)
          ++numReady;
        else
          allReady = false;
    return allReady && (numReady > 1);
  },

  checkGameState: function() {
    if (this.lastGameState !== this.gameState) {
      this.lastGameState = this.gameState;
      //this.jqHideAllModals();

      switch (this.gameState) {
        case gameStates.waitingForPlayers:
          this.gameStopTimers();
          this.jqGameText("Waiting for players", ""); //Wiatin for more than 2 players to sit and hit ready.
          break;
        case gameStates.readyToStartGame:
          this.startGame(2);
          this.jqGameStatus("Game Start Coundown Started!", "The Game will play for "+this.round+" rounds!<br><br>Click the Ready button again to stop the countdown.");
          this.gameStartTimers(3, 0, gameStates.readyToStartRound);
          break;
        case gameStates.readyToStartRound:
          this.setAllSeatsUnReady();
          if (this.isGameOver()) {
            console.log("Game Over!");
            this.gameStartTimers(3, 0, gameStates.gameOver);
          } else {
            var roundOver = this.startRound();
            if (roundOver) {
              console.log("Round Over");
              //this.jqGameStatus(this.seats[this.hinter].name+" is the next Hinter!", "Get ready!");
              this.gameStartTimers(3, 0, gameStates.roundOver);
            } else {
              console.log("Round Starting!");
              this.jqGameStatus(this.seats[this.hinter].name+" is the next Hinter!", "Get ready!");
              console.log(this.hinter);
              this.gameStartTimers(3, this.hinter, gameStates.waitingForGetAnswer);
            }
          }
          break;
        case gameStates.waitingForGetAnswer:
          this.jqHideAllModals();
          this.jqGameText("Waiting for the Hinter to select a movie", "Please standby....");
          this.getHintAnswer();
          break;
        case gameStates.waitingForHint:
          this.setFuzzyCompare();
          this.displayGetHint();
          break;
        case gameStates.waitingForAnswer:
          this.jqDisplayHiddenAnswer();
          this.displayHint();
          this.intervalUnhideAnswer(60, this.answer.length);
          this.gameStartTimers(60, this.hinter, gameStates.hintUnanswered);
          break;
        case gameStates.hintAnswered:
          this.jqHideAllModals();
          this.gameStopTimers();
          this.clearHChat();
          this.displayHintAnswered();
          this.calculatePoints();
          this.jqDisplayAnswer(true);
          this.gameStartTimers(5, this.hinter, gameStates.turnOver);
          break;
        case gameStates.hintUnanswered:
          this.jqHideAllModals();
          this.clearHChat();
          this.displayNotAnswered();
          this.jqDisplayAnswer(false);
          this.gameStartTimers(5, this.hinter, gameStates.turnOver);
          break;
        case gameStates.turnOver:
          this.jqHideHiddenAnswer();
          this.jqHideAllModals();
          this.gameStartTimers(1, 0, gameStates.readyToStartRound);
          break;
        case gameStates.roundOver:
          //this.displayRoundOver();
          --this.round;
          this.jqGameStatus("Next Round is starting!", this.round+" round\\s left!");
          this.gameStartTimers(3, 0, gameStates.readyToStartRound);
          break;
        case gameStates.gameOver:
          this.displayGameOver();
          this.gameStartTimers(3, 0, gameStates.waitingForPlayers);
          break;
      }
    }
  },

  gameStopTimers: function() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.maskIntervalId !== null) {
      clearInterval(this.maskIntervalId);
      this.maskIntervalId = null;
    }
  },

  gameStartTimers: function(time, seat = 0, state = gameStates.waitingForPlayers) {
    //just as a precaution;
    console.log("Timer for: "+state);
    clearInterval(this.intervalId);
    clearTimeout(this.timeoutId);

    this.timeLeft = time;
    this.displayTimerCount();
    //this.jqGameText1("Countdown to game start has begun!");
    this.intervalId = setInterval(function() {
      main_game.displayTimerCount();
    }, 1000);
    this.timeoutId = setTimeout(function() {
      main_game.gameStopTimers();
      main_game.fbSetState(seat, state);
    }, time * 1000);
  },

  isGameOver: function() {
    if (this.round === 0)
      return true;
    else
      return false;
  },

  startGame: function(rounds) {
    this.round = rounds;
    this.jqGameText("Game is starting!", "");
    for(var i=1; i<this.seats.length; ++i){
      this.seats[i].points=0;
      this.seats[i].jqDisplayAll();
      if(this.windowSeat.number===i)
        this.seats[i].fbSetSeat();
    }
  },

  startRound: function() {
    this.hinter = this.getHinter();
    if (this.hinter === -1) {
      this.hinter = 0;
      return true;
    } else
      return false;
  },

  getHinter: function() {
    var temp = this.hinter;
    ++temp;
    while (temp < this.seats.length && !this.seats[temp].joined)
      ++temp;
    if (temp < this.seats.length)
      return temp;
    else
      return -1;
  },

  getHintAnswer: function() {
    if (this.windowSeat.number === this.hinter) {
      getMovieDetails(randomDate("1979", "2017"));
    }
  },

  displayTimerCount: function() {
    this.jqDisplayTimeLeft();
    if (this.timeLeft > 0)
      --(this.timeLeft);
  },

  setFuzzyCompare: function() {
    this.fuzzyCompare = FuzzySet();
    this.fuzzyCompare.add(this.answer.toLowerCase());
  },

  displayGetHint: function() {
    if (this.hinter === this.windowSeat.number) {
      this.jqGameText1("The movie is: " + this.answer);
      this.jqGameText2("Please enter in your first hint");
      this.jqGameStatus("The movie is: " + this.answer, "Please enter in your first hint in the Chat Box.");
    } else {
      this.jqGameStatus("The first hint shall be given shortly!", "The timer starts as soon as the Hinter gives his first hint!<BR><BR>Get ready to start them guesses!");
      this.jqGameText1("The Hinter is " + this.seats[this.hinter].name);
      this.jqGameText2("Waiting on Hinter to enter in a hint");
    }
  },

  displayHint: function() {
    if (this.hinter === this.windowSeat.number) {
      //this.jqGameStatus("More Hints === More Correct Answers!", "Please enter in more hints in the chat box, they will be displayed in the Hinter Box for all to see!  <br><br>Remember, you get points too if someone correclty guesses the movie!");
      this.jqGameText1("Enter hints in the chat box!");
      this.jqGameText2("Remember: Correct Answers = points!");
    } else {
       //this.jqGameStatus("Turn Started!", "Start trying to guess the movie!<br><br>Use the Hidden Answer Box™ and the Hinter Chat for help!");
      this.jqGameText1("Timer has started! START ANSWERING!!!");
      this.jqGameText2("The Chat Box is also your Answer Submit Box!");
    }
  },

  maskUnhide: function() {
    this.jqDisplayHiddenAnswer(false);

    var tempSeat = this.getTempHost();
    if (this.windowSeat.number === tempSeat.number) {
      var rng = Math.floor(Math.random() * this.answer.length);
      this.answerMask[rng] = true;
      this.fbSetMask(tempSeat.number, JSON.stringify(this.answerMask));
    }
  },

  //display up to 75% of the answer
  intervalUnhideAnswer: function(time, length, percent = .75) {
    var revealTime = time / (length * percent);

    this.maskIntervalId = setInterval(function() {
      main_game.maskUnhide();
    }, revealTime * 1000);
  },

  displayHintAnswered: function() {
    this.jqDisplayHiddenAnswer(true);
    this.jqGameText1(this.seats[this.answerer].name + " has answered the hint!");
    this.jqGameText2("The answer was: " + this.answer);
  },

  calculatePoints: function() {
    if (this.answerer !== 0) {
      if (this.windowSeat.number === this.hinter) {
        this.windowSeat.points += 2;
        this.windowSeat.fbSetSeat();
      } else if (this.windowSeat.number === this.answerer) {
        this.windowSeat.points += 1;
        this.windowSeat.fbSetSeat();
      }
    }

  },

  displayNotAnswered: function() {
    this.jqDisplayHiddenAnswer(true);
    this.jqGameText1("Time over!  No one gets any points!");
    this.jqGameText2("The answer was: " + this.answer);
  },

  setAllSeatsUnReady: function() {
    buttonReadyState(false);
    for (var i = 1; i < this.seats.length; ++i) {
      this.seats[i].ready = false;
      this.seats[i].fbSetSeat();
    }
  },

  setAllSeatsPoints: function() {
    for (var i = 1; i < this.seats.length; ++i) {
      this.seats[i].points = 0;
      this.seats[i].fbSetSeat();
    }
  },

  fbSendChatMessage: function(message) {
    if (this.windowSeat.number !== 0) {
      if (this.gameState === gameStates.waitingForHint && this.windowSeat.number === this.hinter)
        this.setHint(message);
      else if (this.gameState === gameStates.waitingForAnswer && this.windowSeat.number !== this.hinter)
        this.checkAnswer(message);

      if (this.gameState === gameStates.waitingForAnswer && this.windowSeat.number === this.hinter) {
        this.hChatRef.push({ msg: message });
      } else {
        var tempMsg = this.windowSeat.name + ": " + message;
        this.chatRef.push({ msg: tempMsg });
      }
    }

  },

  jqDisplayTimeLeft: function() {
    $("#timer").text(this.timeLeft);
  },

  jqDisplayHiddenAnswer: function(reveal=false) {
    var displayStr = "";
    for (var i = 0; i < this.answer.length; ++i)
      if (this.answerMask[i] || reveal)
        displayStr += this.answer[i] + '&nbsp;';
      else
        displayStr += "_&nbsp;";

    $("#movie-to-guess").html(displayStr);
  },

  jqHideHiddenAnswer: function() {
    $("#movie-to-guess").html("");
  },

  jqDisplayChatMessage: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox = $("#chat-history");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  jqDisplayHinterChat: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox = $("#hinter-chat");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  clearHChat: function() {
    $("#hinter-chat").empty();
    this.hChatRef.remove();
  },

  displayGameOver: function() {
    var winStr = this.getWinnerStr();
    this.jqGameStatus(winStr, "Congratulate them! Or not.  Or whatever.  I'm not your mother.");
    this.jqGameText1(winStr);
    this.jqGameText2("Ready up to start again!");
  },

  getWinnerStr: function() {
    var maxPoints = 0;
    var names = [];
    for (var i = 1; i < this.seats.length; ++i) {
      if (this.seats[i].points > maxPoints)
        maxPoints = this.seats[i].points;
    }
    for (var i = 1; i < this.seats.length; ++i) {
      if (this.seats[i].points === maxPoints) {
        names.push(this.seats[i].name);
      }
    }

    var str = "";

    for (var i = 0; i < names.length; ++i) {
      if (i !== 0)
        str += ", ";
      str += names[i];
    }

    if (names.length === 1)
      str += " is the Winner! With " + maxPoints + " Points!";
    else
      str += " have tied! With " + maxPoints + " Points!";

    return str;

  },

  //called by themoviedb api .done call
  jqReturnAnswer: function(str) {
    var myModal = $("#modalConfirmMovie");
    myModal.find(".modal-movie").text(str);
    myModal.modal("show");
  },

  //only the hinter window is going to call this function
  setAnswer: function(str) {
    this.answer = str;
    this.posterUrl = movieImg;
    this.movieYear = movieYear;
    this.mask = [];
    for (var i = 0; i < str.length; ++i)
        this.mask[i] = this.charIsNotAlphaNumeric(str.charCodeAt(i));

      //console.log(this.mask);
    this.jqSetMoviePlotModal();
    this.fbSetMask(this.hinter, JSON.stringify(this.mask));
    this.fbSetState(this.hinter, gameStates.waitingForHint);
  },

  charIsNotAlphaNumeric: function(code) {
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return true;
      }
    return false;
  },

  jqSetMoviePlotModal: function() {
    var myModal = $("#modalMoviePlot");
    myModal.find(".modal-movie").text(movieTitle);
    myModal.find(".modal-plot").html(moviePlot);
  },

  //only the hinter is going to call this function
  setHint: function(str) {
    //console.log("we be getting called");
    this.hint = str;
    this.fbSetState(this.hinter, gameStates.waitingForAnswer);
  },

  //only the first window to submit the correct answer will call this function
  checkAnswer: function(str, prob = .8) {
    var tempFuzzArray = this.fuzzyCompare.get(str.toLowerCase());
    if (tempFuzzArray !== null && tempFuzzArray.length > 0)
      if (tempFuzzArray[0][0] > prob) {
        this.answerer = this.windowSeat.number;
        this.fbSetState(this.answerer, gameStates.hintAnswered);
      }
  },

  jqGameText1: function(str) {
    $("#game-text-1").text(str);
  },
  jqGameText2: function(str) {
    $("#game-text-2").text(str);
  },
  jqGameText: function(str1, str2) {
    this.jqGameText1(str1);
    this.jqGameText2(str2);
  },

  jqDisplayAnswer: function(isAnswered) {
    var modal = $("#modalMoviePoster");
    if (isAnswered) {
      modal.find(".movie-guesser").text(this.seats[this.answerer].name);
      modal.find(".modal-points").text(this.seats[this.answerer].name+" gets 1 points!  "+ this.seats[this.hinter].name+" gets 2 points!");
    } else {
      modal.find(".movie-guesser").text("No one");
      modal.find(".modal-points").text("No one get's any points.  :(");
    }
    modal.find(".movie-title").text(this.answer);
    modal.find(".movie-date").text(this.movieYear);
    modal.find(".movie-poster").attr("src", this.posterUrl);
    modal.modal("show");
  },

  jqGameStatus: function(head, body) {
    var modal = $("#modalGameStatus");
    modal.find(".status-head").html(head);
    modal.find(".status-body").html(body);
    modal.modal("show");
  },

  jqHideAllModals: function() {
    $(".modal").modal("hide");
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  },
  
  windowNum: function() {
    return this.windowSeat.number;
  },
};

