//=============================================================================
// Andrew_AuraRefreshSafetyNet.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_AuraRefreshSafetyNet = true;

var Andrew = Andrew || {};
Andrew.AuraSafetyNet = Andrew.AuraSafetyNet || {};

//=============================================================================
/*:
 * @plugindesc v2.00 (Requires YEP_X_PassiveAuras) Self-healing refresh for
 * aura-based passive states via signature diffing on refresh().
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * YEP_X_PassiveAuras refreshes party/troop members whenever a state carrying
 * aura notetags is added to or removed from a battler (its own
 * Game_BattlerBase.prototype.updateAuras, hooked into addNewState and
 * eraseState). That covers the case where the CAUSE of an aura change is a
 * state add/remove. It does not cover cases where the inputs to aura
 * eligibility change WITHOUT a state add/remove ever firing - direct HP
 * manipulation crossing the alive/dead threshold, enemies appearing,
 * transforming, or being hidden, party membership changing mid-battle, or
 * any future plugin that touches these in a way nothing here anticipated.
 *
 * Rather than hooking every individual mutation site (fragile - it only
 * covers cases we thought to hook, and breaks again the next time a new
 * plugin changes HP/state/membership through an unanticipated path), this
 * plugin rides on the ONE place that already runs after every one of those
 * changes for unrelated reasons: Game_BattlerBase.prototype.refresh().
 *
 * Every time ANY battler's refresh() runs during battle, this plugin builds
 * a lightweight "aura signature" of the entire party+troop - each member's
 * alive/dead/hidden aura status plus the sorted list of aura-emitting state
 * ids currently on them - and compares it to the last known signature. If
 * anything is different, it cascades one BattleManager.refreshAllBattlers()
 * call (the same method YEP_X_PassiveAuras itself uses) and updates the
 * stored signature. Re-entrant refresh() calls made during that cascade are
 * ignored so this can't loop.
 *
 * This makes the fix self-healing: it does not matter which mutation caused
 * the drift, only that a drift happened, because refresh() is already the
 * universal sync point every state/HP/equip/membership change in this
 * engine passes through.
 *
 * This plugin does nothing outside of battle and does nothing at all if
 * YEP_X_PassiveAuras is not present.
 *
 * ============================================================================
 * Placement
 * ============================================================================
 *
 * Place this plugin below YEP_AutoPassiveStates and YEP_X_PassiveAuras,
 * same as all other custom Andrew_ plugins.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 2.00:
 * - Rewritten from an explicit mutation-site hook list (setHp, appear,
 * transform, hide, addActor, removeActor) to a signature-diff approach
 * hooked into Game_BattlerBase.prototype.refresh. Self-healing against
 * future/unknown mutation paths instead of requiring new hooks per case.
 *
 * Version 1.00:
 * - Initial release (explicit mutation-site hooks).
 */
//=============================================================================

(function() {

if (!Imported.YEP_X_PassiveAuras) return;

//=============================================================================
// State
//=============================================================================

Andrew.AuraSafetyNet.isCascading = false;
Andrew.AuraSafetyNet.lastSignature = '';

//=============================================================================
// Signature building
//=============================================================================

Andrew.AuraSafetyNet.memberSignature = function(key, battler) {
  var auraIds = [];
  var states = battler.states();
  var length = states.length;
  for (var i = 0; i < length; ++i) {
    var state = states[i];
    if (state && DataManager.isAuraState(state)) auraIds.push(state.id);
  }
  auraIds.sort(function(a, b) { return a - b; });
  var alive = (battler.hp > 0 && battler.isAlive()) ? 'a' : 'd';
  var hidden = (battler.isHidden && battler.isHidden()) ? 'h' : 'v';
  return key + ':' + alive + hidden + ':' + auraIds.join(',');
};

Andrew.AuraSafetyNet.buildSignature = function() {
  if (!$gameParty.inBattle()) return '';
  var parts = [];
  var partyMembers = $gameParty.members();
  var i;
  for (i = 0; i < partyMembers.length; ++i) {
    var actor = partyMembers[i];
    if (!actor) continue;
    parts.push(Andrew.AuraSafetyNet.memberSignature('A' + actor.actorId(), actor));
  }
  var troopMembers = $gameTroop.members();
  for (i = 0; i < troopMembers.length; ++i) {
    var enemy = troopMembers[i];
    if (!enemy) continue;
    parts.push(Andrew.AuraSafetyNet.memberSignature('E' + i, enemy));
  }
  return parts.join('|');
};

//=============================================================================
// Drift check
//=============================================================================

Andrew.AuraSafetyNet.checkAuraDrift = function() {
  if (!$gameParty.inBattle()) return;
  if (Andrew.AuraSafetyNet.isCascading) return;
  // Guard now covers the ENTIRE check, including both signature builds --
  // not just the refreshAllBattlers() call -- so any refresh() fired from
  // anywhere while THIS drift check is still resolving (e.g. a custom aura
  // condition eval, or any other plugin's addState/refresh chain touched
  // while walking battler.states() for the signature) is short-circuited
  // by this same flag instead of starting a brand new, fully-unguarded
  // checkAuraDrift() cycle. try/finally keeps a thrown exception from
  // leaving isCascading stuck true (which would silently disable the
  // safety net for the rest of the battle).
  Andrew.AuraSafetyNet.isCascading = true;
  try {
    var current = Andrew.AuraSafetyNet.buildSignature();
    if (current === Andrew.AuraSafetyNet.lastSignature) return;
    BattleManager.refreshAllBattlers();
    Andrew.AuraSafetyNet.lastSignature = Andrew.AuraSafetyNet.buildSignature();
  } finally {
    Andrew.AuraSafetyNet.isCascading = false;
  }
};

//=============================================================================
// Game_BattlerBase
//=============================================================================

Andrew.AuraSafetyNet.Game_BattlerBase_refresh =
  Game_BattlerBase.prototype.refresh;
Game_BattlerBase.prototype.refresh = function() {
  Andrew.AuraSafetyNet.Game_BattlerBase_refresh.call(this);
  Andrew.AuraSafetyNet.checkAuraDrift();
};

//=============================================================================
// BattleManager - reset the baseline signature at the start of each battle
//=============================================================================

Andrew.AuraSafetyNet.BattleManager_setup = BattleManager.setup;
BattleManager.setup = function(troopId, canEscape, canLose) {
  Andrew.AuraSafetyNet.BattleManager_setup.call(this, troopId, canEscape, canLose);
  Andrew.AuraSafetyNet.lastSignature = '';
};

})();

//=============================================================================
// End of File
//=============================================================================