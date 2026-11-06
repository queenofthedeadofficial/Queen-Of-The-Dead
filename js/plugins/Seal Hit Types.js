/*:
 * @plugindesc v1.21 Seal skills by hit type (Physical/Magical/Certain) via state notetags. Sealed mid-turn = enemy loses its turn.
 * @author YourName
 *
 * @param Blocked Message
 * @desc Shown when a queued skill became sealed mid-turn and the turn is skipped. %1 = battler, %2 = skill name.
 * @default %1 tried to use %2, but couldn't!
 *
 * @param No Action Message
 * @desc Shown when a sealed enemy had nothing it could select this turn. %1 = battler.
 * @default %1 was frozen and unable to move.
 *
 * @help
 * State notetags (case-insensitive):
 *   <SealPhysical>   blocks skills with Hit Type = Physical Attack
 *   <SealMagical>    blocks skills with Hit Type = Magical Attack
 *   <SealCertain>    blocks skills with Hit Type = Certain Hit
 *                    (note: the default Guard skill and many heals/buffs are Certain Hit)
 *
 * Behavior:
 * - Sealed skills are unusable in menus and are never selected by enemies.
 * - If a state is applied AFTER an enemy queued a skill (mid-turn) and that
 *   skill is now sealed, the enemy's whole turn is skipped: all of its queued
 *   actions are cleared (no fallback to a normal attack) and the Blocked
 *   Message is shown. Actors only have the sealed action cancelled.
 * - If every enemy action is sealed at selection time, the enemy skips its turn
 *   and the No Action Message is shown when its turn comes up.
 * - Items are never sealed.
 *
 * Script helper:
 *   battler.isSealedHitType(1)  // 0 = Certain, 1 = Physical, 2 = Magical
 *   battler.isSealedHitType('magical')
 *
 * Changelog:
 *   v1.21 - Fixed crash: Game_Enemy.isActionConditionMet does not exist in MV;
 *           now uses Game_Enemy.meetsCondition.
 */

(function() {
  'use strict';

  var pluginName = (function() {
    var src = (document.currentScript && document.currentScript.src) || '';
    var m = src.match(/([^\/\\]+)\.js(?:\?.*)?$/);
    return m ? decodeURIComponent(m[1]) : 'Seal Hit Types';
  })();
  var params = PluginManager.parameters(pluginName);
  var blockedMsg  = String(params['Blocked Message']   || "%1 tried to use %2, but couldn't!");
  var noActionMsg = String(params['No Action Message'] || '%1 was frozen and unable to move.');

  var SEAL_TAGS   = { 0: 'sealcertain', 1: 'sealphysical', 2: 'sealmagical' };
  var KEY_TO_TYPE = { certain: 0, physical: 1, magical: 2 };

  // --- Does this battler have a state sealing the given hit type?
  Game_Battler.prototype.isSealedHitType = function(hitType) {
    if (typeof hitType === 'string') hitType = KEY_TO_TYPE[hitType.toLowerCase()];
    var tag = SEAL_TAGS[hitType];
    if (!tag) return false;
    return this.states().some(function(state) {
      if (!state || !state.meta) return false;
      return Object.keys(state.meta).some(function(k) {
        return k.toLowerCase() === tag;
      });
    });
  };

  // --- Menus + enemy action selection (Game_Enemy.isActionValid calls canUse)
  var _Game_Battler_canUse = Game_Battler.prototype.canUse;
  Game_Battler.prototype.canUse = function(item) {
    if (!_Game_Battler_canUse.call(this, item)) return false;
    if (item && DataManager.isSkill(item) && this.isSealedHitType(item.hitType)) return false;
    return true;
  };

  // --- Action-level check (also catches forced actions)
  Game_Action.prototype.isHitTypeSealed = function() {
    var item = this.item();
    return !!(item && this.isSkill() && this.subject().isSealedHitType(item.hitType));
  };

  var _Game_Action_isValid = Game_Action.prototype.isValid;
  Game_Action.prototype.isValid = function() {
    if (this.isHitTypeSealed()) return false;
    return _Game_Action_isValid.call(this);
  };

  // --- Did seals (and only seals) leave this enemy with nothing to select?
  function sealsBlockedEverything(enemy) {
    return enemy.enemy().actions.some(function(a) {
      var skill = $dataSkills[a.skillId];
      return skill &&
        enemy.meetsCondition(a) &&
        _Game_Battler_canUse.call(enemy, skill) &&
        enemy.isSealedHitType(skill.hitType);
    });
  }

  var _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;
  Game_Enemy.prototype.makeActions = function() {
    this._sealNoActionPending = false;
    if (!$gameParty.inBattle() || BattleManager._phase === 'input') {
      this._sealTurnSkipped = false;
    }
    _Game_Enemy_makeActions.call(this);
    var first = this.numActions() > 0 ? this.action(0) : null;
    if (first && !first.item() && sealsBlockedEverything(this)) {
      this._sealNoActionPending = true;
    }
  };

  // Reset the per-turn skip flag once the battler's turn is over
  var _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
  Game_Battler.prototype.onTurnEnd = function() {
    this._sealTurnSkipped = false;
    _Game_Battler_onTurnEnd.call(this);
  };

  // --- Execution-time enforcement + messages
  function announce(text) {
    if (BattleManager._logWindow) BattleManager._logWindow.push('addText', text);
  }

  var _BattleManager_processTurn = BattleManager.processTurn;
  BattleManager.processTurn = function() {
    var subject = this._subject;
    var action = subject ? subject.currentAction() : null;
    if (action) {
      // Enemy already lost its turn to a seal: drop anything that got (re)queued
      if (subject.isEnemy() && subject._sealTurnSkipped) {
        subject.clearActions();
        return;
      }
      // Queued earlier, sealed since (mid-turn)
      if (action.isHitTypeSealed()) {
        var skillName = action.item().name;
        if (subject.isEnemy()) {
          subject._sealTurnSkipped = true;
          subject.clearActions();   // skip the whole turn, no fallback attack
        } else {
          subject.removeCurrentAction();
        }
        announce(blockedMsg.format(subject.name(), skillName));
        return;
      }
      // Enemy had nothing selectable because of seals
      if (subject._sealNoActionPending && !action.item()) {
        subject._sealNoActionPending = false;
        subject.clearActions();
        announce(noActionMsg.format(subject.name()));
        return;
      }
    }
    _BattleManager_processTurn.call(this);
  };

})();