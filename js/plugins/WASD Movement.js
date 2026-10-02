//=============================================================================
// Andrew_WASDMovement.js
//=============================================================================

/*:
 * @plugindesc v1.03 Adds WASD movement controls.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * WASD Movement
 * ============================================================================
 *
 * W = Up
 * S = Down
 * A = Left
 * D = Right
 *
 * Arrow keys remain unchanged.
 *
 * This plugin directly interfaces with RPG Maker MV's Input system.
 * No YEP plugins are required.
 *
 * ============================================================================
 */

(function() {

    'use strict';

    //--------------------------------------------------------------------------
    // WASD key codes
    //--------------------------------------------------------------------------

    var WASD_KEYS = {
        87: 'up',      // W
        83: 'down',    // S
        65: 'left',    // A
        68: 'right'    // D
    };

    //--------------------------------------------------------------------------
    // Key Down
    //--------------------------------------------------------------------------

    var _Input_onKeyDown = Input._onKeyDown;

    Input._onKeyDown = function(event) {

        var buttonName = WASD_KEYS[event.keyCode];

        if (buttonName) {
            this._currentState[buttonName] = true;
            event.preventDefault();
            return;
        }

        _Input_onKeyDown.call(this, event);
    };

    //--------------------------------------------------------------------------
    // Key Up
    //--------------------------------------------------------------------------

    var _Input_onKeyUp = Input._onKeyUp;

    Input._onKeyUp = function(event) {

        var buttonName = WASD_KEYS[event.keyCode];

        if (buttonName) {
            this._currentState[buttonName] = false;
            event.preventDefault();
            return;
        }

        _Input_onKeyUp.call(this, event);
    };

})();