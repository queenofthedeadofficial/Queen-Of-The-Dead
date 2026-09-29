/*:
 * @plugindesc Extends end-of-battle state removal to all game actors.
 * @author ChatGPT
 */

(function() {

    const _BattleManager_endBattle = BattleManager.endBattle;

    BattleManager.endBattle = function(result) {

        _BattleManager_endBattle.call(this, result);

        for (let i = 1; i < $dataActors.length; i++) {

            const actor = $gameActors.actor(i);

            if (!actor) continue;

            // Skip active battle members since MV already handled them
            if ($gameParty.battleMembers().includes(actor)) continue;

            actor.removeBattleStates();
        }
    };

})();