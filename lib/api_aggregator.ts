import * as ts from 'typescript';

export abstract class Base<T> {
  abstract mapNode(n: ts.Node): T;

  mapNodes(nodes: ts.Node[]):T[] { return  nodes ? nodes.map((n) => this.mapNode(n)) : []; }
}

export default class PublicApiAggregator extends Base<string[]> {
  mapNode(node: ts.Node): string[] {
    switch (node.kind) {
      case ts.SyntaxKind.VariableDeclaration:
        const varDecl = <ts.VariableDeclaration>node;
        const name = this.getName(node);
        const isConst = hasFlag(varDecl.parent, ts.NodeFlags.Const);
        const type = this.getColonType(node);
        return [`${isConst ? 'const' : 'var'} ${name}${type}`];

      case ts.SyntaxKind.ClassDeclaration:
        const classDecl = <ts.ClassDeclaration>node;
        return this.getClassLike('class', classDecl);

      case ts.SyntaxKind.EnumDeclaration:
        const enumDecl = <ts.ClassDeclaration>node;
        return this.getClassLike('enum', enumDecl);

      case ts.SyntaxKind.EnumMember:
        return [this.getName(node)];

      case ts.SyntaxKind.InterfaceDeclaration:
        const ifDecl = <ts.InterfaceDeclaration>node;
        return this.getClassLike('interface', ifDecl);

      case ts.SyntaxKind.MethodDeclaration:
        if (this.shouldBeSkipped(node)) return [];
        return [this.getFunctionLike(<ts.MethodDeclaration>node)];

      case ts.SyntaxKind.PropertyDeclaration:
        if (this.shouldBeSkipped(node)) return [];
        return [this.getProperty(<ts.PropertyDeclaration>node)];

      case ts.SyntaxKind.PropertySignature:
        return [this.getProperty(<ts.PropertyDeclaration>node)];

      case ts.SyntaxKind.MethodSignature:
        return [this.getFunctionLike(<ts.MethodDeclaration>node)];

      case ts.SyntaxKind.GetAccessor:
        if (this.shouldBeSkipped(node)) return [];
        return [this.getGetter(<ts.AccessorDeclaration>node)];

      case ts.SyntaxKind.SetAccessor:
        if (this.shouldBeSkipped(node)) return [];
        return [this.getSetter(<ts.AccessorDeclaration>node)];

      case ts.SyntaxKind.FunctionDeclaration:
        return [this.getFunctionLike(<ts.FunctionDeclaration>node)];

      default:
        return [];
    }
  }

  private shouldBeSkipped(decl: ts.Node): boolean {
    const n = this.getName(decl);
    return hasFlag(decl.modifiers, ts.NodeFlags.Private) || n[0] == '_';
  }

  private getFunctionLike(node: ts.FunctionLikeDeclaration): string {
    const name = this.getName(node);
    const params = node.parameters.map(p => this.getType(p)).join(", ");
    const retType = this.getColonType(node);
    return `${name}(${params})${retType}`;
  }

  private getGetter(node: ts.AccessorDeclaration): string {
    const name = this.getName(node);
    const type = this.getColonType(node);
    return `${name}${type}`;
  }

  private getSetter(node: ts.AccessorDeclaration): string {
    const name = this.getName(node);
    const params = node.parameters.map(p => this.getType(p)).join(", ");
    return `${name}=(${params})`;
  }

  private getProperty(decl: ts.PropertyDeclaration): string {
    debugger
    const name = this.getName(decl);
    const type = this.getColonType(decl);
    return `${name}${type}`;
  }

  private getClassLike(keyword: string, decl: ts.ClassDeclaration | ts.InterfaceDeclaration): string[] {
    const name = this.getName(decl);
    const typeParams = typesToString(decl.typeParameters);
    const nameWithTypes = typeParams ? `${name}<${typeParams}>` : name;
    const root = `${keyword} ${nameWithTypes}`;
    const members = this.mapNodes(decl.members);
    return [root].concat(flatten(members).map(m => `${name}.${m}`));
  }

  private getName(node: ts.Node): string {
    const name = (<any>node).name;
    if (name.kind !== ts.SyntaxKind.Identifier) {
      reportError(node, "Invalid node type");
    }
    return (<ts.Identifier>name).text;
  }

  private getType(node: ts.Node): string {
    const t = typeToString((<any>node).type);
    return t ? t : "any";
  }

  private getColonType(node: ts.Node): string {
    const type = this.getType(node);
    return type ? `:${type}` : '';
  }
}

class TypeExtract extends Base<string> {
  mapNode(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.TypeLiteral:
        let members = (<ts.TypeLiteralNode>node).members;
        if (members.length == 1 && members[0].kind == ts.SyntaxKind.IndexSignature) {
          let indexSig = <ts.IndexSignatureDeclaration>(members[0]);
          if (indexSig.parameters.length > 1) {
            reportError(indexSig, "Expected an index signature to have a single parameter");
          }
          const keyType = this.mapNode(indexSig.parameters[0].type);
          const valueType = this.mapNode(indexSig.type);
          return `Map<${keyType},${valueType}>`;
        }
        return "dynamic";

      case ts.SyntaxKind.UnionType:
        return this.mapNodes((<ts.UnionTypeNode>node).types).join("|");

      case ts.SyntaxKind.TypeReference:
        const typeRef = <ts.TypeReferenceNode>node;
        const name = this.mapNode(typeRef.typeName);
        const typeParams = typeRef.typeArguments ? this.mapNodes(typeRef.typeArguments).join(", ") : null;
        return typeParams ? `${name}<${typeParams}>` : name;

      case ts.SyntaxKind.TypeParameter:
        const typeParam = <ts.TypeParameterDeclaration>node;
        return this.mapNode(typeParam.name);

      case ts.SyntaxKind.ArrayType:
        const type = this.mapNode((<ts.ArrayTypeNode>node).elementType);
        return `${type}[]`;

      case ts.SyntaxKind.FunctionType:
        return node.getText();

      case ts.SyntaxKind.QualifiedName:
        var first = <ts.QualifiedName>node;
        return this.mapNode(first.right);

      case ts.SyntaxKind.Identifier:
        var ident = <ts.Identifier>node;
        return ident.text;

      case ts.SyntaxKind.NumberKeyword:
        return "number";

      case ts.SyntaxKind.StringKeyword:
        return "string";

      case ts.SyntaxKind.VoidKeyword:
        return "void";

      case ts.SyntaxKind.BooleanKeyword:
        return "boolean";

      case ts.SyntaxKind.AnyKeyword:
        return "any";

      default:
        return "unknown";
    }
  }
}

function typeToString(node: ts.Node): string {
  return node ? new TypeExtract().mapNode(node) : null;
}

function typesToString(nodes: ts.Node[]): string {
  return nodes ? new TypeExtract().mapNodes(nodes).join(",") : null;
}

function hasFlag(n: {flags: number}, flag: ts.NodeFlags): boolean {
  return n && (n.flags & flag) !== 0 || false;
}

function reportError(n: ts.Node, message: string) {
  const file = n.getSourceFile() ;
  const fileName = file.fileName;
  const start = n.getStart(file);
  const pos = file.getLineAndCharacterOfPosition(start);
  // Line and character are 0-based.
  const fullMessage = `${fileName}:${pos.line + 1}:${pos.character + 1}: ${message}`;
  throw new Error(fullMessage);
}


function flatten<T>(nestedArray: T[][]):T[] {
  return nestedArray.reduce((a, b) => a.concat(b), []);
}
