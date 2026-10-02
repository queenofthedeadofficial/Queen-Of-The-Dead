/*:
 * @plugindesc Resets switches 347–350 at true battle start/end and shows Slot Target indicators above party slots. (YEP ChangeBattleEquip Compatible)
 * @author You
 */

(function() {
"use strict";

// ------------------------------
// CONFIG
// ------------------------------
const SWITCHES = [347, 348, 349, 350];
const IMAGE_NAME = "Slot Target";
const Y_OFFSET = -5;
const X_OFFSET = 20;

// ------------------------------
// RESET SWITCHES
// ------------------------------
function resetTargetSwitches() {
    SWITCHES.forEach(id => $gameSwitches.setValue(id, false));
}

// ------------------------------
// BATTLE START / END
// ------------------------------

const _Scene_Battle_start = Scene_Battle.prototype.start;
Scene_Battle.prototype.start = function() {

    // Ignore returning from YEP ChangeBattleEquip
    if (!$gameTemp._cbeBattle) {
        resetTargetSwitches();
    }

    _Scene_Battle_start.call(this);
};


const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
Scene_Battle.prototype.terminate = function() {

    // Ignore leaving battle temporarily for YEP ChangeBattleEquip
    if (!$gameTemp._cbeBattle) {
        resetTargetSwitches();
    }

    _Scene_Battle_terminate.call(this);
};


// ------------------------------
// CREATE SPRITES
// ------------------------------

const _Window_BattleStatus_initialize = Window_BattleStatus.prototype.initialize;
Window_BattleStatus.prototype.initialize = function() {
    _Window_BattleStatus_initialize.call(this);
    this.createSlotTargetSprites();
};

Window_BattleStatus.prototype.createSlotTargetSprites = function() {
    this._slotTargetSprites = [];

    for (let i = 0; i < 4; i++) {
        const sprite = new Sprite(ImageManager.loadPicture(IMAGE_NAME));
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 1;
        sprite.visible = false;

        this.addChild(sprite);
        this._slotTargetSprites.push(sprite);
    }
};


// ------------------------------
// UPDATE
// ------------------------------

const _Window_BattleStatus_update = Window_BattleStatus.prototype.update;
Window_BattleStatus.prototype.update = function() {
    _Window_BattleStatus_update.call(this);
    this.updateSlotTargetSprites();
};


Window_BattleStatus.prototype.updateSlotTargetSprites = function() {
    if (!this._slotTargetSprites) return;

    for (let i = 0; i < this._slotTargetSprites.length; i++) {
        const sprite = this._slotTargetSprites[i];

        const isOn = $gameSwitches.value(SWITCHES[i]);
        sprite.visible = isOn;

        if (isOn) {
            const rect = this.itemRect(i);

            sprite.x = rect.x + rect.width / 2 + X_OFFSET;
            sprite.y = rect.y + Y_OFFSET;
        }
    }
};

})();