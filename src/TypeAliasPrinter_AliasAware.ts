import * as ts from "typescript";

export class TypeAliasPrinter {
  private readonly MAX_DEPTH = 5;
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;

  constructor(filePath: string) {
    this.program = ts.createProgram([filePath], {});
    this.checker = this.program.getTypeChecker();
    this.sourceFile = this.program.getSourceFile(filePath)!;
  }

  printTypeAlias(name: string, options?: { expanded?: boolean; verbose?: boolean }) {
    const node = this.sourceFile.statements.find(
      (n): n is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(n) && n.name.text === name
    );
    if (!node) return;

    const type = this.checker.getTypeAtLocation(node);
    const typeStr = this.checker.typeToString(type);

    console.log("==============================================");
    console.log("Original (type):\n" + node.getText() + "\n");

    console.log("Evaluated (inferred):");

    if (type.isUnion()) {
      const unionType = type as ts.UnionType;
      const parts = unionType.types.map((t) => this.checker.typeToString(t));
      console.log("-> type " + typeStr + " = " + parts.join(" | "));

      if (options?.verbose) {
        console.log("\nEvaluated (step 2):");
        unionType.types.forEach((t) => {
          const result = this.expandType(t, { depth: 1, seen: new Set() });
          console.log(\`  - \${this.checker.typeToString(t)} → \${result}\`);
        });
      }
    } else if (type.isIntersection()) {
      const intersectionType = type as ts.IntersectionType;
      const parts = intersectionType.types.map((t) => this.checker.typeToString(t));
      console.log("-> type " + typeStr + " = " + parts.join(" & "));

      if (options?.verbose) {
        console.log("\nEvaluated (step 2):");
        intersectionType.types.forEach((t) => {
          const result = this.expandType(t, { depth: 1, seen: new Set() });
          console.log(\`  - \${this.checker.typeToString(t)} → \${result}\`);
        });
      }
    } else {
      const result = this.expandType(type, { depth: 1, seen: new Set() });
      console.log("-> " + result);
    }

    if (options?.expanded) {
      const finalExpanded = this.expandType(type, { depth: 1, seen: new Set() });
      console.log("\nExpanded (final):\n-> " + finalExpanded);
    }

    console.log("==============================================");
  }

  private expandType(type: ts.Type, ctx: { depth: number; seen: Set<ts.Type> }): string {
    const { depth, seen } = ctx;
    if (depth > this.MAX_DEPTH) return "[MaxDepth]";
    if (seen.has(type)) return "[Circular]";
    seen.add(type);

    // 재귀적으로 타입 알리아스를 확장
    if (
      type.aliasSymbol &&
      (type.aliasSymbol.flags & ts.SymbolFlags.TypeAlias)
    ) {
      const aliasTarget = this.checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
      return this.expandType(aliasTarget, {
        depth: depth + 1,
        seen: new Set(seen),
      });
    }

    if (type.isUnion()) {
      const parts = type.types.map((t) =>
        this.expandType(t, { depth: depth + 1, seen: new Set(seen) })
      );
      return parts.join(" | ");
    }

    if (type.isIntersection()) {
      const parts = type.types.map((t) =>
        this.expandType(t, { depth: depth + 1, seen: new Set(seen) })
      );
      return parts.join(" & ");
    }

    const flags = ts.TypeFlags;
    const isFinal =
      type.flags &
        (flags.StringLike |
          flags.NumberLike |
          flags.BooleanLike |
          flags.BigIntLike |
          flags.ESSymbolLike |
          flags.Any |
          flags.Unknown |
          flags.Never) ||
      type.isLiteral();

    if (isFinal) {
      return this.checker.typeToString(type);
    }

    try {
      return this.checker.typeToString(type);
    } catch {
      return "[UnknownType]";
    }
  }

  private getTypeCategory(type: ts.Type): string {
    const flags = ts.TypeFlags;

    if (type.isUnion()) return "Union";
    if (type.isIntersection()) return "Intersection";

    if (type.flags & flags.StringLike) return "String";
    if (type.flags & flags.NumberLike) return "Number";
    if (type.flags & flags.BooleanLike) return "Boolean";
    if (type.flags & flags.BigIntLike) return "BigInt";
    if (type.flags & flags.ESSymbolLike) return "Symbol";
    if (type.flags & flags.Null) return "Null";
    if (type.flags & flags.Undefined) return "Undefined";
    if (type.flags & flags.Void) return "Void";
    if (type.flags & flags.Any) return "Any";
    if (type.flags & flags.Unknown) return "Unknown";
    if (type.flags & flags.Never) return "Never";
    if (type.isLiteral()) return "Literal";

    if (type.flags & flags.Object) {
      const objType = type as ts.ObjectType;

      if (objType.objectFlags & ts.ObjectFlags.Mapped) return "Mapped";
      if (objType.objectFlags & ts.ObjectFlags.Reference) return "GenericInstance";
      if (objType.objectFlags & ts.ObjectFlags.Anonymous) return "ObjectLiteral";
      if (objType.objectFlags & ts.ObjectFlags.Tuple) return "Tuple";
      if (objType.objectFlags & ts.ObjectFlags.Class) return "Class";
      if (objType.objectFlags & ts.ObjectFlags.Interface) return "Interface";
    }

    if (type.flags & flags.IndexedAccess) return "IndexedAccess";
    if (type.flags & flags.Conditional) return "Conditional";

    return "Unknown";
  }
}