//=============================================================================
// EquipSceneWhiteText.js
//=============================================================================

/*:
 * @plugindesc Makes equipment slot text and equip parameter text white.
 * @author ChatGPT
 *
 * @help
 * Requires YEP_EquipCore.js
 *
 * Changes:
 * - Equipment slot names -> white
 * - Parameter names -> white
 * - Parameter values remain unchanged
 *
 */

//=============================================================================
// Window_EquipSlot
//=============================================================================

Window_EquipSlot.prototype.drawItem = function(index) {
    if (!this._actor) return;

    var rect = this.itemRectForText(index);

    // Slot name
    this.resetTextColor();
    this.changePaintOpacity(this.isEnabled(index));

    var ww1 = this._nameWidth;
    this.drawText(this.slotName(index), rect.x, rect.y, ww1);

    // Equipment name
    var ww2 = rect.width - ww1;
    var item = this._actor.equips()[index];

    if (item) {
        this.drawItemName(item, rect.x + ww1, rect.y, ww2);
    } else {
        this.drawEmptySlot(rect.x + ww1, rect.y, ww2);
    }

    this.changePaintOpacity(true);
};


//=============================================================================
// Window_StatCompare
//=============================================================================

Window_StatCompare.prototype.drawParamName = function(y, paramId) {
    var x = this.textPadding();

    // White instead of system color
    this.resetTextColor();

    this.drawText(
        TextManager.param(paramId),
        x,
        y,
        this._paramNameWidth
    );
};