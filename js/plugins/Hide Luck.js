/*:
 * @plugindesc Makes LUK completely invisible in most parameter displays.
 * @author ChatGPT
 */

(function() {
    'use strict';

    // Hide parameter name
    var _TextManager_param = TextManager.param;
    TextManager.param = function(paramId) {
        if (paramId === 7) return ' ';
        return _TextManager_param.call(this, paramId);
    };

    // Hide parameter value
    var _Game_BattlerBase_param = Game_BattlerBase.prototype.param;
    Game_BattlerBase.prototype.param = function(paramId) {
        if (paramId === 7) return ' ';
        return _Game_BattlerBase_param.call(this, paramId);
    };

    // Remove Luck's gameplay effect
    Game_Action.prototype.lukEffectRate = function(target) {
        return 1.0;
    };
})();