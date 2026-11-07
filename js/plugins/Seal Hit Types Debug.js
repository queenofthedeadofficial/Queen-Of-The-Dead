/*:
 * @plugindesc DEBUG: logs where enemy actions come from (console, F8). Remove when done.
 * @author debug
 *
 * @help
 * Load BELOW Seal Hit Types.js and below the YEP plugins.
 * Playtest, press F8 for the dev console, reproduce the problem, then copy
 * every line starting with [SealDebug] (including the stack lines).
 */

(function() {
  'use strict';

  function enemyOf(action) {
    var s = action && action.subject ? action.subject() : null;
    return s && s.isEnemy && s.isEnemy() ? s : null;
  }
  function stack() {
    return new Error().stack.split('\n').slice(3, 11).join('\n');
  }
  function log(msg, withStack) {
    console.log('[SealDebug] ' + msg + (withStack ? '\n' + stack() : ''));
  }
  function skillLabel(action) {
    var item = action && action.item ? action.item() : null;
    return item ? (item.id + ' "' + item.name + '"') : '(none)';
  }

  // Anything turning an enemy action into the Attack skill
  var _setAttack = Game_Action.prototype.setAttack;
  Game_Action.prototype.setAttack = function() {
    _setAttack.call(this);
    var e = enemyOf(this);
    if (e) log('setAttack on ' + e.name() + ' phase=' + BattleManager._phase, true);
  };

  var _setSkill = Game_Action.prototype.setSkill;
  Game_Action.prototype.setSkill = function(skillId) {
    _setSkill.call(this, skillId);
    var e = enemyOf(this);
    if (e && skillId === e.attackSkillId()) {
      log('setSkill(Attack) on ' + e.name() + ' phase=' + BattleManager._phase, true);
    }
  };

  // Mid-turn re-rolls of an enemy's actions
  var _makeActions = Game_Battler.prototype.makeActions;
  Game_Battler.prototype.makeActions = function() {
    _makeActions.call(this);
    if (this.isEnemy() && BattleManager._phase !== 'input') {
      log('makeActions on ' + this.name() + ' OUTSIDE input phase (phase=' +
          BattleManager._phase + ')', true);
    }
  };

  // Forced actions
  var _forceAction = Game_Battler.prototype.forceAction;
  Game_Battler.prototype.forceAction = function(skillId, targetIndex) {
    if (this.isEnemy()) {
      log('forceAction(' + skillId + ') on ' + this.name(), true);
    }
    _forceAction.call(this, skillId, targetIndex);
  };

  // What actually gets processed / started
  var _processTurn = BattleManager.processTurn;
  BattleManager.processTurn = function() {
    var s = this._subject;
    var a = s && s.currentAction ? s.currentAction() : null;
    if (a && s.isEnemy()) {
      var key = skillLabel(a) + '|' + s.numActions() + '|' + (s._sealTurnSkipped ? 1 : 0);
      if (s._dbgKey !== key) {
        s._dbgKey = key;
        log('processTurn: ' + s.name() + ' action=' + skillLabel(a) +
            ' queued=' + s._actions.length +
            ' sealed=' + (a.isHitTypeSealed ? a.isHitTypeSealed() : '?') +
            ' skipFlag=' + !!s._sealTurnSkipped);
      }
    }
    _processTurn.call(this);
  };

  var _startAction = BattleManager.startAction;
  BattleManager.startAction = function() {
    var s = this._subject;
    var a = s && s.currentAction ? s.currentAction() : null;
    if (s && s.isEnemy()) {
      log('startAction: ' + s.name() + ' action=' + skillLabel(a), true);
    }
    _startAction.call(this);
  };
})();