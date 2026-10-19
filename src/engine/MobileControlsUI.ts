export interface VirtualTouchInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
  special: boolean;
  block: boolean;
}

export class MobileControlsUI {
  private static activeInputs: VirtualTouchInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    lightAttack: false,
    heavyAttack: false,
    special: false,
    block: false,
  };

  public static setInput(
    property: keyof VirtualTouchInputState,
    value: boolean,
    isPulse = false
  ): void {
    this.activeInputs[property] = value;
    if (value && isPulse) {
      setTimeout(() => {
        this.activeInputs[property] = false;
      }, 90);
    }
  }

  public static getCurrentInputs(): VirtualTouchInputState {
    return { ...this.activeInputs };
  }

  public static clearAll(): void {
    this.activeInputs = {
      up: false,
      down: false,
      left: false,
      right: false,
      lightAttack: false,
      heavyAttack: false,
      special: false,
      block: false,
    };
  }
}
