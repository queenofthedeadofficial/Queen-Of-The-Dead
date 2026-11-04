/*:
 * @plugindesc Allow an item with <Ignore Life State> to revive AND heal simultaneously
 */

(() => {
  const _Game_Action_testApply = Game_Action.prototype.testApply;
  Game_Action.prototype.testApply = function(target) {
    // Check our notetag
    const item = this.item();
    if (item && item.meta["Ignore Life State"]) {
      // Bypass life/death check: allow effect if other conditions are met
      return ($gameParty.inBattle() ||
              (this.isHpRecover() && target.hp < target.mhp) ||
              (this.isMpRecover() && target.mp < target.mmp) ||
              // If not healing, allow any other valid effects (states, etc.)
              this.hasItemAnyValidEffects(target));
    }
    // Otherwise use default logic
    return _Game_Action_testApply.call(this, target);
  };
})();
