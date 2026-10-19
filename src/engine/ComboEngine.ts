import { AttackMoveType, FighterState, PlayerInput } from './types';

export class ComboEngine {
  /**
   * Street Fighter style cancel hierarchy:
   * - LIGHT (Punch) can cancel into HEAVY (Kick), SPECIAL, or SUPER once it connects (or during early recovery)
   * - HEAVY (Kick) can cancel into SPECIAL or SUPER once it connects (or during early recovery)
   * - SPECIAL can cancel into SUPER if meter >= 100
   */
  public static canCancelMove(
    fighter: FighterState,
    requestedMove: AttackMoveType
  ): boolean {
    if (requestedMove === 'NONE') return false;

    const inCancelWindow =
      (fighter.attackState === 'ACTIVE' || fighter.attackState === 'RECOVERY') &&
      fighter.hitConfirmedThisMove;

    if (!inCancelWindow) return false;

    if (fighter.currentMove === 'LIGHT') {
      return (
        requestedMove === 'HEAVY' ||
        requestedMove === 'SPECIAL' ||
        requestedMove === 'SUPER'
      );
    }

    if (fighter.currentMove === 'HEAVY') {
      return requestedMove === 'SPECIAL' || requestedMove === 'SUPER';
    }

    if (fighter.currentMove === 'SPECIAL') {
      return requestedMove === 'SUPER';
    }

    return false;
  }

  public static resolveRequestedCancel(
    fighter: FighterState,
    input: PlayerInput
  ): AttackMoveType {
    if (input.special && fighter.silenceFrames === 0) {
      if (fighter.meter >= 100 && (input.heavyAttack || input.up)) {
        if (this.canCancelMove(fighter, 'SUPER')) return 'SUPER';
      }
      if (fighter.meter >= 20 && this.canCancelMove(fighter, 'SPECIAL')) {
        return 'SPECIAL';
      }
    }
    if (input.heavyAttack && this.canCancelMove(fighter, 'HEAVY')) {
      return 'HEAVY';
    }
    return 'NONE';
  }
}
