export type DialogButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type Dialog = { id: number; title: string; message?: string; buttons: DialogButton[];
  options?: { cancelable?: boolean; onDismiss?: () => void } };

export class AlertQueue {
  current: Dialog | null = null;
  private pending: Dialog[] = [];
  private listeners = new Set<() => void>();
  private nextId = 1;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.current;
  private emit() { this.listeners.forEach(fn => fn()); }
  push(title: string, message?: string, buttons?: DialogButton[], options?: Dialog['options']) {
    const dialog = { id: this.nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options };
    if (this.current) this.pending.push(dialog); else this.current = dialog;
    this.emit();
  }
  async choose(id: number, index: number) {
    if (this.current?.id !== id || !this.current.buttons[index]) return;
    const button = this.current.buttons[index];
    this.current = this.pending.shift() ?? null; this.emit();
    await button.onPress?.();
  }
  dismiss() {
    if (!this.current || this.current.options?.cancelable === false) return;
    const dialog = this.current;
    const cancel = dialog.buttons.findIndex(button => button.style === 'cancel');
    if (cancel >= 0) void this.choose(dialog.id, cancel);
    else { this.current = this.pending.shift() ?? null; this.emit(); }
    dialog.options?.onDismiss?.();
  }
  clear() { this.current = null; this.pending = []; this.emit(); }
}
export const alertQueue = new AlertQueue();
