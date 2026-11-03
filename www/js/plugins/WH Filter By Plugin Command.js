/*:
 * @plugindesc Filter PH Warehouse lists by the storage name used in the plugin command (PHWarehouse show <Name>). Items must contain the exact notetag <Menu Category: Name> to be visible. Stores last opened name in $gameSystem._phLastWarehouseName. 
 * @author Copilot
 * @help
 * - Captures plugin command: PHWarehouse show <Name> (e.g., PHWarehouse show <Bracelets>)
 * - Filters Window_WarehouseItemList so only items with "<Menu Category: Name>" in their note are shown.
 * - Script calls:
 *     $gameSystem.setPHLastWarehouseName('Rings');
 *     $gameSystem.clearPHLastWarehouseName();
 *     $gameSystem.getPHLastWarehouseName();
 */

(function() {
  'use strict';

  // Persist last opened storage name on $gameSystem
  if (!Game_System.prototype.setPHLastWarehouseName) {
    Game_System.prototype.setPHLastWarehouseName = function(name) {
      this._phLastWarehouseName = name ? String(name) : null;
    };
  }
  if (!Game_System.prototype.clearPHLastWarehouseName) {
    Game_System.prototype.clearPHLastWarehouseName = function() {
      this._phLastWarehouseName = null;
    };
  }
  if (!Game_System.prototype.getPHLastWarehouseName) {
    Game_System.prototype.getPHLastWarehouseName = function() {
      return this._phLastWarehouseName || null;
    };
  }

  // Capture MV-style plugin commands
  var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    try {
      if (!command) return;
      var cmd = String(command).trim();
      if (cmd.toLowerCase() === 'phwarehouse') {
        if (args && args.length > 0) {
          var sub = String(args[0] || '').toLowerCase();
          if (sub === 'show' && args.length >= 2) {
            var raw = args.slice(1).join(' ').trim();
            var m = raw.match(/<\s*([^>]+?)\s*>/);
            var name = m ? m[1].trim() : raw;
            if (name && $gameSystem) {
              $gameSystem.setPHLastWarehouseName(name);
              console.log('PHWarehouse plugin command captured, last storage name set to:', name);
            }
          }
        }
      }
    } catch (e) {
      console.warn('PHWarehouse capture error', e);
    }
  };

  // Utilities
  function buildExactNotetag(name) {
    return '<Menu Category: ' + name + '>';
  }

  function extractNameFromTagText(text) {
    if (!text) return null;
    var m = ('' + text).match(/<\s*Menu\s*Category\s*:\s*([^>]+?)\s*>/i);
    if (m && m[1]) return m[1].trim();
    var m2 = ('' + text).match