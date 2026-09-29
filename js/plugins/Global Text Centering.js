/*:
 * @plugindesc v1.2 Safe Global Message Centering – TSR_TextColorAddOn Aware
 * @author Original: ChatGPT  |  Updated: Claude
 *
 * @help
 * Centers each message line automatically.
 *
 * v1.2: Escape codes from TSR_TextColorAddOn (\C[x], \I[x]) and
 * other plugins are now stripped from the width calculation before
 * centering, so color-coded lines no longer shift left.
 *
 * Escape sequences in textState.text use \x1b (ESC, char 27) as
 * the marker — e.g. \C[32] is stored as \x1bC[32]. This plugin
 * strips all such sequences before calling measureTextWidth, then
 * adds back the correct width for any icons found.
 *
 * Place BELOW YEP plugins and TSR_TextColorAddOn.
 */

(function () {

    // ------------------------------------------------------------------
    // _stripEscapeCodes
    // Remove all RPG Maker escape sequences from a string so that
    // measureTextWidth only sees actual visible characters.
    //
    // Returns { text: <cleaned string>, iconCount: <number> }.
    // Icons are counted separately because \I[x] does advance the draw
    // cursor (TSR renders them at font-scaled width), so their space
    // must be added back after measuring the plain text.
    // ------------------------------------------------------------------
    Window_Message.prototype._stripEscapeCodes = function (text) {
        if (!text) return { text: '', iconCount: 0 };
        var iconCount = 0;

        // 1) Count and remove icon codes first — pattern: \x1bI[digits]
        //    These are handled separately because they contribute real width.
        text = text.replace(/\x1bI\[\d+\]/gi, function () {
            iconCount++;
            return '';
        });

        // 2) Strip all remaining bracketed escape codes.
        //    Covers \C[32], \C[32,24,o18w3], \FS[20], \FN[Arial],
        //    \OC[5], \OW[3], and any other plugin codes of this form.
        text = text.replace(/\x1b\w+\[[^\]]*\]/g, '');

        // 3) Strip un-bracketed multi-character word codes with no [].
        //    e.g. any leftover \x1bXYZ sequences.
        text = text.replace(/\x1b\w+/g, '');

        // 4) Strip single special-character codes (non-word chars after ESC).
        //    Covers standard RMMV codes: \$ \. \| \! \> \< \^
        text = text.replace(/\x1b[^\w\n]/g, '');

        // 5) Remove any stray ESC characters that remain.
        text = text.replace(/\x1b/g, '');

        return { text: text, iconCount: iconCount };
    };

    // ------------------------------------------------------------------
    // _safeTextWidth
    // Measure the true rendered width of a line, ignoring all escape
    // codes and correctly adding space for any icons present.
    // ------------------------------------------------------------------
    Window_Message.prototype._safeTextWidth = function (text) {
        if (!text) return 0;

        var result = this._stripEscapeCodes(text);
        var width  = this.contents.measureTextWidth(result.text);

        // TSR_TextColorAddOn auto-scales icons relative to font size:
        //   iconWidth = fontSize + (fontSize / 4.66) * 2
        // TSR also adds a 4px margin when advancing textState.x per icon.
        if (result.iconCount > 0) {
            var pad       = this.contents.fontSize / 4.66;
            var iconWidth = this.contents.fontSize + pad * 2 + 4;
            width += result.iconCount * iconWidth;
        }

        return width;
    };

    // ------------------------------------------------------------------
    // _getCurrentLine
    // Return the raw text of the current line from textState.index to
    // the next \n, including any escape sequences (stripped later).
    // ------------------------------------------------------------------
    Window_Message.prototype._getCurrentLine = function (textState) {
        var start = textState.index;
        var end   = textState.text.indexOf('\n', start);
        if (end === -1) end = textState.text.length;
        return textState.text.substring(start, end);
    };

    // ------------------------------------------------------------------
    // processCharacter override — center each line at its start.
    //
    // The centering offset is set once when x reaches 0 (start of a
    // new line), then held for the rest of the line. Color/outline
    // escape codes don't advance textState.x, so the offset is
    // preserved correctly while TSR processes them.
    // ------------------------------------------------------------------
    var _alias_processCharacter = Window_Message.prototype.processCharacter;
    Window_Message.prototype.processCharacter = function (textState) {
        if (textState.index === 0 || textState.x === 0) {
            var line  = this._getCurrentLine(textState);
            var width = this._safeTextWidth(line);
            var space = this.contentsWidth();
            textState.x = Math.max(0, Math.floor((space - width) / 2));
        }
        _alias_processCharacter.call(this, textState);
    };

    // ------------------------------------------------------------------
    // newLineX — keep at 0 so the centering check fires at every new
    // line start, preventing YEP from forcing a different alignment.
    // ------------------------------------------------------------------
    Window_Message.prototype.newLineX = function () {
        return 0;
    };

})();