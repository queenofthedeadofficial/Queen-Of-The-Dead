//=============================================================================
// ADRI_VerticalTurnOrderDisplay.js
//=============================================================================

/*:
 * @plugindesc Converts YEP_X_TurnOrderDisplay into a vertical display with X/Y offsets.
 * @author ChatGPT
 *
 * @param X Offset
 * @type number
 * @default 0
 * @desc Horizontal position offset.
 *
 * @param Y Offset
 * @type number
 * @default 0
 * @desc Vertical position offset.
 *
 * @param Direction
 * @type combo
 * @option down
 * @option up
 * @default down
 * @desc Direction icons are arranged.
 *
 * @param Spacing
 * @type number
 * @default 4
 * @desc Additional pixel spacing between icons.
 *
 * @help
 * Requires YEP_X_TurnOrderDisplay.
 *
 * Changes the turn order display from horizontal to vertical.
 *
 * Place below:
 * YEP_X_TurnOrderDisplay.js
 *
 */

var Imported = Imported || {};
Imported.ADRI_VerticalTurnOrderDisplay = true;

var ADRI = ADRI || {};
ADRI.VTOD = ADRI.VTOD || {};

(function() {

var parameters = PluginManager.parameters(
    'ADRI_VerticalTurnOrderDisplay'
);

ADRI.VTOD.xOffset =
    Number(parameters['X Offset'] || 0);

ADRI.VTOD.yOffset =
    Number(parameters['Y Offset'] || 0);

ADRI.VTOD.direction =
    String(parameters['Direction'] || 'down');

ADRI.VTOD.spacing =
    Number(parameters['Spacing'] || 4);


//=============================================================================
// Replace horizontal positioning
//=============================================================================

Window_TurnOrderIcon.prototype.updateDestinationX = function() {

    if (!this.battler()) return;
    if (this.battler().isDead()) return;

    this._destinationX =
        this.verticalX();

    this._destinationY =
        this.verticalY();

};


// Fixed X position
Window_TurnOrderIcon.prototype.verticalX = function() {

    return Yanfly.Param.TODPositionX === 'left'
        ? this.width + ADRI.VTOD.xOffset
        : Graphics.boxWidth - this.width +
          ADRI.VTOD.xOffset;

};


// Vertical stacking position
Window_TurnOrderIcon.prototype.verticalY = function() {

    var index = this.turnOrderDisplayIndex();

    var spacing = this.height + ADRI.VTOD.spacing;

    var y;

    if (ADRI.VTOD.direction === 'up') {

        y =
        Graphics.boxHeight -
        Yanfly.Param.TODPositionY -
        this.height -
        (index * spacing);

    } else {

        y =
        Yanfly.Param.TODPositionY +
        (index * spacing);

    }

    return y + ADRI.VTOD.yOffset;

};


//=============================================================================
// Override movement to use vertical destination
//=============================================================================

Window_TurnOrderIcon.prototype.updatePosition = function() {

    if (BattleManager._escaped) return;


    // X movement
    if (this._destinationX !== this.x) {

        var moveX =
        Math.max(1,
        Math.abs(this._destinationX - this.x) / 4);

        if (this.x > this._destinationX)
            this.x = Math.max(
                this.x - moveX,
                this._destinationX
            );

        if (this.x < this._destinationX)
            this.x = Math.min(
                this.x + moveX,
                this._destinationX
            );

    }


    // Y movement
    if (this._destinationY !== this.y) {

        var moveY =
        Math.max(1,
        Math.abs(this._destinationY - this.y) / 4);

        if (this.y > this._destinationY)
            this.y = Math.max(
                this.y - moveY,
                this._destinationY
            );

        if (this.y < this._destinationY)
            this.y = Math.min(
                this.y + moveY,
                this._destinationY
            );

    }

};

})();