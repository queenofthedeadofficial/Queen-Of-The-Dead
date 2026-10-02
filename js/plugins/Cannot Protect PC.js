/*:
 * @plugindesc Strictly block skills 102 and 105 from targeting actor 1 (multi-hook).
 * @author Copilot
 *
 * @help
 * Blocks selection and application for the configured skills and actor.
 * Place this plugin after other battle plugins. Open the console (F8) to see debug logs.
 */

(function() {
  var SKILL_IDS = [102, 105]; // skills to block
  var BLOCKED_ACTOR_ID = 1;   // actor to block
  var DEBUG = true;           // set false to silence console logs

  function log() {
    if (DEBUG && console && console.log) console.log.apply(console, arguments);
  }

  // Utility: is this action one of the blocked skills?
  function isBlockedAction(action) {
    try {
      return action && action.item() && SKILL_IDS.indexOf(action.item().id) !== -1;
    } catch (e) { return false; }
  }

  // Utility: is this battler the blocked actor?
  function isBlockedActor(battler) {
    return battler && typeof battler.actorId === 'function' && battler.actorId() === BLOCKED_ACTOR_ID;
  }

  // 1) Filter makeTargets
  var _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
  Game_Action.prototype.makeTargets = function() {
    var targets = _Game_Action_makeTargets.call(this);
    if (isBlockedAction(this)) {
      targets = targets.filter(function(t) { return !isBlockedActor(t); });
      log('makeTargets filtered for skill', this.item().id, 'targets left', targets.length);
    }
    return targets;
  };

  // 2) Filter targetsForFriends if present
  if (Game_Action.prototype.targetsForFriends) {
    var _Game_Action_targetsForFriends = Game_Action.prototype.targetsForFriends;
    Game_Action.prototype.targetsForFriends = function() {
      var targets = _Game_Action_targetsForFriends.call(this);
      if (isBlockedAction(this)) {
        targets = targets.filter(function(t) { return !isBlockedActor(t); });
        log('targetsForFriends filtered for skill', this.item().id, 'targets left', targets.length);
      }
      return targets;
    };
  }

  // 3) Filter targetsForOpponents if present
  if (Game_Action.prototype.targetsForOpponents) {
    var _Game_Action_targetsForOpponents = Game_Action.prototype.targetsForOpponents;
    Game_Action.prototype.targetsForOpponents = function() {
      var targets = _Game_Action_targetsForOpponents.call(this);
      if (isBlockedAction(this)) {
        targets = targets.filter(function(t) { return !isBlockedActor(t); });
        log('targetsForOpponents filtered for skill', this.item().id, 'targets left', targets.length);
      }
      return targets;
    };
  }

  // 4) Prevent selection in Window_BattleActor by overriding select and processOk
  var _Window_BattleActor_select = Window_BattleActor.prototype.select;
  Window_BattleActor.prototype.select = function(index) {
    _Window_BattleActor_select.call(this, index);
    try {
      var actor = this.actor(index);
      var action = BattleManager.inputtingAction();
      if (isBlockedAction(action) && isBlockedActor(actor)) {
        // move selection to next enabled index
        var next = this.nextEnabledIndex(index);
        if (next !== index) {
          _Window_BattleActor_select.call(this, next);
          log('select skipped blocked actor at index', index, 'moved to', next);
        } else {
          // if no other enabled, deselect
          this.deselect();
          log('select deselected because blocked actor was only option');
        }
      }
    } catch (e) { /* ignore */ }
  };

  Window_BattleActor.prototype.nextEnabledIndex = function(start) {
    var len = this.maxItems();
    for (var i = start + 1; i < len; i++) {
      var actor = this.actor(i);
      if (this.isEnabled(actor)) return i;
    }
    for (var j = 0; j < start; j++) {
      var actor2 = this.actor(j);
      if (this.isEnabled(actor2)) return j;
    }
    return start;
  };

  var _Window_BattleActor_processOk = Window_BattleActor.prototype.processOk;
  Window_BattleActor.prototype.processOk = function() {
    var actor = this.actor(this.index());
    var action = BattleManager.inputtingAction();
    if (isBlockedAction(action) && isBlockedActor(actor)) {
      SoundManager.playBuzzer();
      log('processOk blocked selection of actor', BLOCKED_ACTOR_ID, 'for skill', action.item().id);
      return; // ignore OK on blocked actor
    }
    _Window_BattleActor_processOk.call(this);
  };

  // 5) Ensure isEnabled returns false for blocked actor when action is blocked
  var _Window_BattleActor_isEnabled = Window_BattleActor.prototype.isEnabled;
  Window_BattleActor.prototype.isEnabled = function(actor) {
    try {
      var action = BattleManager.inputtingAction();
      if (isBlockedAction(action) && isBlockedActor(actor)) {
        return false;
      }
    } catch (e) { /* ignore */ }
    return _Window_BattleActor_isEnabled.call(this, actor);
  };

  // 6) Extra safety: skip apply if somehow targeted
  var _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    if (isBlockedAction(this) && isBlockedActor(target)) {
      log('apply skipped for blocked actor', BLOCKED_ACTOR_ID, 'skill', this.item().id);
      return;
    }
    _Game_Action_apply.call(this, target);
  };

  // 7) If a plugin uses direct selection arrays, filter those too by overriding BattleManager.makeActionTargets
  if (BattleManager.makeActionTargets) {
    var _BattleManager_makeActionTargets = BattleManager.makeActionTargets;
    BattleManager.makeActionTargets = function(action) {
      var targets = _BattleManager_makeActionTargets.call(this, action);
      if (isBlockedAction(action)) {
        targets = targets.filter(function(t) { return !isBlockedActor(t); });
        log('BattleManager.makeActionTargets filtered for skill', action.item().id, 'targets left', targets.length);
      }
      return targets;
    };
  }

  log('BlockSkillTargets_Strict loaded. Blocking skills', SKILL_IDS, 'for actor', BLOCKED_ACTOR_ID);
})();
