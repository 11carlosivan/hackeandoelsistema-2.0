import { describe, expect, it } from "vitest";

import {
  canonicalPathForPost,
  decodeSqlValue,
  iterateSqlTuples,
  parseInsertStatement,
  pickSqlFields,
} from "../scripts/wordpress/inspect-dump.mjs";

describe("WordPress dump inspector", () => {
  it("decodes escaped MySQL string values", () => {
    expect(decodeSqlValue("'Hackeando\\'s Sistema'")).toBe("Hackeando's Sistema");
    expect(decodeSqlValue("NULL")).toBeNull();
    expect(decodeSqlValue("58")).toBe("58");
  });

  it("iterates tuples without splitting commas inside strings", () => {
    const tuples = [...iterateSqlTuples("(1,'Uno, dos','slug-uno'),(2,'Titulo \\'dos\\'','slug-dos')")];

    expect(tuples).toEqual(["1,'Uno, dos','slug-uno'", "2,'Titulo \\'dos\\'','slug-dos'"]);
  });

  it("picks only requested fields from a tuple", () => {
    const fields = pickSqlFields("1,'siteurl','https://hackeandoelsistema.net','yes'", new Set([1, 2]));

    expect(fields).toEqual({
      1: "siteurl",
      2: "https://hackeandoelsistema.net",
    });
  });

  it("parses insert statements and derives root post canonicals", () => {
    const insert = parseInsertStatement(
      "INSERT INTO `wpmb_posts` (`ID`, `post_title`, `post_name`) VALUES\n(1,'ignored','post-slug');",
    );

    expect(insert.table).toBe("wpmb_posts");
    expect(canonicalPathForPost({ type: "post", slug: "post-slug" }, "/%postname%/")).toBe("/post-slug/");
    expect(canonicalPathForPost({ type: "page", slug: "contact", parentId: "0" }, "/%postname%/")).toBe("/contact/");
  });
});
