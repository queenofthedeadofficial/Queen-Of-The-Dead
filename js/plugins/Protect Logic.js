/*:
 * @plugindesc Redirect single-target enemy actions to actor(1) when original target has state 56. Debug logs included. v1.3
 * @author You
 *
 * Place this plugin last in the Plugin Manager.
 */

(function() {

  function shouldRedirect(subject, original) {
    try {
      if (!subject || !original) return false;
      if (!subject.isEnemy || !subject.isEnemy()) return false;
      // If original is an actor and has state 56
      if (original.isActor && original.isStateAffected && original.isStateAffected(56)) {
        var redirect = $gameActors.actor(1);
        if (redirect && redirect.isAlive && redirect.isAlive() && redirect !== original) {
          return true;
        }
      }
    } catch (e) {
      console.error('Redirect helper error:', e);
    }
    return false;
  }

  // Wrap targetsForOpponents (standard MV hook)
  var _Game_Action_targetsForOpponents = Game_Action.prototype.targetsForOpponents;
  Game_Action.prototype.targetsForOpponents = function() {
    var targets = _Game_Action_targetsForOpponents.call(this);
    try {
      var subject = this.subject();
      var item = this.item();
      console.log('[Redirect] targetsForOpponents called. item:', item && item.name ? item.name : item, 'scope:', item && item.scope);
      if (item && (item.scope === 1 || this.isForOne && this.isForOne())) {
        var original = targets && targets[0];
        console.log('[Redirect] original target:', original && original.name ? original.name() : original, 'state56:', original && original.isStateAffected ? original.isStateAffected(56) : 'no');
        if (shouldRedirect(subject, original)) {
          var redirect = $gameActors.actor(1);
          console.log('[Redirect] redirecting to actor(1):', redirect && redirect.name ? redirect.name() : redirect);
          return [redirect];
        }
      }
    } catch (e) {
      console.error('Redirect targetsForOpponents error:', e);
    }
    return targets;
  };

  // If a plugin defines makeTargets, wrap it too (some battle engines do)
  if (Game_Action.prototype.makeTargets) {
    var _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
      var targets = _Game_Action_makeTargets.call(this);
      try {
        var subject = this.subject();
        var item = this.item();
        console.log('[Redirect] makeTargets called. item:', item && item.name ? item.name : item, 'scope:', item && item.scope);
        var original = targets && targets[0];
        console.log('[Redirect] original target (makeTargets):', original && original.name ? original.name() : original, 'state56:', original && original.isStateAffected ? original.isStateAffected(56) : 'no');
        if (shouldRedirect(subject, original)) {
          var redirect = $gameActors.actor(1);
          console.log('[Redirect] (makeTargets) redirecting to actor(1):', redirect && redirect.name ? redirect.name() : redirect);
          return [redirect];
        }
      } catch (e) {
        console.error('Redirect makeTargets error:', e);
      }
      return targets;
    };
  }

  // Fallback: if targets were already chosen elsewhere, try to intercept at BattleManager.startAction
  var _BattleManager_startAction = BattleManager.startAction;
  BattleManager.startAction = function() {
    try {
      var subject = this._subject;
      var action = subject.currentAction && subject.currentAction();
      var item = action && action.item && action.item();
      // Only proceed for enemy subjects and single-target skills
      if (subject && subject.isEnemy && subject.isEnemy() && item && (item.scope === 1 || action.isForOne && action.isForOne && action.isForOne())) {
        // action._targets may exist in some engines; try to inspect and replace
        var targets = action._targets || (action.targets && action.targets());
        var original = targets && targets[0];
        console.log('[Redirect] BattleManager.startAction check. item:', item && item.name ? item.name() : item, 'original:', original && original.name ? original.name() : original);
        if (shouldRedirect(subject, original)) {
          var redirect = $gameActors.actor(1);
          console.log('[Redirect] (BattleManager) redirecting to actor(1):', redirect && redirect.name ? redirect.name() : redirect);
          // Try to set action._targets if present
          if (action._targets !== undefined) {
            action._targets = [redirect];
          }
          // If action.targets is a function that will be called later, try to override it
          if (action.targets && typeof action.targets === 'function') {
            action.targets = function() { return [redirect]; };
          }
        }
      }
    } catch (e) {
      console.error('Redirect BattleManager hook error:', e);
    }
    _BattleManager_startAction.call(this);
  };

})();
