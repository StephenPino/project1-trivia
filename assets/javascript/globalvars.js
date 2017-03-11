const gameStates = {
  waitingForPlayers: "Waiting for all players",
  readyToStartGame: "Everyone is ready, ready to start game",
  readyToStartRound: "Ready to start next round",
  waitingForGetAnswer: "Waiting on setting the answer by the hinter",
  waitingForHint: "Waiting for hinter to enter a hint",
  waitingForAnswer: "Waiting for correct guess for the answer",
  hintAnswered: "Answer has been correctly guessed",
  hintUnanswered: "Answer has not been guessed due to time running out",
  roundOver: "All players have been the quesitoner",
  gameOver: "All Rounds complete"
};

const seatStates = {
  waitingForGameToStart: "Player has joined and is waiting to begin",
  hinter: "You are the hinter",
  emptySlot: "No one has claimed this seat",
  answerer: "You are trying to answer the hint"
};

const windowStates = {
  spectator: "This window is spectating",
  player: "This window a regular player",
  host: "This window is acting as the host"
};

  // Initialize Firebase
var config = {
  apiKey: "AIzaSyBRyByGGGi7bmIeFskezDVuuRWPfw0jpkQ",
  authDomain: "ut-bootcamp-project1.firebaseapp.com",
  databaseURL: "https://ut-bootcamp-project1.firebaseio.com",
  storageBucket: "ut-bootcamp-project1.appspot.com",
  messagingSenderId: "1065980904141"
};
firebase.initializeApp(config);
var database=firebase.database();