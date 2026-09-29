(function() {
  'use strict';

  var TARGET_SWITCH = 526;
  var SKILL_LIST = [1, 205, 214, 215, 216, 217];
  var STATE_ID = 4;

  var DEBUG = true; // set false once the cause is confirmed

  function triggerSwitch(reason) {
    if (DEBUG) console.log('[PerfectAlphaSlime] switch OFF via: ' + reason);
    $gameSwitches.setValue(TARGET_SWITCH, false);
  }

  // Unified HP-loss hook. executeHpDamage was silently never firing —
  // something later in the plugin list (almost certainly
  // YEP_BattleEngineCore) reassigns Game_Action.prototype.executeHpDamage
  // wholesale rather than aliasing it, which orphans any override applied
  // before it loads. gainHp() is the low-level function that actually
  // changes a battler's HP; both normal combat damage AND state slip
  // damage (regenerateHp calls gainHp internally) route through it, and
  // it's foundational enough that plugins essentially never fully replace
  // it. This also lets one hook cover both cases instead of two.
  var _Game_Battler_gainHp = Game_Battler.prototype.gainHp;
  Game_Battler.prototype.gainHp = function(value) {

    // Snapshot BEFORE calling through, since applying the HP change can
    // itself clear/refresh state affliction (e.g. a state that expires
    // exactly as its final slip tick lands).
    var wasStateAffected = this.isStateAffected(STATE_ID);

    // TEMP DIAGNOSTIC: unconditional, fires on every gainHp call regardless
    // of filters below. Remove once we've confirmed the hook is/isn't firing.
    if (DEBUG) console.log('[PerfectAlphaSlime] gainHp ENTRY | battler=' + this.name() +
      ' value=' + value + ' inBattle=' + $gameParty.inBattle() +
      ' isActor=' + this.isActor());

    _Game_Battler_gainHp.call(this, value);

    if (!$gameParty.inBattle()) return;
    if (!this.isActor()) return; // only care about damage taken BY the party
    if (value >= 0) return; // only HP loss, not healing

    // BattleManager._action is only populated while an actual action
    // (attack/skill/item) is being processed. If it's present, this HP
    // loss came from combat; if it's null/undefined, this gainHp call
    // came from the passive regen phase (state slip damage) instead.
    var action = BattleManager._action;

    if (action) {
      var item = action.item ? action.item() : null;
      var isAttackHit = action.isAttack && action.isAttack();
      var isSkillHit = item && DataManager.isSkill(item) && SKILL_LIST.includes(item.id);

      if (isAttackHit || isSkillHit) {
        var subjName = action.subject && action.subject() ? action.subject().name() : '?';
        var itemName = item ? item.name : '(attack)';
        triggerSwitch('gainHp(combat) | subject=' + subjName + ' target=' + this.name() +
          ' item=' + itemName + ' hpDamage=' + (-value));
      }
    } else if (wasStateAffected) {
      triggerSwitch('gainHp(regen, state ' + STATE_ID + ') | actor=' + this.name() +
        ' hpDamage=' + (-value));
    }
  };

})();