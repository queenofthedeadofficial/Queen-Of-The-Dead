/*:
 * @plugindesc v1.0 Adds stackable flat elemental resistance (e.g. -1 Fire damage) via notetags.
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Flat Elemental Resistance
 * ============================================================================
 *
 * This plugin adds flat (additive) elemental mitigation that stacks from
 * equipment, states, classes, actors, and enemies.
 *
 * Requires:
 *  - YEP_DamageCore
 *  - YEP_ElementCore (optional but recommended)
 *
 * ---------------------------------------------------------------------------
 * Notetag Format (any trait-bearing object):
 * ---------------------------------------------------------------------------
 *
 * <Flat Element Resist: Fire +1>
 * <Flat Element Resist: Ice +2>
 * <Flat Element Resist: 3 +5>      // Element ID
 * <Flat Element Resist: Thunder -2> // Vulnerability
 *
 * You may use multiple notetags on the same object.
 *
 * ---------------------------------------------------------------------------
 * Behavior
 * ---------------------------------------------------------------------------
 * - Applied AFTER normal damage calculation
 * - Applied AFTER element rate (% modifiers)
 * - Supports multi-element skills (Element Core)
 * - Damage is clamped to a minimum of 0
 *
 * ---------------------------------------------------------------------------
 * Plugin Order (IMPORTANT)
 * ---------------------------------------------------------------------------
 * 1. YEP_BuffsStatesCore
 * 2. YEP_DamageCore
 * 3. YEP_ElementCore
 * 4. FlatElementResist   <-- this plugin
 *
 * ============================================================================
 */

(function() {
  'use strict';

  // -------------------------------------------------------------------------
  // Flat Element Resist Getter
  // -------------------------------------------------------------------------

  Game_BattlerBase.prototype.flatElementResist = function(elementId) {
    let total = 0;
    const elementName = $dataSystem.elements[elementId];

    this.traitObjects().forEach(obj => {
      if (!obj || !obj.note) return;

      const regex = /<Flat Element Resist:\s*(\w+|\d+)\s*([+-]?\d+)>/gi;
      let match;

      while ((match = regex.exec(obj.note)) !== null) {
        const key = match[1];
        const value = parseInt(match[2], 10);

        // Match by ID or name
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
  // Damage Hook (Global Application)
  // -------------------------------------------------------------------------

  const _Game_Action_makeDamageValue =
    Game_Action.prototype.makeDamageValue;

  Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);

    if (value > 0 && this.item() && this.item().damage) {
      let elementIds = [];

      // Element Core support (multi-element skills)
      if (Imported.YEP_ElementCore && this.getElementIdList) {
        elementIds = this.getElementIdList();
      } else {
        const eId = this.item().damage.elementId;
        if (eId > 0) elementIds = [eId];
      }

      let flatReduction = 0;
      elementIds.forEach(eId => {
        flatReduction += target.flatElementResist(eId);
      });

      value = Math.max(value - flatReduction, 0);
    }

    return value;
  };

})();
