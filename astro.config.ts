import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { rehypeTableWrapper } from "./src/utils/rehypeTableWrapper";
import config from "./astro-paper.config";

export default defineConfig({
  site: config.site.url,
  redirects: {
    "/a-generic-approach-to-parsing-csv-into-case-classes-in-scala-3": "/posts/a-generic-approach-to-parsing-csv-into-case-classes-in-scala-3/",
    "/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1": "/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-1/",
    "/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-2": "/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-2/",
    "/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-3": "/posts/building-a-generic-data-integration-pipeline-in-scala-the-data-plumber-part-3/",
    "/cancellation-of-iofiber-in-cats-effect-3-part-6": "/posts/cancellation-of-iofiber-in-cats-effect-3-part-6/",
    "/cats-effect-3-for-beginners-part-1": "/posts/cats-effect-3-for-beginners-part-1/",
    "/common-apis-cats-effect-io-part-2": "/posts/common-apis-cats-effect-io-part-2/",
    "/common-operators-in-cats-effect-3-part-8": "/posts/common-operators-in-cats-effect-3-part-8/",
    "/comparing-case-class-instances-using-diffx": "/posts/comparing-case-class-instances-using-diffx/",
    "/compile-time-error-generation-using-inline-in-scala-3": "/posts/compile-time-error-generation-using-inline-in-scala-3/",
    "/concurrent-execution-in-cats-effect-using-fibers": "/posts/concurrent-execution-in-cats-effect-using-fibers/",
    "/creating-an-sbt-project-template-using-giter8": "/posts/creating-an-sbt-project-template-using-giter8/",
    "/custom-sbt-task-to-list-direct-dependencies-of-a-project": "/posts/custom-sbt-task-to-list-direct-dependencies-of-a-project/",
    "/data-validation-and-error-accumulation-using-cats-validated": "/posts/data-validation-and-error-accumulation-using-cats-validated/",
    "/developing-java-applications-with-scala-cli": "/posts/developing-java-applications-with-scala-cli/",
    "/different-ways-to-package-a-scala-application": "/posts/different-ways-to-package-a-scala-application/",
    "/diving-into-zio-test-aspects-streamlining-cross-cutting-concerns-in-testing": "/posts/diving-into-zio-test-aspects-streamlining-cross-cutting-concerns-in-testing/",
    "/duck-typing-in-scala": "/posts/duck-typing-in-scala/",
    "/easy-integration-testing-with-testcontainer-scala": "/posts/easy-integration-testing-with-testcontainer-scala/",
    "/effective-test-parameterization-with-scalatest-tables": "/posts/effective-test-parameterization-with-scalatest-tables/",
    "/error-handling-in-cats-effect-part-9": "/posts/error-handling-in-cats-effect-part-9/",
    "/fast-approximate-analytics-in-scala-with-apache-datasketches": "/posts/fast-approximate-analytics-in-scala-with-apache-datasketches/",
    "/introduction-to-clear-config-in-scala": "/posts/introduction-to-clear-config-in-scala/",
    "/json-parsing-using-json4s-in-scala-32eeb4516e06": "/posts/json-parsing-using-json4s-in-scala-32eeb4516e06/",
    "/lazy-and-eager-computations-in-cats-using-eval": "/posts/lazy-and-eager-computations-in-cats-using-eval/",
    "/loading-configs-in-scala-using-pureconfig": "/posts/loading-configs-in-scala-using-pureconfig/",
    "/mastering-scalatest-exploring-tagging-retry-runner-and-more": "/posts/mastering-scalatest-exploring-tagging-retry-runner-and-more/",
    "/resource-handling-in-cats-effect-3-part-5": "/posts/resource-handling-in-cats-effect-3-part-5/",
    "/retrying-cats-effect-failures-with-ease": "/posts/retrying-cats-effect-failures-with-ease/",
    "/safe-ai-agentic-development-sandboxing-coding-assistants": "/posts/safe-ai-agentic-development-sandboxing-coding-assistants/",
    "/scala-closures": "/posts/scala-closures/",
    "/scala-exceptions-try-trycatch-and-a-caveat": "/posts/scala-exceptions-try-trycatch-and-a-caveat/",
    "/scala-made-simple-for-beginners-a-gentle-introduction-to-kickstarting-your-scala-learning": "/posts/scala-made-simple-for-beginners-a-gentle-introduction-to-kickstarting-your-scala-learning/",
    "/scalanative-build-native-applications-in-scala": "/posts/scalanative-build-native-applications-in-scala/",
    "/self-type-in-scala": "/posts/self-type-in-scala/",
    "/synchronisation-and-concurrent-access-in-cats-effect-3-part-7": "/posts/synchronisation-and-concurrent-access-in-cats-effect-3-part-7/",
    "/tagged-types-in-scala": "/posts/tagged-types-in-scala/",
    "/tasty-file-format-in-scala-3": "/posts/tasty-file-format-in-scala-3/",
    "/tools-to-get-started-with-scala-programming": "/posts/tools-to-get-started-with-scala-programming/",
    "/traversing-cats-effect-ios-part-3": "/posts/traversing-cats-effect-ios-part-3/",
    "/tuple-improvements-in-scala-3": "/posts/tuple-improvements-in-scala-3/",
    "/ulid-sortable-unique-identifier": "/posts/ulid-sortable-unique-identifier/",
    "/unlocking-the-power-of-sbt-a-beginners-guide-to-understanding-not-so-common-features": "/posts/unlocking-the-power-of-sbt-a-beginners-guide-to-understanding-not-so-common-features/",
    "/useful-automation-tools-for-scala-development": "/posts/useful-automation-tools-for-scala-development/",
    "/series/cats-effect": "/tags/cats-effect/",
    "/series/data-plumber": "/tags/data-plumber/",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts, rehypeTableWrapper],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      formats: ["woff", "ttf"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
