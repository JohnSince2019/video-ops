import { listBgmPresets, findBgmPresets } from "../lib/audio/bgm-library.ts";

console.log(
  JSON.stringify(
    {
      total: listBgmPresets().length,
      inspiring: findBgmPresets({ mood: "inspiring" }).slice(0, 3),
      deepWork: findBgmPresets({ useCase: "deep work" }),
    },
    null,
    2,
  ),
);
