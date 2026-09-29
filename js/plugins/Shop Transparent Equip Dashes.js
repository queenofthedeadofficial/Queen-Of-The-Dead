//=============================================================================
// Andrew_TransparentDashes.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_TransparentDashes = true;

var Andrew = Andrew || {};
Andrew.TransparentDashes = Andrew.TransparentDashes || {};

//=============================================================================
/*:
 * @plugindesc v1.00 Suppresses the '---' placeholder text drawn by
 * YEP_ItemCore (and similar windows) for empty item data slots.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Overview
 * ============================================================================
 *
 * YEP_ItemCore's Window_ShopStatus (and any other window following the same
 * pattern) draws a literal '---' string for item data slots that have no
 * value, instead of leaving the cell blank. This plugin intercepts all calls
 * to Window_Base.prototype.drawText and silently skips drawing whenever the
 * text being drawn is exactly '---' (after trimming whitespace), so the
 * dashes never get painted.
 *
 * This is intentionally a low-level patch (on Window_Base.drawText itself)
 * rather than targeting a specific window class, since it will work no
 * matter which window is responsible for drawing the dashes - including
 * custom status windows.
 *
 * Place this plugin BELOW YEP_ItemCore (and below any other plugins that
 * might draw the same '---' placeholder) in the Plugin Manager list.
 *
 * ============================================================================
 * Notes
 * ============================================================================
 *
 * If your project uses '---' as legitimate text anywhere else (e.g. as a
 * deliberate separator in a different window), that text will also be
 * suppressed by this plugin, since the check is on the string itself and
 * not on the window/context calling it. If that turns out to be a problem,
 * let me know which window is affected and I can scope this down to a
 * specific class (e.g. only Window_ShopStatus) instead of patching
 * Window_Base globally.
 *
 * ============================================================================
 */
//=============================================================================

Andrew.TransparentDashes.Window_Base_drawText =
    Window_Base.prototype.drawText;
Window_Base.prototype.drawText = function(text, x, y, maxWidth, align) {
    if (typeof text === 'string' && text.trim() === '---') {
        return;
    }
    Andrew.TransparentDashes.Window_Base_drawText.call(
        this, text, x, y, maxWidth, align
    );
};