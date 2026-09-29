/*:
 * @plugindesc Heals attacker for 50% of damage vs targets with state 20 when attacker has state 167. Shows one heal popup per action.
 * @help Minimal, works for actors and enemies. Place after plugins that modify action flow.
 */
(() => {
  const ATTACKER_STATE = 167;
  const TARGET_STATE = 20;
  const HEAL_RATIO = 0.5;

  // Accumulate heal when applying damage to each target
  const _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    _Game_Action_apply.call(this, target);

    try {
      const subject = this.subject();
      if (!subject) return;
      if (!subject.isStateAffected || !target.isStateAffected) return;

      // Only when attacker has ATTACKER_STATE and target has TARGET_STATE
      if (subject.isStateAffected(ATTACKER_STATE) && target.isStateAffected(TARGET_STATE)) {
        const dmg = Math.max(0, target.result().hpDamage || 0);
        if (dmg > 0) {
          const heal = Math.floor(dmg * HEAL_RATIO);
          if (heal > 0) {
            subject._lifeLeechAccum = (subject._lifeLeechAccum || 0) + heal;
            subject.gainHp(heal);
          }
        }
      }
    } catch (e) {
      console.error('LifeLeechByState apply error', e);
    }
  };

  // After the action finishes, show a single heal popup for the accumulated heal
  const _BattleManager_endAction = BattleManager.endAction;
  BattleManager.endAction = function() {
    try {
      const subject = this._subject;
      if (subject && subject._lifeLeechAccum && subject._lifeLeechAccum > 0) {
        // Use negative hpDamage on subject.result() so startDamagePopup shows a heal
        subject.result().hpDamage = -Math.max(0, subject._lifeLeechAccum);
        subject.startDamagePopup();
        subject._lifeLeechAccum = 0;
      }
    } catch (e) {
      console.error('LifeLeechByState endAction error', e);
    }
    _BattleManager_endAction.call(this);
  };
})();
