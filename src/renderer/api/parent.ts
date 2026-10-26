export type ParentApi = Window['schoolTutor']['parent'];

export const parentApi: ParentApi = {
  getStatus: () => window.schoolTutor.parent.getStatus(),
  setupPin: (pin) => window.schoolTutor.parent.setupPin(pin),
  unlock: (pin) => window.schoolTutor.parent.unlock(pin),
  lock: () => window.schoolTutor.parent.lock(),
};
