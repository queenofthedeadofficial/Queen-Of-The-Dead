/*:
 * @plugindesc Dynamic EXP system based on enemy Max HP and actor EXP Rate.
 * @author ChatGPT
 *
 * @help
 * Enemies with:
 *   <Normal> -> grant EXP equal to Max HP
 *   <Boss>   -> grant EXP equal to Max HP * 3
 *
 * Actors only receive EXP if their
 * Sp-Parameter "Experience" is greater than 0%.
 *
 * This completely replaces default battle EXP.
 *
 * No plugin commands.
 */

(function() {
    'use strict';

    // Disable default EXP rewards entirely
    BattleManager.makeRewards = function() {
        this._rewards = {
            gold: $gameTroop.goldTotal(),
            exp: 0,
            items: $gameTroop.makeDropItems()
        };
    };

    // Custom EXP distribution
    BattleManager.gainExp = function() {
        var totalExp = 0;

        $gameTroop.deadMembers().forEach(function(enemy) {
            var note = enemy.enemy().note;

            // Param 0 = Max HP
            var mhp = enemy.param(0);

            if (note.includes("<Boss>")) {
                totalExp += mhp * 3;
            } else if (note.includes("<Normal>")) {
                totalExp += mhp;
            }
        });

        // Give EXP only to actors with EXP Rate > 0%
        $gameParty.allMembers().forEach(function(actor) {

            // sparam(9) = Experience Rate
            // 1.0 = 100%
            // 0.0 = 0%
            if (actor.sparam(9) > 0) {
                actor.gainExp(totalExp);
            }

        });
    };

})();