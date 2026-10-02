/*:
 * @plugindesc v1.2 Treat "all friends" as including dead allies when an item/skill note contains either:
 *              <scope change rule: all-friend>
 *              or
 *              <scope change rule>all-friend</scope change rule>
 * @author ChatGPT
 *
 * @help
 * Usage:
 *   Add this plugin to the Plugin Manager (place it after any plugin that overrides
 *   Game_Action.prototype.targetsForFriends).
 *
 *   In an Item or Skill Note box include one of these forms:
 *     <scope change rule: all-friend>
 *   or
 *     <scope change rule>all-friend</scope change rule>
 *
 *   When present, the action's friend-targeting will return every member of the
 *   user's allies unit (including dead members).
 *
 * Important:
 * - This plugin only changes *which* allies are targeted. It does NOT revive (set HP)
 *   or remove death states. You must include a revive effect or run a pre-step that
 *   sets HP > 0 for dead actors if you want them to be considered alive by later effects.
 * - If another plugin replaces targetsForFriends, load this plugin after it.
 */

(function() {
  'use strict';

  function normalize(str) {
    return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function hasScopeChangeAllFriend(item) {
    if (!item) return false;

    // 1) Prefer parsed meta (common <tag: value> style)
    if (item.meta) {
      var keys = ['scope change rule', 'scopeChangeRule', 'scope_change_rule'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (Object.prototype.hasOwnProperty.call(item.meta, k)) {
          var v = normalize(String(item.meta[k]));
          if (v === 'all-friend' || v === 'allfriend' || v === 'all friends' || v === 'allfriends') return true;
        }
      }
    }

    // 2) Fallback: inspect raw note text
    if (item.note) {
      var note = item.note.toLowerCase();

      // Accept single-tag form: <scope change rule: all-friend>
      if (note.match(/<\s*scope\s+change\s+rule\s*:\s*all-?friend\s*>/)) return true;

      // Accept XML-style open/close: <scope change rule>all-friend</scope change rule>
      var xmlMatch = note.match(/<\s*scope\s+change\s+rule\s*>\s*([\s\S]*?)\s*<\/\s*scope\s+change\s+rule\s*>/);
      if (xmlMatch && normalize(xmlMatch[1]) === 'all-friend') return true;

      // Also accept content without hyphen: allfriend or "all friends"
      if (xmlMatch && (normalize(xmlMatch[1]) === 'allfriend' || normalize(xmlMatch[1]) === 'all friends')) return true;
    }

    return false;
  }

  // Preserve original for fallback
  var _Game_Action_targetsForFriends = Game_Action.prototype.targetsForFriends;

  Game_Action.prototype.targetsForFriends = function() {
    var item = this.item();
    if (hasScopeChangeAllFriend(item)) {
      return this.friendsUnit().members();
    }
    return _Game_Action_targetsForFriends.call(this);
  };

})();
