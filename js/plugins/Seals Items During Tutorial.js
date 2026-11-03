//=============================================================================
// Andrew_SealBattleItemCommand.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_SealBattleItemCommand = true;

var Andrew = Andrew || {};
Andrew.SealBattleItemCommand = Andrew.SealBattleItemCommand || {};
Andrew.SealBattleItemCommand.version = 1.00;

/*:
 * @plugindesc v1.00 Seals the Item command in the battle actor command window while a switch is off.
 * @author Andrew
 *
 * @param Switch ID
 * @desc The switch that must be ON for the Item command to be usable.
 * @type switch
 * @default 407
 *
 * @param Command Symbol
 * @desc The symbol of the actor command window entry to seal. Default battle Item command symbol is 'item'.
 * @default item
 *
 * @help
 * ============================================================================
 * Andrew_SealBattleItemCommand.js
 * ============================================================================
 *
 * Seals (disables/greys out) the Item command in the battle actor command
 * window whenever the configured switch is OFF. The command remains visible
 * but cannot be selected. When the switch turns ON, the command becomes
 * usable again.
 *
 * Standalone plugin. Place anywhere below YEP_BattleEngineCore.
 *
 * ============================================================================
 */

(function() {

  var pluginName = 'Andrew_SealBattleItemCommand';

  var parameters = PluginManager.parameters(pluginName);
  var sealSwitchId = Number(parameters['Switch ID'] || 407);
  var sealSymbol = String(parameters['Command Symbol'] || 'item');

  //=========================================================================
  // Window_ActorCommand
  //=========================================================================

  var _Window_ActorCommand_isCommandEnabled =
    Window_ActorCommand.prototype.isCommandEnabled;
  Window_ActorCommand.prototype.isCommandEnabled = function(index) {
    var enabled = _Window_ActorCommand_isCommandEnabled.call(this, index);
    if (!enabled) return enabled;
    var cmd = this._list[index];
    if (cmd && cmd.symbol === sealSymbol && !$gameSwitches.value(sealSwitchId)) {
      return false;
    }
    return enabled;
  };

})();