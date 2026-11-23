export type Wasm =
  | {
      isComponent: false;
      preamble: Preamble;
      bytes: ArrayBufferLike;
    }
  | Component;

export interface Component {
  isComponent: true;
  preamble: Preamble;
  sections: Section[];
}

export interface Preamble {
  magic: [number, number, number, number];
  version: [number, number];
  layer: [number, number];
}

export function isComponent(preamble: Preamble): boolean {
  // component version
  if (
    preamble.version[0] === 0x0d &&
    preamble.version[1] === 0x00 &&
    preamble.layer[0] === 0x01 &&
    preamble.layer[1] === 0x00
  ) {
    return true;
  }
  return false;
}

export type Section =
  | {
      id: SectionId.Custom;
      kind: CustomSec;
    }
  | {
      id: SectionId.CoreModule;
      kind: CoreModuleSec;
    };

export const enum SectionId {
  Custom = 0,
  CoreModule = 1,
  CoreInstances = 2,
  CoreTypes = 3,
  Component = 4,
  Instances = 5,
  Aliases = 6,
  Types = 7,
  Canons = 8,
  Start = 9, // TODO: not yet implemented
  Imports = 10,
  Exports = 11,
  Values = 12, // TODO: not yet implemented
}

export function isSectionId(id: number): id is SectionId {
  return id >= 0 && id <= 12;
}

export interface CustomSec {
  name: string;
  bytes: ArrayBufferLike;
}

export interface CoreModuleSec {
  bytes: ArrayBufferLike;
}
