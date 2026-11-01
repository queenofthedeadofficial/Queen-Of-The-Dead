/*:
 * @plugindesc ADRI: shift Weakness, Immunity, HP and MP up by a fixed offset (40px) 
 * @author Copilot
 */
(function() {
  'use strict';

  var SHIFT_PIXELS = 40; // change this value to move elements more/less

  function parseIdListFromNote(note, tag) {
    if (!note) return [];
    var m = note.match(new RegExp('<' + tag + ':\\s*([^>]+)>', 'i'));
    if (!m) return [];
    return m[1].split(',').map(function(s){ return Number(s.trim()); }).filter(function(n){ return n > 0; });
  }

  function elementNamesFromIds(ids) {
    if (!ids || !ids.length) return '';
    return ids.map(function(id){ return $dataSystem.elements[id] || ('Elem' + id); }).join(', ');
  }

  function detectWeakImmuneLists(enemy) {
    var weak = [], immune = [];
    if (!enemy) return { weak: weak, immune: immune };
    var weakThreshold = 1.5;
    var eps = 1e-6;
    var maxElements = $dataSystem ? $dataSystem.elements.length - 1 : 0;
    for (var eid = 1; eid <= maxElements; eid++) {
      var rate = (typeof enemy.elementRate === 'function') ? enemy.elementRate(eid) : 1;
      if (Math.abs(rate) <= eps) { immune.push(eid); continue; }
      if (rate >= weakThreshold - eps) { weak.push(eid); continue; }
    }
    return { weak: weak, immune: immune };
  }

  if (typeof Window_InBattleEnemyStatus !== 'undefined') {

    Window_InBattleEnemyStatus.prototype._getWeakImmuneLists = function(enemy) {
      var enemyData = enemy && enemy.enemy ? enemy.enemy() : null;
      if (enemyData && enemyData.note) {
        var manualWeak = parseIdListFromNote(enemyData.note, 'weaknesses');
        var manualImm = parseIdListFromNote(enemyData.note, 'immunities');
        if (manualWeak.length || manualImm.length) {
          return { weak: manualWeak, immune: manualImm };
        }
      }
      return detectWeakImmuneLists(enemy);
    };

    Window_InBattleEnemyStatus.prototype._drawLabelLine = function(label, text, x, y, width, color) {
      if (!text) return;
      var labelWidth = this.textWidth(label + ' ');
      this.changeTextColor(this.systemColor());
      this.drawText(label, x, y, labelWidth, 'left');
      this.resetTextColor();
      if (color) this.changeTextColor(color);
      this.drawText(text, x + labelWidth, y, width - labelWidth, 'left');
      this.resetTextColor();
    };

    Window_InBattleEnemyStatus.prototype.drawSimpleEnemyStatus = function(enemy, showStats, x, y, width) {
      var lineHeight = this.lineHeight();
      var x2 = x + 80;
      var width2 = Math.max(120, width - 80);

      // Name and icons
      this.drawEnemyFullName(enemy, showStats, x2, y, width2);
      this.drawActorIcons(enemy, x2, y + lineHeight * 1);

      // Fixed HP/MP Y positions moved up by SHIFT_PIXELS
      var hpY = y + lineHeight * 3 - SHIFT_PIXELS;
      var mpY = y + lineHeight * 4 - SHIFT_PIXELS;

      // Compute lists
      var lists = this._getWeakImmuneLists(enemy);
      var weakText = elementNamesFromIds(lists.weak);
      var immuneText = elementNamesFromIds(lists.immune);

      // Layout: Weakness above Immunity, Immunity directly above HP; both shifted up
      var weakY = y + Math.ceil(lineHeight * 1.05) - SHIFT_PIXELS;   // higher line
      var immuneY = hpY - Math.ceil(lineHeight * 0.9); // directly above HP (already shifted via hpY)

      // Draw Weakness and Immunity
      this._drawLabelLine('Weakness:', weakText, x2, weakY, width2, this.textColor(17));
      this._drawLabelLine('Immunity:', immuneText, x2, immuneY, width2, this.normalColor());

      // Draw HP and MP at their shifted positions
      this.drawEnemyHp(enemy, showStats, x2, hpY, width2);
      this.drawEnemyMp(enemy, showStats, x2, mpY, width2);
    };
  } else {
    console.warn('ADRI shift patch: Window_InBattleEnemyStatus not found.');
  }

})();
