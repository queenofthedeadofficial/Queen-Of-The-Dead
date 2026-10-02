/*:
 * @plugindesc YEP Battle Status: hide actor names
 */

(function() {
"use strict";

// Backup original drawBasicArea
const _drawBasicArea = Window_BattleStatus.prototype.drawBasicArea;

Window_BattleStatus.prototype.drawBasicArea = function(rect, actor) {
    // Draw original contents
    _drawBasicArea.call(this, rect, actor);

    if (!actor) return;

    // Erase the name area
    this.contents.clearRect(rect.x, rect.y, rect.width, this.lineHeight());

    // Do not redraw the name
};
})();