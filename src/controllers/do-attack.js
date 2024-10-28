import { WsServerMessageTypes } from "../const/ws-message-types.js";
import { getAttackStatus, getEnemyId, isAllEnemyShipsKilled, getShipsByPlayers } from "../databases/games.js";
import { setPlayerAsWinners } from "../databases/players.js";
import { deepStringify } from "../helpers/stringify.js";
import { updateWinners } from "./update-winners.js";

export const doAttack = (data, clients, wss) => {
  const { gameId, x, y, indexPlayer } = JSON.parse(data);

  const status = getAttackStatus(gameId, indexPlayer, x, y)
  const attackRes = deepStringify({
    type: WsServerMessageTypes.attack,
    data: {
      position: { x, y },
      currentPlayer: indexPlayer,
      status,
    },
    id: 0,
  });

  let currentPlayer = indexPlayer;
  if (status === 'miss') {
    currentPlayer = getEnemyId(gameId, indexPlayer);
  }

  const turnRes = deepStringify({
    type: WsServerMessageTypes.turn,
    data: { currentPlayer },
    id: 0,
  })
  
  getShipsByPlayers(gameId).forEach((_, playerId) => {
    const client = clients.get(playerId);
    client.send(attackRes);
    client.send(turnRes);
  })

  if (status === 'shot' && isAllEnemyShipsKilled(gameId, indexPlayer)) {
    const finishRes = deepStringify({
      type: WsServerMessageTypes.finish,
      data: { indexPlayer },
      id: 0,
    })


    getShipsByPlayers(gameId).forEach((_, playerId) => {
      clients.get(playerId).send(finishRes);
    })

    setPlayerAsWinners(indexPlayer);
    updateWinners(wss);
  }
}