/*:
 * @plugindesc Skip YEP Item Synthesis category menu and exit on Cancel.
 * @author ChatGPT
 *
 * Place below YEP_ItemSynthesis.
 */

(function() {

    var _Scene_Synthesis_create = Scene_Synthesis.prototype.create;
    Scene_Synthesis.prototype.create = function() {
        _Scene_Synthesis_create.call(this);

        if (Scene_Synthesis.availableItems().length > 0) {
            this._commandWindow.selectSymbol('item');
        } else if (Scene_Synthesis.availableWeapons().length > 0) {
            this._commandWindow.selectSymbol('weapon');
        } else if (Scene_Synthesis.availableArmors().length > 0) {
            this._commandWindow.selectSymbol('armor');
        }

        this._commandWindow.deactivate();

        this._listWindow.refresh();
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_Synthesis.prototype.onListCancel = function() {
        $gameTemp._synthRecipe = undefined;
        this.popScene();
    };

})();