//=============================================================================
// Andrew_KeepStateOnDeath.js
//=============================================================================

/*:
 * @plugindesc v1.02 Preserves states tagged <Do Not Remove On Death> when a battler dies, including compatibility with delayed death plugins.
 * @author Andrew
 *
 * @help
 * Any state with the notetag:
 *
 *   <Do Not Remove On Death>
 *
 * will survive death even if another plugin performs the death cleanup by
 * calling clearStates() directly instead of die().
 *
 * This plugin only restores tagged states when the battler is actually dying,
 * so other uses of clearStates() (initialization, full recovery, etc.) are
 * unaffected.
 *
 * No plugin commands.
 */

(function() {

    var DEBUG = true;

    var _Game_BattlerBase_clearStates = Game_BattlerBase.prototype.clearStates;
    Game_BattlerBase.prototype.clearStates = function() {

        // During initMembers(), _states/_stateTurns do not yet exist.
        if (!this._states || !this._stateTurns) {
            return _Game_BattlerBase_clearStates.call(this);
        }

        // Only preserve states if the battler is actually dying.
        // This prevents interfering with unrelated clearStates() calls.
        var dying = this.hp <= 0;

        if (!dying) {
            return _Game_BattlerBase_clearStates.call(this);
        }

        var keepIds = this._states.filter(function(stateId) {
            var state = $dataStates[stateId];
            return state && state.meta['Do Not Remove On Death'];
        });

        var keepTurns = {};

        keepIds.forEach(function(stateId) {
            keepTurns[stateId] = this._stateTurns[stateId];
        }, this);

        if (DEBUG) {
            var idInfo =
                this.isActor && this.isActor() ? 'actorId=' + this.actorId() :
                this.isEnemy && this.isEnemy() ? 'enemyIndex=' + this.index() :
                'unknown';

            console.log(
                '[KeepStateOnDeath] clearStates() on',
                this.name ? this.name() : this,
                '(' + idInfo + ')',
                '| HP:', this.hp,
                '| states before:', this._states.slice(),
                '| tagged:', keepIds
            );

            console.trace('[KeepStateOnDeath] clearStates() call stack');
        }

        _Game_BattlerBase_clearStates.call(this);

        keepIds.forEach(function(stateId) {
            if (this._states.indexOf(stateId) === -1) {
                this._states.push(stateId);
            }

            this._stateTurns[stateId] = keepTurns[stateId];
        }, this);

        if (DEBUG) {
            console.log(
                '[KeepStateOnDeath] states after restore:',
                this._states.slice()
            );
        }
    };

})();