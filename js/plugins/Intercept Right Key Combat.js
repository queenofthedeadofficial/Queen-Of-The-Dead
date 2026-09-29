//=============================================================================
// LastActorRightBlock.js
//=============================================================================
/*:
 * @plugindesc Prevents the Right Arrow from ending input when used on the
 * final battle actor. Designed for YEP_BattleStatusWindow.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Description
 * ============================================================================
 *
 * Normally, YEP_BattleStatusWindow allows the Right Arrow to move between
 * actors. When used on the final actor, it immediately begins the battle turn.
 *
 * This plugin blocks that behavior.
 *
 * On the final actor:
 *
 *   Right Arrow -> does nothing
 *
 * The actor command window remains active and the player must press OK to
 * confirm their command normally.
 *
 * Place BELOW:
 *   - YEP_BattleStatusWindow
 *   - YEP_BattleEngineCore (if used)
 *
 * No plugin commands.
 */
//=============================================================================

(function() {
    "use strict";

    Scene_Battle.prototype.selectRightCommand = function() {

        if (!this.isAllowRightCommand()) {
            this._actorCommandWindow.activate();
            return;
        }

        var actor = BattleManager.actor();

        if (!actor) {
            this._actorCommandWindow.activate();
            return;
        }

        // Find the final inputtable battle member.
        var members = $gameParty.battleMembers();
        var lastIndex = -1;

        for (var i = members.length - 1; i >= 0; i--) {
            if (members[i] && members[i].canInput()) {
                lastIndex = i;
                break;
            }
        }

        // If we're already on the last actor, ignore Right.
        if (actor.index() === lastIndex) {
            SoundManager.playBuzzer();
            this._actorCommandWindow.activate();
            return;
        }

        // Otherwise proceed normally.
        if (Imported.YEP_BattleEngineCore && BattleManager.isTickBased()) {
            actor.onTurnStart();
        }

        this.selectNextCommand();
    };

})();