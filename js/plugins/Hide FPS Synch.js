/*:
 * @plugindesc Removes FPS Synch option from Options menu (MV)
 */

(function() {

const _Window_Options_addGeneralOptions =
    Window_Options.prototype.addGeneralOptions;

Window_Options.prototype.addGeneralOptions = function() {
    _Window_Options_addGeneralOptions.call(this);

    // Remove FPS Synch option by symbol
    this._list = this._list.filter(function(opt) {
        return opt.symbol !== "synchFps" && opt.symbol !== "fpsSync";
    });
};

})();