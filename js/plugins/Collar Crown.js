(function() {
  "use strict";

  const SWITCH_FLUFFY = 421;
  const SWITCH_FLORAL = 422;
  const NAME_FLUFFY = "Fluffy's Collar";
  const NAME_FLORAL = "Floral Crown";

  function checkEquips() {
    if (!$gameParty) return;

    const members = $gameParty.members();

    const hasFluffy = members.some(actor =>
      actor && actor.equips().some(eq => eq && eq.name === NAME_FLUFFY)
    );

    const hasFloral = members.some(actor =>
      actor && actor.equips().some(eq => eq && eq.name === NAME_FLORAL)
    );

    // Only set if changed (prevents refresh cascades)
    if ($gameSwitches.value(SWITCH_FLUFFY) !== hasFluffy) {
      $gameSwitches.setValue(SWITCH_FLUFFY, hasFluffy);
    }

    if ($gameSwitches.value(SWITCH_FLORAL) !== hasFloral) {
      $gameSwitches.setValue(SWITCH_FLORAL, hasFloral);
    }
  }

  // Hook equip change ONLY
  const _changeEquip = Game_Actor.prototype.changeEquip;
  Game_Actor.prototype.changeEquip = function(slotId, item) {
    _changeEquip.call(this, slotId, item);
    checkEquips();
  };

  // Also catch force equips (YEP uses this)
  const _forceChangeEquip = Game_Actor.prototype.forceChangeEquip;
  Game_Actor.prototype.forceChangeEquip = function(slotId, item) {
    _forceChangeEquip.call(this, slotId, item);
    checkEquips();
  };

  // Run once after game fully loads (SAFE)
  const _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    checkEquips();
  };

})();