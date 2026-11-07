/*:
 * @plugindesc True Slot-Based Party System (YEP + Instant Cast + Summon Safe) — v2, single-source-of-truth rewrite
 *
 * @help
 * v2 REWRITE NOTES
 * ----------------
 * The original version kept a separate `_battleSlots` array that had to be
 * manually re-synced with the engine's native `_actors` array every time
 * either side changed. Two arrays kept in sync by hand WILL eventually
 * drift — that's what was causing the battle/menu desyncs.
 *
 * This version deletes `_battleSlots` entirely. In-battle slot swaps now
 * call the exact same `Game_Party.prototype.swapOrder` that the menu
 * formation screen uses, on the same `_actors` array. Since both battle
 * and menu now go through one function touching one array, there is no
 * second structure left to desync from.
 *
 * `battleMembers()` is no longer overridden — stock MV's implementation
 * (`allMembers().slice(0, maxBattleMembers()).filter(isAppeared)`) already
 * does what the old override did, and now reads directly from `_actors`,
 * so it always reflects the latest order automatically.
 */

(function() {
  "use strict";

  // ================================
  // IN-BATTLE SLOT SWAP
  // (Now a thin, safe wrapper around the native swapOrder — same array,
  //  same code path the menu formation screen uses. This is the whole
  //  fix: one function, one array, no parallel structure to desync.)
  // ================================
  Game_Party.prototype.swapBattleSlots = function(i, j) {
    if (i === j) return;
    if (i < 0 || j < 0 || i >= this._actors.length || j >= this._actors.length) return;
    this.swapOrder(i, j); // stock method: swaps _actors[i]/_actors[j] + refresh()
  };

  // ================================
  // GLOBAL SWAP FUNCTION
  // Looks up two actors' current positions in _actors and swaps them via
  // the same path as above, then refreshes battle UI/sprites.
  // ================================
  window.swapPartyMembers = function(user, target) {
    if (!user || !target) return;

    const party = $gameParty;
    const i = party._actors.indexOf(user.actorId());
    const j = party._actors.indexOf(target.actorId());

    if (i < 0 || j < 0 || i === j) return;

    party.swapBattleSlots(i, j);

    const scene = SceneManager._scene;

    if (scene && scene instanceof Scene_Battle) {

      $gameParty.members().forEach(a => a.refresh());

      if (scene._statusWindow) scene._statusWindow.refresh();
      if (scene._actorCommandWindow) scene._actorCommandWindow.refresh();
      if (scene._skillWindow) scene._skillWindow.refresh();
      if (scene._actorWindow) scene._actorWindow.refresh();
      if (scene._enemyWindow) scene._enemyWindow.refresh();

      // Visual sync fix (damage popups) — battleMembers() now reads
      // straight from _actors, so this reflects the swap immediately.
      if (scene._spriteset && scene._spriteset._actorSprites) {
        const sprites = scene._spriteset._actorSprites;
        const members = $gameParty.battleMembers();

        for (let k = 0; k < sprites.length; k++) {
          if (sprites[k]) {
            sprites[k].setBattler(members[k]);
          }
        }
      }

      // Instant Cast safe
      if (BattleManager._action) {
        BattleManager._targets = [];
      }
    }
  };

})();