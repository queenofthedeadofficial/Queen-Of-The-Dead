/*:
 * @plugindesc v1.0 Allows skills with <Any Ally Target> to target living and dead allies. YEP-compatible.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Notetag
 * ============================================================================
 *
 * Place in a skill's note box:
 *
 *   <Any Ally Target>
 *
 * The skill should have its Scope set to:
 *   One Ally
 *
 * The target window will allow selecting any party member,
 * regardless of whether they are alive or dead.
 *
 * Designed for RPG Maker MV + YEP Battle Engine Core.
 */

(function() {

    function isAnyAllySkill() {
        var action = BattleManager.inputtingAction();
        if (!action) return false;

        var item = action.item();
        return item &&
               item.note &&
               /<Any Ally Target>/i.test(item.note);
    }

    //-------------------------------------------------------------------------
    // Allow cursor on dead actors
    //-------------------------------------------------------------------------

    var _Window_BattleActor_isCurrentItemEnabled =
        Window_BattleActor.prototype.isCurrentItemEnabled;

    Window_BattleActor.prototype.isCurrentItemEnabled = function() {
        if (isAnyAllySkill()) {
            return true;
        }
        return _Window_BattleActor_isCurrentItemEnabled.call(this);
    };

    //-------------------------------------------------------------------------
    // Don't skip dead actors while moving the cursor
    //-------------------------------------------------------------------------

    Window_BattleActor.prototype.actor = function() {
        return $gameParty.members()[this.index()];
    };

    //-------------------------------------------------------------------------
    // Return all party members as selectable targets
    //-------------------------------------------------------------------------

    var _Game_Action_friendsUnit =
        Game_Action.prototype.friendsUnit;

    Game_Action.prototype.friendsUnit = function() {
        return _Game_Action_friendsUnit.call(this);
    };

    var _Game_Unit_smoothTarget =
        Game_Unit.prototype.smoothTarget;

    Game_Party.prototype.smoothTarget = function(index) {
        if (isAnyAllySkill()) {
            return this.members()[index];
        }
        return _Game_Unit_smoothTarget.call(this, index);
    };

})();