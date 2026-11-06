//=============================================================================
// Andrew_SlotRegenState.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_SlotRegenState = true;

var Andrew = Andrew || {};
Andrew.SlotRegenState = Andrew.SlotRegenState || {};

/*:
 * @plugindesc v2.00 Skill 162 applies state 67 to a party SLOT (not an
 * actor) — the state follows whoever occupies that slot through swaps.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Skill 162 targets a party slot (0-3). This plugin remembers which slot
 * was targeted and keeps state 67 attached to whichever actor currently
 * occupies that slot — including after in-battle party swaps.
 *
 * Tracking is stored on $gameParty as _slotRegenSlot (-1 = nothing
 * tracked), so it saves/loads normally with the rest of party data.
 *
 * Game variable 218 is kept in sync with the tracked slot (1-indexed,
 * 0 when nothing tracked) so state 67's <Help Description> can reference
 * it directly as \V[218] and always show the current slot.
 *
 * ----------------------------------------------------------------------------
 * Why BattleManager.startAction instead of Game_Action.prototype.apply
 * ----------------------------------------------------------------------------
 * Game_Action.prototype.apply is sometimes skipped by YEP action sequences,
 * so it isn't a reliable place to capture the target. BattleManager.
 * startAction is the project's established pre-execution hook: by the time
 * it runs, this._targets is already resolved from the actor's selected
 * target, and it always fires regardless of action sequence content.
 *
 * ----------------------------------------------------------------------------
 * Why hooking Game_Party.prototype.swapOrder (not swapBattleSlots)
 * ----------------------------------------------------------------------------
 * Party_Swap.js v2 routes ALL reordering (in-battle swaps AND the menu
 * formation screen) through the single stock swapOrder method on _actors.
 * Hooking swapOrder itself means this plugin doesn't care which path
 * triggered the reorder — every swap gets caught at the one choke point.
 * ============================================================================
 */

Andrew.SlotRegenState.SkillId = 162;
Andrew.SlotRegenState.StateId = 67;
Andrew.SlotRegenState.DisplayVariableId = 218; // holds slot # (1-indexed) for \V[218] in state 67's <Help Description>

//-----------------------------------------------------------------------------
// Game_Party
//-----------------------------------------------------------------------------

Andrew.SlotRegenState.Game_Party_initialize = Game_Party.prototype.initialize;
Game_Party.prototype.initialize = function() {
  Andrew.SlotRegenState.Game_Party_initialize.call(this);
  this._slotRegenSlot = -1;
};

// Records which slot is being tracked and immediately syncs state 67 to
// whoever currently occupies it.
Game_Party.prototype.setSlotRegenSlot = function(slot) {
  this._slotRegenSlot = slot;
  this.refreshSlotRegenState();
};

// Stops tracking and strips state 67 from whoever currently has it.
Game_Party.prototype.clearSlotRegenSlot = function() {
  this._slotRegenSlot = -1;
  this.refreshSlotRegenState();
};

// Single source of truth: exactly the actor in the tracked slot (if any)
// should have state 67. Safe to call any time — idempotent if nothing
// changed since the last call.
Game_Party.prototype.refreshSlotRegenState = function() {
  var stateId = Andrew.SlotRegenState.StateId;
  var slot = this._slotRegenSlot;
  var members = this.battleMembers();
  var slotActor = (slot >= 0) ? members[slot] : null;

  $gameVariables.setValue(
      Andrew.SlotRegenState.DisplayVariableId, (slot >= 0) ? (slot + 1) : 0);

  this.members().forEach(function(actor) {
    if (!actor) return;
    var shouldHave = (actor === slotActor);
    var has = actor.isStateAffected(stateId);
    if (shouldHave && !has) {
      actor.addState(stateId);
    } else if (!shouldHave && has) {
      actor.removeState(stateId);
    }
  });
};

//-----------------------------------------------------------------------------
// BattleManager
//-----------------------------------------------------------------------------

// Capture the target's slot the moment the action is about to execute.
Andrew.SlotRegenState.BattleManager_startAction = BattleManager.startAction;
BattleManager.startAction = function() {
  Andrew.SlotRegenState.BattleManager_startAction.call(this);
  var action = this._action;
  if (!action || !action.isSkill() || !action.item()) return;
  if (action.item().id !== Andrew.SlotRegenState.SkillId) return;
  var target = this._targets && this._targets[0];
  if (!target || !target.isActor()) return;
  var slot = $gameParty.battleMembers().indexOf(target);
  if (slot < 0) return;
  $gameParty.setSlotRegenSlot(slot);
};

// Clear tracking (and strip state 67) at the end of battle, win/lose/escape.
Andrew.SlotRegenState.BattleManager_endBattle = BattleManager.endBattle;
BattleManager.endBattle = function(result) {
  $gameParty.clearSlotRegenSlot();
  Andrew.SlotRegenState.BattleManager_endBattle.call(this, result);
};

//-----------------------------------------------------------------------------
// Game_Party — swap hook
//-----------------------------------------------------------------------------

// Re-sync state 67 to the (possibly new) occupant of the tracked slot
// whenever party order changes, in battle or via the formation menu.
Andrew.SlotRegenState.Game_Party_swapOrder = Game_Party.prototype.swapOrder;
Game_Party.prototype.swapOrder = function(index1, index2) {
  Andrew.SlotRegenState.Game_Party_swapOrder.call(this, index1, index2);
  this.refreshSlotRegenState();
};