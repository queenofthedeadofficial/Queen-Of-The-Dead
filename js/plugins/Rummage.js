/*:
 * @plugindesc Rummage - Allows an actor to select a battle consumable during
 *              skill selection and use it as their normal action.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Rummage
 * ============================================================================
 *
 * Add this notetag to the skill:
 *
 *   <Rummage>
 *
 * Behavior:
 *
 *   1. Actor selects Rummage.
 *   2. The normal Battle Item window opens immediately.
 *   3. Only owned, consumable, battle-usable items are displayed.
 *   4. Player selects an item.
 *   5. The Rummage action becomes the selected item.
 *   6. The actor's action executes normally during the normal action phase.
 *
 * The selected item is NOT manually applied by this plugin.
 *
 * The normal RPG Maker MV / YEP battle action system handles:
 *
 *   - Item scope
 *   - Item effects
 *   - Animations
 *   - Common Events
 *   - Item consumption
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //=========================================================================
    // State
    //=========================================================================

    var rummageActive = false;
    var rummageActor = null;
    var rummageAction = null;

    //=========================================================================
    // Notetag
    //=========================================================================

    function isRummageSkill(skill) {
        return skill &&
               skill.note &&
               /<Rummage>/i.test(skill.note);
    }

    //=========================================================================
    // Valid Rummage Items
    //=========================================================================

    function canRummageItem(item) {

        if (!item) return false;

        // Must be consumable.
        if (!item.consumable) return false;

        // Must be owned.
        if ($gameParty.numItems(item) <= 0) return false;

        // Must be usable in battle.
        if (!$gameParty.canUse(item)) return false;

        return true;
    }

    //=========================================================================
    // Scene_Battle - Intercept Skill Confirmation
    //=========================================================================

    var _Scene_Battle_onSkillOk =
        Scene_Battle.prototype.onSkillOk;

    Scene_Battle.prototype.onSkillOk = function() {

        var skill = this._skillWindow.item();

        if (isRummageSkill(skill)) {

            var actor = BattleManager.actor();

            if (!actor) {
                _Scene_Battle_onSkillOk.call(this);
                return;
            }

            var action = BattleManager.inputtingAction();

            if (!action) {
                _Scene_Battle_onSkillOk.call(this);
                return;
            }

            // Store the current actor and action.
            rummageActive = true;
            rummageActor = actor;
            rummageAction = action;

            // Ensure the action initially represents Rummage.
            action.setSkill(skill.id);

            // Hide and deactivate the skill window.
            this._skillWindow.hide();
            this._skillWindow.deactivate();

            // Open the normal battle item window.
            this.commandItem();

            return;
        }

        _Scene_Battle_onSkillOk.call(this);
    };

    //=========================================================================
    // Filter Battle Item Window
    //=========================================================================

    var _Window_BattleItem_includes =
        Window_BattleItem.prototype.includes;

    Window_BattleItem.prototype.includes = function(item) {

        if (rummageActive) {
            return canRummageItem(item);
        }

        return _Window_BattleItem_includes.call(this, item);
    };

    //=========================================================================
    // Confirm Selected Item
    //=========================================================================

    var _Window_BattleItem_callOkHandler =
        Window_BattleItem.prototype.callOkHandler;

    Window_BattleItem.prototype.callOkHandler = function() {

        if (!rummageActive) {

            _Window_BattleItem_callOkHandler.call(this);
            return;
        }

        var item = this.item();

        if (!item || !canRummageItem(item)) {

            SoundManager.playBuzzer();
            return;
        }

        if (!rummageAction || !rummageActor) {

            console.error(
                'Rummage: Missing action or actor.'
            );

            resetRummageState();

            _Window_BattleItem_callOkHandler.call(this);
            return;
        }

        // Replace Rummage with the selected item.
        rummageAction.setItem(item.id);

        console.log(
            'Rummage selected:',
            item.name,
            'for:',
            rummageActor.name()
        );

        // Finish item selection.
        rummageActive = false;
        rummageActor = null;
        rummageAction = null;

        this.hide();
        this.deactivate();

        // Return to normal actor command input.
        if (SceneManager._scene &&
            SceneManager._scene._actorCommandWindow) {

            SceneManager._scene._actorCommandWindow.activate();
        }

        return;
    };

    //=========================================================================
    // Cancel Handling
    //=========================================================================

    var _Window_BattleItem_processCancel =
        Window_BattleItem.prototype.processCancel;

    Window_BattleItem.prototype.processCancel = function() {

        if (rummageActive) {

            // Cancel Rummage selection and return to the skill window.
            resetRummageState();

            this.hide();
            this.deactivate();

            var scene = SceneManager._scene;

            if (scene &&
                scene._skillWindow) {

                scene._skillWindow.show();
                scene._skillWindow.activate();
            }

            return;
        }

        _Window_BattleItem_processCancel.call(this);
    };

    //=========================================================================
    // Reset
    //=========================================================================

    function resetRummageState() {

        rummageActive = false;
        rummageActor = null;
        rummageAction = null;
    }

})();