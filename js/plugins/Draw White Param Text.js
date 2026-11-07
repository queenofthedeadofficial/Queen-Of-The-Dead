/*:
 * @plugindesc Changes Window_StatusInfo label text (Stats, Level, Max HP, etc.) from the default system blue to white.
 * @author
 *
 * @help
 * Place this plugin BELOW YEP_StatusMenuCore.
 */
(function() {
"use strict";

Window_StatusInfo.prototype.systemColor = function() {
    return '#ffffff';
};

})();