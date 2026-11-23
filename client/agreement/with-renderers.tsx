"use client";

import { type Config } from "@puckeditor/core";
import { config } from "./config";
import type { Components } from "./types";

type Render<K extends keyof Components> = NonNullable<Config<Components>["components"][K]>["render"];

/** The base config with the render of every form field swapped (editor preview -> form inputs or the filled-in result). */
export const withRenderers = (r: { TextInput: Render<"TextInput">; DateInput: Render<"DateInput">; ImageUpload: Render<"ImageUpload"> }): Config<Components> => ({
  ...config,
  components: {
    ...config.components,
    TextInput: { ...config.components.TextInput, render: r.TextInput },
    DateInput: { ...config.components.DateInput, render: r.DateInput },
    ImageUpload: { ...config.components.ImageUpload, render: r.ImageUpload },
  },
});
