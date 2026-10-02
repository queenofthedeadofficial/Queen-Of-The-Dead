/*:
 * @plugindesc Pitchfork weapons give physical attacks a 20% chance to hit 3 times.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * PITCHFORK WEAPON NOTETAG
 * ============================================================================
 *
 * Add this notetag to a weapon:
 *
 * <Pitchfork>
 *
 * While an actor is wielding that weapon, all physical attacks have:
 *
 *   80% chance: 1 hit
 *   20% chance: 3 hits
 *
 * This applies to:
 * - The normal Attack command
 * - Physical skills
 *
 * It does not affect magical or certain-hit skills.
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //-------------------------------------------------------------------------
    // Game_Action.prototype.numRepeats
    //-------------------------------------------------------------------------
    //
    // Determine how many times the action repeats.
    //

    var _Game_Action_numRepeats = Game_Action.prototype.numRepeats;

    Game_Action.prototype.numRepeats = function() {
        var repeats = _Game_Action_numRepeats.call(this);

        var subject = this.subject();
        var item = this.item();

        // Safety checks
        if (!subject || !item) {
            return repeats;
        }

        // Only physical attacks and skills
        if (item.hitType !== 1) {
            return repeats;
        }

        // Only actors who can wield weapons
        if (!subject.weapons || !subject.weapons().length) {
            return repeats;
        }

        // Check whether the actor is wielding a Pitchfork weapon
        var hasPitchfork = subject.weapons().some(function(weapon) {
            return weapon && weapon.meta && weapon.meta.Pitchfork;
        });

        if (!hasPitchfork) {
            return repeats;
        }

        // 20% chance to make the attack hit exactly 3 times
        if (Math.random() < 0.20) {
            return 3;
        }

        return repeats;
    };

})();