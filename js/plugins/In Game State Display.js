/*:
 * @plugindesc Displays cycling state names above actor names in battle.
 * Cycles every 60 seconds independent of UI refresh.
 */

(function() {

"use strict";

const CYCLE_TIME = 3600; // 60 seconds
const BOX_HEIGHT = 18;
const FONT_SIZE = 14;
const OFFSET_Y = -20; // adjust this to move up/down relative to name

// Alias drawItem instead of update
const _Window_BattleStatus_drawItem =
    Window_BattleStatus.prototype.drawItem;

Window_BattleStatus.prototype.drawItem = function(index) {
    _Window_BattleStatus_drawItem.call(this, index);
    this.drawCyclingStateForActor(index);
};

Window_BattleStatus.prototype.drawCyclingStateForActor = function(index) {

    const actor = $gameParty.battleMembers()[index];
    if (!actor) return;

    const states = actor.states();
    if (!states.length) return;

    const rect = this.itemRect(index);

    const cycleIndex =
        Math.floor(Graphics.frameCount / CYCLE_TIME) % states.length;

    const state = states[cycleIndex];

    const x = rect.x;
    const width = rect.width;

    // Anchor relative to name row (top of slot)
    const y = rect.y + OFFSET_Y;

    const prevSize = this.contents.fontSize;
    this.contents.fontSize = FONT_SIZE;

    this.contents.paintOpacity = 120;
    this.contents.fillRect(x, y, width, BOX_HEIGHT, "rgba(0,0,0,0.3)");
    this.contents.paintOpacity = 255;

    this.drawText(state.name, x, y, width, "center");

    this.contents.fontSize = prevSize;
};

})();