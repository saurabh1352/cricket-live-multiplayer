import { Room, Client, Delayed } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

enum CREATE_REMATCH_CONSENSUS {
  IDLE = -1,
  NO = 0,
  YES = 1,
}
enum REMATCH_POPUP {
  IDLE = -1,
  HIDE = 0,
  SHOW = 1,
}
enum REMATCH_REPLY_OTHER_PLAYER {
  IDLE = -1,
  NO = 0,
  YES = 1,
}


const rematchTimeOutVal = 30000;
export class Player extends Schema {
  @type("string") playingAs = "";
  @type("string") name = "";
  @type("string") jersey = "";
  @type("number") ballX = 0;
  @type("number") run = 0;
  @type("number") posY = 0;
  @type("number") ballPos = 0;
  @type("number") ballpPower = 0;
  @type("boolean") triggerBallingAction = false;
  @type("boolean") triggerBatingAction = false;
  @type("boolean") enableBatting = false;
  @type("number") frame = 0;
  @type("number") emojitype = -1;
  
  
  @type("boolean") newMatch = false;
  @type("number") showRematchPopup = REMATCH_POPUP.IDLE;
  @type("number") replyByOtherPlayerForRematch =
    REMATCH_REPLY_OTHER_PLAYER.IDLE;
}

export class State extends Schema {
  @type("string") currentTurn: string;
  @type({ map: Player })
  players = new MapSchema<Player>();
  @type("number") ballCount = 0;
  @type("number") globalBallPos = -1;
  @type("number") globalPower = -1;
  @type("number") globalBulletValue = -1;
  @type("string") winner: string;
  @type("boolean") draw: boolean;
  @type("boolean") gameOver = false;
  @type("boolean") resetGame = false;
  @type("number") innings = 0;
  @type("boolean") gameComplete = false;
  @type("number") allPlayersHaveAgreedToRematch = CREATE_REMATCH_CONSENSUS.IDLE;
  @type("number") stadium = -1;
  @type("string") roomCode:string;
  @type("boolean") codeMatched=false;
  
  
  ball_X = 0;
  rematchTimeout: Delayed;
}
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export class MyRoom extends Room<State> {
  maxClients = 2;
  runReceived: boolean;
  layoutLoadedForPlayer = 0;
  LOBBY_CHANNEL = "$mylobby"
 result:string;

  // Generate a single 4 capital letter room ID.
  generateRoomIdSingle(): string {
      let result = '';
      for (var i = 0; i < 4; i++) {
          result += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
      }
      return result;
  }
  async generateRoomId(): Promise<string> {
    const currentIds = await this.presence.smembers(this.LOBBY_CHANNEL);
    let id;
    do {
        id = this.generateRoomIdSingle();
    } while (currentIds.includes(id));

    await this.presence.sadd(this.LOBBY_CHANNEL, id);
    return id;
}
  // When room is initialized
  async onCreate(options: any) {
    console.log(`${JSON.stringify(options)} created`);
    if(options.customRoom==1)
    {
      this.result = await this.generateRoomId();
    
console.log(this.result,"this is rooom code .............");
      
    }
    
   

    this.setState(new State());
    this.state.roomCode=this.result;

    this.onMessage("ballPosition", (client, data) => {
      this.ballPositionReceivedAction(client.sessionId, data);
    });

    this.onMessage("ballPower", (client, data) => {
      this.ballPowerReceivedAction(client.sessionId, data);
    });
    this.onMessage("ballX", (client, data) => {
      this.ballX(client.sessionId, data);
    });
    this.onMessage("bulletValue", (client, data) => {
      this.updateBulletDataAction(client.sessionId, data);
    });
    this.onMessage("ballMiss", (client, data) => {
      this.ballMiss(client.sessionId, data);
    });
    this.onMessage("run", (client, data) => {
      this.runAction(client.sessionId, data);
    });
    this.onMessage("newMatch", (client, data) => {
      this.newMatch(client.sessionId, data);
    });
    this.onMessage("askingForRematchAction", (client, data) => {
      this.askingForRematchAction(client.sessionId, data);
    });
    this.onMessage("sendemoji", (client, data) => {
      this.sendemoji(client.sessionId, data);
     
    });
    this.onMessage("rematchReply", (client, data) => {
      this.rematchReplyAction(client.sessionId, data);
    });
    this.onMessage("rematchOrNext", (client, data) => {
      this.rematchOrNext(client.sessionId, data);
    });
  }

  // When client successfully join the room
  onJoin(client: Client, options: any, auth: any) {
    console.log(`____________NEW SESSION___________`,options);
    console.log(
      `${client.sessionId} Joined with name ${options.playerName}, frame: ${options.playerFrame},  jersey: ${options.playerJersey},roomcode:${options.roomcode}`
    );
    
    if(options.roomcode===this.state.roomCode)
    {
      console.log("i ....... reached to here.............");
      this.state.players.set(
        client.sessionId,
        new Player().assign({
          name: options.playerName,
          frame: options.playerFrame,
          jersey: options.playerJersey,
          playingAs: this.state.players.size === 1 ? "bowler" : "batsman",
          
        })
        
      );
      

      if (this.state.players.size === 2) {
        this.state.codeMatched=true;
        this.state.currentTurn = client.sessionId;
        // lock this room for new users
        this.lock();
        this.PrintBallerAndBatsman();
        this.state.stadium = this.getRandomInt(0, 6);
        console.log(`Stadium -> ${this.state.stadium}`);
      }
    }
 
   else{
    this.state.players.set(
      client.sessionId,
      new Player().assign({
        name: options.playerName,
        frame: options.playerFrame,
        jersey: options.playerJersey,
        playingAs: this.state.players.size === 1 ? "bowler" : "batsman",
        
      })
    );
   
    if (this.state.players.size === 2) {
      this.state.currentTurn = client.sessionId;
      // lock this room for new users
      this.lock();
      this.PrintBallerAndBatsman();
      this.state.stadium = this.getRandomInt(0, 6);
      console.log(`Stadium -> ${this.state.stadium}`);
    }
   }
  }
  

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

  ballPositionReceivedAction(sessionId: string, data: any) {
    if (this.state.winner || this.state.draw) {
      return false;
    }

    // Valid player sent ball data
    if (sessionId === this.GetBallerSessionID()) {
      console.log(
        `Position: ${data.ballPosition} received by PlayerId: ${sessionId}`
      );
      this.state.globalBallPos = data.ballPosition;
      //reset run or miss
      this.runReceived = false;
    }
    //  invalid player sent data
    else if (sessionId != this.GetBallerSessionID()) {
      console.log(`Invalid player sent ball position`);
    }
    // Edge case exception
    else {
      console.log(
        `Something else went wrong while getting ball postion, need to check`
      );
    }
  }

  ballPowerReceivedAction(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.winner || this.state.draw) {
      return false;
    }
    // Valid player sent ball power
    if (sessionId === this.GetBallerSessionID()) {
      console.log(
        `${sessionId}: Power: ${data.ballPower} received by playerId: ${sessionId}`
      );
      this.state.globalPower = data.ballPower;

      // enable batting on batsman
      this.state.players.get(this.GetBatsmanSessioID()).enableBatting = true;
      // trigger ball animation on batsman
      // this.clock.setTimeout(() => {
      this.state.players.get(this.GetBatsmanSessioID()).triggerBallingAction =
        true;
      // }, 2000);
      this.state.ballCount += 1;
    }
    //  invalid player sent data
    else if (sessionId != this.GetBallerSessionID()) {
      console.log(`Invalid player sent ball power`);
    }
    // Edge case exception
    else {
      console.log(
        `Something else went wrong while getting ball power, need to check`
      );
    }
  }
  ballX(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.draw || this.state.gameOver) {
      return false;
    }
    // Valid player sent ballMiss value
    if (sessionId === this.GetBatsmanSessioID()) {
      console.log(
        `${sessionId}: ballX: ${data.ballX} received by playerId: ${sessionId}`
      );

      this.state.ball_X = data.ballX;
    }
  }
  updateBulletDataAction(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.draw || this.state.gameOver) {
      return false;
    }

    // Valid player sent bullet value
    if (sessionId === this.GetBatsmanSessioID()) {
      console.log(
        `${sessionId}: Bullet value: ${data.bulletValue} received by playerId: ${sessionId}`
      );
      this.state.globalBulletValue = data.bulletValue;

      // trigger ball animation on baller
      this.state.players.get(this.GetBallerSessionID()).triggerBallingAction =
        true;
      this.state.players.get(this.GetBallerSessionID()).triggerBatingAction =
        true;
    }
    //  invalid player sent data
    else if (sessionId != this.GetBatsmanSessioID()) {
      console.log(`Invalid player sent bullet value`);
    }
    // Edge case exception
    else {
      console.log(
        `Something else went wrong while getting bullet value, need to check`
      );
    }
  }

  ballMiss(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.draw || this.state.gameOver) {
      return false;
    }
    // Valid player sent ballMiss value
    if (sessionId === this.GetBatsmanSessioID()) {
      console.log(
        `${sessionId}: Ball miss received by playerId: ${sessionId}, BallX value -> ${this.state.ball_X}`
      );
      // trigger ball animation on baller
      this.state.players.get(this.GetBallerSessionID()).triggerBallingAction =
        true;

      if (this.state.ball_X > 0) {
        console.log(`${sessionId}: BallX value sent: ${this.state.ball_X}`);
        this.state.players.get(this.GetBallerSessionID()).ballX =
          this.state.ball_X;
      }

      this.clock.setTimeout(() => {
        if (!this.runReceived) {
          this.restAllValue();
          this.clock.setTimeout(() => {
            this.resetGame(`${sessionId}: MISS`, sessionId);
          }, 1000);
        }
      }, 2000);
    }
    //  invalid player sent data
    else if (sessionId != this.GetBatsmanSessioID()) {
      console.log(`Invalid player sent ball Miss`);
    }
    // Edge case exception
    else {
      console.log(
        `Something else went wrong while getting missOrOut, need to check`
      );
    }
  }
  runAction(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.draw || this.state.gameOver) {
      return false;
    }
    // Valid player sent run value
    if (sessionId === this.GetBatsmanSessioID()) {
      console.log(
        `${sessionId}: run received ${data.run} by playerId: ${sessionId}`
      );
      this.state.players.get(sessionId).run += data.run;
      this.runReceived = true;
      this.restAllValue();
      this.clock.setTimeout(() => {
        this.resetGame("RUN", sessionId);
      }, 2000);
    }
    //  invalid player sent run
    else if (sessionId != this.GetBatsmanSessioID()) {
      console.log(`Invalid player sent run`);
    }
    // Edge case exception
    else {
      console.log(`Something else went wrong while getting run, need to check`);
    }
  }

  newMatch(sessionId: string, data: any) {
    console.log(`${sessionId}: New Match Req received ${sessionId}`);

    this.state.players.get(sessionId).newMatch = true;

    const playerIds = Array.from(this.state.players.keys());
    const otherPlayerSessionId =
      sessionId === playerIds[0] ? playerIds[1] : playerIds[0];
  }
  askingForRematchAction(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    console.log("=================");
    console.log(`${sessionId}: Rematch Req received ${sessionId}`);
    //reset reply
    this.state.players.get(
      this.GetBallerSessionID()
    ).replyByOtherPlayerForRematch = REMATCH_REPLY_OTHER_PLAYER.IDLE;
    this.state.players.get(
      this.GetBatsmanSessioID()
    ).replyByOtherPlayerForRematch = REMATCH_REPLY_OTHER_PLAYER.IDLE;

    const playerIds = Array.from(this.state.players.keys());
    const otherPlayerSessionId =
      sessionId === playerIds[0] ? playerIds[1] : playerIds[0];

    this.state.players.get(otherPlayerSessionId).showRematchPopup =
      REMATCH_POPUP.SHOW;
  }
  sendemoji(sessionId: string, data: any){
    if (this.GetPlayerCount() != 2) return;
    console.log("================= emojitype",data);
    this.state.players.get(
      this.GetBallerSessionID()
    ).emojitype = -1;
    this.state.players.get(
      this.GetBatsmanSessioID()
    ).emojitype = -1;
    const playerIds = Array.from(this.state.players.keys());
    const otherPlayerSessionId =
    sessionId === playerIds[0] ? playerIds[1] : playerIds[0];
    this.state.players.get(otherPlayerSessionId).emojitype =
      data.emojitype;
  }
  rematchReplyAction(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    console.log(
      `${sessionId}: Rematch Reply received ${sessionId} ${
        data.reply
      }, POP_UP: ${this.state.players.get(sessionId).showRematchPopup}`
    );
    if (
      this.state.players.get(sessionId).showRematchPopup == REMATCH_POPUP.SHOW
    ) {
      console.log(`${sessionId}: Checking if yes or no ${data.reply}`);
      if (data.reply === "yes") {
        console.log(`Checking if yes or no`);
        this.state.allPlayersHaveAgreedToRematch = CREATE_REMATCH_CONSENSUS.YES;
        this.restAllValue();
      } else if (data.reply === "no") {
        const playerIds = Array.from(this.state.players.keys());
        const playerWhoAskedForRematch =
          this.state.players.get(playerIds[0]).showRematchPopup ===
          REMATCH_POPUP.SHOW
            ? playerIds[1]
            : playerIds[0];
        // const playerWhoAskedForRematch_ =
        //   sessionId === playerIds[0] ? playerIds[1] : playerIds[0];

        this.state.players.get(
          playerWhoAskedForRematch
        ).replyByOtherPlayerForRematch = REMATCH_REPLY_OTHER_PLAYER.NO;

        //reset rematch popup here
        this.state.players.get(sessionId).showRematchPopup = REMATCH_POPUP.IDLE;
        console.log(
          `${sessionId}: Sending reply to ${playerWhoAskedForRematch} ${
            data.reply
          }, Reply: ${
            this.state.players.get(playerWhoAskedForRematch)
              .replyByOtherPlayerForRematch
          }`
        );
        // this.restAllValue();
      } else {
        console.log(`Something is not right on rematch reply`);
      }
    }
  }

  rematchOrNext(sessionId: string, data: any) {
    if (this.GetPlayerCount() != 2) return;

    console.log(`${sessionId}: Layout loaded for ${sessionId}`);
    this.layoutLoadedForPlayer++;

    if (this.layoutLoadedForPlayer == 2) {
      this.layoutLoadedForPlayer = 0;
      this.resetValuesForRematch();
    }
  }

  changePlayerTurnAction(sessionId: string) {
    if (this.GetPlayerCount() != 2) return;

    if (this.state.winner || this.state.draw || this.state.gameOver) {
      return false;
    }
    if (sessionId === this.state.currentTurn) {
      const playerIds = Array.from(this.state.players.keys());
      const otherPlayerSessionId =
        sessionId === playerIds[0] ? playerIds[1] : playerIds[0];

      this.state.currentTurn = otherPlayerSessionId;
    }
  }

  turnChange() {
    if (this.GetPlayerCount() != 2) return;

    this.state.ballCount = 0;
    if (this.state.innings > 0) {
      console.log(`----GAME COMPLETE----`);
      this.state.gameComplete = true;
      this.StartRematchTimer();
    } else {
      this.state.innings += 1;
      // this.state.players.get(this.GetBatsmanSessioID()).run = 0;
      // this.state.players.get(this.GetBallerSessionID()).run = 0;
      this.state.currentTurn = this.GetBatsmanSessioID();
      this.state.players.get(this.GetBatsmanSessioID()).playingAs = "batsman";
      this.state.players.get(this.GetBallerSessionID()).playingAs = "bowler";
      this.PrintBallerAndBatsman();
      console.log(`Second innings started`);
    }
  }

  resetValuesForRematch() {
    if (this.GetPlayerCount() != 2) return;

    console.log(`Rematch Values Re-Initailazed`);

    this.StopRematchTimer();

    this.state.players.get(this.GetBatsmanSessioID()).run = 0;
    this.state.players.get(this.GetBallerSessionID()).run = 0;

    this.state.players.get(this.GetBatsmanSessioID()).showRematchPopup =
      REMATCH_POPUP.IDLE;
    this.state.players.get(this.GetBallerSessionID()).showRematchPopup =
      REMATCH_POPUP.IDLE;

    this.state.players.get(
      this.GetBatsmanSessioID()
    ).replyByOtherPlayerForRematch = REMATCH_REPLY_OTHER_PLAYER.IDLE;
    this.state.players.get(
      this.GetBallerSessionID()
    ).replyByOtherPlayerForRematch = REMATCH_REPLY_OTHER_PLAYER.IDLE;

    this.state.innings = 0;
    this.state.gameComplete = false;
    this.state.allPlayersHaveAgreedToRematch = CREATE_REMATCH_CONSENSUS.IDLE;

    this.restAllValue();
  }

  restAllValue() {
    if (this.GetPlayerCount() != 2) return;

    console.log(`Reseting all values`);
    this.StopRematchTimer();

    this.state.resetGame = false;
    if (this.GetBallerSessionID()) {
      if (
        this.state.players.get(this.GetBallerSessionID()).triggerBallingAction
      ) {
        this.state.players.get(this.GetBallerSessionID()).triggerBallingAction =
          false;
      }
      if (
        this.state.players.get(this.GetBallerSessionID()).triggerBatingAction
      ) {
        this.state.players.get(this.GetBallerSessionID()).triggerBatingAction =
          false;
      }

      if (this.state.players.get(this.GetBallerSessionID()).enableBatting) {
        this.state.players.get(this.GetBallerSessionID()).enableBatting = false;
      }
      if (this.state.players.get(this.GetBallerSessionID()).ballX) {
        this.state.players.get(this.GetBallerSessionID()).ballX = -1;
      }
    }

    if (this.GetBatsmanSessioID()) {
      if (
        this.state.players.get(this.GetBatsmanSessioID()).triggerBallingAction
      ) {
        this.state.players.get(this.GetBatsmanSessioID()).triggerBallingAction =
          false;
      }
      if (
        this.state.players.get(this.GetBatsmanSessioID()).triggerBatingAction
      ) {
        this.state.players.get(this.GetBatsmanSessioID()).triggerBatingAction =
          false;
      }
      if (this.state.players.get(this.GetBatsmanSessioID()).enableBatting) {
        this.state.players.get(this.GetBatsmanSessioID()).enableBatting = false;
      }
      if (this.state.players.get(this.GetBatsmanSessioID()).ballX) {
        this.state.players.get(this.GetBatsmanSessioID()).ballX = -1;
      }
    }
    this.state.globalBallPos = -1;
    this.state.globalPower = -1;
    this.state.ball_X = -1;
  }

  resetGame(arg: string, sessionId: string) {
    if (this.GetPlayerCount() != 2) return;

    console.log(`${sessionId}: Ball Count: ${this.state.ballCount}`);

    if (this.state.innings > 0) {
      console.log(
        `Baller Run ${this.state.players.get(this.GetBallerSessionID()).run}`
      );
      console.log(
        `Batsman Run ${this.state.players.get(this.GetBatsmanSessioID()).run}`
      );

      if (
        this.state.players.get(this.GetBatsmanSessioID()).run >
        this.state.players.get(this.GetBallerSessionID()).run
      ) {
        this.turnChange();
        return;
      }
    }
    if (this.state.ballCount == 6) {
      this.turnChange();
    }
    if (!this.state.gameComplete) {
      this.state.resetGame = true;

      console.log(`${arg}: Game reset`);
    }
  }

  // When a client leaves the room
  onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} Leaving`);
    this.state.players.delete(client.sessionId);
  }

  // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
  onDispose() {}

  //Util function
  PrintBallerAndBatsman() {
    console.log(
      `Correct Baller is ${this.GetBallerSessionID()} ${this.roomId}`
    );
    console.log(
      `Correct Bastman is ${this.GetBatsmanSessioID()} ${this.roomId}`
    );
  }

  //Util function
  GetBallerSessionID() {
    const playerIds = Array.from(this.state.players.keys());
    const ballerSessioId =
      this.state.currentTurn === playerIds[1] ? playerIds[1] : playerIds[0];

    console.log(`Baller Id:`);
    console.log(`${ballerSessioId}`);
    if (!ballerSessioId) console.log(`There is no Bowler in Room`);

    return ballerSessioId;
  }

  //Util function
  GetBatsmanSessioID() {
    const playerIds = Array.from(this.state.players.keys());
    const batsManSessioId =
      this.state.currentTurn === playerIds[1] ? playerIds[0] : playerIds[1];

    console.log(`Batsman Id:`);
    console.log(`${batsManSessioId}`);

    if (!batsManSessioId) console.log(`There is no Batsman in Room`);
    return batsManSessioId;
  }

  GetPlayerCount() {
    console.log(`Players in room ${this.state.players.size}`);
    return this.state.players.size;
  }
  StartRematchTimer() {
    this.state.rematchTimeout = this.clock.setTimeout(() => {
      console.log("Rematch timer over, start new game");
      var batsmanId = this.GetBatsmanSessioID();
      console.log(`Rematch timer batsman: ${batsmanId}`);
      if (batsmanId != null) this.state.players.get(batsmanId).newMatch = true;

      var ballerId = this.GetBallerSessionID();
      console.log(`Rematch timer baller: ${ballerId}`);
      if (ballerId != null) this.state.players.get(ballerId).newMatch = true;
    }, rematchTimeOutVal);
  }

  StopRematchTimer() {
    if (this.state.rematchTimeout) this.state.rematchTimeout.clear();
  }
}
