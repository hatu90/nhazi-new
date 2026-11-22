"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/client/lib/format";
import type { ICommentResponse } from "@/client/lib/types";
import { Raised } from "@/client/ui";

/** The conversation under a request: avatar, author, time and the message body (line breaks preserved). */
export function RequestThread({ comments }: { comments: ICommentResponse[] }) {
  const t = useTranslations("Requests");
  const locale = useLocale();
  if (comments.length === 0) return <Text color="secondary">{t("noComments")}</Text>;
  return (
    <VStack gap={3}>
      {comments.map((cm) => (
        <HStack key={cm.id} gap={3} align="start">
          <Avatar name={cm.author.displayName} size="md" tooltip={false} />
          <div className="min-w-0 flex-1">
            <Raised>
              <VStack gap={1}>
                <HStack justify="between" align="center" gap={3} wrap="wrap">
                  <Text weight="semibold">{cm.author.displayName}</Text>
                  <Text size="sm" color="secondary">{formatDateTime(cm.createdAt, locale)}</Text>
                </HStack>
                <Text as="div" className="whitespace-pre-wrap break-words">{cm.body}</Text>
              </VStack>
            </Raised>
          </div>
        </HStack>
      ))}
    </VStack>
  );
}
