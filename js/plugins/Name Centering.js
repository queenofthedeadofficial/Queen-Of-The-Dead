/*:
 * @plugindesc YEP Battle Status: center actor names
 */

(function() {
"use strict";

// Backup original drawBasicArea
const _drawBasicArea = Window_BattleStatus.prototype.drawBasicArea;

Window_BattleStatus.prototype.drawBasicArea = function(rect, actor) {
    // Call original to draw gauges / icons
    _drawBasicArea.call(this, rect, actor);

    if (!actor) return;

    // Clear previous name area
    this.contents.clearRect(rect.x, rect.y, rect.width, this.lineHeight());

    // Draw name centered
    this.changeTextColor(this.hpColor(actor));
    this.drawText(actor.name(), rect.x, rect.y - 10, rect.width, 'center');
};
})();