/*:
 * @plugindesc Disables preemptive and surprise attacks entirely.
 */

(function() {
"use strict";

Game_Party.prototype.ratePreemptive = function(troopAgi) {
    return 0;
};

Game_Party.prototype.rateSurprise = function(troopAgi) {
    return 0;
};

})();