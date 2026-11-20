"use client";

import { type Config } from "@puckeditor/core";
import { config } from "./config";
import type { Components } from "./types";

export const withTextInput = (render: NonNullable<Config<Components>["components"]["TextInput"]>["render"]): Config<Components> => ({
  ...config,
  components: { ...config.components, TextInput: { ...config.components.TextInput, render } },
});
