/*:
 * @plugindesc Continue map BGM during battle, except for troops containing enemies with <Boss>.
 * @author ChatGPT
 */

(function() {

"use strict";

BattleManager.playBattleBgm = function() {

    // Does the troop contain at least one enemy with <Boss>?
    var hasBoss = $gameTroop.members().some(function(enemy) {
        return enemy.enemy().meta.Boss;
    });

    // Boss battle: play normal battle BGM
    if (hasBoss) {
        AudioManager.playBgm($gameSystem.battleBgm());
        AudioManager.stopBgs();
    }

    // Otherwise do nothing and let the map BGM continue
};

BattleManager.replayBgmAndBgs = function() {

    // Was this a boss battle?
    var hasBoss = $gameTroop.members().some(function(enemy) {
        return enemy.enemy().meta.Boss;
    });

    // For boss battles, restore the map BGM normally
    if (hasBoss) {
        if (this._mapBgm) {
            AudioManager.replayBgm(this._mapBgm);
        } else {
            $gameSystem.replayWalkingBgm();
        }
    }

    // For non-boss battles, do nothing since the map music never stopped
};

})();