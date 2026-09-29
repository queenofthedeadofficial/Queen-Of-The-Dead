/*:
 * @plugindesc Equip Switches per item, robust counting + init refresh - v1.3
 * @author ChatGPT
 *
 * @help
 * Item/weapon/armor Note tags:
 * <Equip Switch On: 12,15>
 * <Equip Switch Off: 12>
 *
 * Use console to force refresh:
 * $gameParty.refreshEquipSwitches();
 *
 * Place this plugin below YEP and other equip plugins.
 */

(function() {
  'use strict';

  function parseSwitchIds(note, tagName) {
    var re = new RegExp('<' + tagName + '\\s*:\\s*([0-9,\\s]+)>', 'i');
    var match = re.exec(note || '');
    if (!match) return [];
    return match[1].split(',').map(function(s) {
      return parseInt(s.trim(), 10);
    }).filter(function(n) {
      return !isNaN(n) && n > 0;
    });
  }

  function equipObject(equipEntry) {
    if (!equipEntry) return null;
    if (typeof equipEntry.object === 'function') {
      try { return equipEntry.object(); } catch (e) { return null; }
    }
    return equipEntry;
  }

  // Count how many equipped items across an actor request a given "Equip Switch On"
  Game_Actor.prototype._collectEquipOnCounts = function() {
    var counts = {};
    var eqs = this.equips();
    for (var i = 0; i < eqs.length; i++) {
      var obj = equipObject(eqs[i]);
      if (!obj || !obj.note) continue;
      var onIds = parseSwitchIds(obj.note, 'Equip Switch On');
      onIds.forEach(function(id) {
        counts[id] = (counts[id] || 0) + 1;
      });
    }
    return counts;
  };

  // Apply explicit Off tags on an actor (these are immediate off requests)
  Game_Actor.prototype._collectEquipOffIds = function() {
    var offSet = {};
    var eqs = this.equips();
    for (var i = 0; i < eqs.length; i++) {
      var obj = equipObject(eqs[i]);
      if (!obj || !obj.note) continue;
      var offIds = parseSwitchIds(obj.note, 'Equip Switch Off');
      offIds.forEach(function(id) { offSet[id] = true; });
    }
    return Object.keys(offSet).map(function(x) { return parseInt(x,10); });
  };

  // Refresh switches for a single actor (counts On tags and applies Off tags)
  Game_Actor.prototype.refreshEquipSwitches = function() {
    var counts = this._collectEquipOnCounts();
    // First, set ON for any id with count > 0
    Object.keys(counts).forEach(function(k) {
      var id = parseInt(k, 10);
      $gameSwitches.setValue(id, counts[k] > 0);
    });
    // Then apply any explicit Off tags (these force off regardless of On counts)
    var offIds = this._collectEquipOffIds();
    offIds.forEach(function(id) {
      $gameSwitches.setValue(id, false);
    });
  };

  // Refresh switches for the whole party
  Game_Party.prototype.refreshEquipSwitches = function() {
    // We'll compute global counts across party for On-tags, then apply
    var globalCounts = {};
    for (var p = 0; p < this.members().length; p++) {
      var actor = this.members()[p];
      if (!actor) continue;
      var aCounts = actor._collectEquipOnCounts();
      Object.keys(aCounts).forEach(function(k) {
        var id = parseInt(k, 10);
        globalCounts[id] = (globalCounts[id] || 0) + aCounts[k];
      });
    }
    // Set switches ON where count > 0
    Object.keys(globalCounts).forEach(function(k) {
      var id = parseInt(k, 10);
      $gameSwitches.setValue(id, globalCounts[k] > 0);
    });
    // Apply explicit Off tags per actor (these are treated as force-off)
    for (var q = 0; q < this.members().length; q++) {
      var a = this.members()[q];
      if (!a) continue;
      var offIds = a._collectEquipOffIds();
      offIds.forEach(function(id) {
        $gameSwitches.setValue(id, false);
      });
    }
  };

  // Expose a convenient global function for debugging
  Game_Party.prototype.refreshEquipSwitches = Game_Party.prototype.refreshEquipSwitches;

  // Alias changeEquip to refresh party switches after equip changes
  var _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
  Game_Actor.prototype.changeEquip = function(slotId, item) {
    _Game_Actor_changeEquip.call(this, slotId, item);
    // After equip change, refresh party-level switches
    if ($gameParty) $gameParty.refreshEquipSwitches();
  };

  // Ensure starting equipment is applied: after actor setup, refresh party switches
  var _Game_Actor_setup = Game_Actor.prototype.setup;
  Game_Actor.prototype.setup = function(actorId) {
    _Game_Actor_setup.call(this, actorId);
    // Defer party refresh until all actors are created; we'll call from Scene_Map start as well.
  };

  // On map start, refresh switches to catch initial equipment and any late YEP init
  var _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    _Scene_Map_start.call(this);
    if ($gameParty) {
      // small timeout to allow other init code to finish (safe in MV)
      setTimeout(function() {
        try {
          $gameParty.refreshEquipSwitches();
          console.log('[EquipSwitches] refreshed on map start');
        } catch (e) {
          console.error('[EquipSwitches] refresh failed', e);
        }
      }, 0);
    }
  };

  // Also provide a console helper
  window._refreshEquipSwitches = function() {
    if ($gameParty) {
      $gameParty.refreshEquipSwitches();
      console.log('[EquipSwitches] manual refresh done');
    } else {
      console.log('[EquipSwitches] no $gameParty yet');
    }
  };

})();
