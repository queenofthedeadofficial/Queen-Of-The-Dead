/*:
 * @plugindesc Minimal patch for HIME_LevelUpEvents to support Change EXP event command and non-party actors.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * Place this plugin BELOW:
 *
 *   HIME_LevelUpEvents.js
 *
 * This patch makes level up common events trigger correctly when:
 *
 * - EXP is granted using the "Change EXP" event command
 * - Actors level up while NOT in the party
 *
 * It works by hooking directly into changeExp() instead of relying solely
 * on Game_Actor.levelUp().
 *
 * ============================================================================
 * No plugin commands.
 * ============================================================================
 */

(function() {

    // Prevent duplicate level-up event calls from the original plugin
    Game_Actor.prototype.onLevelUp = function() {
        // handled by patched changeExp below
    };

    var _Game_Actor_changeExp = Game_Actor.prototype.changeExp;
    Game_Actor.prototype.changeExp = function(exp, show) {

        var oldLevel = this._level;

        _Game_Actor_changeExp.call(this, exp, show);

        if (!this.canRunLevelUpEvent()) {
            return;
        }

        // Actor gained one or more levels
        if (this._level > oldLevel) {

            var actorEventId = this.actorLevelUpEventId();
            var classEventId = this.classLevelUpEventId();

            // Run once per level gained
            for (var i = 0; i < this._level - oldLevel; i++) {

                if (actorEventId > 0) {
                    $gameTemp.reserveCommonEvent(actorEventId);
                }

                if (classEventId > 0) {
                    $gameTemp.reserveCommonEvent(classEventId);
                }
            }
        }
    };

})();