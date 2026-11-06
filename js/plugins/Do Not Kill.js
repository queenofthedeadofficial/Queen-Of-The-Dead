/*:
 * @plugindesc Clamp HP to a minimum when using items tagged <NoKill> or <ClampMinHp:x> Minimal.
 * @author Minimal
 * @help
 * Add <NoKill> or <ClampMinHp:1> to an item's Note box to prevent that item from reducing
 * a target's HP below the specified minimum when used from the menu/item scene.
 */

(function() {

  // Track the item currently being used in the item/menu scene
  var _Scene_ItemBase_useItem = Scene_ItemBase.prototype.useItem;
  Scene_ItemBase.prototype.useItem = function() {
    $gameTemp._usingItemForClamp = this.item();
    _Scene_ItemBase_useItem.call(this);
    $gameTemp._usingItemForClamp = null;
  };

  // Alias Game_Actor.setHp to clamp when the current item has the notetag
  var _Game_Actor_setHp = Game_Actor.prototype.setHp;
  Game_Actor.prototype.setHp = function(hp) {
    var using = $gameTemp._usingItemForClamp;
    if (using && using.meta) {
      // check for <NoKill>
      if (using.meta.NoKill !== undefined) {
        hp = Math.max(1, hp);
      }
      // check for <ClampMinHp:x>
      if (using.meta.ClampMinHp) {
        var min = parseInt(using.meta.ClampMinHp, 10);
        if (!isNaN(min)) hp = Math.max(min, hp);
      }
    }
    _Game_Actor_setHp.call(this, hp);
  };

})();
