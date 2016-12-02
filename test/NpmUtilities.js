import assert from "assert";
import path from "path";

import assertStubbedCalls from "./_assertStubbedCalls";
import ChildProcessUtilities from "../src/ChildProcessUtilities";
import FileSystemUtilities from "../src/FileSystemUtilities";

import NpmUtilities from "../src/NpmUtilities";

const STDIO_OPT = ["ignore", "pipe", "pipe"];

describe("NpmUtilities", () => {
  describe(".installInDir()", () => {
    const testDir = "stub";
    const dependencies = ["foo@1.0.0", "bar"];

    const firstCreatesBackup = [
      FileSystemUtilities, "rename", { nodeCallback: true }, [
        { args: [
          path.join(testDir, "package.json"),
          path.join(testDir, "package.json.asini_backup"),
        ] }
      ]
    ];
    const thenWritesPackages = [
      FileSystemUtilities, "writeFile", { nodeCallback: true }, [
        { args: [
          path.join(testDir, "package.json"),
          JSON.stringify({
            dependencies: { foo: "1.0.0", bar: "*" }
          }),
        ] }
      ]
    ];
    const thenRestoresBackup = [
      FileSystemUtilities, "renameSync", {}, [
        { args: [
          path.join(testDir, "package.json.asini_backup"),
          path.join(testDir, "package.json"),
        ] }
      ]
    ];

    it("does nothing if no dependencies are passed", (done) => {
      NpmUtilities.installInDir(testDir, [], done);
    });

    it("does nothing if some joker tries to pass non-existent dependencies", (done) => {
      NpmUtilities.installInDir(testDir, null, done);
    });

    it("succeeds in golden path", (done) => {
      assertStubbedCalls([
        firstCreatesBackup,
        thenWritesPackages,
        [ChildProcessUtilities, "spawn", { nodeCallback: true }, [
          { args: ["npm", ["install"], { cwd: testDir, stdio: STDIO_OPT }] }
        ]],
        thenRestoresBackup,
      ]);

      NpmUtilities.installInDir(testDir, dependencies, done);
    });

    it("cleans up after failing to write temporary JSON", (done) => {
      assertStubbedCalls([
        firstCreatesBackup,
        [FileSystemUtilities, "writeFile", { nodeCallback: true }, [
          { args: [
            path.join(testDir, "package.json"),
            JSON.stringify({
              dependencies: { foo: "1.0.0", bar: "*" }
            }),
          ], throws: new Error("oops") }
        ]],
        thenRestoresBackup,
      ]);

      NpmUtilities.installInDir(testDir, dependencies, (err) => {
        assert.equal(err.message, "oops");
        done();
      });
    });

    it("cleans up after failing during npm install", (done) => {
      assertStubbedCalls([
        firstCreatesBackup,
        thenWritesPackages,
        [ChildProcessUtilities, "spawn", { nodeCallback: true }, [
          { args: ["npm", ["install"], { cwd: testDir, stdio: STDIO_OPT }], throws: new Error("d'oh") }
        ]],
        thenRestoresBackup,
      ]);

      NpmUtilities.installInDir(testDir, dependencies, (err) => {
        assert.equal(err.message, "d'oh");
        done();
      });
    });
  });

  describe(".splitVersion()", () => {
    it("returns a [name, version] tuple", () => {
      assert.deepEqual(
        NpmUtilities.splitVersion("foo@^1.0.0"),
        ["foo", "^1.0.0"]
      );
    });

    it("supports scoped packages", () => {
      assert.deepEqual(
        NpmUtilities.splitVersion("@bar/foo@^1.0.0"),
        ["@bar/foo", "^1.0.0"]
      );
    });

    it("returns [name, undefined] when version not specified", () => {
      assert.deepEqual(
        NpmUtilities.splitVersion("foo"),
        ["foo", undefined]
      );
    });
  });

  describe(".addDistTag()", () => {
    it("calls `npm dist-tag add` with correct arguments", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["npm dist-tag add foo-pkg@1.0.0 test-tag"] }
        ]]
      ]);

      NpmUtilities.addDistTag("foo-pkg", "1.0.0", "test-tag");
    });
  });

  describe(".removeDistTag()", () => {
    it("calls `npm dist-tag rm` with correct arguments", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["npm dist-tag rm foo-pkg test-tag"] }
        ]]
      ]);

      NpmUtilities.removeDistTag("foo-pkg", "test-tag");
    });
  });

  describe(".checkDistTag()", () => {
    beforeEach(() => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["npm dist-tag ls foo-pkg"], returns: "some-tag: 1.0.0\ntest-tag: 2.0.0" }
        ]]
      ]);
    });

    it("returns true when tag found in `npm dist-tag ls` output", () => {
      assert.strictEqual(NpmUtilities.checkDistTag("foo-pkg", "test-tag"), true);
    });

    it("returns false when tag not found in `npm dist-tag ls` output", () => {
      assert.strictEqual(NpmUtilities.checkDistTag("foo-pkg", "nope-tag"), false);
    });
  });

  describe(".execInDir()", () => {
    it("calls npm subcommand in specified directory with args", (done) => {
      assertStubbedCalls([
        [ChildProcessUtilities, "exec", { nodeCallback: true }, [
          { args: ["npm test -- --grep 'foo bar baz'", { cwd: "packages/foo-pkg", env: process.env }] }
        ]]
      ]);

      NpmUtilities.execInDir("test", ["--", "--grep", "foo bar baz"], "packages/foo-pkg", done);
    });
  });

  describe(".runScriptInDir()", () => {
    it("runs npm script in specified directory with args", (done) => {
      assertStubbedCalls([
        [NpmUtilities, "execInDir", { nodeCallback: true }, [
          { args: ["run build", ["--production"], "packages/foo-pkg"] }
        ]]
      ]);

      NpmUtilities.runScriptInDir("build", ["--production"], "packages/foo-pkg", done);
    });
  });

  describe(".publishTaggedInDir()", () => {
    it("cds into specified directory and publishes with tag", (done) => {
      assertStubbedCalls([
        [ChildProcessUtilities, "exec", { nodeCallback: true }, [
          { args: ["cd packages/foo-pkg && npm publish --tag test-tag", null] }
        ]]
      ]);

      NpmUtilities.publishTaggedInDir("test-tag", "packages/foo-pkg", done);
    });
  });

  describe(".dependencyIsSatisfied()", () => {
    let packagesDir;

    beforeEach(() => {
      // we don't care about git, no changes are being made, just need a package.json to read
      packagesDir = path.resolve(__dirname, "fixtures/PublishCommand/normal/packages");
    });

    it("returns true when dependency version satisfies semver range", () => {
      assert.strictEqual(
        NpmUtilities.dependencyIsSatisfied(packagesDir, "package-1", "^1"),
        true
      );
    });

    it("returns true when dependency version does not satisfy semver range", () => {
      assert.strictEqual(
        NpmUtilities.dependencyIsSatisfied(packagesDir, "package-1", "^2"),
        false
      );
    });
  });
});
