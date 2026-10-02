//=============================================================================
// Andrew_ZeroDefMdfStates.js
//=============================================================================

/*:
 * @plugindesc v1.00 State notetags <Zero DEF> and <Zero MDF> force a
 * battler's DEF/MDF param to 0, mechanically and visually, while held.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_ZeroDefMdfStates.js
 * ============================================================================
 *
 * Add either or both of the following notetags to a State's note box:
 *
 *   <Zero DEF>
 *   While the battler holds this state, their DEF (param 3) is forced to 0.
 *
 *   <Zero MDF>
 *   While the battler holds this state, their MDF (param 5) is forced to 0.
 *
 * Because this works by overriding Game_BattlerBase.prototype.param, it is
 * both "mechanical" (damage formulas, resist calcs, everything that reads
 * .def / .mdf / param(3) / param(5)) and "visual" (status windows, enemy
 * scan windows, any window that displays the parameter) at the same time --
 * there's only one source of truth for the value, so there's nothing to
 * keep in sync.
 *
 * If a battler holds multiple states, only one of them needs the relevant
 * tag for the 0 to apply. Removing all zero-tagged states restores the
 * normal calculated DEF/MDF automatically (no other bookkeeping needed).
 *
 * Works for both actors and enemies (the hook lives on Game_BattlerBase,
 * the shared parent class), even though the ask was enemy-focused.
 *
 * Load order: this forces an absolute 0 rather than applying a further
 * multiplier/offset, so it wins regardless of where it sits relative to
 * buff/debuff plugins. No strict load order requirement, but placing it
 * below YEP_BuffsStatesCore (if present) is fine and recommended.
 *
 * ============================================================================
 */

(function() {

    var PARAM_ID_DEF = 3;
    var PARAM_ID_MDF = 5;

    //-------------------------------------------------------------------
    // Notetag parsing (states)
    //-------------------------------------------------------------------

    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!_DataManager_isDatabaseLoaded.call(this)) return false;
        if (!this._andrewZeroDefMdfProcessed) {
            this.andrewProcessZeroDefMdfNotetags($dataStates);
            this._andrewZeroDefMdfProcessed = true;
        }
        return true;
    };

    DataManager.andrewProcessZeroDefMdfNotetags = function(group) {
        for (var i = 1; i < group.length; i++) {
            var obj = group[i];
            if (!obj) continue;
            obj._andrewZeroDef = false;
            obj._andrewZeroMdf = false;
            var notedata = obj.note.split(/[\r\n]+/);
            for (var j = 0; j < notedata.length; j++) {
                var line = notedata[j];
                if (line.match(/<Zero[ ]DEF>/i)) {
                    obj._andrewZeroDef = true;
                } else if (line.match(/<Zero[ ]MDF>/i)) {
                    obj._andrewZeroMdf = true;
                }
            }
        }
    };

    //-------------------------------------------------------------------
    // Helpers
    //-------------------------------------------------------------------

    Game_BattlerBase.prototype.andrewHasZeroDefState = function() {
        if (!this._states) return false;
        var states = this.states();
        for (var i = 0; i < states.length; i++) {
            if (states[i] && states[i]._andrewZeroDef) return true;
        }
        return false;
    };

    Game_BattlerBase.prototype.andrewHasZeroMdfState = function() {
        if (!this._states) return false;
        var states = this.states();
        for (var i = 0; i < states.length; i++) {
            if (states[i] && states[i]._andrewZeroMdf) return true;
        }
        return false;
    };

    //-------------------------------------------------------------------
    // Core override
    //-------------------------------------------------------------------

    var _Game_BattlerBase_param = Game_BattlerBase.prototype.param;
    Game_BattlerBase.prototype.param = function(paramId) {
        if (paramId === PARAM_ID_DEF && this.andrewHasZeroDefState()) {
            return 0;
        }
        if (paramId === PARAM_ID_MDF && this.andrewHasZeroMdfState()) {
            return 0;
        }
        return _Game_BattlerBase_param.call(this, paramId);
    };

})();