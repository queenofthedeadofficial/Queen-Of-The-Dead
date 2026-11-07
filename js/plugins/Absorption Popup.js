/*:
 * @plugindesc Minimal hook for YEP Absorption Barrier — show popup when barrier is gained.
 * @author Minimal
 * @help
 * Place this plugin below YEP_AbsorptionBarrier.js.
 * It triggers a barrier-style damage popup whenever a battler gains barrier points.
 */

(function() {

  if (!Imported) Imported = {};
  if (!Imported.YEP_AbsorptionBarrier) {
    console.warn('ABR_BarrierGainPopup: YEP_AbsorptionBarrier not found. Plugin disabled.');
    return;
  }

  var _ABR_BG_Game_Battler_gainBarrier = Game_Battler.prototype.gainBarrier;
  Game_Battler.prototype.gainBarrier = function(value, turn) {
    // Call original behavior first
    _ABR_BG_Game_Battler_gainBarrier.call(this, value, turn);

    // Only show popup for positive gains during battle
    if (value > 0 && $gameParty.inBattle && $gameParty.inBattle()) {
      // Ensure a result object exists for the popup system
      this._result = this._result || new Game_ActionResult();

      // Mark barrier affected so Sprite_Damage uses barrier popup visuals
      this._result._barrierAffected = true;

      // Provide a numeric value so the popup shows an amount.
      // Use negative hpDamage so it displays as a "gain" number.
      // This mirrors how some YEP popups use negative values for gains.
      this._result.hpDamage = (this._result.hpDamage || 0) - value;

      // Mark hpAffected so the popup system will render the number
      this._result.hpAffected = true;

      // Trigger the floating popup for this battler
      if (typeof this.startDamagePopup === 'function') {
        this.startDamagePopup();
      }

      // Optionally trigger the barrier animation (keeps visual parity with loseBarrier)
      if (typeof this.startBarrierAnimation === 'function') {
        this.startBarrierAnimation();
      }
    }
  };

})();
