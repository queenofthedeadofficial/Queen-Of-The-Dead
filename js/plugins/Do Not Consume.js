/*:
 * @plugindesc Prevents consumption for items tagged <Do Not Consume> when they are used. Minimal and battle/menu safe.
 * @author Minimal
 * @help
 * Add <Do Not Consume> to an item's Note box to stop the engine from removing one
 * when the player uses it. The item will still run its effects; only the automatic
 * consumption is intercepted.
 *
 * Supports variants: <DoNotConsume>, <Do NotConsume>, <doNotConsume>.
 */

(function() {

  // Track the item currently being used (menu or battle)
  var _Scene_ItemBase_useItem = Scene_ItemBase.prototype.useItem;
  Scene_ItemBase.prototype.useItem = function() {
    $gameTemp._usingItemForDoNotConsume = this.item();
    _Scene_ItemBase_useItem.call(this);
    $gameTemp._usingItemForDoNotConsume = null;
  };

  // Alias Game_Party.loseItem and skip removal when the item is being used and has the notetag
  var _Game_Party_loseItem = Game_Party.prototype.loseItem;
  Game_Party.prototype.loseItem = function(item, amount, includeEquip) {
    if (item && $gameTemp._usingItemForDoNotConsume) {
      var using = $gameTemp._usingItemForDoNotConsume;
      if (using === item && item.meta) {
        // check several common meta key variants
        if (item.meta['Do Not Consume'] || item.meta.DoNotConsume || item.meta['DoNotConsume'] || item.meta.doNotConsume) {
          return; // intercept: do not remove
        }
      }
    }
    _Game_Party_loseItem.call(this, item, amount, includeEquip);
  };

})();
