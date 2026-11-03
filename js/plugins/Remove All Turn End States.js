/*:
 * @plugindesc Force removes end-of-turn states from all existing actors, regardless of party status.
 * @author Andrew
 *
 * @help
 * Removes all states from all Game_Actor objects that are configured
 * with Auto Removal Timing: End of Turn.
 *
 * Works on actors not currently in the party.
 */

(function() {

    var _BattleManager_endTurn = BattleManager.endTurn;

    BattleManager.endTurn = function() {

        _BattleManager_endTurn.call(this);

        forceRemoveGlobalTurnStates();

    };


    function forceRemoveGlobalTurnStates() {

        for (var i = 1; i < $gameActors._data.length; i++) {

            var actor = $gameActors._data[i];

            if (!actor) continue;

            var states = actor.states().slice();

            states.forEach(function(state) {

                if (!state) return;

                // Auto removal timing:
                // 0 = None
                // 1 = Battle End
                // 2 = Turn End
                if (state.autoRemovalTiming === 2) {

                    actor.removeState(state.id);

                }

            });

        }

    }

})();