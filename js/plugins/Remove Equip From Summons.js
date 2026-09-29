//=============================================================================
// Andrew_HideBattleEquip.js
//=============================================================================
// Version 1.01
//  1.01 - Also blocks the command at addCommand() time (works regardless of
//         how/when the Equip command gets added), matches by symbol OR
//         displayed name, and adds an optional console debug log.
//  1.00 - Initial version (filtered the list after makeCommandList only).

/*:
 * @plugindesc v1.01 Removes the Equip command from the battle actor command
 * window for specific actors.
 * @author Andrew
 *
 * @param Actor IDs
 * @text Actor IDs
 * @type string
 * @desc Actors who lose the Equip command in battle. Comma-separated
 * IDs and ranges, e.g. 9-19 or 9,10,12-15.
 * @default 9-19
 *
 * @param Command Symbols
 * @text Command Symbols
 * @type string
 * @desc Comma-separated command symbols to remove (case-insensitive).
 * @default equip,changeequip,change_equip,changebattleequip
 *
 * @param Command Names
 * @text Command Names
 * @type string
 * @desc Comma-separated displayed command names to remove (case-insensitive,
 * text codes ignored). TextManager.equip is always included.
 * @default Equip
 *
 * @param Debug Log
 * @text Debug Log
 * @type boolean
 * @on Log
 * @off Off
 * @desc Logs every command (name / symbol) added for the hidden actors
 * to the console (F8), so you can see what the Equip command is called.
 * @default false
 *
 * @help
 * ============================================================================
 * Andrew_HideBattleEquip
 * ============================================================================
 * Removes the Equip command (added by YEP_X_ChangeBattleEquip) from the
 * actor command window in battle for the actors listed in the parameters.
 * By default that is actors 9 through 19.
 *
 * Standalone: no other Andrew_ plugin is required.
 *
 * Load order: place this BELOW YEP_BattleEngineCore and
 * YEP_X_ChangeBattleEquip.
 *
 * Troubleshooting: set "Debug Log" to true, start a battle, press F8 and
 * look for "[Andrew_HideBattleEquip]" lines. They show the name and symbol
 * of each command being added for a hidden actor. Add the Equip command's
 * symbol/name to the parameters if it isn't matched by default.
 */

(function() {
    'use strict';

    // Self-detect filename so PluginManager.parameters() always matches
    var scriptName = (function() {
        var src = (document.currentScript && document.currentScript.src) || '';
        var m = src.match(/([^\/\\]+)\.js(\?.*)?$/);
        return m ? decodeURIComponent(m[1]) : 'Andrew_HideBattleEquip';
    })();
    var params = PluginManager.parameters(scriptName);

    function parseIdList(str) {
        var ids = {};
        String(str || '').split(',').forEach(function(part) {
            part = part.trim();
            if (!part) return;
            var range = part.match(/^(\d+)\s*-\s*(\d+)$/);
            if (range) {
                var a = Number(range[1]);
                var b = Number(range[2]);
                var lo = Math.min(a, b);
                var hi = Math.max(a, b);
                for (var i = lo; i <= hi; i++) ids[i] = true;
            } else if (/^\d+$/.test(part)) {
                ids[Number(part)] = true;
            }
        });
        return ids;
    }

    function normalize(s) {
        // strip \i[n], \c[n] etc. text codes, lowercase, trim
        return String(s == null ? '' : s)
            .replace(/\\[a-zA-Z]+\[\d+\]/g, '')
            .replace(/\\[a-zA-Z]/g, '')
            .trim().toLowerCase();
    }

    function parseSet(str) {
        var set = {};
        String(str || '').split(',').forEach(function(s) {
            s = normalize(s);
            if (s) set[s] = true;
        });
        return set;
    }

    var hiddenActorIds = parseIdList(params['Actor IDs'] || '9-19');
    var hiddenSymbols = parseSet(params['Command Symbols'] ||
        'equip,changeequip,change_equip,changebattleequip');
    var hiddenNames = parseSet(params['Command Names'] || 'Equip');
    var debugLog = String(params['Debug Log']).toLowerCase() === 'true';

    function isHiddenFor(window) {
        return !!(window._actor && hiddenActorIds[window._actor.actorId()]);
    }

    function isEquipCommand(name, symbol) {
        if (hiddenSymbols[normalize(symbol)]) return true;
        var n = normalize(name);
        if (hiddenNames[n]) return true;
        if (typeof TextManager !== 'undefined' && TextManager.equip &&
            n === normalize(TextManager.equip)) return true;
        return false;
    }

    // Block at add time (covers any plugin/order that calls addCommand)
    var _Window_ActorCommand_addCommand = Window_ActorCommand.prototype.addCommand;
    Window_ActorCommand.prototype.addCommand = function(name, symbol, enabled, ext) {
        if (isHiddenFor(this)) {
            if (debugLog) {
                console.log('[Andrew_HideBattleEquip] actor ' +
                    this._actor.actorId() + ' addCommand name="' + name +
                    '" symbol="' + symbol + '"' +
                    (isEquipCommand(name, symbol) ? '  -> BLOCKED' : ''));
            }
            if (isEquipCommand(name, symbol)) return;
        }
        return _Window_ActorCommand_addCommand.apply(this, arguments);
    };

    // Safety net: filter again once the whole list is built, in case a
    // plugin pushes straight into this._list
    var _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        _Window_ActorCommand_makeCommandList.call(this);
        if (!isHiddenFor(this)) return;
        this._list = this._list.filter(function(cmd) {
            return !isEquipCommand(cmd.name, cmd.symbol);
        });
    };

})();