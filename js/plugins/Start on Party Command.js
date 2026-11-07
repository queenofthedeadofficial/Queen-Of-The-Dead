/* Force party command active at turn start - enable after YEP plugins */
(function() {
  var _Scene_Battle_selectNextCommand = Scene_Battle.prototype.selectNextCommand;
  Scene_Battle.prototype.selectNextCommand = function() {
    _Scene_Battle_selectNextCommand.call(this);
    if (this._partyCommandWindow && this._partyCommandWindow.visible) {
      this._partyCommandWindow.activate();
      if (this._actorCommandWindow) this._actorCommandWindow.deactivate();
    }
  };
})();
