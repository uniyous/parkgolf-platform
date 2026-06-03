let natsReady = false;

export function setNatsReady(value: boolean) {
  natsReady = value;
}

export function isNatsReady(): boolean {
  return natsReady;
}
