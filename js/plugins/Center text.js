/*:
 * @plugindesc v1.0 Global center-align message text (MV/YEP safe)
 * @author (YourName)
 * @help Place this *below* YEP_MessageCore (and YEP ext. packs) in the plugin manager.
 * It will automatically center message text each line/block.
 */

(function() {
    // --- Hook #1: Override Window_Message.newPage ---
    // Keep original (YEP) alias
    const _YEP_Window_Message_newPage = Window_Message.prototype.newPage;
    Window_Message.prototype.newPage = function(textState) {
        // First, let YEP adjust window settings (size, rows, etc.)
        this.adjustWindowSettings();

        // Compute block-center offset on all lines in this page
        // (split on newline; YEP wraps should already have been applied in textState.text)
        const contentWidth = this.contentsWidth();
        const lines = textState.text.split('\n');
        let maxW = 0;
        for (let line of lines) {
            // We should remove escape codes for measurement, but textWidth handles them via convertEscape if needed
            const w = this.textWidth(line);
            if (w > maxW) maxW = w;
        }
        const offset = Math.floor((contentWidth - maxW) / 2);
        // Apply horizontal offset (preserve indent/newLineX)
        textState.x += offset;
        textState.startX += offset;

        // Call original newPage to draw the page
        _YEP_Window_Message_newPage.call(this, textState);
    };

    // --- Hook #2: (Optional) Override createTextState for first-line centering ---
    const _Window_Base_createTextState = Window_Base.prototype.createTextState;
    Window_Base.prototype.createTextState = function(text, x, y, width) {
        const state = _Window_Base_createTextState.call(this, text, x, y, width);
        if (this instanceof Window_Message) {
            // Block-centering fallback for the very first draw (if not using newPage override)
            const contentWidth = this.contentsWidth();
            const lines = text.split('\n');
            let maxW = 0;
            for (let line of lines) {
                const w = this.textWidth(line);
                if (w > maxW) maxW = w;
            }
            const offset = Math.floor((contentWidth - maxW) / 2);
            state.x = offset;
            state.startX = offset;
            state.left = offset;
        }
        return state;
    };

    // --- Hook #3: (Optional) Center each subsequent line on wrap ---
    const _Window_Base_processNewLine = Window_Base.prototype.processNewLine;
    Window_Base.prototype.processNewLine = function(textState) {
        _Window_Base_processNewLine.call(this, textState);
        if (this instanceof Window_Message) {
            // Determine the width of the *next* line (after wrap or newline)
            // Look ahead from current index up to next '\n' or end
            const remaining = textState.text.slice(textState.index);
            const line = remaining.split('\n')[0];
            const lineWidth = this.textWidth(line);
            const offset = Math.floor((this.contentsWidth() - lineWidth) / 2);
            // Apply offset to the new line's starting X
            textState.x = textState.startX + offset;
            textState.left = textState.startX + offset;
        }
    };

    // Note: Do not override processNormalCharacter or drawTextEx here to avoid conflicts.
})();
