/*:
 * @plugindesc ADRI Weakness/Immunity layout: Weakness above Immunity, Immunity above HP. No Resistances.
 * @author Copilot
 */
(function() {
  'use strict';

  // --- Helpers: parse notetags on enemy (manual lists override auto detection) ---
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

  // Robust detection using element rates but only for Weakness and Immunity
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

  // --- Override only if ADRI window exists ---
  if (typeof Window_InBattleEnemyStatus !== 'undefined') {

    // Return only weak and immune lists; manual notetags take precedence
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

    // Draw a labeled line
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

    // New drawSimpleEnemyStatus: Weakness above Immunity, Immunity above HP, HP/MP fixed
    Window_InBattleEnemyStatus.prototype.drawSimpleEnemyStatus = function(enemy, showStats, x, y, width) {
      var lineHeight = this.lineHeight();
      var x2 = x + 80;
      var width2 = Math.max(120, width - 80);

      // Name and icons
      this.drawEnemyFullName(enemy, showStats, x2, y, width2);
      this.drawActorIcons(enemy, x2, y + lineHeight * 1);

      // Fixed HP/MP Y positions (do not move)
      var hpY = y + lineHeight * 3;   // HP sits here
      var mpY = y + lineHeight * 4;   // MP sits here

      // Compute lists
      var lists = this._getWeakImmuneLists(enemy);
      var weakText = elementNamesFromIds(lists.weak);
      var immuneText = elementNamesFromIds(lists.immune);

      // Layout: place Weakness highest, Immunity just above HP
      // Tweak these offsets to taste
      var weakY = y + Math.ceil(lineHeight * 1.05);   // just below name/icons
      var immuneY = hpY - Math.ceil(lineHeight * 0.9); // directly above HP

      // Draw Weakness (top)
      this._drawLabelLine('Weakness:', weakText, x2, weakY, width2, this.textColor(17));

      // Draw Immunity (above HP)
      this._drawLabelLine('Immunity:', immuneText, x2, immuneY, width2, this.normalColor());

      // Draw HP and MP at fixed positions
      this.drawEnemyHp(enemy, showStats, x2, hpY, width2);
      this.drawEnemyMp(enemy, showStats, x2, mpY, width2);
    };
  } else {
    console.warn('ADRI Weak/Imm patch: Window_InBattleEnemyStatus not found.');
  }

})();
