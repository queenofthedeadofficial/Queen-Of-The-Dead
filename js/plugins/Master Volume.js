/*:
 * @plugindesc Forces all Sound Effects to use the SE volume set in the Options menu.
 * @author ChatGPT
 *
 * @help
 * No plugin commands.
 *
 * This plugin ensures every SE is scaled by the current
 * Sound Effects volume from the Options menu.
 */

(function() {

    var _AudioManager_playSe = AudioManager.playSe;
    AudioManager.playSe = function(se) {
        if (!se) return;

        var copy = {
            name: se.name,
            pan: se.pan || 0,
            pitch: se.pitch || 100,
            volume: Math.round((se.volume || 90) * this.seVolume / 100)
        };

        _AudioManager_playSe.call(this, copy);
    };

})();