/*:
 * @plugindesc Element Repeat - Adds conditional native-style repeats based on element.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Notetag
 * ============================================================================
 *
 * Place on:
 * - Weapons
 * - Armors
 * - States
 * - Skills
 * - Actors
 * - Classes
 * - Enemies
 *
 * Format:
 *
 *   <Element Repeat: x, y>
 *
 * x = Element ID
 * y = Percent chance
 *
 * Example:
 *
 *   <Element Repeat: 3, 50>
 *
 * Gives:
 * - 50% chance
 * - to add +1 native repeat
 * - when using a skill/item with element ID 3
 *
 * ============================================================================
 * Features
 * ============================================================================
 *
 * - Uses TRUE native MV repeat flow
 * - Single animation sequence
 * - Native repeat damage popup behavior
 * - Repeat roll cached once per action
 * - Multiple notetags stack additively
 * - Compatible with most YEP setups
 *
 */

(function() {

"use strict";

//=============================================================================
// Notetag Processing
//=============================================================================

function processElementRepeatNotetags(group) {

    const regex =
        /<Element Repeat:\s*(\d+)\s*,\s*(\d+)\s*>/i;

    for (let i = 1; i < group.length; i++) {

        const obj = group[i];
        if (!obj) continue;

        obj.elementRepeat = {};

        if (!obj.note) continue;

        const lines = obj.note.split(/[\r\n]+/);

        for (const line of lines) {

            const match = regex.exec(line);

            if (match) {

                const elementId = Number(match[1]);
                const chance = Number(match[2]);

                obj.elementRepeat[elementId] =
                    (obj.elementRepeat[elementId] || 0) + chance;
            }
        }
    }
}

//=============================================================================
// Database Load
//=============================================================================

const _DataManager_isDatabaseLoaded =
    DataManager.isDatabaseLoaded;

DataManager.isDatabaseLoaded = function() {

    if (!_DataManager_isDatabaseLoaded.call(this)) {
        return false;
    }

    if (!this._elementRepeatLoaded) {

        processElementRepeatNotetags($dataWeapons);
        processElementRepeatNotetags($dataArmors);
        processElementRepeatNotetags($dataStates);
        processElementRepeatNotetags($dataSkills);
        processElementRepeatNotetags($dataActors);
        processElementRepeatNotetags($dataClasses);
        processElementRepeatNotetags($dataEnemies);

        this._elementRepeatLoaded = true;
    }

    return true;
};

//=============================================================================
// Helper
//=============================================================================

Game_Battler.prototype.elementRepeatChance = function(elementId) {

    let total = 0;

    const objects = this.traitObjects();

    for (const obj of objects) {

        if (obj &&
            obj.elementRepeat &&
            obj.elementRepeat[elementId]) {

            total += obj.elementRepeat[elementId];
        }
    }

    return total;
};

//=============================================================================
// Native Repeat Injection
//=============================================================================

const _Game_Action_numRepeats =
    Game_Action.prototype.numRepeats;

Game_Action.prototype.numRepeats = function() {

    let repeats =
        _Game_Action_numRepeats.call(this);

    // Already rolled for this action
    if (this._elementRepeatChecked) {
        return repeats + this._elementRepeatBonus;
    }

    this._elementRepeatChecked = true;
    this._elementRepeatBonus = 0;

    const subject = this.subject();
    const item = this.item();

    if (!subject || !item || !item.damage) {
        return repeats;
    }

    const elementId = item.damage.elementId;

    // Ignore non-element skills
    if (elementId <= 0) {
        return repeats;
    }

    let chance =
        subject.elementRepeatChance(elementId);

    // Skill/item self support
    if (item.elementRepeat &&
        item.elementRepeat[elementId]) {

        chance += item.elementRepeat[elementId];
    }

    // Roll ONCE and cache result
    if (chance > 0 &&
        Math.random() * 100 < chance) {

        this._elementRepeatBonus = 1;
    }

    return repeats + this._elementRepeatBonus;
};

})();