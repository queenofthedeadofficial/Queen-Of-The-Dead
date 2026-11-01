//=============================================================================
// Andrew_RightMouseCancel.js
//=============================================================================

/*:
 * @plugindesc v1.00 Makes the right mouse button function as the Cancel button.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_RightMouseCancel.js
 * ============================================================================
 *
 * Makes the RIGHT mouse button behave like RPG Maker MV's CANCEL button.
 *
 * Examples:
 *
 *   Menus:
 *     Right-click = Cancel / go back
 *
 *   Item selection:
 *     Right-click = Cancel item selection
 *
 *   Skill selection:
 *     Right-click = Cancel skill selection
 *
 *   Actor/target selection:
 *     Right-click = Cancel target selection
 *
 *   Choice windows:
 *     Right-click = Cancel, if the current choice window allows cancellation
 *
 * This plugin is completely standalone and does not require YEP plugins.
 *
 * It does not add any new menu or party commands.
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //--------------------------------------------------------------------------
    // Mouse input
    //--------------------------------------------------------------------------

    var _TouchInput_onMouseDown = TouchInput._onMouseDown;

    TouchInput._onMouseDown = function(event) {
        _TouchInput_onMouseDown.call(this, event);

        // Right mouse button
        if (event.button === 2) {
            Input._currentState['cancel'] = true;
        }
    };


    //--------------------------------------------------------------------------
    // Prevent the browser's right-click context menu
    //--------------------------------------------------------------------------

    document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });


    //--------------------------------------------------------------------------
    // Release the cancel input when the mouse button is released
    //--------------------------------------------------------------------------

    var _TouchInput_onMouseUp = TouchInput._onMouseUp;

    TouchInput._onMouseUp = function(event) {
        _TouchInput_onMouseUp.call(this, event);

        // Right mouse button
        if (event.button === 2) {
            Input._currentState['cancel'] = false;
        }
    };


})();