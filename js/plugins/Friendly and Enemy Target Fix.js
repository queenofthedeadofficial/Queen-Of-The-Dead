/*:
 * @plugindesc Enforce friend/opponent target sides globally. Optional per-skill exception <allowCross:true>.
 * @author Copilot
 * @help
 * By default this plugin filters action target lists so:
 *  - friend-scoped actions only return actor targets
 *  - opponent-scoped actions only return enemy targets
 *
 * To allow a specific skill to target across sides, add to the skill's Note:
 *   <allowCross:true>
 *
 * No other configuration required. Place this plugin after battle-related plugins.
 */

(function() {
  'use strict';

  function itemAllowsCross(item) {
    return !!(item && item.meta && item.meta.allowCross === 'true');
  }

  // Wrap targetsForOpponents to ensure only enemies are returned unless skill allows cross-targeting
  var _Game_Action_targetsForOpponents = Game_Action.prototype.targetsForOpponents;
  Game_Action.prototype.targetsForOpponents = function() {
    var targets = _Game_Action_targetsForOpponents.call(this);
    var item = this.item();
    if (itemAllowsCross(item)) return targets;
    // Filter out anything that isn't an enemy (defensive)
    return targets.filter(function(target) {
      return target && target.isEnemy && target.isEnemy();
    });
  };

  // Wrap targetsForFriends to ensure only actors are returned unless skill allows cross-targeting
  var _Game_Action_targetsForFriends = Game_Action.prototype.targetsForFriends;
  Game_Action.prototype.targetsForFriends = function() {
    var targets = _Game_Action_targetsForFriends.call(this);
    var item = this.item();
    if (itemAllowsCross(item)) return targets;
    // Filter out anything that isn't an actor (defensive)
    return targets.filter(function(target) {
      return target && target.isActor && target.isActor();
    });
  };

})();
