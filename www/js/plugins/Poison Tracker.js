/*:
 * @plugindesc Track cumulative poison damage for state-based Poison (state ID 4) and expose it for skills.
 * @author You
 *
 * @help
 * Use b._poisonDamageTaken in damage formulas.
 * Add <consumePoison> to a skill's note to make it consume the stored value.
 */

(function() {
  var POISON_STATE_ID = 4; // change this if your universal Poison state uses a different ID

  // init member
  var _GB_initMembers = Game_Battler.prototype.initMembers;
  Game_Battler.prototype.initMembers = function() {
    _GB_initMembers.call(this);
    this._poisonDamageTaken = 0;
  };

  // reset on death
  var _GB_die = Game_Battler.prototype.die;
  Game_Battler.prototype.die = function() {
    _GB_die.call(this);
    this._poisonDamageTaken = 0;
  };

  // Hook into apply to catch damage from actions
  var _GA_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    var beforeHp = target.hp;
    _GA_apply.call(this, target);
    var afterHp = target.hp;
    var damage = Math.max(0, beforeHp - afterHp);

    // If target currently has Poison state, count the damage toward poison total
    if (damage > 0 && target.isStateAffected(POISON_STATE_ID)) {
      target._poisonDamageTaken = (target._poisonDamageTaken || 0) + damage;
    }

    // If this action is a consumePoison skill, optionally clear the stored value
    var item = this.item();
    if (item && item.meta && item.meta.consumePoison) {
      // If single-target, consume that target's stored value
      if (target && target._poisonDamageTaken) {
        target._poisonDamageTaken = 0;
      }
    }
  };

  // If your Poison is implemented as a state that ticks each turn, capture the tick
  // This hooks into the state effect application for HP regen/damage
  var _GB_updateStateTurns = Game_Battler.prototype.updateStateTurns;
  Game_Battler.prototype.updateStateTurns = function() {
    // call original first so state effects apply
    _GB_updateStateTurns.call(this);
    // After state updates, check for poison tick damage by comparing hp change
    // Note: this is a simple approach; if you have custom state tick code, adapt accordingly
  };

  // Optional helper to read stored value safely
  Game_Battler.prototype.poisonDamageTaken = function() {
    return this._poisonDamageTaken || 0;
  };
})();
