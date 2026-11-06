/*:
 * @plugindesc Prevents use of skills with hitType = Physical (1) and the Attack command when a battler has <SealPhysical> state.
 * @author You
 *
 * @help
 * Put <SealPhysical> in a State's note to block:
 *  - the default Attack command
 *  - any skill whose database Hit Type is "Physical Attack" (hitType === 1)
 *
 * Works for both actors and enemies.
 */

(function() {
  'use strict';

  // Helper: true if battler has a state with <SealPhysical>
  Game_Battler.prototype.isSealedPhysical = function() {
    return this.states().some(function(state) {
      return state && state.meta && state.meta.SealPhysical !== undefined;
    });
  };

  // Remove Attack command from actor command window when sealed
  var _Window_ActorCommand_addAttackCommand = Window_ActorCommand.prototype.addAttackCommand;
  Window_ActorCommand.prototype.addAttackCommand = function() {
    if (this._actor && this._actor.isSealedPhysical()) {
      return; // do not add Attack
    }
    _Window_ActorCommand_addAttackCommand.call(this);
  };

  // Block using skills with hitType === 1 (Physical) or the system Attack skill when sealed
  var _Game_Battler_canUse = Game_Battler.prototype.canUse;
  Game_Battler.prototype.canUse = function(item) {
    if (!_Game_Battler_canUse.call(this, item)) {
      return false;
    }

    if (!item) return true;

    // System Attack skill id (default Attack command uses this)
    var attackSkillId = $dataSystem ? $dataSystem.attackSkillId : 1;

    if (this.isSealedPhysical()) {
      // If item is the Attack skill, block it
      if (DataManager.isSkill(item) && item.id === attackSkillId) {
        return false;
      }
      // If item is a skill and its hitType is Physical (1), block it
      if (DataManager.isSkill(item) && item.hitType === 1) {
        return false;
      }
    }

    return true;
  };

  // Grey out physical skills in the skill window when sealed
  var _Window_BattleSkill_isEnabled = Window_BattleSkill.prototype.isEnabled;
  Window_BattleSkill.prototype.isEnabled = function(item) {
    if (this._actor && this._actor.isSealedPhysical() && item && DataManager.isSkill(item) && item.hitType === 1) {
      return false;
    }
    return _Window_BattleSkill_isEnabled.call(this, item);
  };

})();