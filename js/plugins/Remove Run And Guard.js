/*:
 * @plugindesc Remove Run/Escape and Guard commands from battle UI (global).
 * @help
 * Drops Run/Escape and Guard from the actor and party command windows.
 * Place this plugin below YEP Battle Engine Core and other battle UI plugins.
 */

(function() {
  // Helper: filter out commands by symbol names
  function _filterOutRunGuard(list) {
    if (!Array.isArray(list)) return list;
    return list.filter(function(cmd) {
      if (!cmd || !cmd.symbol) return true;
      var s = String(cmd.symbol).toLowerCase();
      return s !== 'guard' && s !== 'escape' && s !== 'run';
    });
  }

  // Alias Window_ActorCommand.makeCommandList and filter its internal list
  var _Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function() {
    _Window_ActorCommand_makeCommandList.call(this);
    if (this._list) this._list = _filterOutRunGuard(this._list);
  };

  // Alias Window_PartyCommand.makeCommandList and filter its internal list
  var _Window_PartyCommand_makeCommandList = Window_PartyCommand.prototype.makeCommandList;
  Window_PartyCommand.prototype.makeCommandList = function() {
    _Window_PartyCommand_makeCommandList.call(this);
    if (this._list) this._list = _filterOutRunGuard(this._list);
  };

  // Some projects use Window_ActorCommand or Window_ActorCommand variants; also guard against custom windows:
  // If a plugin adds other command windows, you can add similar aliases for them here.
})();
