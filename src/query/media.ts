import { z } from "zod";

const imageKeyword = "X-query-agent-image";

/**
 * An image field for a structured output, returned with the generated PNG as base64 in `base64`.
 *
 * Lists of images need a `.max()`, and a schema may request at most 10 images in the worst case.
 */
export const GeneratedImage = z
  .object({
    image_prompt: z.string(),
    base64: z.string(), // hidden from the agent's schema; the server fills it
  })
  .meta({ [imageKeyword]: true });
export type GeneratedImage = z.infer<typeof GeneratedImage>;

export type ImageShape = "square" | "landscape" | "portrait";

/** Options for generating an image; unset options fall back to the backend defaults. */
export type ImageOptions = {
  shape?: ImageShape;
};

/** A {@link GeneratedImage} field generated with the given options. */
export const imageWithOptions = ({ shape }: ImageOptions) =>
  GeneratedImage.meta(shape === undefined ? {} : { "X-image-shape": shape });

/** Hides `base64` from image nodes in the emitted JSON Schema, since the server adds it after generation. */
export const hideImageBase64 = ({
  jsonSchema,
}: {
  jsonSchema: z.core.JSONSchema.BaseSchema;
}) => {
  if (jsonSchema[imageKeyword] !== true) {
    return;
  }
  delete jsonSchema.properties?.base64;
  jsonSchema.required = jsonSchema.required?.filter((key) => key !== "base64");
};
