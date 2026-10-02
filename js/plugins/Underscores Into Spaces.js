/*:
 * @plugindesc Replace underscores with spaces for category/command labels in YEP Item Synthesis menus only.
 * @author Copilot
 * @help
 * Minimal, non-destructive: only changes displayed text while in a Synthesis scene.
 */

(function() {
  'use strict';

  // Save original
  var _Window_Command_drawItem = Window_Command.prototype.drawItem;

  // Helper: are we in a synthesis scene?
  function isSynthesisScene() {
    var scene = SceneManager._scene;
    if (!scene || !scene.constructor) return false;
    try {
      return String(scene.constructor.name).indexOf('Synthesis') !== -1;
    } catch (e) {
      return false;
    }
  }

  // Override drawItem to replace underscores for category/command windows when in synthesis
  Window_Command.prototype.drawItem = function(index) {
    // If not in synthesis scene, call original
    if (!isSynthesisScene()) {
      _Window_Command_drawItem.call(this, index);
      return;
    }

    // Heuristic: only alter windows that look like category/command windows
    var ctorName = String(this.constructor && this.constructor.name || '');
    var looksLikeCategory = ctorName.indexOf('Category') !== -1 || ctorName.indexOf('Synthesis') !== -1 || ctorName.indexOf('Command') !== -1;

    if (!looksLikeCategory) {
      _Window_Command_drawItem.call(this, index);
      return;
    }

    // Safe custom draw: mimic original drawItem but replace underscores in the command name
    var rect = this.itemRectForText(index);
    this.resetTextColor();
    this.changePaintOpacity(this.isCommandEnabled(index));

    // Get original name from list (safe fallback)
    var name = '';
    if (this._list && this._list[index]) {
      name = String(this._list[index].name || '');
    } else {
      name = String(this.commandName(index) || '');
    }

    // Replace underscores with spaces only here
    name = name.replace(/_/g, ' ');

    this.drawText(name, rect.x, rect.y, rect.width, this.itemTextAlign());
  };

})();
