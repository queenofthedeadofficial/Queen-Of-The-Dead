/*:
 * @plugindesc Disables all battleback graphics but keeps compatibility with YEP_ImprovedBattlebacks.
 * @author
 */

(function() {

"use strict";

// Return empty bitmap instead of loading battleback images
Spriteset_Battle.prototype.battleback1Bitmap = function() {
    return new Bitmap(1, 1);
};

Spriteset_Battle.prototype.battleback2Bitmap = function() {
    return new Bitmap(1, 1);
};

// After creation, ensure battleback sprites are invisible
const _createBattleback = Spriteset_Battle.prototype.createBattleback;
Spriteset_Battle.prototype.createBattleback = function() {
    _createBattleback.call(this);

    if (this._back1Sprite) {
        this._back1Sprite.bitmap = new Bitmap(1,1);
        this._back1Sprite.opacity = 0;
    }

    if (this._back2Sprite) {
        this._back2Sprite.bitmap = new Bitmap(1,1);
        this._back2Sprite.opacity = 0;
    }
};

})();