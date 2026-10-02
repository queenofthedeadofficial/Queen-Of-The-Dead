//=============================================================================
// Andrew_GreyTextEscapeCode.js
//=============================================================================

/*:
 * @plugindesc v1.0 Adds escape codes to render text in disabled/grey color within message windows.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * DESCRIPTION
 * ============================================================================
 * This plugin adds escape codes to grey out text in message windows, matching
 * the appearance of disabled choices. Useful for indicating unavailable options,
 * locked features, or conditional text within dialogue.
 *
 * ============================================================================
 * ESCAPE CODES
 * ============================================================================
 *
 * \grey<text> or \GREY<text>
 * - Renders the text in grey (disabled color).
 * - Text reverts to normal color after the escape code closes.
 *
 * Example: "This is \grey<disabled text> and this is normal."
 *
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 * The plugin patches Window_Base.prototype.convertEscapeCharacters to parse
 * the new escape codes. Text wrapped in \grey<...> is converted to internal
 * color control codes that match RPG Maker's disabled item color.
 *
 * ============================================================================
 */

(function() {
    'use strict';

    // Store the original convertEscapeCharacters function
    var _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;

    /**
     * Override convertEscapeCharacters to handle \grey<...> escape codes
     */
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        // Skip \grey<...> handling entirely during battle
        if (!($gameParty && $gameParty.inBattle())) {
            // Get the disabled/grey color index
            // RPG Maker's disabled color is typically index 7 (grey)
            var disabledColorIndex = 7;

            // Convert \grey<text> and \GREY<text> BEFORE the original conversion
            // This way the backslash isn't consumed by the original function
            text = text.replace(/\\grey<([^>]*?)>/gi, function(match, content) {
                console.log('Match found:', match, 'Content:', content);
                // Use \c[n] format for color codes
                return '\\c[' + disabledColorIndex + ']' + content + '\\c[0]';
            });

            console.log('Text after grey conversion (pre-original):', text);
        }

        // Now apply the original escape character conversions
        text = _Window_Base_convertEscapeCharacters.call(this, text);

        console.log('Text after original conversion:', text);

        return text;
    };

})();