/*:
 * @plugindesc Autosave UI tweak — remove icon and shift text left 50px (YEP patch for MV)
 * @author You
 */
(function() {
  var SHIFT_X = -50; // negative moves text left; change to taste

  // 1) Prevent icons from drawing inside the autosave window
  var _Window_Base_drawIcon = Window_Base.prototype.drawIcon;
  Window_Base.prototype.drawIcon = function(iconIndex, x, y) {
    // Skip drawing icons for the autosave window class
    if (this.constructor && this.constructor.name === 'Window_AutoSave') {
      return;
    }
    _Window_Base_drawIcon.call(this, iconIndex, x, y);
  };

  // 2) Override the autosave window refresh to redraw text shifted left
  if (typeof Window_AutoSave !== 'undefined') {
    var _WA_refresh = Window_AutoSave.prototype.refresh;
    Window_AutoSave.prototype.refresh = function() {
      if (_WA_refresh) _WA_refresh.call(this);

      if (!this.contents) return;
      this.contents.clear();

      // Determine text (try common property names)
      var text = this._message || this._text || this._autosaveText || 'Autosaved';

      // Vertical centering
      var lh = this.lineHeight();
      var y = Math.floor((this.contents.height - lh) / 2);

      // Draw shifted text: extend width so centering still behaves but is offset
      var drawWidth = this.contents.width - SHIFT_X; // add space when SHIFT_X negative
      this.resetTextColor();
      this.drawText(text, SHIFT_X, y, drawWidth, 'center');
    };
  } else {
    // If Window_AutoSave isn't defined, try to patch common YEP window name
    if (typeof Window_MessageAutoSave !== 'undefined') {
      var _WMA_refresh = Window_MessageAutoSave.prototype.refresh;
      Window_MessageAutoSave.prototype.refresh = function() {
        if (_WMA_refresh) _WMA_refresh.call(this);
        if (!this.contents) return;
        this.contents.clear();
        var text = this._message || this._text || 'Autosaved';
        var lh = this.lineHeight();
        var y = Math.floor((this.contents.height - lh) / 2);
        var drawWidth = this.contents.width - SHIFT_X;
        this.resetTextColor();
        this.drawText(text, SHIFT_X, y, drawWidth, 'center');
      };
    }
  }
})();
