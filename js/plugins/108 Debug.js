/*:
 * @plugindesc Debug State 108 Source
 * @author ChatGPT
 */

(function() {
    'use strict';

    var _Game_Battler_addState = Game_Battler.prototype.addState;

    Game_Battler.prototype.addState = function(stateId) {

        if (stateId === 108) {
            console.log("=================================");
            console.log("STATE 108 APPLIED");
            console.log("Target:", this.name());
            console.trace();
        }

        _Game_Battler_addState.call(this, stateId);
    };

})();