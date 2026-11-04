/*:
 * @plugindesc Show only skill description in help window and strip icon escapes.
 * @author You
 */
(function() {

  var _Scene_Skill_updateHelp = Scene_Skill.prototype.updateHelp;
  Scene_Skill.prototype.updateHelp = function() {
    _Scene_Skill_updateHelp.call(this);
    var skill = this.item();
    if (!skill || !this._helpWindow) return;

    // Get raw description from database
    var text = skill.description || '';

    // Remove icon escape codes like \i[12]
    text = text.replace(/\\i

\[\d+\]

/g, '');

    // Remove any leading/trailing whitespace and collapse multiple newlines to a single space
    text = text.replace(/\r?\n+/g, ' ').trim();

    // Convert other escape characters (e.g., \V[n], \C[n]) safely
    text = this._helpWindow.convertEscapeCharacters(text);

    // Set the help window text (this replaces whatever YEP might have appended)
    this._helpWindow.setText(text);
  };

})();
