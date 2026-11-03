/*:
 * @plugindesc Fixes flat +/- sequencing by clamping after all modifiers (YEP-safe)
 * @author You
 */

(function() {

  Game_BattlerBase.prototype.param = function(paramId) {
    // This already includes base + all flat modifiers
    let value = this.paramBasePlus(paramId);

    // Apply rates and buffs normally
    value *= this.paramRate(paramId);
    value *= this.paramBuffRate(paramId);

    // Clamp ONCE at the end
    return Math.max(1, Math.floor(value));
  };

})();
