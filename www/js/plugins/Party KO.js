/*:
 * @plugindesc Game Over if actors 1, 2, and 3 are all KO’d, even if others are alive.
 * @help This plugin automatically checks at the end of each turn. 
 * If actors 1, 2, and 3 all have 0 HP, the game ends immediately.
 */

(function() {

    // List of core actor IDs
    var coreActors = [1, 2, 3];

    // Check at end of each battle turn
    var _BattleManager_endTurn = BattleManager.endTurn;
    BattleManager.endTurn = function() {
        _BattleManager_endTurn.call(this);
        checkCoreKO();
    };

    function checkCoreKO() {
        // Only run in battle
        if (!$gameParty.inBattle()) return;

        var allKO = coreActors.every(function(id) {
            var actor = $gameActors.actor(id);
            return actor && actor.isDead();
        });

        if (allKO) SceneManager.goto(Scene_Gameover);
    }

})();
