//=============================================================================
// Andrew_HpCostReduction.js
//=============================================================================

var Imported = Imported || {};
Imported.Andrew_HpCostReduction = true;

var Andrew = Andrew || {};
Andrew.HpCostReduction = Andrew.HpCostReduction || {};
Andrew.HpCostReduction.version = 1.00;

/*:
 * @plugindesc v1.00 Equipment (and states, classes, actors, enemies) can reduce
 * the HP cost of skills. Requires YEP_SkillCore. Load below it.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * YEP_SkillCore adds HP costs to skills but has no trait for reducing them
 * (MP has MCR, TP has TCR, HP has nothing). This plugin adds one via notetags.
 *
 * Because it wraps Game_BattlerBase.prototype.skillHpCost, the reduced cost is
 * what gets shown in the skill list, checked for affordability, and paid.
 *
 * ============================================================================
 * Notetags
 * ============================================================================
 *
 * Put these in the notebox of a Weapon, Armor, State, Class, Actor or Enemy.
 *
 *   <HP Cost Rate: x%>
 *   Multiplies the HP cost of skills by x%. 75% = costs 25% less,
 *   50% = half cost, 0% = free. Values above 100% increase the cost.
 *   Multiple sources multiply together (two 50% items = 25% of the cost).
 *
 *   <HP Cost Reduction: x>
 *   Subtracts a flat x HP from the cost. Use a negative x to add cost.
 *   Multiple sources add together.
 *
 * Order of operations: the rate is applied first, then the flat reduction.
 * The final cost never drops below 0. Skills with no HP cost are unaffected.
 *
 * Examples:
 *   <HP Cost Rate: 75%>
 *   <HP Cost Reduction: 10>
 */

(function() {

  if (!Imported.YEP_SkillCore) {
    console.error('Andrew_HpCostReduction: YEP_SkillCore is required and ' +
      'must be loaded above this plugin.');
    return;
  }

  var RATE_RE = /<HP COST RATE:\s*(-?\d+(?:\.\d+)?)\s*[%％]>/i;
  var FLAT_RE = /<HP COST REDUCTION:\s*(-?\d+(?:\.\d+)?)>/i;

  // Parse each database object's notetags once and cache the result on it.
  function parsed(obj) {
    if (obj._andrewHpCostParsed) return obj._andrewHpCostParsed;
    var note = obj.note || '';
    var rate = RATE_RE.exec(note);
    var flat = FLAT_RE.exec(note);
    obj._andrewHpCostParsed = {
      rate: rate ? parseFloat(rate[1]) / 100 : 1,
      flat: flat ? parseFloat(flat[1]) : 0
    };
    return obj._andrewHpCostParsed;
  }

  // traitObjects() covers equipment, states (including passive states),
  // class and actor for actors; enemy and states for enemies.
  Game_BattlerBase.prototype.andrewHpCostRate = function() {
    return this.traitObjects().reduce(function(r, obj) {
      return obj ? r * parsed(obj).rate : r;
    }, 1);
  };

  Game_BattlerBase.prototype.andrewHpCostFlat = function() {
    return this.traitObjects().reduce(function(sum, obj) {
      return obj ? sum + parsed(obj).flat : sum;
    }, 0);
  };

  Andrew.HpCostReduction.skillHpCost = Game_BattlerBase.prototype.skillHpCost;
  Game_BattlerBase.prototype.skillHpCost = function(skill) {
    var cost = Andrew.HpCostReduction.skillHpCost.call(this, skill);
    if (cost <= 0) return cost;
    cost = cost * this.andrewHpCostRate() - this.andrewHpCostFlat();
    return Math.max(0, Math.floor(cost));
  };

})();