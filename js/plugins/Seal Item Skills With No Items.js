//=============================================================================
// Seal Item Skills With No Items.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_SealSkillsNoConsumables = true;

var Andrew = Andrew || {};
Andrew.SealSkillsNoConsumables = Andrew.SealSkillsNoConsumables || {};

/*:
 * @plugindesc v1.20 (no-parameter test build) Seals skills 58, 348, and 349
 * in battle if the actor's party has no consumable items usable in battle.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Seal Item Skills With No Items.js
 * ============================================================================
 * TEST BUILD: This version has no plugin parameters at all (skill IDs are
 * hardcoded below) to rule out a Plugin Manager registration issue caused by
 * the "number[]" parameter type used in the previous build.
 *
 * If this build's boot log still doesn't appear in the console, the problem
 * is not the parameter block.
 * ============================================================================
 */

(function() {

console.log("[SealSkillsNoConsumables] PLUGIN FILE LOADED - v1.20 no-parameter test build");

// Hardcoded - no plugin parameters in this test build.
Andrew.SealSkillsNoConsumables.SealedSkillIds = [58, 348, 349];

//-----------------------------------------------------------------------------
// Helper: does the party currently hold any consumable item usable in battle?
//-----------------------------------------------------------------------------
Andrew.SealSkillsNoConsumables.hasUsableBattleConsumable = function() {
    var items = $gameParty.items();
    console.log("[SealSkillsNoConsumables] $gameParty.items() =", items.map(function(it) {
        return it ? (it.name + " (id:" + it.id + ", occasion:" + it.occasion +
            ", consumable:" + it.consumable + ", qty:" + $gameParty.numItems(it) + ")") : "null";
    }));
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item) continue;
        // item.occasion: 0 = Always, 1 = Battle Screen, 2 = Menu Screen, 3 = Never
        var usableInBattle = (item.occasion === 0 || item.occasion === 1);
        if (item.consumable && usableInBattle && $gameParty.numItems(item) > 0) {
            return true;
        }
    }
    return false;
};

// Shared check used by both hooks below.
Andrew.SealSkillsNoConsumables.shouldSeal = function(skillId) {
    if (Andrew.SealSkillsNoConsumables.SealedSkillIds.indexOf(skillId) < 0) return false;
    if (!$gameParty.inBattle()) return false;
    var hasConsumable = Andrew.SealSkillsNoConsumables.hasUsableBattleConsumable();
    console.log("[SealSkillsNoConsumables] shouldSeal check for skill", skillId, "- hasConsumable:", hasConsumable);
    return !hasConsumable;
};

//-----------------------------------------------------------------------------
// Hook 1: Game_BattlerBase.prototype.isSkillSealed
//-----------------------------------------------------------------------------
Andrew.SealSkillsNoConsumables.Game_BattlerBase_isSkillSealed =
    Game_BattlerBase.prototype.isSkillSealed;
Game_BattlerBase.prototype.isSkillSealed = function(skillId) {
    if (Andrew.SealSkillsNoConsumables.Game_BattlerBase_isSkillSealed.call(this, skillId)) {
        return true;
    }
    if (this.isActor && this.isActor() && Andrew.SealSkillsNoConsumables.shouldSeal(skillId)) {
        console.log("[SealSkillsNoConsumables] isSkillSealed sealing skill", skillId);
        return true;
    }
    return false;
};

//-----------------------------------------------------------------------------
// Hook 2: Window_BattleSkill.prototype.isEnabled (UI-level backstop)
//-----------------------------------------------------------------------------
Andrew.SealSkillsNoConsumables.Window_BattleSkill_isEnabled =
    Window_BattleSkill.prototype.isEnabled;
Window_BattleSkill.prototype.isEnabled = function(item) {
    console.log("[SealSkillsNoConsumables] Window_BattleSkill.isEnabled CALLED for item id:", item && item.id, item && item.name);
    var baseEnabled = Andrew.SealSkillsNoConsumables.Window_BattleSkill_isEnabled.call(this, item);
    if (!baseEnabled) return false;
    if (item && Andrew.SealSkillsNoConsumables.shouldSeal(item.id)) {
        console.log("[SealSkillsNoConsumables] Window_BattleSkill.isEnabled sealing skill", item.id);
        return false;
    }
    return baseEnabled;
};

//-----------------------------------------------------------------------------
// Hook 2b: Window_SkillList.prototype.isEnabled (main-menu Skill scene)
//-----------------------------------------------------------------------------
Andrew.SealSkillsNoConsumables.Window_SkillList_isEnabled =
    Window_SkillList.prototype.isEnabled;
Window_SkillList.prototype.isEnabled = function(item) {
    var baseEnabled = Andrew.SealSkillsNoConsumables.Window_SkillList_isEnabled.call(this, item);
    if (!baseEnabled) return false;
    if (item && Andrew.SealSkillsNoConsumables.shouldSeal(item.id)) {
        console.log("[SealSkillsNoConsumables] Window_SkillList.isEnabled sealing skill", item.id);
        return false;
    }
    return baseEnabled;
};

})();