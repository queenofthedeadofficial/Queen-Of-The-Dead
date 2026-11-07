/*:
 * @plugindesc DEBUG BUILD - Delays death cleanup until after regeneration.
 * @author Andrew
 *
 * @help
 * Temporary diagnostic build. Adds console logging around every decision
 * point so we can see, for a real battle death, what actually fires and
 * in what order. Remove once the bug is isolated.
 */

(function() {

    var _Game_BattlerBase_die = Game_BattlerBase.prototype.die;

    Game_BattlerBase.prototype.die = function() {
        console.log('[DDC] die() called on', this.name ? this.name() : this,
            '| _inRegenerateAll =', this._inRegenerateAll,
            '| hp before =', this._hp);
        console.trace('[DDC] die() call stack');

        this._hp = 0;

        if (this._inRegenerateAll) {
            console.log('[DDC] -> deferring finalization (regen-step death)');
            _Game_BattlerBase_die.call(this);
            return;
        }

        console.log('[DDC] -> finalizing immediately (non-regen death)');
        this.clearStates();
        this.clearBuffs();
        _Game_BattlerBase_die.call(this);

        console.log('[DDC] -> after finalize, isStateAffected(deathStateId) =',
            this.isStateAffected(this.deathStateId()));
    };


    var _Game_Battler_regenerateAll = Game_Battler.prototype.regenerateAll;

    Game_Battler.prototype.regenerateAll = function() {
        console.log('[DDC] regenerateAll() start on', this.name ? this.name() : this,
            '| hp =', this._hp);

        this._inRegenerateAll = true;
        _Game_Battler_regenerateAll.call(this);
        this._inRegenerateAll = false;

        console.log('[DDC] regenerateAll() after regen tick, hp =', this._hp);

        if (this.hp > 0) {
            console.log('[DDC] -> survived regen, returning');
            return;
        }

        console.log('[DDC] -> hp still 0 after regen, finalizing death now');
        this._hp = 0;
        this.clearStates();
        this.clearBuffs();
        this.addState(this.deathStateId());

        console.log('[DDC] -> after regen finalize, isStateAffected(deathStateId) =',
            this.isStateAffected(this.deathStateId()));
    };

})();