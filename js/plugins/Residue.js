//=============================================================================
// Andrew_ResidueStacks.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_ResidueStacks = true;

var Andrew = Andrew || {};
Andrew.ResidueStacks = Andrew.ResidueStacks || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Tracks cumulative DoT damage from two states into a
 * counter, shows it in state 146's help description, and pays it out via
 * skill 355. Requires YEP_X_ExtDoT.
 * @author Andrew
 *
 * @param DoT State 1
 * @type state
 * @desc First state whose DoT damage is tracked.
 * @default 4
 *
 * @param DoT State 2
 * @type state
 * @desc Second state whose DoT damage is tracked.
 * @default 145
 *
 * @param Residue State
 * @type state
 * @desc The state whose help description shows the tracked total
 * (expects the description to start with "X").
 * @default 146
 *
 * @param Payoff Skill
 * @type skill
 * @desc The skill that consumes the tracked total: adds it to damage,
 * then resets the counter to 0.
 * @default 355
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Whenever a battler takes DoT damage (via YEP_X_ExtDoT) from either of the
 * two "DoT State" states, that damage is added to a running "Residue Stacks"
 * counter on the battler.
 *
 * The Residue State's <Help Description> notetag should begin with a literal
 * "X", e.g.:
 *
 *   <Help Description>
 *   X stacks of Residue.
 *   </Help Description>
 *
 * When that state's description is displayed (via the enemy status help
 * window), the leading X is replaced with the battler's current stack count.
 *
 * When the Payoff Skill is used on a target that has the Residue State, the
 * target's stack count is added to that skill's damage, then reset to 0.
 *
 * ============================================================================
 * Plugin Order
 * ============================================================================
 *
 * Place this BELOW YEP_X_ExtDoT, YEP_BuffsStatesCore, and
 * ADRI_InBattleEnemyStatus / YEP_X_InBattleStatus.
 *
 * ============================================================================
 */
//=============================================================================

Andrew.ResidueStacks.Parameters = PluginManager.parameters('Andrew_ResidueStacks');
Andrew.ResidueStacks.Param = Andrew.ResidueStacks.Param || {};
Andrew.ResidueStacks.Param.DotState1 =
  Number(Andrew.ResidueStacks.Parameters['DoT State 1'] || 4);
Andrew.ResidueStacks.Param.DotState2 =
  Number(Andrew.ResidueStacks.Parameters['DoT State 2'] || 145);
Andrew.ResidueStacks.Param.ResidueState =
  Number(Andrew.ResidueStacks.Parameters['Residue State'] || 146);
Andrew.ResidueStacks.Param.PayoffSkill =
  Number(Andrew.ResidueStacks.Parameters['Payoff Skill'] || 355);

//=============================================================================
// Game_Battler
// ----------------------------------------------------------------------------
// Residue stack storage
//=============================================================================

Andrew.ResidueStacks.Game_Battler_initMembers = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {
  Andrew.ResidueStacks.Game_Battler_initMembers.call(this);
  this._residueStacks = 0;
};

Game_Battler.prototype.residueStacks = function() {
  return this._residueStacks || 0;
};

Game_Battler.prototype.gainResidueStacks = function(amount) {
  amount = Math.round(amount);
  if (amount <= 0) return;
  this._residueStacks = this.residueStacks() + amount;
};

Game_Battler.prototype.clearResidueStacks = function() {
  this._residueStacks = 0;
};

//=============================================================================
// Game_Battler
// ----------------------------------------------------------------------------
// Tracking: hook YEP_X_ExtDoT's per-state DoT application. We diff actual HP
// before/after rather than reading the formula's internal 'value', since
// that global gets clobbered by gainHp() (see BattleLog.js history).
//=============================================================================

if (Imported.YEP_X_ExtDoT) {

Andrew.ResidueStacks.Game_Battler_processDamageOverTimeStateEffect =
  Game_Battler.prototype.processDamageOverTimeStateEffect;
Game_Battler.prototype.processDamageOverTimeStateEffect = function(state) {
  var trackedIds = [
    Andrew.ResidueStacks.Param.DotState1,
    Andrew.ResidueStacks.Param.DotState2
  ];
  var isTracked = state && trackedIds.indexOf(state.id) >= 0;
  // If Andrew_NetRegenHp is buffering this step, real hp won't move until
  // the step ends - diff its buffer instead so tracking still works. Falls
  // back to diffing hp directly if that plugin isn't buffering (or isn't
  // installed).
  var before = this._bufferingRegen ? this._regenHpBuffer : this.hp;
  Andrew.ResidueStacks.Game_Battler_processDamageOverTimeStateEffect.call(this, state);
  var after = this._bufferingRegen ? this._regenHpBuffer : this.hp;
  if (isTracked) {
    var damageDealt = before - after;
    if (damageDealt > 0) {
      this.gainResidueStacks(damageDealt);
    }
  }
};

} else {

  console.log('Andrew_ResidueStacks requires YEP_X_ExtDoT to track DoT damage.');

}

//=============================================================================
// Game_Battler
// ----------------------------------------------------------------------------
// Auto-apply: whenever either DoT state is applied to a battler, make sure
// the Residue State is present too (does nothing if it's already there).
//=============================================================================

Andrew.ResidueStacks.Game_Battler_addState = Game_Battler.prototype.addState;
Game_Battler.prototype.addState = function(stateId) {
  Andrew.ResidueStacks.Game_Battler_addState.call(this, stateId);
  var trackedIds = [
    Andrew.ResidueStacks.Param.DotState1,
    Andrew.ResidueStacks.Param.DotState2
  ];
  if (trackedIds.indexOf(stateId) >= 0) {
    var residueId = Andrew.ResidueStacks.Param.ResidueState;
    if (!this.isStateAffected(residueId)) {
      this.addState(residueId);
    }
  }
};

//=============================================================================
// Window_InBattleStateList
// ----------------------------------------------------------------------------
// YEP_X_InBattleStatus normally excludes any state with iconIndex <= 0 from
// the scan/state list. Override so states without an icon still show up.
//=============================================================================

if (Imported.YEP_X_InBattleStatus) {

Window_InBattleStateList.prototype.includes = function(item) {
  if (!item) return false;
  if (item.name.length <= 0) return false;
  return true;
};

}

//=============================================================================
// Window_Help
// ----------------------------------------------------------------------------
// Display: substitute the leading "X" in the Residue State's description
// with the current stacks of whichever enemy is being viewed.
//=============================================================================

if (Window_Help.prototype.setItem) {

Andrew.ResidueStacks.Window_Help_setItem = Window_Help.prototype.setItem;
Window_Help.prototype.setItem = function(item) {
  var residueState = $dataStates[Andrew.ResidueStacks.Param.ResidueState];
  if (item && residueState && item === residueState) {
    var battler = Andrew.ResidueStacks.getViewedEnemy();
    var stacks = battler ? battler.residueStacks() : 0;
    var text = (item.description || '').replace(/(^|\n)X\b/, function(match, prefix) {
      return prefix + stacks;
    });
    this.setText(text);
    return;
  }
  Andrew.ResidueStacks.Window_Help_setItem.call(this, item);
};

} else {

  console.log('Andrew_ResidueStacks: Window_Help.prototype.setItem not found. ' +
    'Place this plugin below your item/skill core plugins, or send ' +
    'YEP_X_InBattleStatus.js so the hook point can be adjusted.');

}

Andrew.ResidueStacks.getViewedEnemy = function() {
  var scene = SceneManager._scene;
  if (scene && scene._inBattleEnemyStateList) {
    return scene._inBattleEnemyStateList._battler;
  }
  return null;
};

//=============================================================================
// Game_Action
// ----------------------------------------------------------------------------
// Payoff: skill 355 gains bonus damage equal to the target's stacks, then
// the stacks are reset to 0.
//=============================================================================

Andrew.ResidueStacks.Game_Action_evalDamageFormula =
  Game_Action.prototype.evalDamageFormula;
Game_Action.prototype.evalDamageFormula = function(target) {
  var value = Andrew.ResidueStacks.Game_Action_evalDamageFormula.call(this, target);
  if (this.isSkill() && this.item().id === Andrew.ResidueStacks.Param.PayoffSkill) {
    if (target.isStateAffected(Andrew.ResidueStacks.Param.ResidueState)) {
      value += target.residueStacks();
    }
  }
  return value;
};

Andrew.ResidueStacks.Game_Action_apply = Game_Action.prototype.apply;
Game_Action.prototype.apply = function(target) {
  var isPayoff = this.isSkill() &&
    this.item().id === Andrew.ResidueStacks.Param.PayoffSkill &&
    target.isStateAffected(Andrew.ResidueStacks.Param.ResidueState);
  Andrew.ResidueStacks.Game_Action_apply.call(this, target);
  if (isPayoff) {
    target.clearResidueStacks();
    target.removeState(Andrew.ResidueStacks.Param.ResidueState);
  }
};

//=============================================================================
// End of File
//=============================================================================