/*:
 * @plugindesc Horizontal title menu with configurable spacing, font size, transparency, and position.
 * @author ChatGPT
 *
 * @param Font Size
 * @type number
 * @min 12
 * @max 72
 * @default 24
 *
 * @param X Position
 * @type number
 * @default 0
 *
 * @param Y Position
 * @type number
 * @default 0
 *
 * @param Spacing
 * @type number
 * @min 0
 * @default 40
 *
 * @help
 * Horizontal title menu with clean spacing control and layout centering.
 */

(function() {

const params = PluginManager.parameters(document.currentScript.src.replace(/^.*\/([^/]+)$/, '$1'));

const FONT_SIZE = Number(params["Font Size"] || 24);
const POS_X = Number(params["X Position"] || 0);
const POS_Y = Number(params["Y Position"] || 550);
const SPACING = Number(params["Spacing"] || 40);

// -------------------- Window Setup --------------------

const _initialize = Window_TitleCommand.prototype.initialize;

Window_TitleCommand.prototype.initialize = function() {
    _initialize.call(this);

    this.opacity = 0;
    this.backOpacity = 0;
};

// -------------------- Layout --------------------

Window_TitleCommand.prototype.maxCols = function() {
    return this.maxItems();
};

Window_TitleCommand.prototype.numVisibleRows = function() {
    return 1;
};

Window_TitleCommand.prototype.windowWidth = function() {
    return Graphics.boxWidth;
};

// Positioning
Window_TitleCommand.prototype.updatePlacement = function() {
    this.x = POS_X;
    this.y = POS_Y >= 0
        ? POS_Y
        : Graphics.boxHeight + POS_Y - this.windowHeight();
};

// -------------------- Spacing + Centering --------------------

// Override item width to shrink natural spacing influence
Window_TitleCommand.prototype.itemWidth = function() {
    return this.textWidth(this.commandName(0)) + 32;
};

// Center whole command group
Window_TitleCommand.prototype.itemRect = function(index) {
    const items = this.maxItems();
    let totalWidth = 0;

    for (let i = 0; i < items; i++) {
        totalWidth += this.itemWidth();
        if (i < items - 1) totalWidth += SPACING;
    }

    const startX = (this.contentsWidth() - totalWidth) / 2;

    let x = startX;
    for (let i = 0; i < index; i++) {
        x += this.itemWidth() + SPACING;
    }

    return new Rectangle(x, 0, this.itemWidth(), this.itemHeight());
};

// -------------------- Font Size --------------------

const _resetFontSettings =
    Window_TitleCommand.prototype.resetFontSettings;

Window_TitleCommand.prototype.resetFontSettings = function() {
    _resetFontSettings.call(this);
    this.contents.fontSize = FONT_SIZE;
};

})();