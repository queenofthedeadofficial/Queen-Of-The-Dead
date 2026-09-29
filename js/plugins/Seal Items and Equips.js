(function() {

  // === Parse notetags ===
  const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
  DataManager.isDatabaseLoaded = function() {
    if (!_DataManager_isDatabaseLoaded.call(this)) return false;

    if (!this._sealParsed) {
      if (Array.isArray($dataActors)) {
        $dataActors.forEach(function(actor) {
          if (!actor) return;
          var note = actor.note || '';
          actor._sealItems = note.includes("<SealItems>");
          actor._sealEquip = note.includes("<SealEquip>");
        });
      }
      this._sealParsed = true;
    }

    return true;
  };

  // === Battle Command Filtering (ITEM + EQUIP unified) ===
  const _Window_ActorCommand_makeCommandList =
    Window_ActorCommand.prototype.makeCommandList;

  Window_ActorCommand.prototype.makeCommandList = function() {
    _Window_ActorCommand_makeCommandList.call(this);

    var actor = this._actor;
    if (!actor) return;

    var data = $dataActors[actor.actorId()];
    if (!data) return;

    this._list = this._list.filter(function(cmd) {

      if (data._sealItems && cmd.symbol === 'item') {
        return false;
      }

      if (data._sealEquip && cmd.symbol === 'equip') {
        return false;
      }

      return true;
    });
  };

})();