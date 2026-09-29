/*:
 * @plugindesc Prevents State 1 (Death) from being automatically applied during the regeneration phase only. v1.0
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * This plugin prevents RPG Maker MV from automatically adding State 1 (Death)
 * while HP regeneration is being processed.
 *
 * Outside of the regeneration phase, State 1 behaves completely normally.
 *
 * No plugin commands.
 * ============================================================================
 */

(function() {

    var _regenAll = Game_Battler.prototype.regenerateAll;
    Game_Battler.prototype.regenerateAll = function() {
        this._suppressRegenDeathState = true;
        _regenAll.call(this);
        this._suppressRegenDeathState = false;
    };

    var _refresh = Game_BattlerBase.prototype.refresh;
    Game_BattlerBase.prototype.refresh = function() {
        if (this._suppressRegenDeathState) {
            var hp = this._hp;
            var mp = this._mp;
            var tp = this._tp;

            var deathStateId = this.deathStateId();

            this._states = this._states.filter(function(id) {
                return id !== deathStateId;
            });

            this._hp = hp.clamp(0, this.mhp);
            this._mp = mp.clamp(0, this.mmp);
            this._tp = tp.clamp(0, this.maxTp());

            return;
        }

        _refresh.call(this);
    };

})();