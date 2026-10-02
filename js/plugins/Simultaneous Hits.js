/*:
 * @plugindesc Simultaneous Hits - Makes a skill/item hit a fixed number of
 * times via TRUE native MV repeats.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Notetag
 * ============================================================================
 *
 * Place on:
 * - Skills
 * - Items
 *
 * Format:
 *
 *   <Simultaneous Hits: X>
 *
 * X = total number of hits
 *
 * Example:
 *
 *   <Simultaneous Hits: 3>
 *
 * Gives:
 * - The skill/item hits exactly 3 times
 * - via native MV repeat flow (same animation sequence and damage popup
 *   behavior as a native <Repeats: 3> would produce)
 *
 * This is a flat override, not a bonus -- if present, it replaces the
 * item's normal repeat count entirely rather than adding to it. If you
 * want it to add on top of the item's native Repeats setting instead,
 * let me know and I can switch it to additive.
 *
 * For multi-target actions, hits are applied round-robin across all
 * targets (everyone takes hit 1, then everyone takes hit 2, etc.) rather
 * than native MV's default of finishing all repeats on one target before
 * moving to the next.
 *
 * ============================================================================
 * Features
 * ============================================================================
 *
 * - Uses TRUE native MV repeat flow
 * - Single animation sequence
 * - Native repeat damage popup behavior
 * - Repeat count cached once per action
 *
 */

(function() {

"use strict";

//=============================================================================
// Notetag Processing
//=============================================================================

function processSimultaneousHitsNotetags(group) {

    const regex =
        /<Simultaneous Hits:\s*(\d+)\s*>/i;

    for (let i = 1; i < group.length; i++) {

        const obj = group[i];
        if (!obj) continue;

        obj.simultaneousHits = 0;

        if (!obj.note) continue;

        const lines = obj.note.split(/[\r\n]+/);

        for (const line of lines) {

            const match = regex.exec(line);

            if (match) {
                obj.simultaneousHits = Number(match[1]);
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

    if (!this._simultaneousHitsLoaded) {

        processSimultaneousHitsNotetags($dataSkills);
        processSimultaneousHitsNotetags($dataItems);

        this._simultaneousHitsLoaded = true;
    }

    return true;
};

//=============================================================================
// Native Repeat Injection
//=============================================================================

const _Game_Action_numRepeats =
    Game_Action.prototype.numRepeats;

Game_Action.prototype.numRepeats = function() {

    let repeats =
        _Game_Action_numRepeats.call(this);

    // Already resolved for this action
    if (this._simultaneousHitsChecked) {
        return this._simultaneousHitsOverride !== null ?
            this._simultaneousHitsOverride : repeats;
    }

    this._simultaneousHitsChecked = true;
    this._simultaneousHitsOverride = null;

    const item = this.item();

    if (item &&
        item.simultaneousHits &&
        item.simultaneousHits > 0) {

        this._simultaneousHitsOverride = item.simultaneousHits;
    }

    return this._simultaneousHitsOverride !== null ?
        this._simultaneousHitsOverride : repeats;
};

//=============================================================================
// Round-Robin Target Order
//=============================================================================
// Native MV's repeatTargets() builds the hit list as [A,A,A, B,B,B, C,C,C]
// -- every repeat on one target before moving to the next -- which is why
// each enemy flashes/pops damage in isolation before the next one starts.
// For actions using <Simultaneous Hits: X>, we rebuild that list as
// [A,B,C, A,B,C, A,B,C] instead, so every target takes one hit per pass
// before anyone takes their second. This is scoped to tagged actions only,
// so native <Repeats> elsewhere in the project is unaffected.

const _Game_Action_repeatTargets =
    Game_Action.prototype.repeatTargets;

Game_Action.prototype.repeatTargets = function(targets) {

    const item = this.item();

    if (!item || !item.simultaneousHits || item.simultaneousHits <= 0) {
        return _Game_Action_repeatTargets.call(this, targets);
    }

    const repeats = this.numRepeats();
    const interleaved = [];

    for (let j = 0; j < repeats; j++) {
        for (let i = 0; i < targets.length; i++) {
            if (targets[i]) {
                interleaved.push(targets[i]);
            }
        }
    }

    return interleaved;
};

})();