//=============================================================================
// Andrew_DisableTeleportsMenu.js
//=============================================================================
// v1.00

/*:
 * @plugindesc v1.00 Greys out a main menu command (default: "Teleports") while a
 * chosen switch (default: 407) is OFF.
 * @author Andrew
 *
 * @param Command Name
 * @desc Name of the main menu command to disable. Text codes in the
 * command's name (e.g. \C[6]) are ignored when matching.
 * @default Teleports
 *
 * @param Switch ID
 * @type switch
 * @desc The command is disabled while this switch is OFF.
 * @default 407
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Standalone plugin. Works with YEP_MainMenuManager (or any plugin that adds
 * commands through Window_MenuCommand). Any main menu command whose name
 * matches "Command Name" is still shown, but cannot be selected (greyed out)
 * unless the chosen switch is ON.
 *
 * Plugin load order: place this BELOW YEP_MainMenuManager.js.
 *
 * No plugin commands.
 */

(function() {

  'use strict';

  //---------------------------------------------------------------------------
  // Parameters (filename self-detected so a renamed file still works)
  //---------------------------------------------------------------------------
  var src = document.currentScript && document.currentScript.src;
  var pluginName = 'Andrew_DisableTeleportsMenu';
  if (src) {
    var detected = decodeURIComponent(src.split('/').pop()).replace(/\.js$/i, '');
    if (detected) pluginName = detected;
  }
  var params = PluginManager.parameters(pluginName);

  var targetName = String(params['Command Name'] || 'Teleports').trim();
  var switchId   = Number(params['Switch ID'] || 407);

  //---------------------------------------------------------------------------
  // Helpers
  //---------------------------------------------------------------------------
  // Remove RPG Maker text codes (\C[6], \I[3], \{ etc.) and surrounding spaces.
  function plainName(name) {
    return String(name || '')
      .replace(/\\[A-Za-z]+\[\d+\]/g, '')
      .replace(/\\[.|!<>^{}$]/g, '')
      .trim();
  }

  //---------------------------------------------------------------------------
  // Window_MenuCommand
  //---------------------------------------------------------------------------
  // Post-process the finished command list so it works no matter which plugin
  // (or which YEP command slot) added the command.
  var _Andrew_DTM_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
  Window_MenuCommand.prototype.makeCommandList = function() {
    _Andrew_DTM_makeCommandList.call(this);
    if ($gameSwitches.value(switchId)) return;
    for (var i = 0; i < this._list.length; i++) {
      var cmd = this._list[i];
      if (plainName(cmd.name) === targetName) {
        cmd.enabled = false;
      }
    }
  };

})();