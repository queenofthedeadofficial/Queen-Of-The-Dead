/*:
 * @plugindesc Adds agility bonuses when certain state combinations are present.
 * @help Adds +2 AGI if states 85 and 175 are both present, +4 AGI if states 127 and 175 are both present.
 */
(() => {
  const S_A = 85;   // first state for +2
  const S_B = 175;  // common state required
  const S_C = 127;  // state for +4

  const _Game_BattlerBase_paramPlus = Game_BattlerBase.prototype.paramPlus;
  Game_BattlerBase.prototype.paramPlus = function(paramId) {
    let value = _Game_BattlerBase_paramPlus.call(this, paramId);
    // paramId 6 is Agility in MV/MZ
    if (paramId === 6 && this.isStateAffected(S_B)) {
      if (this.isStateAffected(S_A)) value += 2;
      if (this.isStateAffected(S_C)) value += 4;
    }
    return value;
  };
})();
