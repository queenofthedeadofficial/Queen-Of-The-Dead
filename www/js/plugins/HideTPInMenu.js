/*:
 * @plugindesc Hides TP in menus (but not in battle). 
 * @author You
 */

(function() {

    // Override drawActorTp in base window to do nothing in menus
    var _Scene_MenuBase_create = Scene_MenuBase.prototype.create;
    Scene_MenuBase.prototype.create = function() {
        _Scene_MenuBase_create.call(this);
        Window_Base.prototype.drawActorTp = function() {};
    };

})();