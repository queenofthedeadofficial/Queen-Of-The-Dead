//=============================================================================
// ADRI Enemy HP MP Label Colors.js
//=============================================================================

/*:
 * @plugindesc Changes enemy HP and MP label colors and X positions only.
 *
 * @param HP Text X Offset
 * @type number
 * @default 0
 *
 * @param MP Text X Offset
 * @type number
 * @default 0
 *
 * @help
 * Place BELOW ADRI_InBattleEnemyStatus.js
 *
 * HP label color: #b0ff90
 * MP label color: #8cfffb
 */

(function() {

var params = PluginManager.parameters('ADRI Enemy HP MP Label Colors');

var hpOffset = Number(params['HP Text X Offset'] || 180);
var mpOffset = Number(params['MP Text X Offset'] || 180);


//-----------------------------------------------------------------------------
// HP
//-----------------------------------------------------------------------------

var _drawActorHp = Window_InBattleEnemyStatus.prototype.drawActorHp;

Window_InBattleEnemyStatus.prototype.drawActorHp = function(actor, x, y, width) {

    var oldSystemColor = this.systemColor;
    var oldDrawText = this.drawText;
    var firstText = true;

    this.systemColor = function() {
        return '#b0ff90';
    };

    this.drawText = function(text, dx, dy, dw, align) {

        if (firstText && text === TextManager.hpA) {
            firstText = false;
            return oldDrawText.call(this, text, dx + hpOffset, dy, dw, align);
        }

        return oldDrawText.call(this, text, dx, dy, dw, align);
    };

    _drawActorHp.call(this, actor, x, y, width);

    this.drawText = oldDrawText;
    this.systemColor = oldSystemColor;
};


//-----------------------------------------------------------------------------
// MP
//-----------------------------------------------------------------------------

var _drawActorMp = Window_InBattleEnemyStatus.prototype.drawActorMp;

Window_InBattleEnemyStatus.prototype.drawActorMp = function(actor, x, y, width) {

    var oldSystemColor = this.systemColor;
    var oldDrawText = this.drawText;
    var firstText = true;

    this.systemColor = function() {
        return '#8cfffb';
    };

    this.drawText = function(text, dx, dy, dw, align) {

        if (firstText && text === TextManager.mpA) {
            firstText = false;
            return oldDrawText.call(this, text, dx + mpOffset, dy, dw, align);
        }

        return oldDrawText.call(this, text, dx, dy, dw, align);
    };

    _drawActorMp.call(this, actor, x, y, width);

    this.drawText = oldDrawText;
    this.systemColor = oldSystemColor;
};


})();