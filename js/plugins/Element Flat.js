 /*:
 * @plugindesc Flat Element Damage Bonuses (stable makeDamageValue version)
 * @author You
 */

(function() {

//------------------------------------------------------
// Notetag parsing
//------------------------------------------------------

function processElementFlatNotetags(group) {
    const regex = /<Element Flat:\s*(\d+),\s*([+\-]?\d+)>/i;

    for (let i = 1; i < group.length; i++) {
        const obj = group[i];
        if (!obj) continue;

        obj.elementFlat = {};

        if (!obj.note) continue;

        const lines = obj.note.split(/[\r\n]+/);

        for (const line of lines) {
            const match = regex.exec(line);

            if (match) {
                const elementId = Number(match[1]);
                const value = Number(match[2]);

                obj.elementFlat[elementId] =
                    (obj.elementFlat[elementId] || 0) + value;
            }
        }
    }
}

//------------------------------------------------------
// Load notetags
//------------------------------------------------------

const _DataManager_isDatabaseLoaded =
    DataManager.isDatabaseLoaded;

DataManager.isDatabaseLoaded = function() {
    if (!_DataManager_isDatabaseLoaded.call(this)) return false;

    if (!this._elementFlatLoaded) {
        processElementFlatNotetags($dataWeapons);
        processElementFlatNotetags($dataArmors);
        processElementFlatNotetags($dataStates);
        processElementFlatNotetags($dataActors);
        processElementFlatNotetags($dataClasses);

        this._elementFlatLoaded = true;
    }

    return true;
};

//------------------------------------------------------
// Trait aggregation helper
//------------------------------------------------------

Game_Battler.prototype.elementFlatBonus = function(elementId) {
    let total = 0;

    const objects = this.traitObjects();

    for (const obj of objects) {
        if (obj && obj.elementFlat && obj.elementFlat[elementId]) {
            total += obj.elementFlat[elementId];
        }
    }

    return total;
};

//------------------------------------------------------
// CORE FIX: inject into makeDamageValue (FINAL SAFE POINT)
//------------------------------------------------------

const _Game_Action_makeDamageValue =
    Game_Action.prototype.makeDamageValue;

Game_Action.prototype.makeDamageValue = function(target, critical) {

    let value =
        _Game_Action_makeDamageValue.call(this, target, critical);

    const subject = this.subject();
    const item = this.item();

    if (!item || !item.damage) return value;

    let elementId = item.damage.elementId;

    let bonus = 0;

    // ------------------------------------------
    // Normal Attack handling (-1)
    // ------------------------------------------
    if (elementId === -1) {
        const elements = subject.attackElements();

        for (const id of elements) {
            bonus += subject.elementFlatBonus(id);
        }
    }

    // ------------------------------------------
    // Fixed element skill
    // ------------------------------------------
    else if (elementId > 0) {
        bonus += subject.elementFlatBonus(elementId);
    }

    // ------------------------------------------
    // Apply flat bonus BEFORE result exists
    // ------------------------------------------
    if (bonus !== 0) {
        value += bonus;
    }

    return value;
};

})();