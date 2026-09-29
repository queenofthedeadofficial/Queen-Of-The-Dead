//=============================================================================
// Andrew Custom Plugin - Seal Skills Without Required Item Cost
// Andrew_SealSkillsNoItemCost.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_SealSkillsNoItemCost = true;

var Andrew = Andrew || {};
Andrew.SSNIC = Andrew.SSNIC || {};
Andrew.SSNIC.version = 1.02;

//=============================================================================
/*:
 * @plugindesc v1.02 (Requires YEP_SkillCore + YEP_X_SkillCostItems) Greys
 * out/disables, and optionally hides, any skill from the skill list if the
 * actor lacks the item, weapon, or armor cost that skill requires. Hooks
 * both Window_SkillList and Window_BattleSkill directly.
 * @author Andrew
 *
 * @param Hide Sealed Skills
 * @type boolean
 * @on Hide
 * @off Disable Only
 * @desc true: skills missing their required item cost vanish from the
 * list entirely. false: keep Yanfly's default disabled-but-visible look.
 * @default true
 *
 * @param Debug Log
 * @type boolean
 * @on Log
 * @off Silent
 * @desc If true, prints console.log traces for every skill checked so
 * you can see what this plugin is deciding and why. Turn off for release.
 * @default false
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin requires YEP_SkillCore and YEP_X_SkillCostItems, and must be
 * placed BELOW both of them in the plugin list.
 *
 * This plugin does two things for any skill that requires an item, weapon,
 * or armor cost via YEP_X_SkillCostItems notetags:
 *
 *   1. It always greys out and makes unselectable any such skill the actor
 *      cannot currently afford, by directly overriding
 *      Window_SkillList.prototype.isEnabled. This happens regardless of the
 *      "Hide Sealed Skills" parameter below and does not rely on
 *      meetsSkillConditions/canUse working correctly elsewhere in the
 *      plugin stack.
 *   2. Optionally (see the parameter below), it also removes the skill from
 *      the list entirely rather than just greying it out - generalizing the
 *      project's earlier per-skill seal behavior (previously hardcoded to
 *      skills 58/348/349) to ANY skill with an item/weapon/armor cost:
 *
 *   <Item x Cost: y>      <Item Cost: y ItemName>
 *   <Weapon x Cost: y>    <Item Cost: y% ItemName>  (rate/set modifiers too)
 *   <Armor x Cost: y>     <Item Cost: +y ItemName>
 *
 * If a skill has NO item/weapon/armor cost notetag at all, this plugin does
 * not touch it - it behaves exactly as if this plugin were not installed.
 *
 * ============================================================================
 * Plugin Parameters
 * ============================================================================
 *
 * Hide Sealed Skills
 *   true  - skills the actor can't currently afford disappear from the
 *           skill list entirely (the "sealed" behavior).
 *   false - the skill stays visible in the list, but is still greyed out
 *           and unselectable (handled directly by this plugin, not just
 *           left to Yanfly's default chain).
 *
 * ============================================================================
 * Compatibility
 * ============================================================================
 *
 * - Requires Imported.YEP_SkillCore and Imported.YEP_X_SkillCostItems.
 * - Must load BELOW both YEP_SkillCore and YEP_X_SkillCostItems.
 * - Overrides Window_SkillList.prototype.includes (list membership) and
 *   BOTH Window_SkillList.prototype.isEnabled AND
 *   Window_BattleSkill.prototype.isEnabled (grey-out/selectability).
 *   Window_BattleSkill is hooked directly and separately because any
 *   plugin that assigns its own Window_BattleSkill.prototype.isEnabled
 *   (own property) shadows the inherited Window_SkillList method entirely -
 *   relying on inheritance alone silently misses the battle skill window.
 *   Leaves cost display, payment, and gauge-swap logic from
 *   YEP_X_SkillCostItems untouched.
 *
 * ============================================================================
 * End of Help File
 * ============================================================================
 */
//=============================================================================

if (!Imported.YEP_SkillCore) {
  var msg = '';
  msg += 'Andrew_SealSkillsNoItemCost.js requires YEP_SkillCore.js to be ';
  msg += 'installed above it in the plugin list.\n';
  throw new Error(msg);
}

if (!Imported.YEP_X_SkillCostItems) {
  var msg = '';
  msg += 'Andrew_SealSkillsNoItemCost.js requires YEP_X_SkillCostItems.js ';
  msg += 'to be installed above it in the plugin list.\n';
  throw new Error(msg);
}

//=============================================================================
// Parameters
//=============================================================================

Andrew.SSNIC.Parameters = PluginManager.parameters('Andrew_SealSkillsNoItemCost');
Andrew.SSNIC.HideSealed =
    String(Andrew.SSNIC.Parameters['Hide Sealed Skills']) === 'true';
Andrew.SSNIC.DebugLog =
    String(Andrew.SSNIC.Parameters['Debug Log']) === 'true';

// One-time confirmation that the file itself loaded and parameters read
// correctly (filename vs. PluginManager.parameters lookup mismatches have
// bitten this project before).
console.log('[Andrew_SealSkillsNoItemCost] loaded. HideSealed=' +
    Andrew.SSNIC.HideSealed + ' DebugLog=' + Andrew.SSNIC.DebugLog);

//=============================================================================
// Game_BattlerBase
//=============================================================================

// True if the skill has any <Item/Weapon/Armor x Cost: y> notetag on it,
// regardless of whether the cost can currently be paid.
Game_BattlerBase.prototype.hasSkillItemCostRequirement = function(skill) {
    if (!skill) return false;
    if (skill.useItemCost && skill.useItemCost.length > 0) return true;
    if (skill.useWeaponCost && skill.useWeaponCost.length > 0) return true;
    if (skill.useArmorCost && skill.useArmorCost.length > 0) return true;
    return false;
};

// True only for skills that DO require an item cost AND the actor currently
// cannot pay it. Skills with no item cost requirement always return false.
Game_BattlerBase.prototype.isSealedByMissingItemCost = function(skill) {
    if (!this.hasSkillItemCostRequirement(skill)) {
      if (Andrew.SSNIC.DebugLog && skill) {
        console.log('[SSNIC] "' + skill.name + '" has no item/weapon/armor ' +
            'cost notetag - not touched by this plugin.');
      }
      return false;
    }
    var result = !this.canPaySkillItemCost(skill);
    if (Andrew.SSNIC.DebugLog) {
      console.log('[SSNIC] "' + skill.name + '" requires item cost. ' +
          'canPaySkillItemCost=' + this.canPaySkillItemCost(skill) +
          ' -> sealed=' + result);
    }
    return result;
};

//=============================================================================
// Window_SkillList
//=============================================================================

Andrew.SSNIC.Window_SkillList_includes = Window_SkillList.prototype.includes;
Window_SkillList.prototype.includes = function(item) {
    if (!Andrew.SSNIC.Window_SkillList_includes.call(this, item)) return false;
    if (!Andrew.SSNIC.HideSealed) return true;
    if (!this._actor) return true;
    if (this._actor.isSealedByMissingItemCost(item)) return false;
    return true;
};

// Always grey out / block selection of a missing-item-cost skill, whether
// or not "Hide Sealed Skills" is also removing it from the list above.
Andrew.SSNIC.Window_SkillList_isEnabled = Window_SkillList.prototype.isEnabled;
Window_SkillList.prototype.isEnabled = function(item) {
    if (Andrew.SSNIC.DebugLog && item) {
      console.log('[SSNIC] Window_SkillList.isEnabled check running for "' +
          item.name + '"');
    }
    if (this._actor && this._actor.isSealedByMissingItemCost(item)) return false;
    return Andrew.SSNIC.Window_SkillList_isEnabled.call(this, item);
};

//=============================================================================
// Window_BattleSkill
//=============================================================================
// Window_BattleSkill extends Window_SkillList but is NOT guaranteed to reach
// Window_SkillList.prototype.isEnabled via the prototype chain - any plugin
// that assigns Window_BattleSkill.prototype.isEnabled directly (own
// property) shadows the inherited method entirely. This project already has
// exactly that pattern (Seal Item Skills With No Items.js), so this plugin
// must alias-and-wrap Window_BattleSkill.prototype.isEnabled directly too,
// rather than relying on inheritance from Window_SkillList.

if (typeof Window_BattleSkill !== 'undefined') {
  Andrew.SSNIC.Window_BattleSkill_isEnabled =
      Window_BattleSkill.prototype.isEnabled;
  Window_BattleSkill.prototype.isEnabled = function(item) {
      if (Andrew.SSNIC.DebugLog && item) {
        console.log('[SSNIC] Window_BattleSkill.isEnabled check running for "' +
            item.name + '"');
      }
      if (this._actor && this._actor.isSealedByMissingItemCost(item)) return false;
      return Andrew.SSNIC.Window_BattleSkill_isEnabled.call(this, item);
  };
}

//=============================================================================
// End of File
//=============================================================================