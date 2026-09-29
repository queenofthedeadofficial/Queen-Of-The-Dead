/* Insert after or inside your LotPItemSelect.js IIFE, after applySelectedItemEffects is defined.
   This override intercepts the native item command and auto-applies lastItem when appropriate.
*/

(function() {
  // keep references to originals
  const _Scene_Battle_commandItem = Scene_Battle.prototype.commandItem;
  const _Game_Action_apply_LoTP = Game_Action.prototype.apply;

  // safer subject capture helper
  function getActionSubject(action) {
    return (action && action.subject && action.subject()) || BattleManager._subject || null;
  }

  // Helper: try to get lastItem for an actor from Auto-Battle macros
  function getActorLastItem(actor) {
    if (!actor || !$gameSystem || !$gameSystem._actorMacros) return null;
    const macro = $gameSystem._actorMacros[actor.actorId()];
    if (!macro) return null;
    // prefer explicit lastItem (Skill-58 flow), fall back to item macro if present
    if (macro.lastItem && $dataItems[macro.lastItem]) return $dataItems[macro.lastItem];
    if (macro.type === 'item' && $dataItems[macro.id]) return $dataItems[macro.id];
    return null;
  }

  // Intercept Scene_Battle.commandItem so we can short-circuit the UI when needed
  Scene_Battle.prototype.commandItem = function() {
    try {
      // If there's no current subject/action, just call original
      const subject = BattleManager._subject || (this._actorWindow && this._actorWindow.actor && this._actorWindow.actor());
      const action = BattleManager.inputtingAction ? BattleManager.inputtingAction() : (subject && subject.currentAction && subject.currentAction());
      // If we can detect Skill 58 as the action and we're not in an interactive inputting state,
      // attempt to auto-apply the lastItem instead of opening the item menu.
      const isSkill58 = action && action.item && action.item().id === 58;
      const nonInteractive = !BattleManager._inputting; // auto-battle typically sets _inputting false
      if (isSkill58 && nonInteractive) {
        const actor = getActionSubject(action) || subject;
        const lastItem = getActorLastItem(actor);

        if (lastItem) {
          // Prevent the item window from opening; simulate selection and application.
          // Use the same applySelectedItemEffects flow: set selectedItem and actingActor then call it.
          // Ensure we use the same variable names as LotPItemSelect (if in same file scope).
          if (typeof selectedItem !== 'undefined') selectedItem = lastItem;
          if (typeof actingActor !== 'undefined') actingActor = actor;
          // If you used a different function name, call that; here we assume applySelectedItemEffects exists.
          if (typeof applySelectedItemEffects === 'function') {
            // mark that this was a simulated flow so Window_BattleItem overrides don't interfere
            skillItemActive = false;
            applySelectedItemEffects();

            // If Auto-Battle pushed a derived context, pop it to restore root context
            if ($gameTemp && $gameTemp._macroContext && $gameTemp._macroContext.length > 0) {
              $gameTemp._macroContext.pop();
            }

            // After applying, ensure the action completes so battle continues.
            // Call BattleManager.endAction to resume normal flow.
            if (BattleManager && typeof BattleManager.endAction === 'function') {
              BattleManager.endAction();
            }
            return;
          }
        }
        // If no lastItem found, fall through to open the normal item menu so player can choose.
      }
    } catch (e) {
      // If anything goes wrong, fall back to original behavior to avoid freezing.
      if (typeof console !== 'undefined') console.error("commandItem interception error:", e);
    }

    // Default: call original commandItem (interactive menu)
    _Scene_Battle_commandItem.call(this);
  };

  // Also add a defensive override to Window_BattleItem.show to prevent draw if we intentionally blocked it.
  const _Window_BattleItem_show = Window_BattleItem.prototype.show;
  Window_BattleItem.prototype.show = function() {
    try {
      // If we are in a simulated Skill-58 auto flow, don't show the window.
      // skillItemActive is set by LotPItemSelect when interactive; we only want to block when we simulated.
      // We check BattleManager._inputting false and current action is Skill 58 to be safe.
      const subject = BattleManager._subject;
      const action = subject && subject.currentAction && subject.currentAction();
      const isSkill58 = action && action.item && action.item().id === 58;
      const nonInteractive = !BattleManager._inputting;
      if (isSkill58 && nonInteractive) {
        // do not show the window; just return
        return;
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.warn("Window_BattleItem.show interception failed:", e);
    }
    _Window_BattleItem_show.call(this);
  };

  // Ensure Game_Action.apply still captures actingActor safely for other flows
  Game_Action.prototype.apply = function(target) {
    _Game_Action_apply_LoTP.call(this, target);
    try {
      if (this.item && this.item() && this.item().id === 58) {
        // safer subject capture
        actingActor = (this.subject && this.subject()) || BattleManager._subject || actingActor;
        pendingItemUse = true;
        skillItemActive = true;
        if (typeof console !== 'undefined') {
          console.log("Skill 58 applied; actingActor:", actingActor ? actingActor.name() : "NULL");
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.error("Game_Action.apply interception error:", e);
    }
  };

})();
