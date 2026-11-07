//=============================================================================
// Andrew_InstantCastKeepActions.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_InstantCastKeepActions = true;

var Andrew = Andrew || {};
Andrew.ICKA = Andrew.ICKA || {};
Andrew.ICKA.version = 1.00;

//=============================================================================
/*:
 * @plugindesc v1.00 Stops YEP_InstantCast from discarding a battler's
 * already-selected actions when an instant cast resolves.
 * @author Andrew
 *
 * @param Allow Later Slots
 * @type boolean
 * @on Yes
 * @off No
 * @desc Allow instant cast to fire from action slots other than the
 * first one. Required for multi-action actors. Default: Yes
 * @default true
 *
 * @param Debug Log
 * @type boolean
 * @on Yes
 * @off No
 * @desc Log snapshot/restore events to the console.
 * Default: No
 * @default false
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * YEP_InstantCast ends an instant action by calling:
 *
 *     user.makeActions();
 *
 * inside BattleManager.endActorInstantCast(). That rebuilds the battler's
 * entire _actions array from scratch, which is fine for a single-action
 * battler but destroys every action the battler had already selected this
 * turn. A battler who picked a normal skill in slot 0 and then an instant
 * skill in slot 1 loses the slot 0 selection and has to re-input the whole
 * turn.
 *
 * This plugin snapshots the battler's action slots before the instant cast
 * runs and restores them afterwards, leaving only the slot that held the
 * instant action free for re-input (since instant casts do not consume a
 * turn).
 *
 * ============================================================================
 * Why the slot rotation is needed
 * ============================================================================
 *
 * Game_Battler.currentAction() returns _actions[0], unconditionally. That is
 * what BattleManager.startAction() executes. YEP_InstantCast works around
 * this by refusing to trigger unless the inputting action IS action(0):
 *
 *     if (action !== actor.action(0)) return false;   // Scene_Battle
 *
 * So on a multi-action battler, an instant skill chosen for slot 1 simply
 * never triggers as instant. With "Allow Later Slots" enabled, this plugin
 * lifts that restriction and instead rotates the chosen action into slot 0
 * for the duration of the cast, then restores the original ordering. The
 * remaining slots are kept in the array (rather than temporarily emptied) so
 * numActions() stays stable for anything that watches it mid-action -- most
 * importantly BattleEngineCore's onAllActionsEnd() timing and any
 * "Action End" state removal that hangs off it.
 *
 * ============================================================================
 * Behavior
 * ============================================================================
 *
 * Single-action battlers: no functional change. The snapshot contains one
 * slot, the instant action occupies it, and the restore hands back one empty
 * slot -- the same end state YEP's makeActions() produces.
 *
 * Multi-action battlers:
 *   - Slot 0: "Fire" (normal)      -> preserved
 *   - Slot 1: "Quick Guard" (instant) -> fires immediately
 *   - After resolution: slot 0 still holds "Fire", input resumes at slot 1
 *
 * Cancelling out of the actor command window after the instant cast walks
 * back to slot 0 as usual (selectPreviousCommand decrements the input index),
 * so the preserved action can still be changed.
 *
 * The restore is skipped -- deliberately -- when:
 *   - BattleManager._instantCasting is still truthy, or the phase is not
 *     'input'. This is YEP's updateEventMain() early-return path at the top
 *     of endActorInstantCast(); the instant cast did not finish cleanly and
 *     touching the action array there would make the hang worse, not better.
 *   - The battler is dead, cannot move, or cannot input. Confusion, berserk
 *     and auto-battle all rely on makeActions() re-rolling their actions, so
 *     YEP's behavior is left alone. YEP_InstantCast's own onRestrict hook
 *     handles the berserk-mid-instant-cast case.
 *   - One action-times reroll caveat: because the snapshot is restored
 *     verbatim, a state applied BY the instant skill that grants extra
 *     actions will not add a slot this turn. Stock YEP would reroll
 *     makeActionTimes() and might. If you rely on that, note it.
 *
 * ============================================================================
 * Install
 * ============================================================================
 *
 * Load BELOW YEP_InstantCast.js. If YEP_BattleEngineCore is used, the usual
 * YEP ordering applies (BattleEngineCore above InstantCast above this).
 *
 * One method is overwritten rather than aliased: Scene_Battle.isInstantCast,
 * and only when "Allow Later Slots" is on -- the slot-0 check cannot be
 * removed by aliasing. If another plugin also redefines it, load order
 * between the two matters.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.00:
 * - Initial release.
 */
//=============================================================================

(function() {

'use strict';

//-----------------------------------------------------------------------------
// Parameters (self-detecting filename)
//-----------------------------------------------------------------------------

var pluginName = (function() {
  var src = (document.currentScript && document.currentScript.src) || '';
  var file = decodeURIComponent(src.split('/').pop() || '');
  return file.replace(/\.js$/i, '') || 'Andrew_InstantCastKeepActions';
})();

var params          = PluginManager.parameters(pluginName) || {};
var allowLaterSlots = String(params['Allow Later Slots'] || 'true') !== 'false';
var debugLog        = String(params['Debug Log'] || 'false') === 'true';

var log = function(msg) {
  if (debugLog) console.log('[' + pluginName + '] ' + msg);
};

if (!BattleManager.performInstantCast || !BattleManager.endActorInstantCast) {
  console.error(pluginName + ': YEP_InstantCast.js not detected. ' +
    'This plugin must be placed BELOW YEP_InstantCast.js.');
  return;
}

//-----------------------------------------------------------------------------
// Snapshot storage
//-----------------------------------------------------------------------------

var snapshot = null;

//-----------------------------------------------------------------------------
// Scene_Battle - allow instant cast from any input slot
//-----------------------------------------------------------------------------

if (allowLaterSlots) {

// Overwrite: drops YEP's "action !== actor.action(0)" restriction. Safe only
// because performInstantCast below rotates the chosen action into slot 0.
Scene_Battle.prototype.isInstantCast = function() {
    var actor = BattleManager.actor();
    if (!actor) return false;
    var action = BattleManager.inputtingAction();
    if (!action) return false;
    var item = action.item();
    if (!item) return false;
    return actor.isInstantCast(item);
};

} // allowLaterSlots

//-----------------------------------------------------------------------------
// BattleManager
//-----------------------------------------------------------------------------

Andrew.ICKA.BattleManager_performInstantCast = BattleManager.performInstantCast;
BattleManager.performInstantCast = function() {
    snapshot = null;
    var actor = this.actor();
    if (actor && actor._actions) {
      var index  = actor._actionInputIndex || 0;
      var action = actor._actions[index];
      if (action) {
        snapshot = {
          actor:   actor,
          actions: actor._actions.slice(),
          index:   index
        };
        // currentAction() is always _actions[0], so rotate the instant action
        // to the front. Keep the other slots in the array so numActions()
        // does not change underneath BattleEngineCore mid-action.
        var rest = actor._actions.slice();
        rest.splice(index, 1);
        actor._actions = [action].concat(rest);
        actor._actionInputIndex = 0;
        log('snapshot taken: actor ' + actor.actorId() +
            ', slot ' + index + ' of ' + snapshot.actions.length);
      }
    }
    Andrew.ICKA.BattleManager_performInstantCast.call(this);
};

Andrew.ICKA.BattleManager_endActorInstantCast =
    BattleManager.endActorInstantCast;
BattleManager.endActorInstantCast = function() {
    var data = snapshot;
    snapshot = null;
    Andrew.ICKA.BattleManager_endActorInstantCast.call(this);
    if (!data) return;

    // YEP bails out early (updateEventMain / checkBattleEnd) without clearing
    // _instantCasting or entering the input phase. Do not restore there.
    if (this._instantCasting) {
      log('restore skipped: instant cast did not finish cleanly');
      return;
    }
    if (this._phase !== 'input') {
      log('restore skipped: phase is ' + this._phase);
      return;
    }

    var actor = data.actor;
    if (!actor || !actor.isAlive()) return;
    if (!actor.canMove() || !actor.canInput()) {
      log('restore skipped: actor cannot input (restriction/auto-battle)');
      return;
    }

    // Hand back every slot except the one the instant action occupied, which
    // becomes free again -- an instant cast does not consume a turn.
    var actions = data.actions;
    actions[data.index] = new Game_Action(actor);
    actor._actions = actions;
    actor._actionInputIndex = data.index;
    actor.setActionState('inputting');
    this.refreshStatus();
    log('restored ' + actions.length + ' slot(s), input resumes at slot ' +
        data.index);
};

//-----------------------------------------------------------------------------
// Safety: never let a stale snapshot leak across battles or turns.
//-----------------------------------------------------------------------------

Andrew.ICKA.BattleManager_endBattle = BattleManager.endBattle;
BattleManager.endBattle = function(result) {
    snapshot = null;
    Andrew.ICKA.BattleManager_endBattle.call(this, result);
};

Andrew.ICKA.BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
    snapshot = null;
    Andrew.ICKA.BattleManager_startTurn.call(this);
};

})();