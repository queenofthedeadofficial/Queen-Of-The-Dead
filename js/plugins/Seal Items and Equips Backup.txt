/*:
 * @plugindesc Blocks Item and Equip for actors with <SealItems> or <SealEquip> notetags.
 * @author Copilot
 *
 * @help
 * <SealItems> → removes Item command in battle.
 * <SealEquip> → blocks Equip menu for that actor.
 */

(function() {
  // Parse notetags (defensive: handle missing note fields)
  const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
  DataManager.isDatabaseLoaded = function() {
    if (!_DataManager_isDatabaseLoaded.call(this)) return false;
    if (!this._sealParsed) {
      if (Array.isArray($dataActors)) {
        $dataActors.forEach(actor => {
          if (!actor) return;
          var note = typeof actor.note === 'string' ? actor.note : '';
          actor._sealItems = note.includes("<SealItems>");
          actor._sealEquip = note.includes("<SealEquip>");
        });
      }
      this._sealParsed = true;
    }
    return true;
  };

  // === Battle: remove Item command ===
  const _Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function() {
    _Window_ActorCommand_makeCommandList.call(this);
    const actor = this._actor;
    if (!actor) return;
    const data = $dataActors[actor.actorId()];
    if (data && data._sealItems) {
      this._list = this._list.filter(cmd => cmd.symbol !== 'item');
    }
  };

  // === Equip Scene: hard guard ===
  const _Scene_Equip_initialize = Scene_Equip.prototype.initialize;
  Scene_Equip.prototype.initialize = function() {
    _Scene_Equip_initialize.call(this);
    const actor = this.actor && this.actor();
    const data = actor ? $dataActors[actor.actorId()] : null;
    if (data && data._sealEquip) {
      SoundManager.playBuzzer();
      SceneManager.pop(); // immediately exit
    }
  };

  // === Actor selection guard ===
  const _Window_MenuActor_processOk = Window_MenuActor.prototype.processOk;
  Window_MenuActor.prototype.processOk = function() {
    const actor = $gameParty.members()[this.index()];
    const data = actor ? $dataActors[actor.actorId()] : null;

    // Guarded access to currentSymbol to avoid calling into undefined commandWindow
    const symbol = (SceneManager._scene && SceneManager._scene._commandWindow && typeof SceneManager._scene._commandWindow.currentSymbol === 'function')
      ? SceneManager._scene._commandWindow.currentSymbol()
      : null;

    if (symbol === 'equip' && data && data._sealEquip) {
      SoundManager.playBuzzer();
      this.activate(); // stay on actor selection
      return;
    }
    _Window_MenuActor_processOk.call(this);
  };
})();
