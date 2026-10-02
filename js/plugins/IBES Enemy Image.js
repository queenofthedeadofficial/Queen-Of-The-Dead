//=============================================================================
// ADRI Enemy Status Image.js
//=============================================================================

/*:
 * @plugindesc Adds enemy battle images to ADRI_InBattleEnemyStatus window.
 *
 * @param Image Box Width
 * @type number
 * @default 150
 *
 * @param Image Box Height
 * @type number
 * @default 150
 *
 * @param Image X Offset
 * @type number
 * @default 0
 *
 * @param Image Y Offset
 * @type number
 * @default 0
 *
 * @help
 * Place below ADRI_InBattleEnemyStatus.js
 *
 * Draws enemy battle sprites in the enemy status window.
 * Images are automatically scaled down to fit the box.
 */

(function() {

var params = PluginManager.parameters('ADRI Enemy Status Image');

var boxWidth  = Number(params['Image Box Width'] || 150);
var boxHeight = Number(params['Image Box Height'] || 150);
var offsetX   = Number(params['Image X Offset'] || 366);
var offsetY   = Number(params['Image Y Offset'] || -15);


//=============================================================================
// Window_InBattleEnemyStatus
//=============================================================================

var _ADRI_Window_InBattleEnemyStatus_refreshSimpleVersion =
    Window_InBattleEnemyStatus.prototype.refreshSimpleVersion;

Window_InBattleEnemyStatus.prototype.refreshSimpleVersion = function(showStats) {

    this.drawEnemyImage(
        this._battler,
        this.standardPadding() + offsetX,
        this.standardPadding() + offsetY
    );

    _ADRI_Window_InBattleEnemyStatus_refreshSimpleVersion.call(
        this,
        showStats
    );
};


//=============================================================================
// Draw Enemy Image
//=============================================================================

Window_InBattleEnemyStatus.prototype.drawEnemyImage = function(enemy, x, y) {

    if (!enemy) return;

    var bitmap = this.getEnemyBitmap(enemy);

    if (!bitmap || !bitmap.isReady()) return;


    var scale = 1;

    if (bitmap.width > boxWidth) {
        scale = Math.min(scale, boxWidth / bitmap.width);
    }

    if (bitmap.height > boxHeight) {
        scale = Math.min(scale, boxHeight / bitmap.height);
    }


    var width = bitmap.width * scale;
    var height = bitmap.height * scale;


    var dx = x + (boxWidth - width) / 2;
    var dy = y + (boxHeight - height) / 2;


    this.contents.blt(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        dx,
        dy,
        width,
        height
    );
};


//=============================================================================
// Get Enemy Bitmap
//=============================================================================

Window_InBattleEnemyStatus.prototype.getEnemyBitmap = function(enemy) {

    var sprites = SceneManager._scene._spriteset._enemySprites;

    if (!sprites) return null;

    for (var i = 0; i < sprites.length; i++) {

        var sprite = sprites[i];

        if (sprite._enemy === enemy) {
            return sprite.bitmap;
        }

    }

    return null;
};


})();