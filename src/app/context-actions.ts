"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { refresh } from "next/cache";
import postgres from "postgres";

import {
  createChangeProposal,
  resolveWebViewer,
  respondToObject,
} from "@/domain/context";

export type ContextActionState = {
  status: "idle" | "success" | "error";
  message: string;
  reviewPath?: string;
};

function formString(
  formData: FormData,
  name: string,
): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function updateContextAction(
  _previousState: ContextActionState,
  formData: FormData,
): Promise<ContextActionState> {
  const objectId = formString(formData, "objectId");
  const intent = formString(formData, "intent");
  const viewer = formString(formData, "as");

  if (!objectId || !intent) {
    return {
      status: "error",
      message: "Choose an action for a known context item.",
    };
  }

  const sql = postgres(
    getCloudflareContext().env.HYPERDRIVE.connectionString,
    {
      max: 5,
      fetch_types: false,
    },
  );
  const caller = await resolveWebViewer(sql, viewer);

  try {
    if (
      intent === "accept" ||
      intent === "accept_with_condition" ||
      intent === "decline"
    ) {
      const responseText = formString(formData, "responseText")?.trim();
      if (intent === "accept_with_condition" && !responseText) {
        return {
          status: "error",
          message: "Write the condition before accepting with a condition.",
        };
      }
      await respondToObject(sql, {
        caller,
        objectId,
        stance:
          intent === "accept"
            ? "accepted"
            : intent === "accept_with_condition"
              ? "accepted_with_condition"
              : "rejected",
        responseText: responseText || undefined,
      });
      refresh();

      return {
        status: "success",
        message:
          intent === "accept"
            ? "Acceptance recorded."
            : intent === "accept_with_condition"
              ? "Conditional acceptance recorded."
              : "Decline recorded.",
      };
    }

    if (intent === "propose_change") {
      const replacementText = formString(
        formData,
        "replacementText",
      )?.trim();
      if (!replacementText) {
        return {
          status: "error",
          message: "Write the replacement wording first.",
        };
      }

      const proposal = await createChangeProposal(sql, {
        caller,
        objectId,
        text: replacementText,
        origin: "web",
      });
      refresh();

      return {
        status: "success",
        message:
          "Change proposed. The original wording remains current until everyone accepts the replacement.",
        reviewPath: proposal.reviewPath,
      };
    }

    return {
      status: "error",
      message: "Choose accept, decline, or propose a change.",
    };
  } catch {
    return {
      status: "error",
      message: "That action is not available for this context item.",
    };
  }
}
