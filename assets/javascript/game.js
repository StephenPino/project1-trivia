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

    fbPlayerInit: function() {
        for (var i = 1; i < this.seats.length; ++i)
            this.seats[i].fbSetSeat();

        this.gameRef.set({ gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: "" });

    },

    fbSetGame: function() {
        this.gameRef.set({ gameState: this.gameState, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer });
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
            this.gameRefDisc.set({ gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: "" });
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
            this.gameRef.set({ gameState: state, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer });
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

            switch (this.gameState) {
                case gameStates.waitingForPlayers:
                    this.gameStopTimers();
                    this.jqGameText1("Waiting for players"); //Wiatin for more than 2 players to sit and hit ready.
                    break;
                case gameStates.readyToStartGame:
                    this.startGame(3);
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
                            console.log("Round OVer");
                            this.gameStartTimers(3, 0, gameStates.roundOver);
                        } else {
                            console.log("Round Starting!");
                            this.gameStartTimers(3, this.hinter, gameStates.waitingForGetAnswer);
                        }
                    }
                    break;
                case gameStates.waitingForGetAnswer:
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
                    this.gameStopTimers();
                    this.clearHChat();
                    this.displayResults();
                    this.calculatePoints();
                    this.jqDisplayAnswer(true);
                    this.gameStartTimers(3, this.hinter, gameStates.turnOver);
                    break;
                case gameStates.hintUnanswered:
                    this.clearHChat();
                    this.displayNotAnswered();
                    this.jqDisplayAnswer(false);
                    this.gameStartTimers(3, this.hinter, gameStates.turnOver);
                    break;
                case gameStates.turnOver:
                    this.fbSetState(0, gameStates.readyToStartRound);
                    break;
                case gameStates.roundOver:
                    //this.displayRoundOver();
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

    gameStartTimers(time, seat = 0, state = gameStates.waitingForPlayers) {
        //just as a precaution;
        clearInterval(this.intervalId);
        clearTimeout(this.timeoutlId);

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
        this.jqGameText1("Countdown to game start has begun!");
    },

    startRound: function() {
        --this.round;
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
        this.jqGameText1("The Hinter is " + this.seats[this.hinter].name);
        if (this.hinter === this.windowSeat.number) {
            this.jqGameText1("The movie is: " + this.answer);
            this.jqGameText2("Please enter the first hint in the chat box");
        } else {
            this.jqGameText2("Waiting on Hinter to enter in a hint");
        }
    },

    displayHint: function() {
        this.jqGameText1("The Hint is: " + this.hint);
        if (this.hinter === this.windowSeat.number) {
            this.jqGameText2("You may offer more hints if you want");
        } else {
            this.jqGameText2("The chat box is also used as your submit answer box");
        }
    },

    maskUnhide: function() {
        this.jqDisplayHiddenAnswer();

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

    displayResults: function() {
        this.jqGameText1(this.seats[this.answerer].name + " has answered the hint!");
        this.jqGameText2("The answer was: " + this.answer);
    },

    calculatePoints: function() {
        if (this.answerer !== 0) {
            if (this.windowSeat.number === this.hinter) {
                this.windowSeat.points += 1;
                this.windowSeat.fbSetSeat();
            } else if (this.windowSeat.number === this.answerer) {
                this.windowSeat.points += 3;
                this.windowSeat.fbSetSeat();
            }
        }

    },

    displayNotAnswered: function() {
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

    jqDisplayHiddenAnswer: function() {
        var displayStr = "";
        for (var i = 0; i < this.answer.length; ++i)
            if (this.answerMask[i])
                displayStr += this.answer[i] + '&nbsp;';
            else
                displayStr += "_&nbsp;";

        $("#movie-to-guess").html(displayStr);
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
        this.jqGameText1(winStr);
        this.jqGameText2("Waiting for all people to be ready to start again");
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
        this.mask = [];
        for (var i = 0; i < str.length; ++i)
            if (str[i] === ' ')
                this.mask[i] = true;
            else
                this.mask[i] = false;

            //console.log(this.mask);
        this.jqSetMoviePlotModal();
        this.fbSetMask(this.hinter, JSON.stringify(this.mask));
        this.fbSetState(this.hinter, gameStates.waitingForHint);
    },

    jqSetMoviePlotModal: function() {
        var myModal = $("#modalMoviePlot");
        myModal.find(".modal-movie").text(movieTitle);
        myModal.find(".modal-plot").text(moviePlot);
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

    jqDisplayAnswer: function(isAnswered) {
        var modal = $("#modalMoviePoster");
        if (isAnswered) {
            modal.find(".movie-guesser").html(this.answerer);
        } else {
            modal.find(".movie-guesser").html("No one");
        }
        modal.find(".movie-title").html(movieTitle);
        modal.find(".movie-date").html(movieYear);
        modal.find(".movie-poster").attr("src", movieImg);
        modal.modal("show");
    },

};
