//=============================================================================
// EquipSceneWhiteArrow.js
//=============================================================================

/*:
 * @plugindesc Makes equip comparison arrows white, hides the Luck arrow,
 * adds a blank row between MP and Attack, and allows arrow X positioning.
 * @author ChatGPT
 *
 * @param Arrow X Offset
 * @type number
 * @default 0
 * @desc Moves only the comparison arrows horizontally.
 * Positive = right, Negative = left.
 *
 * @help
 * Requires YEP_EquipCore.js
 *
 * Changes:
 * - Default comparison arrows become white.
 * - Luck stat arrow is hidden.
 * - Adds an empty row between MP and ATK.
 * - Adds an X offset for arrows only.
 * - Stat increase/decrease colors remain unchanged.
 *
 */

//=============================================================================
// Parameters
//=============================================================================

var EquipArrowParameters = PluginManager.parameters('EquipSceneWhiteArrow');
var EquipArrowXOffset = Number(EquipArrowParameters['Arrow X Offset'] || 18);


//=============================================================================
// Window_StatCompare
//=============================================================================

Window_StatCompare.prototype.refresh = function() {
    this.contents.clear();

    if (!this._actor) return;

    var row = 0;

    for (var i = 0; i < 8; ++i) {

        // Blank row between MP and Attack
        if (i === 2) {
            row++;
        }

        this.drawItem(
            0,
            this.lineHeight() * row,
            i
        );

        row++;
    }
};


//=============================================================================
// Draw Parameters
//=============================================================================

Window_StatCompare.prototype.drawItem = function(x, y, paramId) {
    this.drawDarkRect(x, y, this.contents.width, this.lineHeight());

    this.drawParamName(y, paramId);
    this.drawCurrentParam(y, paramId);

    // Hide arrow for Luck
    if (paramId !== 7) {
        this.drawRightArrow(y);
    }

    if (!this._tempActor) return;

    this.drawNewParam(y, paramId);
    this.drawParamDifference(y, paramId);
};


//=============================================================================
// Arrow Drawing
//=============================================================================

Window_StatCompare.prototype.drawRightArrow = function(y) {

    var x = this.contents.width - this.textPadding();

    x -= this._paramValueWidth + this._arrowWidth +
         this._bonusValueWidth;

    // Apply arrow-only offset
    x += EquipArrowXOffset;

    var dw = this.textWidth('\u2192' + ' ');

    // White default arrow
    this.resetTextColor();

    this.drawText('\u2192', x, y, dw, 'center');
};