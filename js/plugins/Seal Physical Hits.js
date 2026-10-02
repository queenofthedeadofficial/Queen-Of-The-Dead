/*:
 * @plugindesc Prevents use of skills with hitType = Physical (1) and the Attack command when a battler has <SealPhysical> state. Shows a message when such a state is applied.
 * @author You
 *
 * @help
 * Put <SealPhysical> in a State's note to block:
 *  - the default Attack command
 *  - any skill whose database Hit Type is "Physical Attack" (hitType === 1)
 *
 * When a state that has <SealPhysical> is newly applied, a message will be shown:
 *   (Battler Name) has been <state name in lowercase>!
 *
 * Example:
 *  State note: <SealPhysical>
 *  State name: Frozen
 *  Message: Goblin has been frozen!
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

  // --- Show a message when a state with <SealPhysical> is newly applied ---
  var _Game_Battler_addState = Game_Battler.prototype.addState;
  Game_Battler.prototype.addState = function(stateId) {
    // Was the state already present?
    var already = this.isStateAffected(stateId);
    // Call original to actually add the state
    _Game_Battler_addState.call(this, stateId);
    // If it was not present before but is present now, it was newly applied
    if (!already && this.isStateAffected(stateId)) {
      var state = $dataStates[stateId];
      if (state && state.meta && state.meta.SealPhysical !== undefined) {
        // Build message text
        // If you want a custom message per state, use <SealPhysicalText:has been frozen!> in the state's note.
        var custom = (state.meta && state.meta.SealPhysicalText) ? state.meta.SealPhysicalText : null;
        var text;
        if (custom) {
          // Allow custom text to include placeholders if desired in future; for now use as-is
          text = this.name() + ' ' + custom;
        } else {
          // Default: "Name has been <state name in lowercase>!"
          text = this.name() + ' has been ' + state.name.toLowerCase() + '!';
        }

        // Queue the message so it appears in the battle message window
        $gameMessage.add(text);
      }
    }
  };

})();
