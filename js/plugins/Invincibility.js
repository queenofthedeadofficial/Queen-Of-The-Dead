/*:
 * @plugindesc v1.0 Prevents damage and status application while a configured state is active. Default state id: 197.
 * @author You
 * @param ImmunityStateId
 * @text Immunity State ID
 * @type number
 * @min 1
 * @default 197
 * @help
 * If a battler has the configured state, they take no damage and cannot gain other states.
 */
(function() {
  var params = PluginManager.parameters('ImmuneState') || {};
  var IMMUNE_ID = Number(params['ImmunityStateId'] || 197);

  // Prevent HP/MP/TP damage and other action effects from applying when target has immunity.
  var _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    // If target already has immunity, short-circuit common damaging/effectful behavior:
    if (target && target.isStateAffected(IMMUNE_ID)) {
      // Clear damage and mark as evaded so it shows as no effect
      var result = target.result();
      result.clear();
      result.used = true;
      result.missed = false;
      result.evaded = true;
      result.hpDamage = 0;
      result.mpDamage = 0;
      result.tpDamage = 0;
      // Do not run normal effect application (states, buffs, etc.)
      // But still allow any forced removals or special plugin logic that expects apply to run,
      // so we skip the rest and return.
      return;
    }
    _Game_Action_apply.call(this, target);
  };

  // Block adding states to an immune battler (but allow adding the immunity state itself).
  var _Game_Battler_addState = Game_Battler.prototype.addState;
  Game_Battler.prototype.addState = function(stateId) {
    if (this.isStateAffected(IMMUNE_ID) && stateId !== IMMUNE_ID) {
      return; // ignore attempts to add any other state while immune
    }
    _Game_Battler_addState.call(this, stateId);
  };

  // Block removing HP/MP/TP via direct gain methods when immune (extra safety).
  var _Game_Battler_gainHp = Game_Battler.prototype.gainHp;
  Game_Battler.prototype.gainHp = function(value) {
    if (this.isStateAffected(IMMUNE_ID) && value < 0) return;
    _Game_Battler_gainHp.call(this, value);
  };
  var _Game_Battler_gainMp = Game_Battler.prototype.gainMp;
  Game_Battler.prototype.gainMp = function(value) {
    if (this.isStateAffected(IMMUNE_ID) && value < 0) return;
    _Game_Battler_gainMp.call(this, value);
  };
  var _Game_Battler_gainTp = Game_Battler.prototype.gainTp;
  Game_Battler.prototype.gainTp = function(value) {
    if (this.isStateAffected(IMMUNE_ID) && value < 0) return;
    _Game_Battler_gainTp.call(this, value);
  };

})();
