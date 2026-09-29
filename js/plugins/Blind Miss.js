/*:
 * @plugindesc Forces battlers with state 31 to always miss. Safe for YEP Core. Minimal version.
 * @author ChatGPT
 * @help
 * Battlers with state 31 will automatically miss all actions.
 * Damage popups will show "Miss!".
 */

(function() {
    "use strict";

    // Save original method
    const _Game_Action_isHit = Game_Action.prototype.isHit;

    Game_Action.prototype.isHit = function(target) {
        // Force miss if user has state 31
        if (this.subject().isStateAffected(31)) {
            return false;
        }
        // Otherwise, use original formula
        return _Game_Action_isHit.call(this, target);
    };

})();