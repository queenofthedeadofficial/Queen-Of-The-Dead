/*:
@title Large Choices - Cancel Fix
@author YourName
@version 3.0
@plugindesc v3.0 - Fixes cancel/Jump to Label in HIME_LargeChoices nested choice structures.
Place BELOW HIME_LargeChoices. Remove all previous versions of this fix.

@help
ROOT CAUSE
----------
When the interpreter resumes after cancel is pressed inside a nested inner
submenu (indent:3), it correctly executes command403 and command119, and
jumpTo(1) is called successfully. However on the next frame the interpreter
walks forward from index 1 and encounters the unmerged inner code:102
commands that sit inside the 402 branch blocks at indent:3. Because the
interpreter's current indent is 3, command102 fires for these inner choice
commands, HIME clones the list again and opens a new spurious choice window
which immediately terminates -- closing the event before the outer menu
can display.

FIX
---
We alias command102 to track whether we are currently inside a jumpTo
recovery. After command119 fires and sets a new _index, we flag the
interpreter. While the flag is active, any command102 whose indent is
GREATER than the indent at which the jump landed is suppressed -- it is
treated as a branch interior that should be skipped, not executed.
The flag clears as soon as the interpreter reaches a command at the
correct indent level that is not a spurious inner 102.
*/

(function () {

  if (!TH || !TH.LargeChoices) return;

  /* alias command119 to set a recovery flag after any jump */
  var _c119 = Game_Interpreter.prototype.command119;
  Game_Interpreter.prototype.command119 = function () {
    var result = _c119.call(this);
    /* after the jump, record the indent we landed at so command102
       can suppress any inner 102 commands at deeper indents        */
    this._jumpRecoveryIndent = this._indent;
    return result;
  };

  /* alias command102 to suppress spurious inner choice windows
     that the interpreter encounters while walking out of a nested
     branch after a jumpTo                                          */
  var _c102 = Game_Interpreter.prototype.command102;
  Game_Interpreter.prototype.command102 = function () {
    if (this._jumpRecoveryIndent !== undefined) {
      if (this._indent > this._jumpRecoveryIndent) {
        /* this is an inner 102 inside a branch we are leaving --
           skip its entire block and continue                      */
        this.skipBranch();
        return true;
      } else {
        /* we have reached a 102 at or above the jump landing indent
           this is a legitimate new choice command -- clear the flag */
        this._jumpRecoveryIndent = undefined;
      }
    }
    return _c102.call(this);
  };

  /* also clear the flag on any non-choice command at the landing
     indent so it does not persist across unrelated events         */
  var _exec = Game_Interpreter.prototype.executeCommand;
  Game_Interpreter.prototype.executeCommand = function () {
    if (this._jumpRecoveryIndent !== undefined) {
      var cmd = this.currentCommand();
      if (cmd && cmd.indent <= this._jumpRecoveryIndent &&
          cmd.code !== 102 && cmd.code !== 402 &&
          cmd.code !== 403 && cmd.code !== 404) {
        this._jumpRecoveryIndent = undefined;
      }
    }
    return _exec.call(this);
  };

})();
