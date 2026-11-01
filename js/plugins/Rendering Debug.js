/*:
 * @plugindesc DEBUG: prove we can draw in Scene_Battle
 */

(function() {

const _Scene_Battle_start = Scene_Battle.prototype.start;
Scene_Battle.prototype.start = function() {
    _Scene_Battle_start.call(this);

    const sprite = new Sprite(new Bitmap(400, 60));
    sprite.bitmap.fontSize = 24;
    sprite.bitmap.drawText("DEBUG TEXT VISIBLE", 0, 0, 400, 60, 'center');

    sprite.x = 100;
    sprite.y = 100;

    this.addChild(sprite);
};

})();