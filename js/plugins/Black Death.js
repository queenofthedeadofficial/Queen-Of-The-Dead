/*:
 * @plugindesc Linear DoT for State 13 (stable, once per turn)
 * @author You
 */

(function() {
"use strict";

const STATE_ID = 13;

let _lastProcessedTurn = -1;

const _BattleManager_endTurn = BattleManager.endTurn;
BattleManager.endTurn = function() {
  _BattleManager_endTurn.call(this);

  const turn = $gameTroop.turnCount();

  // HARD GATE: only run once per actual turn
  if (_lastProcessedTurn === turn) return;
  _lastProcessedTurn = turn;

  applyLinearDoT();
};

function applyLinearDoT() {
  const members = $gameParty.members().concat($gameTroop.members());

  members.forEach(target => {
    if (!target || !target.isAlive()) return;
    if (!target.isStateAffected(STATE_ID)) return;

    if (!target._linearDot) target._linearDot = {};

    if (!target._linearDot[STATE_ID]) {
      target._linearDot[STATE_ID] = 1;
    } else {
      target._linearDot[STATE_ID] += 1;
    }

    const value = target._linearDot[STATE_ID];

    target.gainHp(-value);
    target.startDamagePopup();
    target.performDamage();

    if (typeof BattleManager.pushPassiveLogEntry === "function") {
      var stateName = ($dataStates[STATE_ID] && $dataStates[STATE_ID].name)
        ? $dataStates[STATE_ID].name : "Black Death";
      BattleManager.pushPassiveLogEntry(target.name(), value, stateName, false);
    }

    if (target.isDead()) {
      target.performCollapse();
    }
  });
}

// Clean up on removal
const _Game_Battler_removeState = Game_Battler.prototype.removeState;
Game_Battler.prototype.removeState = function(stateId) {
  _Game_Battler_removeState.call(this, stateId);

  if (stateId === STATE_ID && this._linearDot) {
    delete this._linearDot[stateId];
  }
};

})();