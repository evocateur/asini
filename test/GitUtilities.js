import assert from "assert";
import { EOL } from "os";
import assertStubbedCalls from "./_assertStubbedCalls";
import ChildProcessUtilities from "../src/ChildProcessUtilities";

import GitUtilities from "../src/GitUtilities";

describe("GitUtilities", () => {
  describe(".isInitialized()", () => {
    it("returns true when git command succeeds", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-parse"] }
        ]]
      ]);

      assert.strictEqual(GitUtilities.isInitialized(), true);
    });

    it("returns false when git command fails", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-parse"], throws: new Error("fatal: Not a git repository") }
        ]]
      ]);

      assert.strictEqual(GitUtilities.isInitialized(), false);
    });
  });

  describe(".addFile()", () => {
    it("calls git add with file argument", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git add foo"] }
        ]]
      ]);

      GitUtilities.addFile("foo");
    });
  });

  describe(".commit()", () => {
    it("calls git commit with message", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git commit -m \"$(echo \"foo\")\""] }
        ]]
      ]);

      GitUtilities.commit("foo");
    });

    it("allows multiline message", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: [`git commit -m "$(echo "foo${EOL}bar")"`] }
        ]]
      ]);

      GitUtilities.commit(`foo${EOL}bar`);
    });
  });

  describe(".addTag()", () => {
    it("adds specified git tag", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git tag foo"] }
        ]]
      ]);

      GitUtilities.addTag("foo");
    });
  });

  describe(".removeTag()", () => {
    it("deletes specified git tag", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git tag -d foo"] }
        ]]
      ]);

      GitUtilities.removeTag("foo");
    });
  });

  describe(".hasTags()", () => {
    it("returns true when one or more git tags exist", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git tag"], returns: "foo" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.hasTags(), true);
    });

    it("returns false when no git tags exist", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git tag"], returns: "" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.hasTags(), false);
    });
  });

  describe(".getLastTaggedCommit()", () => {
    it("returns SHA of closest git tag", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-list --tags --max-count=1"], returns: "deadbeef" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.getLastTaggedCommit(), "deadbeef");
    });
  });

  describe(".getFirstCommit()", () => {
    it("returns SHA of first commit", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-list --max-parents=0 HEAD"], returns: "beefcafe" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.getFirstCommit(), "beefcafe");
    });
  });

  describe(".pushWithTags()", () => {
    it("pushes current branch and specified tag(s) to origin", () => {
      assertStubbedCalls([
        [GitUtilities, "getCurrentBranch", {}, [
          { args: [], returns: "master" }
        ]],
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git push origin master"] },
          { args: ["git push origin foo@1.0.1 foo-bar@1.0.0"] }
        ]]
      ]);

      GitUtilities.pushWithTags(["foo@1.0.1", "foo-bar@1.0.0"]);
    });
  });

  describe(".describeTag()", () => {
    it("returns description of specified tag", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git describe --tags deadbeef"], returns: "foo@1.0.0" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.describeTag("deadbeef"), "foo@1.0.0");
    });
  });

  describe(".diffSinceIn()", () => {
    it("returns list of files changed since commit at location", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git diff --name-only foo@1.0.0 -- packages/foo"], returns: "stuff maybe" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.diffSinceIn("foo@1.0.0", "packages/foo"), "stuff maybe");
    });
  });

  describe(".getCurrentSHA()", () => {
    it("returns SHA of current ref", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-parse HEAD"], returns: "deadcafe" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.getCurrentSHA(), "deadcafe");
    });
  });

  describe(".getTopLevelDirectory()", () => {
    it("returns root directory of repo", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git rev-parse --show-toplevel"], returns: "/path/to/foo" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.getTopLevelDirectory(), "/path/to/foo");
    });
  });

  describe(".checkoutChanges()", () => {
    it("calls git checkout with specified arg", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git checkout -- packages/*/package.json"] }
        ]]
      ]);

      GitUtilities.checkoutChanges("packages/*/package.json");
    });
  });

  describe(".getCurrentBranch()", () => {
    it("returns current git branch", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git symbolic-ref --short HEAD"], returns: "foo" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.getCurrentBranch(), "foo");
    });
  });

  describe(".init()", () => {
    it("calls git init", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git init"], returns: "stdout for logger" }
        ]]
      ]);

      assert.strictEqual(GitUtilities.init(), "stdout for logger");
    });
  });

  describe(".hasCommit()", () => {
    it("returns true when git command succeeds", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git log"] }
        ]]
      ]);

      assert.strictEqual(GitUtilities.hasCommit(), true);
    });

    it("returns false when git command fails", () => {
      assertStubbedCalls([
        [ChildProcessUtilities, "execSync", {}, [
          { args: ["git log"], throws: new Error("fatal: your current branch 'master' does not have any commits yet") }
        ]]
      ]);

      assert.strictEqual(GitUtilities.hasCommit(), false);
    });
  });
});
