/*:
 * @plugindesc Probe: confirm plugin loads and hooks are called. v1.0
 */

(function() {
  console.log('Probe loaded: Probe_Loaded.js');

  var _orig = Game_Action.prototype.targetsForOpponents;
  Game_Action.prototype.targetsForOpponents = function() {
    console.log('Probe: targetsForOpponents called for item id:', this.item() && this.item().id);
    return _orig.call(this);
  };

  if (Game_Action.prototype.makeTargets) {
    var _orig2 = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
      console.log('Probe: makeTargets called for item id:', this.item() && this.item().id);
      return _orig2.call(this);
    };
  }

  var _bm = BattleManager.startAction;
  BattleManager.startAction = function() {
    console.log('Probe: BattleManager.startAction called, subject:', this._subject && this._subject.name && this._subject.name());
    _bm.call(this);
  };
})();
