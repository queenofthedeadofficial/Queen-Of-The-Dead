//=============================================================================
// Andrew_HideBattleSkillType.js
//=============================================================================
// Version 1.00

/*:
 * @plugindesc v1.00 Removes a skill type command (default 13) from the battle
 * actor command window for specific actors.
 * @author Andrew
 *
 * @param Actor IDs
 * @text Actor IDs
 * @type string
 * @desc Actors who lose the skill type command in battle. Comma-separated
 * IDs and ranges, e.g. 1-3 or 1,2,3.
 * @default 1-3
 *
 * @param Skill Type ID
 * @text Skill Type ID
 * @type number
 * @min 1
 * @desc The skill type whose command is removed from the actor command
 * window.
 * @default 13
 *
 * @param Debug Log
 * @text Debug Log
 * @type boolean
 * @on Log
 * @off Off
 * @desc Logs every command (name / symbol / ext) added for the hidden
 * actors to the console (F8).
 * @default false
 *
 * @help
 * ============================================================================
 * Andrew_HideBattleSkillType
 * ============================================================================
 * Removes the skill type command (e.g. the "Teleports" skill type, ID 13)
 * from the battle actor command window for the listed actors. By default
 * that is actors 1, 2 and 3.
 *
 * This only removes the COMMAND from the actor command window. The skills
 * themselves are untouched, so other windows (e.g. a custom window that
 * lists skill type 13 for an actor) keep working.
 *
 * Load order: place this BELOW YEP_BattleEngineCore and YEP_SkillCore.
 *
 * Troubleshooting: set "Debug Log" to true, start a battle, press F8 and
 * look for "[Andrew_HideBattleSkillType]" lines.
 */

(function() {
    'use strict';

    // Self-detect filename so PluginManager.parameters() always matches
    var scriptName = (function() {
        var src = (document.currentScript && document.currentScript.src) || '';
        var m = src.match(/([^\/\\]+)\.js(\?.*)?$/);
        return m ? decodeURIComponent(m[1]) : 'Andrew_HideBattleSkillType';
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

    var hiddenActorIds = parseIdList(params['Actor IDs'] || '1-3');
    var hiddenStypeId = Number(params['Skill Type ID'] || 13);
    var debugLog = String(params['Debug Log']).toLowerCase() === 'true';

    function isHiddenFor(window) {
        return !!(window._actor && hiddenActorIds[window._actor.actorId()]);
    }

    function isHiddenSkillType(symbol, ext) {
        return symbol === 'skill' && Number(ext) === hiddenStypeId;
    }

    // Block at add time (covers any plugin/order that calls addCommand)
    var _Window_ActorCommand_addCommand = Window_ActorCommand.prototype.addCommand;
    Window_ActorCommand.prototype.addCommand = function(name, symbol, enabled, ext) {
        if (isHiddenFor(this)) {
            var hide = isHiddenSkillType(symbol, ext);
            if (debugLog) {
                console.log('[Andrew_HideBattleSkillType] actor ' +
                    this._actor.actorId() + ' addCommand name="' + name +
                    '" symbol="' + symbol + '" ext=' + ext +
                    (hide ? '  -> BLOCKED' : ''));
            }
            if (hide) return;
        }
        return _Window_ActorCommand_addCommand.apply(this, arguments);
    };

    // Safety net: filter again once the list is built, in case a plugin
    // pushes straight into this._list
    var _Window_ActorCommand_makeCommandList =
        Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        _Window_ActorCommand_makeCommandList.call(this);
        if (!isHiddenFor(this)) return;
        this._list = this._list.filter(function(cmd) {
            return !isHiddenSkillType(cmd.symbol, cmd.ext);
        });
    };

})();