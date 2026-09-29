/*:
 * @plugindesc Adds \DEFLOSS escape code for states to show DEF lost from armor break.
 */

(function() {

  const _convert = Window_Base.prototype.convertEscapeCharacters;
  Window_Base.prototype.convertEscapeCharacters = function(text) {
    text = _convert.call(this, text);

    // \DEFLOSS → show target._defDebuffFromHit
    text = text.replace(/\\DEFLOSS/gi, () => {
      const b = this._battler || this._actor || this._enemy;
      if (b && b._defDebuffFromHit != null) {
        return String(b._defDebuffFromHit);
      }
      return "0";
    });

    return text;
  };

})();
