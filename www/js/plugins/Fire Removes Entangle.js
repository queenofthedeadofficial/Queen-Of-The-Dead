/*:
 * @plugindesc Remove Entangle state when a Fire-element action hits a target.
 * @help
 * Configure FIRE_ELEMENT_ID and ENTANGLE_ID below.
 */
(function(){
  var FIRE_ELEMENT_ID = 2; // set your Fire element ID
  var ENTANGLE_ID = 75;     // set your Entangle state ID

  var _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    // call original apply (damage, states, collapse, etc.)
    _Game_Action_apply.call(this, target);

    // Only proceed if target is still a battler and the action has an item
    var item = this.item();
    if (!item) { return; }

    // Check the action's element (this checks the skill/item damage element)
    var elemId = item.damage ? item.damage.elementId : 0;
    if (elemId === FIRE_ELEMENT_ID && target.isStateAffected(ENTANGLE_ID)) {
      target.removeState(ENTANGLE_ID);
    }
  };
})();
