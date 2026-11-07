//=============================================================================
// IncreaseActorCommandHeight.js
//=============================================================================

/*:
 * @plugindesc Increases the actor command window height by 20 pixels.
 * @author ChatGPT
 *
 * @help
 * This plugin increases the height of the actor command window only.
 *
 * Place below plugins that modify battle windows.
 *
 */

(function() {

    var _Window_ActorCommand_windowHeight =
        Window_ActorCommand.prototype.windowHeight;

    Window_ActorCommand.prototype.windowHeight = function() {
        return _Window_ActorCommand_windowHeight.call(this) + 20;
    };

})();