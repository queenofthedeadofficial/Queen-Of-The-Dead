/*:
 * @plugindesc v1.0 Adds stackable flat elemental damage bonuses via notetags.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Flat Elemental Damage Bonus
 * ============================================================================
 *
 * Adds flat elemental damage bonuses that stack from states, equipment,
 * classes, actors, and enemies.
 *
 * Requires:
 *  - YEP_DamageCore
 *  - YEP_ElementCore (optional, recommended)
 *
 * ---------------------------------------------------------------------------
 * Notetag Format (any trait-bearing object):
 * ---------------------------------------------------------------------------
 *
 * <Flat Element Damage: Fire +2>
 * <Flat Element Damage: Ice +5>
 * <Flat Element Damage: 3 +10>     // Element ID
 * <Flat Element Damage: Thunder -2> // Penalty
 *
 * Multiple notetags allowed.
 *
 * ---------------------------------------------------------------------------
 * Behavior
 * ---------------------------------------------------------------------------
 * - Applied AFTER base damage and % modifiers
 * - Applied BEFORE target mitigation
 * - Supports multi-element skills
 * - Damage clamped to minimum of 0 (after all steps)
 *
 * ---------------------------------------------------------------------------
 * Plugin Order (IMPORTANT)
 * ---------------------------------------------------------------------------
 * 1. YEP_BuffsStatesCore
 * 2. YEP_DamageCore
 * 3. YEP_ElementCore
 * 4. FlatElementDamage
 * 5. FlatElementResist (if used)
 *
 * ============================================================================
 */

(function() {
  'use strict';

  // -------------------------------------------------------------------------
  // Flat Element Damage Getter (ATTACKER)
  // -------------------------------------------------------------------------

  Game_BattlerBase.prototype.flatElementDamage = function(elementId) {
    let total = 0;
    const elementName = $dataSystem.elements[elementId];

    this.traitObjects().forEach(obj => {
      if (!obj || !obj.note) return;

      const regex = /<Flat Element Damage:\s*(\w+|\d+)\s*([+-]?\d+)>/gi;
      let match;

      while ((match = regex.exec(obj.note)) !== null) {
        const key = match[1];
        const value = parseInt(match[2], 10);

        if (
          (!isNaN(key) && Number(key) === elementId) ||
          (isNaN(key) && elementName &&
           elementName.toLowerCase() === key.toLowerCase())
        ) {
          total += value;
        }
      }
    });

    return total;
  };

  // -------------------------------------------------------------------------
  // Damage Hook
  // -------------------------------------------------------------------------

  const _Game_Action_makeDamageValue =
    Game_Action.prototype.makeDamageValue;

  Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    if (value > 0 && this.item() && this.item().damage) {
      let elementIds = [];

      // Element Core support
      if (Imported.YEP_ElementCore && this.getElementIdList) {
        elementIds = this.getElementIdList();
      } else {
        const eId = this.item().damage.elementId;

        if (eId === -1) {
          // Normal Attack -> weapon elements
          elementIds = this.subject().attackElements();
        } else if (eId > 0) {
          elementIds = [eId];
        }
      }

      let bonus = 0;
      elementIds.forEach(eId => {
        bonus += this.subject().flatElementDamage(eId);
      });

      value += bonus;
    }

    return Math.max(value, 0);
  };

})();
