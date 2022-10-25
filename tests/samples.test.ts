import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIObject } from "openapi3-ts";
import { Options, resolveConfig } from "prettier";
import { getZodClientTemplateContext } from "../src/template-context";
import { getHandlebars } from "../src/generateZodClientFromOpenAPI";
import { maybePretty } from "../src/maybePretty";

import fg from "fast-glob";

import { readFileSync } from "fs";
import { beforeAll, describe, expect, test } from "vitest";

let prettierConfig: Options | null;

beforeAll(async () => {
    prettierConfig = await resolveConfig("./");
});

describe("samples-generator", async () => {
    const list = fg.sync(["./samples/v3\\.*/**/*.yaml"]);

    const template = getHandlebars().compile(readFileSync("./src/template.hbs", "utf8"));
    const resultByFile = {} as Record<string, string>;

    for (const docPath of list) {
        test(docPath, async () => {
            const openApiDoc = (await SwaggerParser.parse(docPath)) as OpenAPIObject;
            const data = getZodClientTemplateContext(openApiDoc);

            const output = template({ ...data, options: { ...data.options, apiClientName: "api" } });
            const prettyOutput = maybePretty(output, prettierConfig);
            const fileName = docPath.replace("yaml", "");

            // means the .ts file is valid
            expect(prettyOutput).not.toBe(output);

            // means the input format doesn't matter (json=yaml) -> same .ts
            if (resultByFile[fileName]) {
                expect(resultByFile[fileName]).toEqual(prettyOutput);
            }

            expect(prettyOutput).toMatchSnapshot();

            resultByFile[fileName] = prettyOutput;
        });
    }
});
