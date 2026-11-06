(function() {

    const HP_COLOR_INDEX = 3; // will override below
    const MP_COLOR_INDEX = 4;

    // Inject custom colors into ColorManager (MV-safe approach)
    const _ColorManager_textColor = ColorManager.textColor;
    ColorManager.textColor = function(n) {
        if (n === 3) return "#b0ff90"; // HP label replacement
        if (n === 4) return "#b83dba"; // MP label replacement
        return _ColorManager_textColor.call(this, n);
    };

    // Force HP/MP labels to use those indices
    const _Window_StatusBase_drawActorHpLabel =
        Window_StatusBase.prototype.drawActorHpLabel;

    Window_StatusBase.prototype.drawActorHpLabel = function(actor, x, y, w) {
        this.changeTextColor(this.textColor(3));
        this.drawText(TextManager.hpA, x, y, w);
        this.resetTextColor();
    };

    const _Window_StatusBase_drawActorMpLabel =
        Window_StatusBase.prototype.drawActorMpLabel;

    Window_StatusBase.prototype.drawActorMpLabel = function(actor, x, y, w) {
        this.changeTextColor(this.textColor(4));
        this.drawText(TextManager.mpA, x, y, w);
        this.resetTextColor();
    };

})();