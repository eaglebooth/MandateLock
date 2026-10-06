import { studionet } from "genlayer-js/chains";
export const chain = studionet;
export const defaultContract = () =>
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a";
export const explorer = (hash: string) => `${process.env.NEXT_PUBLIC_EXPLORER_TX_BASE || "https://explorer-studio.genlayer.com/tx/"}${hash}`;
export const contractExplorer = (address: string) => `https://explorer-studio.genlayer.com/address/${address}`;
