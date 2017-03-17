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
  maskRef: database.ref("mask"),
  maskRefDisc: null,


  //Semi useful initialize funciton;
  reset: function() {
    this.windowSeat = this.seats[0];
  },

  //Cleans up Firebase to good inital status
  //used as a helper for cleaning up incase of unforseen coding errors or connection stuffs.
  fbReset: function() {
    for (var i = 1; i < this.seats.length; ++i)
      this.seats[i].fbReset();

    this.gameRef.set({ gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: "", poster: "", year: "" });
    this.maskRef.remove();
    this.chatRef.remove();
    this.hChatRef.remove();

  },

  //updates firebase("game") with current information
  fbSetGame: function() {
    this.gameRef.set({ gameState: this.gameState, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer, poster: this.posterUrl, year: this.movieYear});
  },

  //updates firebase("mask") with current answer display mask
  fbUpdateMask: function(val) {
    //console.log(val.str);
    this.answerMask = JSON.parse(val.str);
    if (this.gameState === gameStates.waitingForAnswer)
      this.jqDisplayHiddenAnswer();
  },

  //Called on "value" updates of firebase("game"), updates local to match firebase
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

  //Called on "value" updates of firebase("player/x"), updates local to match firebase
  //Also checks to see if a player has left in the middle of the game and displays info
  //If this window player is the last connected, then have this player clean up firebase when player disconnects
  fbUpdateSeat: function(num, val) {
    var tempSeat = this.seats[num];

    if (tempSeat.joined === true && val.joined === false)
      if (this.gameState !== gameStates.waitingForPlayers)
        this.playerLeftGame(tempSeat.name);

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

  //Helper function, does stuff when another player leaves the active game.
  playerLeftGame: function(name) {
    this.gameStopTimers();
    this.jqHideAllModals();
    this.hinter = 0;
    this.answer = "";
    this.answerer = 0;
    this.jqGameText1(name + " has left the game!");
    this.jqGameText2("Waiting for players..");
    this.fbSendChat(0, name + " has disconnected");
    this.jqGameStatus("A player has left the game!", "Jeers for "+name+" next time you see them for spoiling the fun!");
  },

  //Helper function, get's a connected  player to act as the temp host
  //using this method because we don't have a central server to run the game code
  getTempHost: function() {
    for (var i = 1; i < this.seats.length; ++i) {
      if (this.seats[i].joined)
        return this.seats[i];
    }
    return -1;
  },

  //returns the seat of the window player if they are the last connected, 0 otherwise
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

  //Attaches onDisconnect's to this window to clean up firebase.  Called when this is the only player connected
  fbDisconnectAttach: function(num) {
    if (num === this.windowSeat.number) {
      this.hChatRefDisc = this.hChatRef.onDisconnect();
      this.hChatRefDisc.remove();
      this.chatRefDisc = this.chatRef.onDisconnect();
      this.chatRefDisc.remove();
      this.maskRefDisc = this.maskRef.onDisconnect();
      this.maskRefDisc.remove();
    }
  },

  //Cancels this windows onDisconnect's to Firebase, called when there is more than one player connected
  fbCancelDisconnect: function() {
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

  //Get's a temp host to set Firebase with current game stats
  //We do this to ensure that firebase is only updated by only 1 player at a time, to prevent all sorts of bugs.
  fbTempHostSetGame: function() {
    var tempSeat = this.getTempHost();
    if (tempSeat.number === this.windowSeat.number)
      this.fbSetGame();
  },

  //If num is 0, get temp host, otherwise use that window that is in the player seat to change the gamestate to firebase.
  //This is so only one player can change the gamestate at any one time.
  fbSetState: function(num, state) {
    //console.log("fb Set State "+num+" "+state);
    var tempSeat = null;
    if (num === 0)
      tempSeat = this.getTempHost();
    else
      tempSeat = this.seats[num];

    if (this.windowSeat.number === tempSeat.number) {
      //console.log("This Window is changing state to: " + state);
      this.gameRef.set({ gameState: state, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer, poster: this.posterUrl, year: this.movieYear});
    }
  },

  //If num is 0, get temp host, otherwise use that window that is in the player seat to change the mask array in firebase
  //This is so only one player can change the answer Mask at any one time.
  //Usually the hinter number is given
  fbSetMask: function(num, string) {
    //console.log("fb Set Mask "+num);
    var tempSeat = null;
    if (num === 0)
      tempSeat = this.getTempHost();
    else
      tempSeat = this.seats[num];

    if (this.windowSeat.number === tempSeat.number) {
      //console.log("This Window is setting mask");
      database.ref("mask").set({ str: string });
    }
  },

  //If num is 0, get temp host, otherwise use that window that is in the player seat to push a mesage to firebase("chat")
  //This is so only one player pushes the new message.
  fbSendChat: function(num, string) {
    //console.log("fb Send Chat "+num);
    var tempSeat = null;
    if (num === 0)
      tempSeat = this.getTempHost();
    else
      tempSeat = this.seats[num];

    if (this.windowSeat.number === tempSeat.number) {
      //console.log("This Window is setting chat");
      this.chatRef.push({ msg: string });
    }
  },

  //Called when the player tries to join a seat by entering in their name in the input field
  //If successful, this window seat is now the seat the player joined.
  joinGame: function(num, name) {
    if (this.seats[num].joined) {
      this.jqGameStatus("Pick an empty seat!", "This Seat is taken! No sitting in other people's laps.");
    } else if (this.windowSeat.number !== 0)
      this.jqGameStatus("You picked a seat already!", "Be nice and share; no hogging all the seats!");
    else if (this.gameState !== gameStates.waitingForPlayers)
      this.jqGameStatus("Game In Progress", "Sorry, but you can't join in the middle of a game.  Please wait until it is over to join in the fun.");
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

  //Called when the ready button is pressed
  //Only does stuff if the window has an active player and the gameState is waitingForPlayers or ReadyToStartGame
  //Returns this window's ready state (true/false)
  windowReady: function() {
    if (this.windowState !== windowStates.spectator) {
      if (this.gameState === gameStates.waitingForPlayers || this.gameState === gameStates.readyToStartGame) {
        if (this.windowSeat.ready) {
          this.windowSeat.ready = false;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are not ready.");
          var tempMsg = this.windowSeat.name + " is unready";
          this.chatRef.push({ msg: tempMsg });
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
          var tempMsg = this.windowSeat.name + " is ready";
          this.chatRef.push({ msg: tempMsg });
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

  //Returns true if all the players in a seat are ready and there are more than two of them, false otherwise
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

  //Heart of the Game logic
  //This is only called when fbUpdateGame get's an update via firebase
  //Only runs new calls on edge changes, just in case firebase is updated more than once with the same gameState
  //checks the gameState against the gameStates enum to see which case should be run.
  //Since this is only called when firebase updates, and we are striving that only one window will update firebae at any given time, each window should have the same gamestate at all times
  //For most gameStates, we set a timeroout to go to the next gamestate, and use a timer to display how long to the next state change.
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
            //console.log("Game Over!");
            this.gameStartTimers(3, 0, gameStates.gameOver);
          } else {
            var roundOver = this.startRound();
            if (roundOver) {
              //console.log("Round Over");
              //this.jqGameStatus(this.seats[this.hinter].name+" is the next Hinter!", "Get ready!");
              this.gameStartTimers(3, 0, gameStates.roundOver);
            } else {
              //console.log("Turn Starting!");
              this.jqGameStatus(this.seats[this.hinter].name+" is the next Hinter!", "Get ready!");
              this.fbSendChat(this.hinter, this.seats[this.hinter].name+" is the next Hinter!");
              //console.log(this.hinter);
              this.gameStartTimers(3, this.hinter, gameStates.waitingForGetAnswer);
            }
          }
          break;
        case gameStates.waitingForGetAnswer:
          this.jqHideAllModals();
          this.jqHideGameStatusModal();
          this.jqGameText("Waiting for the Hinter to select a movie", "Please standby....");
          this.fbSendChat(this.hinter, "Waiting for the Hinter to select a movie");
          this.getHintAnswer();
          break;
        case gameStates.waitingForHint:
          this.setFuzzyCompare();
          this.displayGetHint();
          break;
        case gameStates.waitingForAnswer:
          this.jqHideAllModals();
          this.jqHideGameStatusModal();
          this.jqDisplayHiddenAnswer();
          this.displayHint();
          this.intervalUnhideAnswer(60, this.answer.length);
          this.gameStartTimers(60, this.hinter, gameStates.hintUnanswered);
          break;
        case gameStates.hintAnswered:
          this.jqHideAllModals();
          this.jqHideGameStatusModal();
          this.gameStopTimers();
          this.clearHChat();
          this.displayHintAnswered();
          this.calculatePoints();
          this.jqDisplayAnswer(true);
          this.gameStartTimers(5, this.hinter, gameStates.turnOver);
          break;
        case gameStates.hintUnanswered:
          this.jqHideAllModals();
          this.jqHideGameStatusModal();
          this.clearHChat();
          this.displayNotAnswered();
          this.jqDisplayAnswer(false);
          this.gameStartTimers(5, this.hinter, gameStates.turnOver);
          break;
        case gameStates.turnOver:
          this.jqHideHiddenAnswer();
          this.jqHideAllModals();
          this.jqHideGameStatusModal();
          this.gameStartTimers(1, 0, gameStates.readyToStartRound);
          break;
        case gameStates.roundOver:
          //this.displayRoundOver();
          --this.round;
          this.jqGameStatus("Next Round is starting!", this.round+" rounds left!");
          this.fbSendChat(0, "Round Over!  " +this.round+" rounds left!");
          this.gameStartTimers(3, 0, gameStates.readyToStartRound);
          break;
        case gameStates.gameOver:
          this.displayGameOver();
          this.gameStartTimers(3, 0, gameStates.waitingForPlayers);
          break;
      }
    }
  },

  //Cancels all timeout's and intervals that may be runnning, set's their ID variables to null
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

  //Input, timer in seconds, seat to update firebasewith new state, and the new state to change to
  //Set's an interval per second that countsdown, and a timeout to runs when time ends to change the gameState
  gameStartTimers: function(time, seat = 0, state = gameStates.waitingForPlayers) {
    //just as a precaution;
    //console.log("Timer for: "+state);
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

  //Checks to see if the game is over, game is over when round===0
  isGameOver: function() {
    if (this.round === 0)
      return true;
    else
      return false;
  },

  //Helper function, does multiple stuff when gameState is reaadyToStartGame
  //takes an number of rounds as a paramater and sets the game length to that
  startGame: function(rounds) {
    this.round = rounds;
    this.jqGameText("Game is starting!", "");
    this.fbSendChat(0, "The game is about to start! Press Ready to stop countdown");
    for(var i=1; i<this.seats.length; ++i){
      this.seats[i].points=0;
      this.seats[i].jqDisplayAll();
      if(this.windowSeat.number===i)
        this.seats[i].fbSetSeat();
    }
  },

  //Helper function, does multiple stuff when gameState is readyToStartRound
  //Tries to get the next hinter in the round, if it does, returns false, otherwise everyone has been the hinter in this round and return's true
  startRound: function() {
    this.hinter = this.getHinter();
    if (this.hinter === -1) {
      this.hinter = 0;
      return true;
    } else
      return false;
  },

  //helper function for StartRound, returns -1 if everyone has been the hinter, or the seat number of the next hinter
  //Only checks seats that are active in the game
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

  //If this window is the hinter, this starts the ajax call to theMoviedb to get a random title
  getHintAnswer: function() {
    if (this.windowSeat.number === this.hinter) {
      getMovieDetails(randomDate("1979", "2017"));
    }
  },

  //Called via interval, updates the timer display, and also counts down.
  displayTimerCount: function() {
    this.jqDisplayTimeLeft();
    if (this.timeLeft > 0)
      --(this.timeLeft);
  },

  //Called when the hinter selects a movie as the answer.  Add's the answer to fuzzycompare to make comparing player guesses easy and lenient
  setFuzzyCompare: function() {
    this.fuzzyCompare = FuzzySet();
    this.fuzzyCompare.add(this.answer.toLowerCase());
  },

  //helper function, Displays game status based on if the window is the hinter or not.
  displayGetHint: function() {
    if (this.hinter === this.windowSeat.number) {
      this.jqGameText1("The movie is: " + this.answer);
      this.jqGameText2("Please enter in your first hint");
      this.jqGameStatus("The movie is: " + this.answer, "Please enter in your first hint in the Chat Box.");
      this.fbSendChat(this.hinter, "Waiting for the Hinter to enter in first hint");
    } else {
      this.jqGameStatus("The first hint shall be given shortly!", "The timer starts as soon as the Hinter gives his first hint!<BR><BR>Get ready to start them guesses!");
      this.jqGameText1("The Hinter is " + this.seats[this.hinter].name);
      this.jqGameText2("Waiting on Hinter to enter in a hint");
    }
  },

  //
  displayHint: function() {
    if (this.hinter === this.windowSeat.number) {
      //this.jqGameStatus("More Hints === More Correct Answers!", "Please enter in more hints in the chat box, they will be displayed in the Hinter Box for all to see!  <br><br>Remember, you get points too if someone correclty guesses the movie!");
      this.jqGameText1("Enter hints in the chat box!");
      this.jqGameText2("Remember: Correct Answers = points!");
      this.fbSendChat(this.hinter, "TIME TO START GUESSING THE MOVIE!!!");
    } else {
       //this.jqGameStatus("Turn Started!", "Start trying to guess the movie!<br><br>Use the Hidden Answer Box™ and the Hinter Chat for help!");
      this.jqGameText1("Timer has started! START ANSWERING!!!");
      this.jqGameText2("The Chat Box is also your Answer Submit Box!");
    }
  },

  //Display's the masked Answer in the game board, selects a temp host to select a random position in the mask to unveal a letter/number
  maskUnhide: function() {
    this.jqDisplayHiddenAnswer(false);

    var tempSeat = this.getTempHost();
    if (this.windowSeat.number === tempSeat.number) {
      var rng = Math.floor(Math.random() * this.answer.length);
      this.answerMask[rng] = true;
      this.fbSetMask(tempSeat.number, JSON.stringify(this.answerMask));
    }
  },

  //display up to 75% (or percent if set) of the answer over the course of time in seconds.
  //makes a new interval that calls maskUnhide
  intervalUnhideAnswer: function(time, length, percent = .75) {
    var revealTime = time / (length * percent);

    this.maskIntervalId = setInterval(function() {
      main_game.maskUnhide();
    }, revealTime * 1000);
  },

  //called when the anwer has been guessed
  //displays the whole answer, and updates some game status text when the movie has been guessed
  displayHintAnswered: function() {
    this.jqDisplayHiddenAnswer(true);
    this.jqGameText1(this.seats[this.answerer].name + " has answered the hint!");
    this.jqGameText2("The answer was: " + this.answer);
    this.fbSendChat(this.answerer, this.seats[this.answerer].name + " has answered the hint!");
    this.fbSendChat(this.answerer, "The answer was: " + this.answer);
    this.fbSendChat(this.answerer, this.seats[this.answerer].name + " gets 1 point!");
    this.fbSendChat(this.answerer, this.seats[this.hinter].name + " gets 2 point!");
  },

  //called when the answer has been guessed
  //Gives the hinter and answerer points if the movie was guessed, updates their firebase entries with the points
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

  //called when the timer runsout when trying to guess a movie
  //displays the whole answer, and updates some game status text when the movie has not been guessed
  displayNotAnswered: function() {
    this.jqDisplayHiddenAnswer(true);
    this.jqGameText1("Time over!  No one gets any points!");
    this.jqGameText2("The answer was: " + this.answer);
    this.fbSendChat(0, "Time over!  No one gets any points!");
    this.fbSendChat(0, "The answer was: " + this.answer);
  },

  //called when the game starts
  //makes a temp host set all seats .ready to unready in firebase
  setAllSeatsUnReady: function() {
    var tempSeat=this.getTempHost();
    if(this.windowSeat.number===tempSeat.number)
      for (var i = 1; i < this.seats.length; ++i) {
        this.seats[i].ready = false;
        this.seats[i].fbSetSeat();
      }
  },

  //Unused Function
  setAllSeatsPoints: function() {
    for (var i = 1; i < this.seats.length; ++i) {
      this.seats[i].points = 0;
      this.seats[i].fbSetSeat();
    }
  },

  //called when the window tries to send a message via the chat box.
  //if the window is in a seat and is not the hinter, chat is sent to the chat box, and if there is a movie to be gussed curretly, the chat box also your submit guess box.
  //if the window  is the hinter, chat is sent to the hinter chat box
  //input is sent to firebse("chat")  or firebase("hChat")
  fbSendChatMessage: function(message) {
    if (this.windowSeat.number !== 0) {
      if ((this.gameState === gameStates.waitingForAnswer || this.gameState === gameStates.waitingForHint ) && this.windowSeat.number === this.hinter) {
        this.hChatRef.push({ msg: message });
      } else {
        var tempMsg = this.windowSeat.name + ": " + message;
        this.chatRef.push({ msg: tempMsg });
      }

      if (this.gameState === gameStates.waitingForHint && this.windowSeat.number === this.hinter)
        this.setHint(message);
      else if (this.gameState === gameStates.waitingForAnswer && this.windowSeat.number !== this.hinter)
        this.checkAnswer(message);
    }

  },

  //jquery function, updates timer display
  jqDisplayTimeLeft: function() {
    $("#timer").text(this.timeLeft);
  },

  //jquery function, if reveal is false, display the answer masked by answerMask, else display the full answer
  jqDisplayHiddenAnswer: function(reveal=false) {
    var displayStr = "";
    for (var i = 0; i < this.answer.length; ++i)
      if (this.answerMask[i] || reveal)
        displayStr += this.answer[i] + '&nbsp;';
      else
        displayStr += "_&nbsp;";

    $("#movie-to-guess").html(displayStr);
  },

  //jquery funciton, erases the diplayed answer container
  jqHideHiddenAnswer: function() {
    $("#movie-to-guess").html("");
  },

  //jquery function, called when firebase("chat") get's a new child added.  Displays the mesg to the chat box
  jqDisplayChatMessage: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox = $("#chat-history");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  //jquery function, called when firebase("hChat") get's a new child added.  Displays the mesg to the hinter chat box
  jqDisplayHinterChat: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox = $("#hinter-chat");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  //empties the hinter chat box
  clearHChat: function() {
    $("#hinter-chat").empty();
    this.hChatRef.remove();
  },

  //called when the game is over
  //displays a modal and updates game status text
  displayGameOver: function() {
    var winStr = this.getWinnerStr();
    this.jqGameStatus(winStr, "Congratulate them! Or not.  Or whatever.  I'm not your mother.");
    this.jqGameText1(winStr);
    this.jqGameText2("Ready up to start again!");
    this.fbSendChat(0, "Game over!");
    this.fbSendChat(0, winStr);
    this.fbSendChat(0, "Ready up to start again!");
  },

  //helper function for displayGameOver
  //returns a string based on who has the most points at the end of the game.
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
  //Displays the reroll/set movie modal
  jqReturnAnswer: function(str) {
    var myModal = $("#modalConfirmMovie");
    myModal.find(".modal-movie").text(str);
    myModal.modal("show");
  },

  //only the hinter window is going to call this function
  //Set's the str as the hinter's answer.  also builds the intial answerMask, and updates the wikipedia plot modal text
  setAnswer: function(str) {
    this.answer = str;
    this.posterUrl = movieImg;
    this.movieYear = movieYear;
    this.mask = [];
    for (var i = 0; i < str.length; ++i)
        this.mask[i] = this.charIsNotAlphaNumeric(str.charCodeAt(i));

      //console.log(this.mask);
    this.jqSetMoviePlotModal();
    this.jqSetMovieDetailsModal();
    this.fbSetMask(this.hinter, JSON.stringify(this.mask));
    this.fbSetState(this.hinter, gameStates.waitingForHint);
  },

  //herlp function, if charCode paramater is an alphanumeric, return true, false otherwise
  charIsNotAlphaNumeric: function(code) {
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return true;
      }
    return false;
  },

  //jquery funciton, updates the wikipedi plot modal text with the answer's title and plot.
  jqSetMoviePlotModal: function() {
    var object = wtf_wiki_object;
    //console.log("Wikitext Parse object");
    //console.log(object);
    var keysIter = object.text.keys();
    //console.log(keysIter);
    //console.log("Plot entry in wikiText parse");
    //console.log(plotObject);
    var myModal = $("#modalMoviePlot");
    var title = myModal.find(".modal-movie");
    var body = myModal.find(".modal-body");
    body.empty();

    title.text(movieTitle);

    if(object===null || object.text.size===0){
      body.append($("<p>").text("No Wikipedia Entry, Sorry"));
    }
    else {
      for(var k=0; k<object.text.size; ++k) {
        var entry = keysIter.next().value;
        //console.log(entry);
        var tempArray = object.text.get(entry);

        body.append($("<h3>").text(entry));
        body.append($("<hr>"));

        var tempP = $("<p>");
        for (var i = 0; i < tempArray.length; i++) {
          tempP.append(tempArray[i].text+"&nbsp;&nbsp;");
          if(i%3===0) 
            tempP.append("<br/><br/>");
        }
        body.append(tempP);
        body.append("<br/><br/>");
      }
    }
  },

  //Set's the movie Details Modal
  jqSetMovieDetailsModal: function() {
    var myModal = $("#modalMovieDetails");
    myModal.find(".movie-title").text(movieTitle);
    myModal.find(".movie-year").text(movieYear);
    myModal.find(".movie-summary").text(movieSummary);
    myModal.find("img").attr("src", movieImg);
  },

  //only the hinter is going to call this function
  //Called when the hinter enters in their first hint to start the timer countdown.
  //changes state hinter's window then also changes gameState to waitingForAnswer
  setHint: function(str) {
    //console.log("we be getting called");
    this.hint = str;
    this.fbSetState(this.hinter, gameStates.waitingForAnswer);
  },

  //only the first window to submit the correct answer will call this function
  //if thi wndow guesses the answer with greater than prob matching, they are the answerer.
  checkAnswer: function(str, prob = .8) {
    var tempFuzzArray = this.fuzzyCompare.get(str.toLowerCase());
    if (tempFuzzArray !== null && tempFuzzArray.length > 0)
      if (tempFuzzArray[0][0] > prob) {
        this.answerer = this.windowSeat.number;
        this.fbSetState(this.answerer, gameStates.hintAnswered);
      }
  },

  //jquery function, changes the gameTest1 text
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

  //Called when the question is answered or when time runs out
  //Update's and displays the movie modal with the title and year, and move poster
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

  //updates and display's the gameStatus modal
  jqGameStatus: function(head, body) {
    var modal = $("#modalGameStatus");
    modal.find(".status-head").html(head);
    modal.find(".status-body").html(body);
    modal.modal("show");
  },

  //hides all modals that have .modal-hideable as a class
  jqHideAllModals: function() {
    $(".modal-hideable").modal("hide");
  },

  jqHideGameStatusModal: function() {
    $("#modalGameStatus").modal("hide");
  },
  
  //returns this windows seat nunber.
  windowNum: function() {
    return this.windowSeat.number;
  }
};

