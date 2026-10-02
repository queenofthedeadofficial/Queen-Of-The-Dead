//=============================================================================
// Andrew_AddAllItemsDebug.js
//=============================================================================

/*:
 * @plugindesc v1.0 Adds 1 of every Item/Weapon/Armor in the database to the
 * party inventory. Intended for testing item description UI.
 * @author Andrew
 *
 * @param Include Items
 * @type boolean
 * @default true
 * @desc Add 1 of every entry from the Items database.
 *
 * @param Include Weapons
 * @type boolean
 * @default true
 * @desc Add 1 of every entry from the Weapons database.
 *
 * @param Include Armors
 * @type boolean
 * @default true
 * @desc Add 1 of every entry from the Armors database.
 *
 * @param Skip Blank Names
 * @type boolean
 * @default true
 * @desc Skip database entries with no name (spacer/unused slots).
 *
 * @param Auto Run On New Game
 * @type boolean
 * @default false
 * @desc If true, automatically grants everything at the start of a new game.
 *
 * @help
 * =============================================================================
 * Plugin Commands (MV-style, type in the "Plugin Command" event command)
 * =============================================================================
 *
 *   AddAllItems
 *     Grants 1 of every Item/Weapon/Armor (per the ON/OFF params above)
 *     to the party inventory immediately.
 *
 * =============================================================================
 * Notes
 * =============================================================================
 * - This is a debug/testing tool. It is not intended to ship in a release
 *   build; strip the plugin command / disable Auto Run before shipping.
 * - Entries with a blank name are skipped by default (these are typically
 *   unused/reserved database slots, not real items).
 */

var Andrew_AddAllItemsDebug = Andrew_AddAllItemsDebug || {};
Andrew_AddAllItemsDebug.pluginName = 'Andrew_AddAllItemsDebug';

(function() {
    'use strict';

    var params = PluginManager.parameters(Andrew_AddAllItemsDebug.pluginName);
    var includeItems = params['Include Items'] === 'true';
    var includeWeapons = params['Include Weapons'] === 'true';
    var includeArmors = params['Include Armors'] === 'true';
    var skipBlankNames = params['Skip Blank Names'] === 'true';
    var autoRunNewGame = params['Auto Run On New Game'] === 'true';

    console.log('[AndrewDebug] Plugin parsed. autoRunNewGame=' + autoRunNewGame);

    Andrew_AddAllItemsDebug.grantAll = function() {
        var granted = 0;

        function grantList(list, flag) {
            if (!flag || !list) return;
            for (var i = 1; i < list.length; i++) {
                var entry = list[i];
                if (!entry) continue;
                if (skipBlankNames && (!entry.name || entry.name === '')) continue;
                $gameParty.gainItem(entry, 1);
                granted++;
            }
        }

        grantList($dataItems, includeItems);
        grantList($dataWeapons, includeWeapons);
        grantList($dataArmors, includeArmors);

        console.log('[Andrew_AddAllItemsDebug] Granted ' + granted + ' item types to inventory.');
    };

    //-----------------------------------------------------------------------
    // Plugin Command
    //-----------------------------------------------------------------------

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'AddAllItems') {
            Andrew_AddAllItemsDebug.grantAll();
        }
    };

    //-----------------------------------------------------------------------
    // Optional auto-run on new game
    //-----------------------------------------------------------------------

    if (autoRunNewGame) {
        console.log('[AndrewDebug] Installing setupNewGame alias.');
        var _DataManager_setupNewGame = DataManager.setupNewGame;
        DataManager.setupNewGame = function() {
            console.log('[AndrewDebug] setupNewGame alias firing.');
            _DataManager_setupNewGame.call(this);
            Andrew_AddAllItemsDebug.grantAll();
        };
    }

})();