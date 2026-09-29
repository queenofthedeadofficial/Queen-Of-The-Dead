//=============================================================================
// Andrew_MagicLilyEquipSwitch.js
//=============================================================================
/*:
 * @plugindesc v1.00 Turns Switch 422 ON while any actor has the armor
 * "Magic Lily" equipped, and OFF when no actor has it equipped.
 * @author Andrew
 *
 * @help
 * ---------------------------------------------------------------------------
 * Andrew_MagicLilyEquipSwitch.js
 * ---------------------------------------------------------------------------
 * Standalone, no plugin parameters. Behavior is hardcoded per spec:
 *
 *   - Armor matched by exact name: "Magic Lily"
 *   - Switch 422 = ON  whenever at least one actor in the party has it
 *                       equipped
 *   - Switch 422 = OFF whenever no actor has it equipped
 *   - Works for any actor, on the map or in battle
 *   - Re-evaluated (not just toggled) after every equip change, by
 *     scanning the whole party, so it stays correct even if more than
 *     one copy could end up equipped across different actors.
 *   - Refreshes all windows in the current scene so any state/status
 *     displays update immediately after the switch changes.
 *
 * Place this below all YEP plugins.
 * ---------------------------------------------------------------------------
 */

var Andrew = Andrew || {};
Andrew.MagicLilyEquip = Andrew.MagicLilyEquip || {};

(function() {

    var TARGET_ARMOR_NAME = "Magic Lily";
    var TARGET_SWITCH_ID = 422;

    Andrew.MagicLilyEquip._targetArmorId = null;

    //-------------------------------------------------------------------
    // Resolve the armor's database ID by name (cached after first lookup)
    //-------------------------------------------------------------------
    Andrew.MagicLilyEquip.getTargetArmorId = function() {
        if (Andrew.MagicLilyEquip._targetArmorId !== null) {
            return Andrew.MagicLilyEquip._targetArmorId;
        }
        var id = 0;
        for (var i = 1; i < $dataArmors.length; i++) {
            var armor = $dataArmors[i];
            if (armor && armor.name === TARGET_ARMOR_NAME) {
                id = armor.id;
                break;
            }
        }
        Andrew.MagicLilyEquip._targetArmorId = id;
        if (id === 0) {
            console.warn('Andrew_MagicLilyEquipSwitch: no armor named "' +
                TARGET_ARMOR_NAME + '" found in the database.');
        } else {
            console.log('Andrew_MagicLilyEquipSwitch: matched armor ID ' + id);
        }
        return id;
    };

    //-------------------------------------------------------------------
    // Scan the whole party (not just the actor who just changed equips)
    // and set the switch based on whether anyone currently has it on.
    // This is safer than a simple was/now toggle if more than one copy
    // of the armor could exist and be equipped by different actors.
    //-------------------------------------------------------------------
    Andrew.MagicLilyEquip.refreshSwitch = function() {
        var targetId = Andrew.MagicLilyEquip.getTargetArmorId();
        if (targetId === 0) return;

        var anyEquipped = $gameParty.allMembers().some(function(actor) {
            return actor.equips().some(function(equip) {
                return equip && DataManager.isArmor(equip) && equip.id === targetId;
            });
        });

        console.log('Andrew_MagicLilyEquipSwitch: anyEquipped=' + anyEquipped);

        var current = $gameSwitches.value(TARGET_SWITCH_ID);
        if (current !== anyEquipped) {
            $gameSwitches.setValue(TARGET_SWITCH_ID, anyEquipped);
            console.log('Andrew_MagicLilyEquipSwitch: switch ' + TARGET_SWITCH_ID +
                ' set to ' + anyEquipped);

            // YEP_BuffsStatesCore caches passive states (from notetags like
            // <Passive Condition: Switch 422 ON>) and only recomputes them
            // inside Game_BattlerBase.refresh(). Nothing else calls refresh()
            // just because a switch flipped outside of battle, so the cache
            // goes stale until something else happens to trigger it. Force it
            // here for every party member.
            $gameParty.allMembers().forEach(function(actor) {
                actor.refresh();
            });

            Andrew.MagicLilyEquip.refreshSceneWindows();
        }
    };

    //-------------------------------------------------------------------
    // Refresh every object in the active scene that exposes a refresh()
    // method, so any status displays reflect the new switch state. Walks
    // the full scene tree (not just the window layer), since some custom
    // state-display overlays are added as scene-level sprites rather than
    // Window_* objects living inside _windowLayer.
    //-------------------------------------------------------------------
    Andrew.MagicLilyEquip.refreshSceneWindows = function() {
        var scene = SceneManager._scene;
        if (!scene) return;
        Andrew.MagicLilyEquip.refreshChildrenRecursive(scene);
    };

    Andrew.MagicLilyEquip.refreshChildrenRecursive = function(node) {
        if (!node || !node.children) return;
        node.children.forEach(function(child) {
            if (child && typeof child.refresh === 'function') {
                try {
                    child.refresh();
                } catch (e) {
                    // Some objects require specific setup before refresh;
                    // skip silently rather than breaking the equip flow.
                }
            }
            Andrew.MagicLilyEquip.refreshChildrenRecursive(child);
        });
    };

    //-------------------------------------------------------------------
    // Hook equip changes for any actor, map or battle
    //-------------------------------------------------------------------
    Andrew.MagicLilyEquip.Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
    Game_Actor.prototype.changeEquip = function(slotId, item) {
        console.log('Andrew_MagicLilyEquipSwitch: changeEquip fired, slot=' +
            slotId + ' item=' + (item ? item.name : 'null'));
        Andrew.MagicLilyEquip.Game_Actor_changeEquip.call(this, slotId, item);
        Andrew.MagicLilyEquip.refreshSwitch();
    };

})();