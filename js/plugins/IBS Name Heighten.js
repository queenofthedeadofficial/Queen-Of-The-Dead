/*:
 * @plugindesc Raise battle name sprites.
 * @author ChatGPT
 */

(function() {

const _updateBattlerName = Sprite_Battler.prototype.updateBattlerName;

Sprite_Battler.prototype.updateBattlerName = function() {
    _updateBattlerName.call(this);

    if (this._nameSprite) {
        this._nameSprite.y -= 20; // Increase to move higher
    }
};

})();