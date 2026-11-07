/*:
 * @plugindesc Increase the Party Command Window height by 20 pixels.
 * @author ChatGPT
 *
 * @help
 * Place below YEP_BattleEngineCore.
 */

(function() {

    var _Window_PartyCommand_windowHeight =
        Window_PartyCommand.prototype.windowHeight;

    Window_PartyCommand.prototype.windowHeight = function() {
        return _Window_PartyCommand_windowHeight.call(this) + 20;
    };

})();