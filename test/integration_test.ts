/// <reference path="../typings/chai/chai.d.ts"/>
import chai = require('chai');
import main = require('../lib/main');

describe('integration test', () => {
  it("should handle empty files", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/empty.ts"), []);
  });

  it("should include symbols", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/simple.ts"), ["const A:string", "var B:any"]);
  });

  it("should include symbols reexported explicitly", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/reexported.ts"), ["const A:string", "var B:any"]);
  });

  it("should include symbols reexported with *", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/reexported_star.ts"), ["const A:string", "var B:any"]);
  });

  it("should include members of classes and interfaces", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/classes_and_interfaces.ts"),
      ["class A", "A.field:string", "A.method(string):number", "interface B", "B.field:A"]);
  });

  it("should include members reexported classes", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/reexported_classes.ts"),
      ["class A", "A.field:string", "A.method(string):number"]);
  });

  it("should support imports with prefixes", () => {
    chai.assert.deepEqual(main.publicApi("test/fixtures/imported_with_prefix.ts"),
      ["class C", "C.field:A"]);
  });
});