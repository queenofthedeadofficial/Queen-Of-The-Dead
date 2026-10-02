/*:
 * @plugindesc Makes Recover All affect every actor in the database, not just party members.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Purpose
 * ============================================================================
 * Extends the "Recover All" event command so it restores:
 * - Active party members
 * - Reserve members
 * - ALL actors in the database
 *
 * This includes actors not currently in the party.
 *
 * ============================================================================
 * Installation
 * ============================================================================
 * Place anywhere below the default engine.
 * Compatible with YEP plugins.
 * ============================================================================
 */

(function() {
    'use strict';

    const _Game_Interpreter_command314 =
        Game_Interpreter.prototype.command314;

    Game_Interpreter.prototype.command314 = function() {

        // Run normal Recover All behavior first
        const result = _Game_Interpreter_command314.call(this);

        // Recover every actor in database
        for (let i = 1; i < $dataActors.length; i++) {
            const actor = $gameActors.actor(i);
            if (actor) {
                actor.recoverAll();
            }
        }

        return result;
    };

})();