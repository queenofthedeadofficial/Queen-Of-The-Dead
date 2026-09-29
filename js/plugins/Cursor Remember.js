(function() {

    var cursorMemory = {};
    var currentKey = null;

    function makeKey(interpreter) {
        if (!interpreter) return "global";

        return [
            interpreter._mapId,
            interpreter._eventId,
            interpreter._index
        ].join("_");
    }

    // Capture key when choices start
    var _start = Window_ChoiceList.prototype.start;
    Window_ChoiceList.prototype.start = function() {
        _start.call(this);

        currentKey = makeKey(this._interpreter);
        this._rcc_pendingApply = true;
    };

    // Apply selection AFTER window is ready (HIME-safe)
    var _update = Window_ChoiceList.prototype.update;
    Window_ChoiceList.prototype.update = function() {
        _update.call(this);

        if (this._rcc_pendingApply && this.isOpen()) {
            this._rcc_pendingApply = false;

            if (cursorMemory[currentKey] !== undefined) {
                var idx = cursorMemory[currentKey];
                idx = Math.max(0, Math.min(idx, this.maxItems() - 1));

                if (this.smoothSelect) {
                    this.smoothSelect(idx);
                } else {
                    this.select(idx);
                }
            }
        }
    };

    // Save on OK
    var _callOkHandler = Window_ChoiceList.prototype.callOkHandler;
    Window_ChoiceList.prototype.callOkHandler = function() {
        cursorMemory[currentKey] = this.index();
        _callOkHandler.call(this);
    };

    // Save on Cancel
    var _callCancelHandler = Window_ChoiceList.prototype.callCancelHandler;
    Window_ChoiceList.prototype.callCancelHandler = function() {
        if (this.index() >= 0) {
            cursorMemory[currentKey] = this.index();
        }
        _callCancelHandler.call(this);
    };

})();