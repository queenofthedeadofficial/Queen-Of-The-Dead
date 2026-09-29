//=============================================================================
// Andrew_InstantCastKeepPrimary.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_InstantCastKeepPrimary = true;

var Andrew = Andrew || {};
Andrew.ICKP = Andrew.ICKP || {};
Andrew.ICKP.version = 2.01;

//=============================================================================
/*:
 * @plugindesc v2.01 Preserves a battler's already-confirmed non-instant
 * skill or item -- AND its chosen target -- across any number of instant
 * casts before it executes.
 * @author Andrew
 *
 * @param Debug Log
 * @type boolean
 * @on Yes
 * @off No
 * @desc Log capture/restore events to the console.
 * Default: No
 * @default false
 *
 * @help
 * ============================================================================
 * The actual problem (found via v1.00's diagnostic logging)
 * ============================================================================
 *
 * With a single action slot, selecting a skill/item calls setSkill/setItem
 * on the SAME Game_Action object already sitting in _actions[0] -- both
 * funnel into Game_Action.prototype.setItemObject.
 *
 * v1.00 of this plugin tried to capture the previous selection reactively,
 * inside setItemObject, right as an instant skill was about to overwrite it.
 * That does not work: some other part of this project's plugin stack (a
 * per-row help/preview mechanism in the Skill window) calls setItemObject --
 * and very likely action.clear() as well -- on every row the cursor passes
 * while ANY skill list is open, as a side effect of just rendering the
 * description text. That means the real selection (e.g. Fire) is already
 * wiped from the action the moment the Skill window reopens to browse for
 * an instant ability, well before the instant is ever confirmed. By the
 * time setItemObject fires for the instant pick itself, there is nothing
 * left in the action to capture -- confirmed by this project's own debug
 * log showing "action had nothing previously set" at exactly that point.
 *
 * ============================================================================
 * What this version does instead
 * ============================================================================
 *
 * It captures proactively, not reactively -- at the moment a non-instant
 * selection is genuinely CONFIRMED (Scene_Battle.selectNextCommand about to
 * advance normally, i.e. isInstantCast() is false), not at the moment
 * something later overwrites it. That value -- the item AND the target the
 * player chose for it -- is kept in a Map, outside the Game_Action object
 * entirely, so no amount of preview/help-text scanning of the skill or item
 * list can touch it.
 *
 * Once an instant cast resolves and the battler is back in the input phase,
 * the remembered selection is written back into the freshly rebuilt action.
 * The stored value is NOT cleared after one restore -- it stays available
 * for every subsequent instant cast in the same turn (Fire confirmed ->
 * instant Heal -> restores Fire -> instant Shield -> restores Fire -> ...),
 * and is only replaced when the battler confirms a new non-instant
 * selection, or cleared at the start of the next turn / end of battle.
 *
 * Capture is skipped when:
 *   - No item ended up selected at all (e.g. a command with no associated
 *     skill/item).
 *   - The confirmed selection is itself instant-cast (isInstantCast() being
 *     false already rules this out, but the check stays as a safety net in
 *     case another plugin's isInstantCast() override disagrees at the two
 *     call sites).
 *
 * The restore is skipped -- deliberately -- when the instant cast did not
 * finish cleanly (BattleManager._instantCasting still true, or phase is not
 * 'input' -- YEP_InstantCast's updateEventMain() early-return case) or when
 * the battler can no longer input (dead, restricted, confused, auto-battle).
 * In those cases YEP's own makeActions() reroll is left as the authority.
 *
 * ============================================================================
 * Install
 * ============================================================================
 *
 * Load BELOW YEP_InstantCast.js.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 2.01:
 * - Capture and restore now also cover the confirmed target
 *   (action._targetIndex), not just the item. v2.00 only stored the item,
 *   so a "for one" skill/item aimed at a specific target (e.g. Fire ->
 *   Enemy 3) would come back after an instant-cast interruption with the
 *   right skill but a lost target: the same preview/help-text scanning
 *   that clears the real item while browsing for the instant pick clears
 *   _targetIndex right along with it, and nothing was restoring it.
 *
 * Version 2.00:
 * - Reworked capture to happen at confirm-time (Scene_Battle.selectNext-
 *   Command) instead of reactively inside setItemObject. v1.00's approach
 *   was defeated by an unrelated preview/help-text mechanism elsewhere in
 *   the plugin stack that clears the real action just from browsing a list.
 *
 * Version 1.00:
 * - Initial release (superseded -- did not work, kept only for history).
 */
//=============================================================================

(function() {

'use strict';

var pluginName = (function() {
  var src = (document.currentScript && document.currentScript.src) || '';
  var file = decodeURIComponent(src.split('/').pop() || '');
  return file.replace(/\.js$/i, '') || 'Andrew_InstantCastKeepPrimary';
})();

var params   = PluginManager.parameters(pluginName) || {};
var debugLog = String(params['Debug Log'] || 'false') === 'true';

var log = function(msg) {
  if (debugLog) console.log('[' + pluginName + '] ' + msg);
};

log('file loaded and executing (v2.01)');

if (!BattleManager.performInstantCast || !BattleManager.endActorInstantCast ||
    !Scene_Battle.prototype.selectNextCommand) {
  console.error(pluginName + ': YEP_InstantCast.js not detected. ' +
    'This plugin must be placed BELOW YEP_InstantCast.js.');
  return;
}

//-----------------------------------------------------------------------------
// Per-battler primary-selection storage. Keyed by battler reference, so no
// actorId/enemy-index string keys and no id-collision concerns.
//-----------------------------------------------------------------------------

Andrew.ICKP.primaries  = new Map();
Andrew.ICKP.restoring  = false;

var subjLabel = function(battler) {
  if (!battler) return 'none';
  return battler.isActor() ? 'actor ' + battler.actorId() :
                              'enemy index ' + battler.index();
};

var itemLabel = function(item) {
  if (!item) return 'none';
  return (DataManager.isSkill(item) ? 'skill ' : 'item ') + item.id +
         ' "' + item.name + '"';
};

var targetLabel = function(targetIndex) {
  return (targetIndex === undefined || targetIndex === null) ?
      'none' : String(targetIndex);
};

//-----------------------------------------------------------------------------
// Scene_Battle - capture at the moment of genuine confirmation
//-----------------------------------------------------------------------------

Andrew.ICKP.Scene_Battle_selectNextCommand =
    Scene_Battle.prototype.selectNextCommand;
Scene_Battle.prototype.selectNextCommand = function() {
    if (!this.isInstantCast()) {
      Andrew.ICKP.captureConfirmedPrimary();
    }
    Andrew.ICKP.Scene_Battle_selectNextCommand.call(this);
};

Andrew.ICKP.captureConfirmedPrimary = function() {
    var actor = BattleManager.actor();
    if (!actor) return;
    var action = BattleManager.inputtingAction();
    if (!action) return;
    var item = action.item();
    if (!item) {
      log('confirm: no item selected, nothing to capture for ' +
          subjLabel(actor));
      return;
    }
    if (actor.isInstantCast && actor.isInstantCast(item)) {
      // Should not happen (isInstantCast() already gated this branch), kept
      // as a safety net in case another plugin's override disagrees.
      log('confirm: selection is instant, not treating as primary');
      return;
    }
    // Capture the target the player actually chose alongside the item --
    // setSkill/setItem only reassigns _item, so without this the target
    // silently reverts to whatever the instant-pick browsing scan last
    // left _targetIndex as.
    var targetIndex = action._targetIndex;
    Andrew.ICKP.primaries.set(actor, { item: item, targetIndex: targetIndex });
    log('PRIMARY CONFIRMED: ' + itemLabel(item) + ' -> target ' +
        targetLabel(targetIndex) + ' for ' + subjLabel(actor));
};

//-----------------------------------------------------------------------------
// BattleManager - restore once the instant cast has fully resolved
//-----------------------------------------------------------------------------

Andrew.ICKP.BattleManager_endActorInstantCast =
    BattleManager.endActorInstantCast;
BattleManager.endActorInstantCast = function() {
    var actor = this._subject;
    Andrew.ICKP.BattleManager_endActorInstantCast.call(this);

    if (this._instantCasting) {
      log('restore skipped: instant cast did not finish cleanly');
      return;
    }
    if (this._phase !== 'input') {
      log('restore skipped: phase is ' + this._phase);
      return;
    }
    if (!actor || !actor.isAlive() || !actor.canMove() || !actor.canInput()) {
      log('restore skipped: actor cannot input');
      return;
    }

    var saved = Andrew.ICKP.primaries.get(actor);
    if (!saved) {
      log('no saved primary for ' + subjLabel(actor));
      return;
    }

    var action = actor.currentAction ? actor.currentAction() : null;
    if (!action) return;

    Andrew.ICKP.restoring = true;
    if (DataManager.isSkill(saved.item)) {
      action.setSkill(saved.item.id);
    } else {
      action.setItem(saved.item.id);
    }
    if (saved.targetIndex !== undefined) {
      action._targetIndex = saved.targetIndex;
    }
    Andrew.ICKP.restoring = false;

    this.refreshStatus();
    log('RESTORED ' + itemLabel(saved.item) + ' -> target ' +
        targetLabel(saved.targetIndex) + ' for ' + subjLabel(actor));
};

//-----------------------------------------------------------------------------
// Safety: never let a stale primary leak into a new turn or battle.
//-----------------------------------------------------------------------------

Andrew.ICKP.BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
    Andrew.ICKP.primaries.clear();
    Andrew.ICKP.BattleManager_startTurn.call(this);
};

Andrew.ICKP.BattleManager_endBattle = BattleManager.endBattle;
BattleManager.endBattle = function(result) {
    Andrew.ICKP.primaries.clear();
    Andrew.ICKP.BattleManager_endBattle.call(this, result);
};

})();