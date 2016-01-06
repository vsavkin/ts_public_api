/// <reference path="../typings/chai/chai.d.ts"/>
import chai = require('chai');
import main = require('../lib/main');
import * as ts from 'typescript';

describe('unit test', () => {
  it("should support classes", () => {
    check(`
      export class A {
        field:string;

        method(a:string):number {
          return 1;
        }
      }
    `, ["class A", "A.field:string", "A.method(string):number"]);
  });

  it("should support interfaces", () => {
    check(`
      export interface A {
        field:string;
        method(a:string):number;
      }
    `, ["interface A", "A.field:string", "A.method(string):number"]);
  });

  it("should support generics", () => {
    check(`
      export class A<T> {
        field:T;
        method(q:T):T { return null; }
      }
    `, ["class A<T>", "A.field:T", "A.method(T):T"]);
  });

  it("should support static members", () => {
    check(`
      export class A {
        static field: string;
        static method(a: string): number {}
      }
    `, ["class A", "A.field:string", "A.method(string):number"]);
  });

  it("should support arrays", () => {
    check(`
      export var a: Array<Array<string>>;
      export var b: string[][];
    `, ["var a:Array<Array<string>>", "var b:string[][]"]);
  });

  it("should support map", () => {
    check(`
      export var a: Map<Map<string, number>, number>;
    `, ["var a:Map<Map<string, number>, number>"]);
  });

  it("should support getters and setters", () => {
    check(`
      export class A {
        get a(): string {}
        set a(v:string){}
        get b() {}
        set b(v) {}
      }
    `, ["class A", "A.a:string", "A.a=(string)", "A.b:any", "A.b=(any)"]);
  });

  it("should support function declarations", () => {
    check(`
      export function f(a:string):number {}
    `, ["f(string):number"]);
  });

  it("should support enums", () => {
    check(`
      export enum A {
        Red = 1,
        Green
      }
    `, ["enum A", "A.Red", "A.Green"]);
  });

  it("should ignore private methods", () => {
    check(`
      export class A {
        fa(){}
        protected fb() {}
        private fc() {}
      }
    `, ["class A", "A.fa():any", "A.fb():any"]);
  });

  it("should ignore private props", () => {
    check(`
      export class A {
        fa;
        protected fb;
        private fc;
      }
    `, ["class A", "A.fa:any", "A.fb:any"]);
  });

  it("should ignore members staring with an _", () => {
    check(`
      export class A {
        _fa;
        _fb(){}
      }
    `, ["class A"]);
  });
});

function check(contents:string, expected:string[]) {
  var mockHost: ts.CompilerHost = {
    getSourceFile: (sourceName, languageVersion) => {
      if (sourceName !== "file.ts") return undefined;
      return ts.createSourceFile(sourceName, contents, languageVersion, true);
    },
    writeFile(name, text, writeByteOrderMark) {},
    fileExists: (filename) => filename === "file.ts",
    readFile: (filename) => contents,
    getDefaultLibFileName: () => "lib.ts",
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (filename) => filename,
    getCurrentDirectory: () => './',
    getNewLine: () => '\n',
  };
  const actual = main.publicApiInternal(mockHost, "file.ts");
  chai.assert.deepEqual(actual, expected);
}