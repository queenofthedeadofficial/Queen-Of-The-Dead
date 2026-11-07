/*:
@title Large Choices - Cancel Diagnostics
@author YourName
@plugindesc Temporary diagnostic tool. Place BELOW HIME_LargeChoices. Remove when done.
@help
Logs command119 (Jump to Label) searches and command403 firing.
Check F8 DevTools console while testing cancel in-game.
*/

(function () {

  /* --- log command403 when it fires --- */
  var _c403 = Game_Interpreter.prototype.command403;
  Game_Interpreter.prototype.command403 = function () {
    var branchVal = this._branch[this._indent];
    console.log('=== HIME DIAG: command403 fired ===');
    console.log('  _index:', this._index, '  _indent:', this._indent);
    console.log('  _branch[_indent]:', branchVal, '  will SKIP?', branchVal >= 0);
    var result = _c403.call(this);
    console.log('  command403 returned:', result);
    return result;
  };

  /* --- log command119 (Jump to Label) every time it runs --- */
  var _c119 = Game_Interpreter.prototype.command119;
  Game_Interpreter.prototype.command119 = function () {
    var labelName = this._params[0];
    console.log('=== HIME DIAG: command119 (Jump to Label) ===');
    console.log('  searching for label: "' + labelName + '"');
    console.log('  _list length:', this._list ? this._list.length : 'NULL');

    /* scan for matching label and report what we find */
    var found = false;
    if (this._list) {
      for (var i = 0; i < this._list.length; i++) {
        var cmd = this._list[i];
        if (cmd.code === 118) {
          console.log('  found Label at [' + i + ']: "' + cmd.parameters[0] + '"' +
            (cmd.parameters[0] === labelName ? ' << MATCH' : ''));
          if (cmd.parameters[0] === labelName) found = true;
        }
      }
    }
    if (!found) console.log('  !! NO MATCHING LABEL FOUND in _list !!');

    return _c119.call(this);
  };

  /* --- log terminate with stack trace --- */
  var _term = Game_Interpreter.prototype.terminate;
  var _termLogged = false;
  Game_Interpreter.prototype.terminate = function () {
    if (!_termLogged) {
      _termLogged = true;
      console.log('=== HIME DIAG: FIRST interpreter terminated ===');
      console.trace();
    }
    _term.call(this);
  };

})();
