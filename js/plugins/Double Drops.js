/*:
 * @plugindesc Double enemy drop rolls when any actor has equipment with <doubleDrops:true> in its note box.
 * @author Custom
 *
 * @help
 * Add <doubleDrops:true> to the note box of any weapon/armor to enable.
 * When equipped by any party member, each enemy drop slot gets a second independent roll.
 * This does not create new drop slots; it runs an extra roll per configured slot.
 */

(function() {
  var _Game_Enemy_makeDropItems = Game_Enemy.prototype.makeDropItems;
  Game_Enemy.prototype.makeDropItems = function() {
    // original drops (keeps default behavior)
    var drops = _Game_Enemy_makeDropItems.call(this);

    // check party for equipment with meta tag
    var doubleActive = $gameParty.members().some(function(actor) {
      return actor && actor.equips().some(function(eq) {
        return eq && eq.note && /<doubleDrops\s*:\s*true>/i.test(eq.note);
      });
    });

    if (!doubleActive) return drops;

    // perform an extra independent roll for each enemy drop slot
    var extraDrops = [];
    var dropList = this.enemy().dropItems || [];
    for (var i = 0; i < dropList.length; i++) {
      var di = dropList[i];
      // denominator is the chance denominator (1/denominator)
      var denom = di.denominator || 1;
      var p = 1 / denom;
      if (Math.random() < p) {
        var obj = null;
        if (di.kind === 0) obj = $dataItems[di.dataId];
        else if (di.kind === 1) obj = $dataWeapons[di.dataId];
        else if (di.kind === 2) obj = $dataArmors[di.dataId];
        if (obj) extraDrops.push(obj);
      }
    }

    return drops.concat(extraDrops);
  };
})();
