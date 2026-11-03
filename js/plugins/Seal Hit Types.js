/*:
 * @plugindesc Seal hit-type skills and show a skip message when an enemy has no usable actions left due to seals.
 * @author YourName
 *
 * @help
 * State notetags:
 *   <SealPhysical>
 *   <SealMagical>
 *   <SealCertain>
 *
 * Behavior:
 * - Player skills of sealed hit types become unusable.
 * - Enemies will not select sealed-type skills.
 * - If filtering removes every available enemy action, the enemy does nothing and the message
 *   "<Enemy name> was frozen and unable to move." is shown once for that enemy that turn.
 *
 * No plugin commands.
 */

(function() {

  // --- Helper: check if battler has a state that seals a given key
  Game_Battler.prototype.isSealedHitType = function(key) {
    return this.states().some(function(state) {
      if (!state) return false;
      var meta = state.meta || {};
      if (key === 'physical' && (meta.SealPhysical || meta.Sealphysical)) return true;
      if (key === 'magical'  && (meta.SealMagical  || meta.Sealmagical))  return true;
      if (key === 'certain'  && (meta.SealCertain  || meta.Sealcertain))  return true;
      return false;
    });
  };

  // --- Make skills unusable in menus if their hit type is sealed for the user
  var _Game_Battler_canUse = Game_Battler.prototype.canUse;
  Game_Battler.prototype.canUse = function(item) {
    if (!_Game_Battler_canUse.call(this, item)) return false;
    if (!item) return false;
    if (DataManager.isSkill(item)) {
      var tempAction = new Game_Action(this);
      tempAction.setItemObject(item);
      if (tempAction.isPhysical() && this.isSealedHitType('physical')) return false;
      if (tempAction.isMagical()  && this.isSealedHitType('magical'))  return false;
      if (tempAction.isCertainHit && tempAction.isCertainHit() && this.isSealedHitType('certain')) return false;
    }
    return true;
  };

  // --- Prevent enemies from selecting sealed-type skills
  var _Game_Enemy_selectAction = Game_Enemy.prototype.selectAction;
  Game_Enemy.prototype.selectAction = function(actionList, ratingZero) {
    // Filter out actions whose skill is of a sealed hit type for this enemy
    var filtered = actionList.filter(function(action) {
      if (!action) return false;
      var skill = $dataSkills[action.skillId];
      if (!skill) return true;
      var ga = new Game_Action(this);
      ga.setSkill(action.skillId);
      if (ga.isPhysical() && this.isSealedHitType('physical')) return false;
      if (ga.isMagical()  && this.isSealedHitType('magical'))  return false;
      if (ga.isCertainHit && ga.isCertainHit() && this.isSealedHitType('certain')) return false;
      return true;
    }, this);

    // If filtering removed everything, mark that this enemy will skip and show message
    if (filtered.length === 0) {
      // Only show the message if the reason is at least one seal state (avoid false positives)
      var hasAnySeal = this.isSealedHitType('physical') || this.isSealedHitType('magical') || this.isSealedHitType('certain');
      if (hasAnySeal) {
        // Prevent duplicate messages for the same enemy during the same selection phase
        if (!this._sealedSkipAnnounced) {
          this._sealedSkipAnnounced = true;
          // Queue a battle message. Using $gameMessage so it appears in the battle message window.
          $gameMessage.add(this.name() + " was frozen and unable to move.");
        }
      }
      // Return null so the enemy does nothing this turn
      return null;
    }

    // Reset announcement flag if enemy has usable actions
    this._sealedSkipAnnounced = false;

    return _Game_Enemy_selectAction.call(this, filtered, ratingZero);
  };

  // --- Prevent forced actions that bypass canUse/isValid
  var _Game_Action_isValid = Game_Action.prototype.isValid;
  Game_Action.prototype.isValid = function() {
    var item = this.item();
    if (item && DataManager.isSkill(item)) {
      if (this.isPhysical() && this.subject().isSealedHitType('physical')) return false;
      if (this.isMagical()  && this.subject().isSealedHitType('magical'))  return false;
      if (this.isCertainHit && this.isCertainHit() && this.subject().isSealedHitType('certain')) return false;
    }
    return _Game_Action_isValid.call(this);
  };

})();
