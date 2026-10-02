/*:
 * @plugindesc Blocks all EXP gain/loss for actors 1, 2, and 3.
 * @author ChatGPT
 *
 * @help
 * Actors 1, 2, and 3:
 * - cannot gain EXP
 * - cannot lose EXP
 * - ignore Change EXP commands
 * - ignore gainExp() calls
 *
 * No plugin commands.
 */

(function() {
    'use strict';

    var blockedActors = [1, 2, 3];

    function isBlocked(actor) {
        return blockedActors.indexOf(actor.actorId()) >= 0;
    }

    // Block direct EXP changes
    var _Game_Actor_changeExp = Game_Actor.prototype.changeExp;
    Game_Actor.prototype.changeExp = function(exp, show) {
        if (isBlocked(this)) {
            return;
        }

        _Game_Actor_changeExp.call(this, exp, show);
    };

    // Block gainExp calls too
    var _Game_Actor_gainExp = Game_Actor.prototype.gainExp;
    Game_Actor.prototype.gainExp = function(exp) {
        if (isBlocked(this)) {
            return;
        }

        _Game_Actor_gainExp.call(this, exp);
    };

})();