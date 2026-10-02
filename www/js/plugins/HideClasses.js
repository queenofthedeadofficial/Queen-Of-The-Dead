/*:
 * @plugindesc Hides actor class names globally from menus and UI. Classes still work internally. @author
 */

(function() {

    // Override to prevent drawing the class name
    Window_Base.prototype.drawActorClass = function(actor, x, y, width) {
        // Do nothing — hides class everywhere
    };

})();