(function() {
"use strict";

// REMOVE per-row clipping mask in selectable windows
Window_Selectable.prototype.itemRect = function(index) {
    const rect = new Rectangle();

    const maxCols = this.maxCols ? this.maxCols() : 1;
    const itemWidth = this.itemWidth ? this.itemWidth() : this.contentsWidth();
    const itemHeight = this.itemHeight ? this.itemHeight() : this.lineHeight();

    rect.width = itemWidth;
    rect.height = itemHeight;

    rect.x = (index % maxCols) * itemWidth;
    rect.y = Math.floor(index / maxCols) * itemHeight;

    return rect;
};

})();