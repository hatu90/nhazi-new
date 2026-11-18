"use client";

import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/Stack";

export const PageSpinner = () => (
  <VStack align="center" padding={8}>
    <Spinner label="Loading" />
  </VStack>
);
