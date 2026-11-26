import { test, expect } from "bun:test";
import { parse } from "../../parser/index.ts";
import { SectionId } from "../../parser/ast.ts";

test("module check", async () => {
  const wasm = await Bun.file(import.meta.dir + "/module.wasm").arrayBuffer();
  const res = parse(wasm);

  expect(res.isComponent).toBe(false);
  expect(res.preamble.magic).toEqual([0x00, 0x61, 0x73, 0x6d]);
  expect(res.preamble.version).toEqual([0x01, 0x00]);
  expect(res.preamble.layer).toEqual([0x00, 0x00]);
});

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

test("module in component", async () => {
  const wasm = await Bun.file(
    import.meta.dir + "/module-in-component.wasm",
  ).arrayBuffer();
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
  expect(section.id).toBe(SectionId.CoreModule);
});

test("core instances section", async () => {
  const wasm = await Bun.file(
    import.meta.dir + "/core-instance.wasm",
  ).arrayBuffer();
  const res = parse(wasm);

  expect(res.isComponent).toBe(true);
  expect(res.preamble.magic).toEqual([0x00, 0x61, 0x73, 0x6d]);
  expect(res.preamble.version).toEqual([0x0d, 0x00]);
  expect(res.preamble.layer).toEqual([0x01, 0x00]);

  if (!res.isComponent) {
    throw new Error("Not a component");
  }

  const sections = res.sections.filter(
    (sec) => sec.id === SectionId.CoreInstances,
  );
  expect(sections.length).toBe(1);

  const section = sections[0]!;

  expect(section.id).toBe(SectionId.CoreInstances);
  expect(section.kind.length).toBe(2);

  const instance0 = section.kind[0]!;
  expect(instance0.type).toBe("inlineexport");
  if (instance0.type !== "inlineexport") {
    throw new Error("Not an inlineexport instance");
  }
  expect(instance0.exports.length).toBe(0);

  const instance1 = section.kind[1]!;
  expect(instance1.type).toBe("instantiate");
  if (instance1.type !== "instantiate") {
    throw new Error("Not an instantiate instance");
  }
  expect(instance1.moduleIndex).toBe(0);
  expect(instance1.args.length).toBe(1);
  expect(instance1.args[0]).toEqual({ name: "a", instanceIndex: 0 });
});
