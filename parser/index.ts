import * as ast from "./ast";

export function parse(buffer: ArrayBufferLike): ast.Wasm {
  const p = new Parser(buffer);
  const res = p.parse();
  if (res === undefined) {
    throw new Error("Failed to parse WASM");
  }
  return res;
}

type ParserResult<T> = [T, number] | [undefined, 0];
type ParserSig<T> = (pos: number) => ParserResult<T>;

class Parser {
  view: DataView;

  constructor(buf: ArrayBufferLike) {
    this.view = new DataView(buf);
  }

  public parse(): ast.Wasm | undefined {
    const [root] = this.root(0);
    return root;
  }

  private readU8(pos: number): ParserResult<number> {
    try {
      const v = this.view.getUint8(pos);
      return [v, pos + 1];
    } catch {
      return [undefined, 0];
    }
  }

  private copyRange(begin: number, end: number): ParserResult<ArrayBufferLike> {
    try {
      const v = this.view.buffer.slice(begin, end);
      return [v, end];
    } catch {
      return [undefined, 0];
    }
  }

  private root(pos: number): ParserResult<ast.Wasm> {
    const [preamble, next] = this.preamble(pos);
    if (preamble === undefined) {
      return [undefined, 0];
    }
    pos = next;

    if (!ast.isComponent(preamble)) {
      return [
        {
          isComponent: false,
          preamble,
          bytes: this.view.buffer,
        },
        pos,
      ];
    }

    const [sections, next2] = this.sections(pos);
    if (sections === undefined) {
      return [undefined, 0];
    }
    pos = next2;

    return [
      {
        isComponent: true,
        preamble,
        sections,
      },
      pos,
    ];
  }

  private preamble(pos: number): ParserResult<ast.Preamble> {
    let magic = [0, 0, 0, 0] as [number, number, number, number];
    for (let i = 0; i < 4; i++) {
      const [v, next] = this.readU8(pos);
      if (v === undefined) {
        return [undefined, 0];
      }
      magic[i] = v;
      pos = next;
    }

    let version = [0, 0] as [number, number];
    for (let i = 0; i < 2; i++) {
      const [v, next] = this.readU8(pos);
      if (v === undefined) {
        return [undefined, 0];
      }
      version[i] = v;
      pos = next;
    }

    let layer = [0, 0] as [number, number];
    for (let i = 0; i < 2; i++) {
      const [v, next] = this.readU8(pos);
      if (v === undefined) {
        return [undefined, 0];
      }
      layer[i] = v;
      pos = next;
    }

    return [
      {
        magic,
        version,
        layer,
      },
      pos,
    ];
  }

  private sections(pos: number): ParserResult<ast.Section[]> {
    let sections: ast.Section[] = [];
    while (true) {
      const [section, next] = this.section(pos);
      if (section === undefined) {
        break;
      }
      pos = next;
      sections.push(section);
    }

    return [sections, pos];
  }

  private section(pos: number): ParserResult<ast.Section> {
    // N: section id
    const [id, next] = this.readU8(pos);
    if (id === undefined) {
      return [undefined, 0];
    }
    pos = next;

    // len: u32
    const [len, secbegin] = this.uN(32, pos);
    if (len === undefined) {
      return [undefined, 0];
    }
    pos = secbegin;

    const secend = secbegin + len;

    if (!ast.isSectionId(id)) {
      throw new Error(`id ${id} is not valid as section id`);
    }

    switch (id) {
      case ast.SectionId.Custom:
        const [name, next2] = this.name(pos);
        if (name === undefined) {
          return [undefined, 0];
        }
        pos = next2;

        const [bytes, next3] = this.copyRange(pos, secend);
        if (bytes === undefined) {
          return [undefined, 0];
        }
        pos = next3;

        return [
          {
            id: ast.SectionId.Custom,
            kind: {
              name,
              bytes,
            },
          },
          pos,
        ];
      case ast.SectionId.CoreModule:
        const [bytes2, next4] = this.copyRange(pos, secend);
        if (bytes2 === undefined) {
          return [undefined, 0];
        }
        pos = next4;

        return [
          {
            id: ast.SectionId.CoreModule,
            kind: {
              bytes: bytes2,
            },
          },
          pos,
        ]
      default:
        throw new Error("Not implemented yet: wasm section eath implement");
    }
  }

  private name(pos: number): ParserResult<string> {
    const [utf8, next] = this.list(this.readU8.bind(this), pos);
    if (utf8 === undefined) {
      return [undefined, 0];
    }
    pos = next;

    return [new TextDecoder().decode(Uint8Array.from(utf8)), pos];
  }

  private vec<T>(elem: ParserSig<T>, pos: number): ParserResult<T[]> {
    // n: element length
    const [n, next] = this.readU8(pos);
    if (n === undefined) {
      return [undefined, 0];
    }
    pos = next;

    let array: T[] = [];

    for (let i = 1; i <= n; i++) {
      const [e, next2] = elem(pos);
      if (e === undefined) {
        return [undefined, 0];
      }
      pos = next2;
      array.push(e);
    }

    return [array, pos];
  }

  private list<T>(elem: ParserSig<T>, pos: number): ParserResult<T[]> {
    // n: element length
    const [n, next] = this.uN(32, pos);
    if (n === undefined) {
      return [undefined, 0];
    }
    pos = next;

    let array: T[] = [];

    for (let i = 1; i <= n; i++) {
      const [e, next2] = elem(pos);
      if (e === undefined) {
        return [undefined, 0];
      }
      pos = next2;
      array.push(e);
    }

    return [array, pos];
  }

  private uN(n: number, pos: number): ParserResult<number> {
    let result = 0;
    let shift = 0;
    let loop = 0;

    while (true) {
      if (loop > Math.ceil(n / 7)) {
        return [undefined, 0];
      }

      const [v, next] = this.readU8(pos);
      if (v === undefined) {
        return [undefined, 0];
      }
      pos = next;

      result |= (v & 0x7f) << shift;
      if ((v & 0x80) === 0) {
        break;
      }

      loop += 1;
      shift += 7;
    }

    return [result, pos];
  }
}
