/*:
 * @plugindesc Makes both physical and magical attacks use EVA only.
 * @author ChatGPT
 *
 * @help
 * Physical Hit Formula:
 *   HIT - EVA
 *
 * Magical Hit Formula:
 *   HIT - EVA
 *
 * MEV is completely ignored.
 *
 * No plugin commands.
 */

(function() {
    'use strict';

    Game_Action.prototype.itemHit = function(target) {
        var subject = this.subject();

        // User HIT stat
        var hit = subject.hit;

        // Both physical and magical use EVA
        if (this.isPhysical() || this.isMagical()) {
            return Math.max(hit - target.eva, 0);
        }

        // Certain hit skills always hit
        return 1;
    };

})();