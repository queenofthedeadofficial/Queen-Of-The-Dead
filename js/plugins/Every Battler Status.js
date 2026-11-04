/*:
 * @plugindesc Adds a Status command to each actor command window.
 * Requires YEP_X_InBattleStatus
 * @author You
 */

(function() {
    'use strict';

    if (!Imported.YEP_X_InBattleStatus) {
        console.error('Actor Command Status requires YEP_X_InBattleStatus');
        return;
    }

    //--------------------------------------------------------------------------
    // Add Status command to actor commands
    //--------------------------------------------------------------------------

    const _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;

    Window_ActorCommand.prototype.makeCommandList = function() {
        _Window_ActorCommand_makeCommandList.call(this);

        if (this._actor) {
            this.addCommand(
                Yanfly.Param.IBSCmdName,
                'actorStatus',
                true
            );
        }
    };

    //--------------------------------------------------------------------------
    // Add handler
    //--------------------------------------------------------------------------

    const _Scene_Battle_createActorCommandWindow =
        Scene_Battle.prototype.createActorCommandWindow;

    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);

        this._actorCommandWindow.setHandler(
            'actorStatus',
            this.commandActorStatus.bind(this)
        );
    };

    //--------------------------------------------------------------------------
    // Open status UI from actor command
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.commandActorStatus = function() {

        this._helpWindow.show();

        this._inBattleStatusWindow.show();

        this._inBattleStateList.show();
        this._inBattleStateList.activate();

        // Use current actor instead of slot 0
        const actor = BattleManager.actor();

        if (actor) {
            this._inBattleStateList.setBattler(actor);
        }

        // Keep command window visible for visual consistency
        this._actorCommandWindow.deactivate();

        // Safety: ensure party command isn't active underneath
        this._partyCommandWindow.deactivate();
    };

    //--------------------------------------------------------------------------
    // Return to actor command instead of party command
    //--------------------------------------------------------------------------

    const _Scene_Battle_onInBattleStatusCancel =
        Scene_Battle.prototype.onInBattleStatusCancel;

    Scene_Battle.prototype.onInBattleStatusCancel = function() {

        this._helpWindow.hide();

        this._inBattleStatusWindow.hide();

        this._inBattleStateList.hide();
        this._inBattleStateList.deactivate();

        // If actor input is active, return there
        if (BattleManager.actor()) {

            // Keep existing command window visually intact
            this._actorCommandWindow.activate();

        } else {

            // fallback to original behavior
            _Scene_Battle_onInBattleStatusCancel.call(this);

        }

        this._statusWindow.deselect();
    };

})();