/*:
 * @plugindesc Turns ON switch 548 if any party member has Alpha Bat Head equipped.
 * Also refreshes Actor 10 when state changes.
 * @author ChatGPT
 */

(function() {
  "use strict";

  const SWITCH_ID = 548;
  const ARMOR_NAME = "Alpha Bat Head";
  const REFRESH_ACTOR_ID = 10;

  function refreshActor10() {
    const actor = $gameActors ? $gameActors.actor(REFRESH_ACTOR_ID) : null;
    if (actor) actor.refresh();
  }

  function checkEquips() {
    if (!$gameParty || !$gameSwitches) return;

    const hasItem = $gameParty.members().some(actor =>
      actor && actor.equips().some(eq => eq && eq.name === ARMOR_NAME)
    );

    const current = $gameSwitches.value(SWITCH_ID);

    // Only update if changed
    if (current !== hasItem) {
      $gameSwitches.setValue(SWITCH_ID, hasItem);
      refreshActor10();
    }
  }

  // Catch normal equip changes
  const _changeEquip = Game_Actor.prototype.changeEquip;
  Game_Actor.prototype.changeEquip = function(slotId, item) {
    _changeEquip.call(this, slotId, item);
    checkEquips();
  };

  // Catch force equips (YEP compatibility)
  const _forceChangeEquip = Game_Actor.prototype.forceChangeEquip;
  Game_Actor.prototype.forceChangeEquip = function(slotId, item) {
    _forceChangeEquip.call(this, slotId, item);
    checkEquips();
  };

  // Run once when entering the map
  const _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    checkEquips();
  };

  // Safety refresh when loading game / party changes context
  const _Game_Party_refresh = Game_Party.prototype.refresh;
  Game_Party.prototype.refresh = function() {
    _Game_Party_refresh.call(this);
    checkEquips();
  };

})();