const gameStates = {
  waitingForPlayers: "Waiting for all players",
  readyToStart: "Everyone has joined that is going to, ready to start round",
  waitingForQuestion: "Waiting for Questioneer to enter a question",
  waitingForAnswer: "Waiting for correct answer",
  questionAnswered: "Question has been correctly answered",
  roundOver: "All players have been the quesitoner",
  gameOver: "All Rounds complete"
};

const seatStates = {
  waitingForGameToStart: "Player has joined and is waiting to begin",
  questioner: "You are the questioner",
  emptySlot: "No one has claimed this seat",
  answerer: "You are trying to answer the question"
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