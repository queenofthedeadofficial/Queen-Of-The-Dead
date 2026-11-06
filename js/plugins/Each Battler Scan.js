/*:
 * @plugindesc Adds an Enemy Scan command to actor command windows.
 * Requires ADRI_InBattleEnemyStatus
 * @author You
 */

(function() {
    'use strict';

    if (!Imported.ADRI_InBattleEnemyStatus) {
        console.error(
            'Actor Enemy Scan requires ADRI_InBattleEnemyStatus'
        );
        return;
    }

    //--------------------------------------------------------------------------
    // Add Scan command to actor command list
    //--------------------------------------------------------------------------

    const _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;

    Window_ActorCommand.prototype.makeCommandList = function() {
        _Window_ActorCommand_makeCommandList.call(this);

        if (this._actor) {
            this.addCommand(
                ADRI.Params.EnemyStatusText,
                'actorEnemyStatus',
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
            'actorEnemyStatus',
            this.commandActorEnemyStatus.bind(this)
        );
    };

    //--------------------------------------------------------------------------
    // Open enemy scan UI
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.commandActorEnemyStatus = function() {

        this._helpWindow.show();

        this._enemyStatusWindow.refresh();
        this._enemyStatusWindow.show();

        this._inBattleEnemyStatusWindow.show();

        this._inBattleEnemyStateList.show();
        this._inBattleEnemyStateList.activate();

        // Default to first alive enemy
        const enemy = $gameTroop.aliveMembers()[0];

        if (enemy) {
            this._inBattleEnemyStateList.setBattler(enemy);
        }

        // Preserve actor command window visually
        this._actorCommandWindow.deactivate();

        // Safety
        this._partyCommandWindow.deactivate();

        if (Imported.YEP_X_PartyLimitGauge) {
            this._showPartyLimitGauge =
                $gameSystem.isShowPartyLimitGauge();

            this._showTroopLimitGauge =
                $gameSystem.isShowTroopLimitGauge();

            $gameSystem.setShowPartyLimitGauge(false);
            $gameSystem.setShowTroopLimitGauge(false);
        }
    };

    //--------------------------------------------------------------------------
    // Return to actor command window
    //--------------------------------------------------------------------------

    const _Scene_Battle_onInBattleEnemyStatusCancel =
        Scene_Battle.prototype.onInBattleEnemyStatusCancel;

    Scene_Battle.prototype.onInBattleEnemyStatusCancel = function() {

        this._enemyStatusWindow.hide();

        this._helpWindow.hide();

        this._inBattleEnemyStatusWindow.hide();

        this._inBattleEnemyStateList.hide();

        this._enemyStatusWindow.deselect();

        this._inBattleEnemyStateList.deactivate();

        // Return to actor command if actor input active
        if (BattleManager.actor()) {

            this._actorCommandWindow.activate();

        } else {

            _Scene_Battle_onInBattleEnemyStatusCancel.call(this);

        }

        if (Imported.YEP_X_PartyLimitGauge) {

            $gameSystem.setShowPartyLimitGauge(
                this._showPartyLimitGauge
            );

            $gameSystem.setShowTroopLimitGauge(
                this._showTroopLimitGauge
            );
        }
    };

})();