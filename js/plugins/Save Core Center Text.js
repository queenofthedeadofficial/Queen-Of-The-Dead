//=============================================================================
// Andrew_SaveCoreCenterText.js
//=============================================================================

/*:
 * @plugindesc v1.00 Centers the "File 1", "File 2", etc. text in the Save/
 * Load file list, and centers the help window text in the Save/Load scene.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin centers two pieces of text in the Save/Load scene added by
 * YEP_SaveCore:
 *
 *   1. The "File 1", "File 2", etc. label (plus its icon) is centered
 *      horizontally within each save file's row.
 *   2. The help window text at the top of the scene (e.g. "Select a file to
 *      save your data.") is centered horizontally within the help window.
 *
 * This only affects the Save/Load scene's help window instance, not other
 * help windows used elsewhere (item menu, skill menu, etc.).
 *
 * Place this plugin BELOW YEP_SaveCore in the plugin list.
 *
 * ============================================================================
 */
//=============================================================================

var Andrew = Andrew || {};
Andrew.SaveCoreCenterText = Andrew.SaveCoreCenterText || {};

//=============================================================================
// Window_SavefileList - center "File X" label + icon within the row
//=============================================================================

Window_SavefileList.prototype.drawItem = function(index) {
    var id = index + 1;
    var valid = DataManager.isThisGameFile(id);
    var rect = this.itemRect(index);
    this.resetTextColor();
    this.changePaintOpacity(valid);
    var icon = valid ? Yanfly.Param.SaveIconSaved : Yanfly.Param.SaveIconEmpty;
    var text = TextManager.file + ' ' + id;
    var textWidth = this.textWidth(text);
    var dx = rect.x + Math.max((rect.width - textWidth) / 2, 0);
    this.drawIcon(icon, rect.x + 2, rect.y + 2);
    this.drawFileId(id, dx, rect.y);
};

//=============================================================================
// Scene_File - flag the help window instance for centered text
//=============================================================================

Scene_File.prototype.createHelpWindow = function() {
    this._helpWindow = new Window_Help(2);
    this._helpWindow._andrewCenterText = true;
    this._helpWindow.setText(Yanfly.Param.SaveHelpSelect);
    this.addWindow(this._helpWindow);
};

//=============================================================================
// Window_Help - center text when flagged
//=============================================================================

Andrew.SaveCoreCenterText.Window_Help_refresh =
    Window_Help.prototype.refresh;
Window_Help.prototype.refresh = function() {
    if (!this._andrewCenterText) {
      Andrew.SaveCoreCenterText.Window_Help_refresh.call(this);
      return;
    }
    this.contents.clear();
    var tw = this.textWidthEx(this._text);
    var dx = Math.max((this.contents.width - tw) / 2, 0);
    this.drawTextEx(this._text, dx, 0);
};