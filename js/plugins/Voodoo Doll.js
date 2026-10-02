/*:
 * @plugindesc Reserve Common Event 157 once per battle turn at turn end if any party member has state 186.
 * @help Place this file in js/plugins and enable it. Load after plugins that modify turn flow.
 */
(() => {
  const COMMON_EVENT_ID = 157;
  const REQUIRED_STATE_ID = 186;
  const _BattleManager_endTurn = BattleManager.endTurn;
  BattleManager.endTurn = function() {
    _BattleManager_endTurn.call(this);
    try {
      if (!$gameTroop) return;
      const turn = (typeof $gameTroop.turnCount === 'function') ? $gameTroop.turnCount() : ($gameTroop._turnCount || null);
      if (turn == null) return;
      if ($gameTemp._runCE157Turn === turn) return;
      // check party for required state
      const hasState = $gameParty && $gameParty.members && $gameParty.members().some(m => m && m.isStateAffected && m.isStateAffected(REQUIRED_STATE_ID));
      if (!hasState) return;
      $gameTemp._runCE157Turn = turn;
      if (COMMON_EVENT_ID > 0) {
        $gameTemp.reserveCommonEvent(COMMON_EVENT_ID);
        // Log an entry for every afflicted party member so the combat log
        // reflects that the Voodoo Doll triggered this turn.
        if (typeof BattleManager.pushPassiveLogEntry === "function") {
          $gameParty.members().forEach(function(m) {
            if (m && m.isStateAffected && m.isStateAffected(REQUIRED_STATE_ID)) {
              BattleManager.pushPassiveLogEntry(
                m.name(), "?", "Voodoo Doll", false
              );
            }
          });
        }
      }
    } catch (e) {
      console.error('RunCommonEvent157OncePerTurn error', e);
    }
  };
})();
