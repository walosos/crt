import { $ } from "bun";

$.cwd(import.meta.dir);

const glob = new Bun.Glob("*.wat");
const files = glob.scan({ cwd: import.meta.dir });

for await (const file of files) {
  await $`wasm-tools parse ${file} -o ${file.replace(/\.wat$/, ".wasm")}`;
}
