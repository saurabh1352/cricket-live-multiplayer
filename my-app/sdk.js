var URL_DEV = "ws://localhost:3663";
var URL_QA = "wss://multiplayer.freakx.in";
var URL_BETA = "ws://143.244.135.205:3664";
var client = new Colyseus.Client(URL_DEV);
var room;
var playerCount = 0;
var playerID;
var _gameOver = false;
var globalBullet = 0;
var isBowling = false;
var isBallHitWithBat = false;
var gobalName;
var globalFrame;
var globalJersey;
var rematchFlow = false;
var randomJear; 
var randomJearString; 
var customRoom = Number;
var roomcode=String;

var REMATCH_POPUP = {
  IDLE: -1,
  HIDE: 0,
  SHOW: 1,
};

var REMATCH_REPLY = {
  IDLE: -1,
  NO: 0,
  YES: 1,
};
var CREATE_REMATCH_CONSENSUS = {
  IDLE: -1,
  NO: 0,
  YES: 1,
};
var BOT_STATUS = {
  IDLE: -1,
  JOINED: 1,
};

var isPlayingWithBot = BOT_STATUS.IDLE;


function onLoad(name, frame, jearsy,createCustomRooms,code) {
  randomJear = Math.floor(Math.random() * 10);
randomJearString = randomJear.toString();
  console.log(randomJearString);
  
  
  // if (rematchFlow) return;
  globalName = name;
  globalFrame = frame;
  customRoom=createCustomRooms
  roomcode=code
  
  console.log(
    `Col -> Name: ${globalName}, Frame: ${globalFrame}, Jersey: ${globalJersey} , customRoom:${customRoom}`
  );

  if (jearsy == null) globalJersey = randomJearString;
  client
    .joinOrCreate("myRoom", {
      playerName: globalName,
      playerFrame: globalFrame,
      playerJersey: globalJersey,
      customRoom,
      roomcode
    })
    .then((room_instance) => {
      room = room_instance;
      console.log(room.sessionId, "joined", room.name);
      console.log(`Colysesus: v7 `);

      c3_callFunction("serverConnected", []);

      // listen to patches coming from the server
      room.state.players.onAdd = function (player, key) {
        //create Player in the game
        playerCount++;
        // console.log(`Colysesus Rec: ${JSON.stringify(player)} joined`);
        if (room.sessionId === room_instance.sessionId) {
          console.log(
            `Colysesus Rec: ${player.name} joined as ${player.playingAs}, frame: ${player.frame}`
          );
          if (player.playingAs == "bowler")
            c3_callFunction("bowlerInfo", [
              player.name,
              player.frame,
              player.jersey,
            ]);
          else if (player.playingAs == "batsman")
            c3_callFunction("batsmanInfo", [
              player.name,
              player.frame,
              player.jersey,
            ]);
        }
        setBallHitWithBat(false);
        if (playerCount == 2) {
          console.log(
            `Colysesus Rec: Both Player Connected > statdium ${room.state.stadium}`
          );
          c3_callFunction("bothPlayerConnected", [room.state.stadium]);
        }

        player.listen("playingAs", (playingAs) => {
          if (player.playingAs == "bowler") {
            console.log(`Colysesus Rec: Playing as bowler`);
            // isBowling = true;
            c3_callFunction("bowlerInfo", [
              player.name,
              player.frame,
              player.jersey,
            ]);
          } else if (player.playingAs == "batsman") {
            console.log(`Colysesus Rec: Playing as batsman`);
            // isBowling = false;
            c3_callFunction("batsmanInfo", [
              player.name,
              player.frame,
              player.jersey,
            ]);
          }
        });

        player.listen(
          "triggerBallingAction",
          (triggerBallingAction, previousTriggerBallingAction) => {
            if (key === room.sessionId) {
              if (triggerBallingAction) {
                console.log(`Colysesus Rec: Start balling animation`);
                c3_callFunction("triggerBallAction", [0]);
              }
            }
          }
        );
        player.listen(
          "enableBatting",
          (enableBatting, previousEnableBatting) => {
            if (key === room.sessionId) {
              if (enableBatting) {
                console.log(`Colysesus Rec: Enable batting on batsman`);
                c3_callFunction("batTurn", []);
              }
            }
          }
        );
        player.listen(
          "triggerBatingAction",
          (triggerBatingAction, previousTriggerBatingAction) => {
            if (key === room.sessionId) {
              if (triggerBatingAction) {
                console.log(
                  `Colysesus Rec:Start batting animation on baller  -> ${Date.now()}`
                );
                c3_callFunction("getBattingDone", [globalBullet]);
              }
            }
          }
        );

        player.listen("ballX", (ballX, previousballX) => {
          if (key === room.sessionId && ballX > 0) {
            console.log(
              ` Colysesus Rec: Miss value received from batsman: ${ballX}`
            );
            c3_callFunction("getBallX", [ballX]);
          }
        });

        player.listen("run", (run, previousScore) => {
          if (player.playingAs == "batsman") {
            console.log(` Colysesus Rec: Run By batsman: ${run}`);
            c3_callFunction("batScore", [run]);
          }
        });
        //new match requested by player A - Called on A
        player.listen("newMatch", (newMatch) => {
          if (key === room.sessionId && newMatch) {
            console.log(` Colysesus Rec: new match ${newMatch}`);
            LeaveRoom();
            c3_callFunction("newMatch", [0]);
          }
        });
        // Player A tap on rematch button - Called on Player B, shows popup
        player.listen("showRematchPopup", (showRematchPopup) => {
          if (
            key === room.sessionId &&
            showRematchPopup == REMATCH_POPUP.SHOW
          ) {
            console.log(` Colysesus Rematch:===========`);
            console.log(` Colysesus Rematch: Other player ask for rematch`);
            c3_callFunction("askRematch", [0]);
          }
        });
        player.listen("emojitype", (emojitype) => {
          if (
            key === room.sessionId
            
          ) {
            console.log(` emoji coming`);
            console.log(` emojitype`,emojitype);
            c3_callFunction("createEmoji",[emojitype]);
          }
        });
        

        //On Condition NO by Player B - Called On Player A
        player.listen(
          "replyByOtherPlayerForRematch",
          (replyByOtherPlayerForRematch) => {
            if (
              key === room.sessionId &&
              replyByOtherPlayerForRematch === REMATCH_REPLY.NO
            ) {
              console.log(
                ` Colysesus Rematch: rematch rejected by other player`
              );
              c3_callFunction("rejectedRematch", [0]);
            }
          }
        );
      };

      room.state.players.onRemove = function (player, key) {
        console.log("Removing Player", player, key);
        c3_callFunction("userLeft", []);
        LeaveRoom();
      };

      // When turn is changed
      room.state.listen("currentTurn", (key) => {
        setTurn(key);
      });
    

      // When ball position is set
      room.state.listen("globalBallPos", (position) => {
        if (position > 0) {
          console.log(`Colysesus Rec: Ball position received ${position}`);
          c3_callFunction("getBallPosition", [position]);
        }
      });

      // When ball power is set
      room.state.listen("globalPower", (power) => {
        if (power > 0) {
          console.log(`Colysesus Rec: Power of bowler received ${power}`);
          c3_callFunction("getBallPower", [power]);
        }
      });
      room.state.listen("roomCode",(roomCode)=>{
        console.log(roomCode,"ye rha room code")
        c3_callFunction("createRoomCode",[roomCode]);
      })
      room.state.listen("codeMatched",(codeMatched)=>{
        if(codeMatched==true)
        {
        console.log(codeMatched,"both player connected");
        c3_callFunction("goForMatching", [0]);
        }
        else{
          c3_callFunction("invalidRoomCode", [0]); 
        }
       
      })


      room.state.listen("globalBulletValue", (bulletValue) => {
        if (bulletValue > 0) {
          console.log(
            `Colysesus Rec: Bullet Value of ball received ${bulletValue}`
          );
          globalBullet = bulletValue;
        }
      });

      room.state.listen("draw", () => {
        console.log("Draw Done");
      });
      room.state.listen("winner", (sessionId) => {});

      room.state.listen("gameOver", (gameOver) => {
        console.log(`Colysesus Rec: GameOver ${gameOver}`);
        _gameOver = gameOver;
      });
      room.state.listen("resetGame", (resetGame) => {
        if (resetGame) {
          console.log(`Colysesus Rec: reset ${resetGame}`);
          setBallHitWithBat(false);
          c3_callFunction("resetTurn", [0]);
        }
      });

      room.state.listen("innings", (innings) => {
        if (innings == 1) {
          console.log(`Colysesus Rec: Ist Innings done, turn will change`);
          c3_callFunction("InningDone", []);
        }
      });
      room.state.listen("gameComplete", (gameComplete) => {
        if (gameComplete) {
          console.log(`Colysesus Rec: Game Complete`);
          rematchFlow = true;
          c3_callFunction("gameComplete", []);
        }
      });
      //On Condition YES by Player B - On Player A and Player B
      room.state.listen(
        "allPlayersHaveAgreedToRematch",
        (allPlayersHaveAgreedToRematch) => {
          if (allPlayersHaveAgreedToRematch === CREATE_REMATCH_CONSENSUS.YES) {
            console.log(`Colysesus Rematch: Create a rematch`);
            c3_callFunction("rematch", [0]);
          }
        }
      );

      // room.onStateChange((state) => {
      //   console.log(`Colysesus Rec...state: ${JSON.stringify(state)}`);
      // });
    })
    .catch((e) => {
      console.log(`Colysesus:  something wrong with server`);
      c3_callFunction("ServerNotWorking", []);
    });
}

function LeaveRoom() {
  if (room) {
    room.connection.close();
    room = null;
    ResetEverything();
  } else {
    console.warn("Not connected.");
  }
}

function connectServer() {
  console.log(`Colysesus:  Check if connected`);
  c3_callFunction("serverConnected", [0]);
}
function newMatch() {
  console.log(`Colysesus: gameOver ${_gameOver}`);
  if (_gameOver) {
    if (room) room.send("newMatch", {});
  } else if (!_gameOver) exitMatch();
}
function rematch() {
  //Ask for Rematch - Click by Player A
  console.log(` Colysesus Rec:===========`);
  console.log(`Colysesus: Ask  for rematch`);
  if (room) room.send("askingForRematchAction", {});
}

function rematchConfirm() {
  //Yes if rematch accepted - Click by Player B
  console.log(`Colysesus Rematch: Send rematch Yes`);
  if (room) room.send("rematchReply", { reply: "yes" });
}
function rematchNo() {
  //No if rematch rejected - Click by Player B
  console.log(`Colysesus Rematch: Send rematch no`);
  if (room) room.send("rematchReply", { reply: "no" });
}

//Lyout loaded get all data
function rematchOrNext() {
  _gameOver = false;
  setBallHitWithBat(false);
  if (room) room.send("rematchOrNext", {});
}
function emojiClicked(emojitype)
{
  
  if (room) room.send("sendemoji", {emojitype});
}

function setTurn(playerId) {
  if (playerId == room.sessionId) {
    console.log("Colysesus: You Bowl!");
    console.log("Colysesus: Opponent Bat!");
    isBowling = true;
    c3_callFunction("ballTurn", [0]);
    c3_callFunction("baller", [0]);
  } else {
    isBowling = false;
    console.log("Colysesus: You Bat!");
    console.log("Colysesus: Opponent Bowl!");
    c3_callFunction("batsman", [0]);
  }
}

//Send Events
function sendBallPosition(arg) {
  if (!_gameOver && isBowling)
    if (room) room.send("ballPosition", { ballPosition: arg });
}

function sendBallPower(arg) {
  if (!_gameOver && isBowling)
    if (room) room.send("ballPower", { ballPower: arg });
}

function sendBattingDone(arg) {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Bullet by Batsman -> ${arg}`);
    setBallHitWithBat(true);
    if (room)
      room.send("bulletValue", {
        bulletValue: arg,
      });
  }
}

function sendRun(arg) {
  console.log(`Colysesus: ${_gameOver} <- RUN -> ${isBowling}`);
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Run by Batsman -> ${arg}`);
    if (room) room.send("run", { run: arg });
  }
}

function ballMissed() {
  console.log(
    `Colysesus Sent ${_gameOver}, ${isBowling}, ${IsBallHitWithBat()}`
  );
  if (!_gameOver && !isBowling && !IsBallHitWithBat()) {
    console.log(
      `Colysesus Sent: Auto Ball Miss by Batsman ${IsBallHitWithBat()}`
    );
    if (room) room.send("ballMiss", {});
  }
}

//ballX
function ballX(arg) {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus Sent: Ball X Miss -> ${arg}`);
    if (room) room.send("ballX", { ballX: arg });
  }
}

function wicketGone() {
  if (!_gameOver && !isBowling) {
    console.log(`Colysesus: Wicket by Batsman `);
    if (room) room.send("ballMiss", {});
  }
}
// Get Events
function displayAds() {}

// for ball miss
function setBallHitWithBat(arg) {
  isBallHitWithBat = arg;
}

function IsBallHitWithBat() {
  return isBallHitWithBat;
}

// "InningDone" - c3function - one player done batting
// "gameComplete" - c3Function - Both batting done

function ResetEverything() {
  console.log(`Colysesus Rematch Reset Everything`);
  playerCount = 0;
  isPlayingWithBot = BOT_STATUS.IDLE;
}

function exitMatch() {
  console.log(`Colysesus Exit Match`);
  LeaveRoom();
  c3_callFunction("newMatch", [0]);
}

window.addEventListener("load", () => {
  hasNetwork(navigator.onLine);

  window.addEventListener("online", () => {
    // Set hasNetwork to online when they change to online.
    hasNetwork(true);
  });

  window.addEventListener("offline", () => {
    // Set hasNetwork to offline when they change to offline.
    hasNetwork(false);
  });
});

function hasNetwork(online) {
  if (!online) {
    c3_callFunction("showOfflineMsg", [0]);
  }
}

function botConnected() {
  isPlayingWithBot = BOT_STATUS.JOINED;
  console.log("Droid -> Exiting room");
  console.log("Droid");

  // as player one joned but didn't find other player so bot kicks in
  if (playerCount > 0) {
    playerCount = 0;
    if (room) {
      room.connection.close();
      room = null;
      console.log(`Colysesus: Bot Connected ${room} `);
    }
  }
}

function sendEvent(eventName, arg) {
  if (isPlayingWithBot != BOT_STATUS.JOINED)
    if (room) room.send(eventName, arg);
}