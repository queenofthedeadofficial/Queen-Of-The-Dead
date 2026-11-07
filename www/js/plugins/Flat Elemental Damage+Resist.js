/*:
 * @plugindesc v1.0 Unified flat elemental damage and resistance system.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Flat Element Modifiers
 * ============================================================================
 *
 * Supports flat elemental DAMAGE (attacker) and flat elemental RESISTANCE
 * (target), stacking from equipment, states, classes, actors, enemies, and
 * party auras.
 *
 * Requires:
 *  - YEP_DamageCore
 *  - YEP_ElementCore (recommended)
 *
 * ---------------------------------------------------------------------------
 * NOTETAGS (any trait-bearing object)
 * ---------------------------------------------------------------------------
 *
 * <Flat Element Damage: Fire +2>
 * <Flat Element Damage: 3 +5>
 *
 * <Flat Element Resist: Ice +3>
 * <Flat Element Resist: Thunder -2>
 *
 * ---------------------------------------------------------------------------
 * ORDER OF OPERATIONS
 * ---------------------------------------------------------------------------
 * 1. Base damage + % modifiers (YEP)
 * 2. Flat elemental DAMAGE bonus (attacker)
 * 3. Flat elemental RESISTANCE (target)
 * 4. Clamp to minimum 0
 *
 * ---------------------------------------------------------------------------
 * PLUGIN ORDER (MANDATORY)
 * ---------------------------------------------------------------------------
 * 1. YEP_BuffsStatesCore
 * 2. YEP_DamageCore
 * 3. YEP_ElementCore
 * 4. FlatElementModifiers
 *
 * ============================================================================
 */

(function() {
  'use strict';

  // -------------------------------------------------------------------------
  // Utility: Read Flat Element Value
  // -------------------------------------------------------------------------

  function readFlatElement(obj, tag, elementId) {
    if (!obj || !obj.note) return 0;

    const elementName = $dataSystem.elements[elementId];
    const regex = new RegExp(
      `<${tag}:\\s*(\\w+|\\d+)\\s*([+-]?\\d+)>`,
      'gi'
    );

    let total = 0;
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

    return total;
  }

  // -------------------------------------------------------------------------
  // Battler Accessors
  // -------------------------------------------------------------------------

  Game_BattlerBase.prototype.flatElementDamage = function(elementId) {
    return this.traitObjects().reduce((sum, obj) =>
      sum + readFlatElement(obj, 'Flat Element Damage', elementId), 0);
  };

  Game_BattlerBase.prototype.flatElementResist = function(elementId) {
    return this.traitObjects().reduce((sum, obj) =>
      sum + readFlatElement(obj, 'Flat Element Resist', elementId), 0);
  };

  // -------------------------------------------------------------------------
  // Unified Damage Hook
  // -------------------------------------------------------------------------

  const _Game_Action_makeDamageValue =
    Game_Action.prototype.makeDamageValue;

  Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    if (value > 0 && this.item() && this.item().damage) {
      let elementIds = [];

      if (Imported.YEP_ElementCore && this.getElementIdList) {
        elementIds = this.getElementIdList();
      } else {
        const eId = this.item().damage.elementId;

        if (eId === -1) {
          elementIds = this.subject().attackElements();
        } else if (eId > 0) {
          elementIds = [eId];
        }
      }

      let bonus = 0;
      let resist = 0;

      elementIds.forEach(eId => {
        bonus += this.subject().flatElementDamage(eId);
        resist += target.flatElementResist(eId);
      });

      value = value + bonus - resist;
      value = Math.max(value, 0);
    }

    return value;
  };

})();
