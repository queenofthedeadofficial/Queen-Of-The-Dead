/*:
 * @plugindesc v1.0 Caps AGI of enemies with <Boss> notetag to 5 when switch 4991 is ON.
 * @author ChatGPT
 *
 * @help
 * Add <Boss> to the enemy's note box.
 *
 * When game switch 4991 is ON:
 *   - Boss enemies cannot have AGI higher than 5.
 *
 * When switch 4991 is OFF:
 *   - No changes are made.
 */

(function() {

    var _Game_BattlerBase_param = Game_BattlerBase.prototype.param;
    Game_BattlerBase.prototype.param = function(paramId) {
        var value = _Game_BattlerBase_param.call(this, paramId);

        // AGI parameter ID
        if (paramId !== 6) return value;

        // Switch must be ON
        if (!$gameSwitches || !$gameSwitches.value(4991)) {
            return value;
        }

        // Enemy only
        if (!(this instanceof Game_Enemy)) {
            return value;
        }

        // <Boss> notetag
        var note = this.enemy().note || "";
        if (/<Boss>/i.test(note)) {
            value = Math.min(value, 5);
        }

        return value;
    };

})();