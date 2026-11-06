/*:
 * @plugindesc Snatch and Run - Instant battle item consumption.
 *             Fires normally, opens the battle item window, and immediately
 *             consumes the selected battle-usable consumable item.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Snatch and Run
 * ============================================================================
 *
 * Add this notetag to the skill:
 *
 *   <Snatch and Run>
 *
 * The intended flow is:
 *
 *   1. Actor selects Snatch and Run.
 *   2. The skill fires normally.
 *   3. The skill is treated as an Instant Cast skill by YEP_InstantCast.
 *   4. The battle item window opens.
 *   5. The player selects a consumable item usable in battle.
 *   6. The selected item is immediately applied.
 *   7. The item is consumed.
 *
 * Only items satisfying all of the following are displayed:
 *
 *   - The party owns at least one.
 *   - The item is consumable.
 *   - The item is usable in battle.
 *
 * The item is applied to all living party members, matching the existing
 * Skill 58 item-selection behavior supplied by the user.
 *
 * This plugin is intended to be placed below:
 *
 *   YEP_BattleEngineCore.js
 *   YEP_InstantCast.js
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //=========================================================================
    // State
    //=========================================================================

    var snatchPending = false;
    var snatchItemActive = false;
    var snatchActor = null;
    var snatchSelectedItem = null;

    //=========================================================================
    // Notetag
    //=========================================================================

    function isSnatchAndRun(item) {
        return item &&
               item.note &&
               /<Snatch[ ]and[ ]Run>/i.test(item.note);
    }

    //=========================================================================
    // Get Action Subject
    //=========================================================================

    function getActionSubject(action) {
        if (action && action.subject) {
            return action.subject();
        }

        if (BattleManager.actor) {
            return BattleManager.actor();
        }

        return BattleManager._subject || null;
    }

    //=========================================================================
    // Valid Scavenge Items
    //=========================================================================

    function canSnatchItem(item) {
        if (!item) return false;

        // Must be consumable.
        if (!item.consumable) return false;

        // Must be owned.
        if ($gameParty.numItems(item) <= 0) return false;

        // Must be usable in battle.
        //
        // This uses the normal party usability check, which respects the
        // item's occasion and normal RPG Maker MV item usability rules.
        if (!$gameParty.canUse(item)) return false;

        return true;
    }

    //=========================================================================
    // Detect Snatch and Run when the skill actually applies
    //=========================================================================

    var _Game_Action_apply =
        Game_Action.prototype.apply;

    Game_Action.prototype.apply = function(target) {

        _Game_Action_apply.call(this, target);

        try {

            var item = this.item();

            if (!item) return;

            if (!isSnatchAndRun(item)) return;

            snatchActor = getActionSubject(this);

            if (!snatchActor) {
                console.warn(
                    'Snatch and Run: Could not determine action subject.'
                );
                return;
            }

            snatchPending = true;

            console.log(
                'Snatch and Run detected for:',
                snatchActor.name()
            );

        } catch (e) {

            console.error(
                'Snatch and Run Game_Action.apply error:',
                e
            );

        }

    };

    //=========================================================================
    // After Snatch and Run finishes, open the normal Battle Item window
    //=========================================================================

    var _BattleManager_endAction =
        BattleManager.endAction;

    BattleManager.endAction = function() {

        if (snatchPending) {

            snatchPending = false;
            snatchItemActive = true;

            var scene = SceneManager._scene;

            if (scene &&
                typeof scene.commandItem === 'function') {

                console.log(
                    'Snatch and Run: Opening battle item window.'
                );

                scene.commandItem();

                return;
            }

            console.warn(
                'Snatch and Run: Could not open battle item window.'
            );

            snatchItemActive = false;
            snatchActor = null;
        }

        _BattleManager_endAction.call(this);
    };

    //=========================================================================
    // Filter the normal Battle Item window
    //=========================================================================

    var _Window_BattleItem_includes =
        Window_BattleItem.prototype.includes;

    Window_BattleItem.prototype.includes = function(item) {

        if (snatchItemActive) {
            return canSnatchItem(item);
        }

        return _Window_BattleItem_includes.call(this, item);
    };

    //=========================================================================
    // Intercept item confirmation
    //=========================================================================

    var _Window_BattleItem_callOkHandler =
        Window_BattleItem.prototype.callOkHandler;

    Window_BattleItem.prototype.callOkHandler = function() {

        if (!snatchItemActive) {
            _Window_BattleItem_callOkHandler.call(this);
            return;
        }

        var item = this.item();

        if (!item || !canSnatchItem(item)) {

            SoundManager.playBuzzer();
            return;
        }

        snatchSelectedItem = item;

        console.log(
            'Snatch and Run selected:',
            snatchSelectedItem.name
        );

        applySnatchedItem();

        this.hide();
        this.deactivate();

        snatchItemActive = false;

        return;
    };

    //=========================================================================
    // Prevent cancellation while selecting the Snatch and Run item
    //=========================================================================

    var _Window_BattleItem_processCancel =
        Window_BattleItem.prototype.processCancel;

    Window_BattleItem.prototype.processCancel = function() {

        if (snatchItemActive) {

            SoundManager.playBuzzer();
            return;
        }

        _Window_BattleItem_processCancel.call(this);
    };

    var _Window_BattleItem_callCancelHandler =
        Window_BattleItem.prototype.callCancelHandler;

    Window_BattleItem.prototype.callCancelHandler = function() {

        if (snatchItemActive) {

            SoundManager.playBuzzer();
            return;
        }

        _Window_BattleItem_callCancelHandler.call(this);
    };

    var _Window_BattleItem_cancel =
        Window_BattleItem.prototype.cancel;

    Window_BattleItem.prototype.cancel = function() {

        if (snatchItemActive) {

            SoundManager.playBuzzer();
            return;
        }

        _Window_BattleItem_cancel.call(this);
    };

    //=========================================================================
    // Apply the selected item immediately
    //=========================================================================

    function applySnatchedItem() {

    try {

        if (!snatchSelectedItem) {
            console.error(
                'Snatch and Run: No item selected.'
            );
            return;
        }

        if (!snatchActor) {
            console.error(
                'Snatch and Run: No acting actor.'
            );
            return;
        }

        if ($gameParty.numItems(snatchSelectedItem) <= 0) {
            console.error(
                'Snatch and Run: Item is no longer available.'
            );
            return;
        }

        var action = new Game_Action(snatchActor);

        action.setItem(
            snatchSelectedItem.id
        );

        // Prevent custom Auto-Battle systems from recording this internal
        // item action as the actor's last selected action.
        action._skipAutoBattleRecord = true;

        // Apply the item ONLY to the rat/user of Snatch and Run.
        action.apply(snatchActor);

        // Consume exactly one item.
        $gameParty.consumeItem(
            snatchSelectedItem
        );

        console.log(
            'Snatch and Run consumed:',
            snatchSelectedItem.name,
            'on:',
            snatchActor.name()
        );

    } catch (e) {

        console.error(
            'Snatch and Run applySnatchedItem error:',
            e
        );

    } finally {

        snatchSelectedItem = null;
        snatchActor = null;
        snatchPending = false;
        snatchItemActive = false;

    }

}

})();