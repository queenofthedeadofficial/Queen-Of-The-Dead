/*:
 * @plugindesc Reliable turn-based state replacement for swapped actors.
 * @author ChatGPT
 *
 * @help
 * Replaces fragile state-based cooldowns with global turn counters.
 *
 * Use:
 *   actor.setSkillCooldown(skillId, turns)
 *   actor.isSkillSealed(skillId)
 *
 * This works even if actors are removed from party.
 */

(function() {
    'use strict';

    // Ensure storage exists
    Game_Actor.prototype._skillCooldowns = Game_Actor.prototype._skillCooldowns || {};

    Game_Actor.prototype.setSkillCooldown = function(skillId, turns) {
        this._skillCooldowns[skillId] = turns;
    };

    Game_Actor.prototype.isSkillSealed = function(skillId) {
        return (this._skillCooldowns[skillId] || 0) > 0;
    };

    Game_Actor.prototype.updateCooldowns = function() {
        for (var id in this._skillCooldowns) {
            this._skillCooldowns[id]--;
            if (this._skillCooldowns[id] <= 0) {
                delete this._skillCooldowns[id];
            }
        }
    };

    function allActors() {
        var out = [];
        for (var i = 1; i < $dataActors.length; i++) {
            var a = $gameActors.actor(i);
            if (a) out.push(a);
        }
        return out;
    }

    var _endTurn = BattleManager.endTurn;
    BattleManager.endTurn = function() {
        _endTurn.call(this);

        allActors().forEach(function(actor) {
            actor.updateCooldowns();
        });
    };

})();