/*:
 * @plugindesc Alphabetizes states in YEP_X_InBattleStatus. v1.0
 * @author ChatGPT
 *
 * @help
 * ============================================================================
 * Requirements
 * ============================================================================
 *
 * Requires:
 *   YEP_X_InBattleStatus
 *
 * Place this plugin BELOW:
 *   YEP_X_InBattleStatus
 *
 * ============================================================================
 * What This Does
 * ============================================================================
 *
 * Alphabetizes the displayed states in the in-battle status menu.
 *
 * Buffs and debuffs remain at the bottom in their normal parameter order.
 *
 * Example:
 *
 * Before:
 *   Poison
 *   Blind
 *   Sleep
 *
 * After:
 *   Blind
 *   Poison
 *   Sleep
 *
 * ============================================================================
 */

(function() {

    'use strict';

    const _makeItemList =
        Window_InBattleStateList.prototype.makeItemList;

    Window_InBattleStateList.prototype.makeItemList = function() {

        this._data = [];

        if (this._battler) {

            //-------------------------------------------------------------------------
            // STATES
            //-------------------------------------------------------------------------

            var states = this._battler.states().filter(function(state) {
                return this.includes(state);
            }, this);

            states.sort(function(a, b) {

                var nameA = a.name.toLowerCase();
                var nameB = b.name.toLowerCase();

                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;

            });

            this._data = this._data.concat(states);

            //-------------------------------------------------------------------------
            // BUFFS / DEBUFFS
            //-------------------------------------------------------------------------

            for (var i = 0; i < 8; ++i) {

                if (this._battler.isBuffAffected(i) ||
                    this._battler.isDebuffAffected(i)) {

                    this._data.push('buff ' + i);

                }
            }
        }

        //-------------------------------------------------------------------------
        // HEALTHY
        //-------------------------------------------------------------------------

        if (this._data.length <= 0) {
            this._data.push(null);
        }
    };

})();