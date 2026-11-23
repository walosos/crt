import { test, expect } from "bun:test";
import { parse } from "../../parser/index.ts";
import { SectionId } from "../../parser/ast.ts";

test("custom section", async () => {
  const wasm = await Bun.file(import.meta.dir + "/custom.wasm").arrayBuffer();
  const res = parse(wasm);

  expect(res.isComponent).toBe(true);
  expect(res.preamble.magic).toEqual([0x00, 0x61, 0x73, 0x6d]);
  expect(res.preamble.version).toEqual([0x0d, 0x00]);
  expect(res.preamble.layer).toEqual([0x01, 0x00]);

  if (!res.isComponent) {
    throw new Error("Not a component");
  }

  expect(res.sections.length).toBe(1);
  const section = res.sections[0]!;
  expect(section.id).toBe(SectionId.Custom);
  if (section.id !== SectionId.Custom) {
    throw new Error("Not a custom section");
  }
  expect(section.kind.name).toBe("test");
  expect(section.kind.bytes).toEqual(new TextEncoder().encode("hello").buffer);
});