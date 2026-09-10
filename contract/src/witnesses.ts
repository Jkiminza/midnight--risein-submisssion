export type NightDeskPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createNightDeskPrivateState = (secretKey: Uint8Array): NightDeskPrivateState => ({
  secretKey,
});

export const createWitnesses = () => ({
  localSecretKey: ({
    privateState,
  }: {
    privateState: NightDeskPrivateState;
  }): [NightDeskPrivateState, Uint8Array] => [privateState, privateState.secretKey],
});