/*:
 * @plugindesc Customize ExtDoT single-line messages
 * @author You
 */
(function() {
  BattleManager.pushPassiveLogEntry = function(targetName, amount, sourceName, isHeal) {
    if (!$gameParty.inBattle()) return;
    // Example formats:
    // 1) Include state name and amount: "Bob took 12 damage from Poison."
    // 2) Include state and target: "Poison dealt 12 to Bob."
    // 3) Use localization-friendly template:
    const verb = isHeal ? "recovered" : "took";
    const sentence = `${targetName} ${verb} ${amount} HP from ${sourceName}.`;
    BattleManager._turnActions.push({
      subject: sentence,
      skill: "",
      log: [],
      passive: true
    });
  };
})();
