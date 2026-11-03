/*:
 * @plugindesc Disables F9 Debug Menu entirely, even during playtesting. Useful for preventing test cheats or player abuse. @author
 */

(function() {
    // Completely disable F9 input from opening the debug scene
    Scene_Map.prototype.updateCallDebug = function() {
        // Do nothing
    };

    Scene_Battle.prototype.updateCallDebug = function() {
        // Do nothing
    };
})();