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
    }
  | {
      id: SectionId.CoreInstances;
      kind: CoreInstanceSec[];
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

export type CoreInstanceSec =
  | {
      type: "instantiate";
      moduleIndex: number;
      args: { name: string; instanceIndex: number }[];
    }
  | {
      type: "inlineexport";
      exports: { name: string; sortIndex: CoreSortIdx }[];
    };

export interface CoreSortIdx {
  sort: CoreSort;
  index: number;
}

export const enum CoreSort {
  Func = 0x00,
  Table = 0x01,
  Memory = 0x02,
  Global = 0x03,
  Tag = 0x04,
  Type = 0x10,
  Module = 0x11,
  Instance = 0x12,
}
