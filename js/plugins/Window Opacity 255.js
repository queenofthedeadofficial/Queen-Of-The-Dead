/*:
 * @plugindesc Forces all window backgrounds to be fully opaque.
 * @author You
 */

(function() {

const _Window_update = Window.prototype.update;
Window.prototype.update = function() {
    _Window_update.call(this);
    this.backOpacity = 255;
};

})();