/*:
 * @plugindesc Adds +20px to Skill + Item windows, expanding upward (YEP safe)
 */

(function() {

  const ADD = 20;

  function resizeUp(win) {
    if (!win) return;

    win.height += ADD;

    // THIS is the key: shift upward so growth appears on top
    win.y -= ADD;

    win.createContents();
    win.refresh();

    if (win.updatePlacement) win.updatePlacement();
  }

  const _Scene_Battle_update = Scene_Battle.prototype.update;
  Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);

    if (!this._skillItemAdjusted && this._skillWindow && this._itemWindow) {
      resizeUp(this._skillWindow);
      resizeUp(this._itemWindow);

      this._skillItemAdjusted = true;
    }
  };

})();