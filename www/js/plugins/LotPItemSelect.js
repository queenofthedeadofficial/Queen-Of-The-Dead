/*:
 * @plugindesc Allows Skill 58 to trigger RPG Maker MV's battle item menu
 *          before finishing the user's action—using custom handling to bypass YEP conflicts.
 *          After the item is consumed, state 28 is removed from the acting actor.
 *          The item menu cannot be closed with the cancel button during this mode.
 * @author Copilot
 */

(function() {
    // Global custom state
    let selectedItem = null;
    let pendingItemUse = false;
    let actingActor = null;
    let skillItemActive = false; // Flag indicating we're processing a skill's custom item selection

    // When a skill is applied, check if it’s Skill 58.
    const _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        _Game_Action_apply.call(this, target);
        if (this.item().id === 58) { // Skill 58 triggers our custom item selection
            pendingItemUse = true;
            actingActor = BattleManager._subject; // Store the actor using the skill
            skillItemActive = true;             // Set our custom processing flag
            console.log("Skill 58 activated by:", actingActor ? actingActor.name() : "NULL");
        }
    };

    // Pause ending the action; instead, open the battle item menu.
    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        if (pendingItemUse) {
            pendingItemUse = false;
            console.log("Opening item menu after Skill 58.");
            SceneManager._scene.commandItem(); // Use the native battle item menu
            return; // Prevent completing the action until the item selection is handled
        }
        _BattleManager_endAction.call(this);
    };

    // Intercept the OK handling for battle item selection.
    // (We’re overriding the Window_BattleItem behavior instead of Scene_Battle.onItemOk.)
    const _Window_BattleItem_callOkHandler = Window_BattleItem.prototype.callOkHandler;
    Window_BattleItem.prototype.callOkHandler = function() {
        if (skillItemActive) { // If we're in custom mode for Skill 58...
            selectedItem = this.item(); // Retrieve the selected item
            console.log("Custom Skill Item selected:", selectedItem ? selectedItem.name : "NULL");
            if (!selectedItem) {
                console.warn("Error: No item selected.");
                return;
            }
            applySelectedItemEffects();
            skillItemActive = false; // Reset flag so normal processing resumes next time
            this.hide(); // Close the item window
            return;
        } else {
            _Window_BattleItem_callOkHandler.call(this);
        }
    };

    // Override processCancel to disable canceling when in custom mode.
    const _Window_BattleItem_processCancel = Window_BattleItem.prototype.processCancel;
    Window_BattleItem.prototype.processCancel = function() {
        if (skillItemActive) {
            SoundManager.playBuzzer();
            return;
        }
        _Window_BattleItem_processCancel.call(this);
    };

    // Override callCancelHandler to disable canceling when in custom mode.
    const _Window_BattleItem_callCancelHandler = Window_BattleItem.prototype.callCancelHandler;
    Window_BattleItem.prototype.callCancelHandler = function() {
        if (skillItemActive) {
            SoundManager.playBuzzer();
            return;
        }
        _Window_BattleItem_callCancelHandler.call(this);
    };

    // Also override cancel directly (as an extra safeguard)
    const _Window_BattleItem_cancel = Window_BattleItem.prototype.cancel;
    Window_BattleItem.prototype.cancel = function() {
        if (skillItemActive) {
            SoundManager.playBuzzer();
            return;
        }
        _Window_BattleItem_cancel.call(this);
    };

    // Process the selected item: apply its effects, consume it,
    // and remove state 28 from the acting actor.
    function applySelectedItemEffects() {
        console.log("Applying item effects. Acting Actor:",
            actingActor ? actingActor.name() : "NULL");
        if (selectedItem && selectedItem.consumable && actingActor) {
            const action = new Game_Action(actingActor);
            action.setItem(selectedItem.id);
            
            $gameParty.members().forEach(member => {
                if (member.isAlive()) {
                    action.apply(member);
                }
            });
            
            $gameParty.consumeItem(selectedItem);
            console.log("Item consumed:", selectedItem.name);

            // Remove state 28 from the actor if it exists.
            if (actingActor.isStateAffected(28)) {
                actingActor.removeState(28);
                console.log("State 28 removed from", actingActor.name());
            }
        } else {
            console.error("Error: Unable to apply item effects. Missing valid actor or item.");
        }
        // Clear state so that subsequent item usage is processed normally.
        selectedItem = null;
        actingActor = null;
    }
})();
