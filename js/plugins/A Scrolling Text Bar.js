(function() {

const MAX_VISIBLE_ROWS = 6;

// Only modify when choices exceed the limit
const _Window_ChoiceList_numVisibleRows =
    Window_ChoiceList.prototype.numVisibleRows;

Window_ChoiceList.prototype.numVisibleRows = function() {
    const count = this.maxItems();

    if (count > MAX_VISIBLE_ROWS) {
        return MAX_VISIBLE_ROWS; // enable scrolling
    }

    // Otherwise, use default behavior
    return _Window_ChoiceList_numVisibleRows.call(this);
};

})();