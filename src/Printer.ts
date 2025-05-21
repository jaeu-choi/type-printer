// TypeAliasPrinter with Enum-based kind detection and modular print handlers
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

interface PrintOptions {
  expanded?: boolean;
  verbose?: boolean;
  final?: boolean;
}

enum AnalyzableKind {
  TYPEALIAS = "TYPEALIAS",
  INTERFACE = "INTERFACE",
  VARIABLE = "VARIABLE",
  FUNCTION = "FUNCTION",
  UNKNOWN = "UNKNOWN",
  ENUM = "ENUM",
  CLASS = "CLASS",
}

export class TypeAliasPrinter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;
  private fileName: string;
  private sourceCode: string;
  private readonly MAX_DEPTH = 10;

  constructor(indexFilePath: string) {
    this.fileName = path.resolve(indexFilePath);
    this.sourceCode = fs.readFileSync(this.fileName, "utf-8");

    const compilerHost: ts.CompilerHost = {
      fileExists: (file) => file === this.fileName,
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      getNewLine: () => "\n",
      getDefaultLibFileName: () => "lib.d.ts",
      readFile: (file) =>
        file === this.fileName ? this.sourceCode : undefined,
      useCaseSensitiveFileNames: () => true,
      writeFile: () => {},
      getSourceFile: (file, version) => {
        if (file === this.fileName) {
          return ts.createSourceFile(file, this.sourceCode, version, true);
        }
        return undefined;
      },
    };

    this.program = ts.createProgram(
      [this.fileName],
      { target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS },
      compilerHost
    );
    this.checker = this.program.getTypeChecker();

    const src = this.program.getSourceFile(this.fileName);
    if (!src) throw new Error("Cannot find source file: " + this.fileName);
    this.sourceFile = src;
  }

  public printType(name: string, options?: PrintOptions): void {
    const kind = this.identifyKind(name);
    switch (kind) {
      case AnalyzableKind.TYPEALIAS:
        this.printTypeAlias(name, options);
        break;
      case AnalyzableKind.INTERFACE:
        this.printInterface(name, options);
        break;
      case AnalyzableKind.VARIABLE:
        this.printVariable(name, options);
        break;
      case AnalyzableKind.FUNCTION:
        this.printFunction(name, options);
        break;
      default:
        console.log("Cannot find analyzable symbol: '" + name + "'.");
    }
  }
  private findSymbolByName(name: string): ts.Symbol | undefined {
    for (const statement of this.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isFunctionDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return this.checker.getSymbolAtLocation(statement.name);
      }

      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            return this.checker.getSymbolAtLocation(decl.name);
          }
        }
      }
    }

    return undefined;
  }
  private formatEvaluated(
    name: string,
    kind: AnalyzableKind,
    type: ts.Type
  ): string {
    const typeStr =
      type.flags & ts.TypeFlags.Object
        ? this.getObjectTypeString(type)
        : this.checker.typeToString(
            type,
            undefined,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseFullyQualifiedType |
              ts.TypeFormatFlags.MultilineObjectLiterals
          );

    switch (kind) {
      case AnalyzableKind.TYPEALIAS:
        return `type ${name} = ${typeStr}`;
      case AnalyzableKind.INTERFACE:
        return `interface ${name} = ${typeStr}`;
      case AnalyzableKind.ENUM:
        return `enum ${name} = ${typeStr}`;
      case AnalyzableKind.CLASS:
        return `class ${name} = ${typeStr}`;
      case AnalyzableKind.FUNCTION:
      case AnalyzableKind.VARIABLE:
      default:
        return `${name}: ${typeStr}`;
    }
  }
  private identifyKind(name: string): AnalyzableKind {
    const symbol = this.findSymbolByName(name);
    if (!symbol) return AnalyzableKind.UNKNOWN;

    const flags = symbol.getFlags();

    if (flags & ts.SymbolFlags.TypeAlias) return AnalyzableKind.TYPEALIAS;
    if (flags & ts.SymbolFlags.Interface) return AnalyzableKind.INTERFACE;
    if (flags & ts.SymbolFlags.Enum) return AnalyzableKind.ENUM;
    if (flags & ts.SymbolFlags.Class) return AnalyzableKind.CLASS;
    if (flags & ts.SymbolFlags.Function) return AnalyzableKind.FUNCTION;

    if (flags & ts.SymbolFlags.Variable) {
      const type = this.checker.getTypeOfSymbolAtLocation(
        symbol,
        symbol.valueDeclaration!
      );
      if (type.getCallSignatures().length > 0) return AnalyzableKind.FUNCTION;
      return AnalyzableKind.VARIABLE;
    }

    return AnalyzableKind.UNKNOWN;
  }

  private printTypeAlias(name: string, options?: PrintOptions): void {
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
        unionType.types.forEach((t, i) => {
          const resolved = this.expandType(t, {
            depth: 1,
            seen: new Set(),
            path: "root",
          });
          console.log(`  - ${this.checker.typeToString(t)} → ${resolved}`);
        });
      }
    } else if (type.isIntersection()) {
      const intersectionType = type as ts.IntersectionType;
      const parts = intersectionType.types.map((t) =>
        this.checker.typeToString(t)
      );
      console.log("-> type " + typeStr + " = " + parts.join(" & "));

      if (options?.verbose) {
        console.log("\nEvaluated (step 2):");
        intersectionType.types.forEach((t, i) => {
          const resolved = this.expandType(t, {
            depth: 1,
            seen: new Set(),
            path: "root",
          });
          console.log(`  - ${this.checker.typeToString(t)} → ${resolved}`);
        });
      }
    } else {
      // not union or intersection → still print
      const resolved = this.expandType(type, {
        depth: 1,
        seen: new Set(),
        path: "root",
      });
      console.log("-> type " + typeStr + " = " + resolved);
    }

    if (options?.expanded) {
      const finalExpanded = this.expandType(type, {
        depth: 1,
        seen: new Set(),
        path: "root",
      });
      console.log("\nExpanded (final):\n-> " + finalExpanded);
    }

    if (options?.final) {
      const finalType = this.checker.getTypeFromTypeNode(node.type); // 🔄 여기 수정
      const reduced = this.expandType(finalType, {
        depth: 1,
        seen: new Set(),
        path: "final",
      });
      console.log("\nFinal (compiler-reduced type):\n-> " + reduced);
    }
    console.log("==============================================");
  }

  private expandType(
    type: ts.Type,
    ctx: { depth: number; seen: Set<string>; path: string }
  ): string {
    const { depth, seen, path } = ctx;

    if (depth > this.MAX_DEPTH) return "[MaxDepth]";
    const key = `${(type as any).id}@${path}`;
    if (seen.has(key)) return "[Circular]";
    seen.add(key);

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
          flags.Never) || type.isLiteral();

    if (isFinal) {
      return this.checker.typeToString(type);
    }

    if (type.isIntersection()) {
      // Check for impossible intersections (primitive & object)
      let hasPrimitive = false;
      let hasObject = false;
      let hasStringType = false;

      for (const t of type.types) {
        // Check for primitive types
        if (
          t.flags &
          (flags.StringLike |
            flags.NumberLike |
            flags.BooleanLike |
            flags.BigIntLike |
            flags.ESSymbolLike |
            flags.Undefined |
            flags.Null)
        ) {
          hasPrimitive = true;
          if (t.flags & flags.StringLike) {
            hasStringType = true;
          }
        }

        // Check for object types with properties
        if (t.flags & flags.Object) {
          const objType = t as ts.ObjectType;
          // Only consider it an object if it has properties or is definitely an object type
          if (
            t.getProperties().length > 0 ||
            !(
              objType.objectFlags & ts.ObjectFlags.Anonymous &&
              t.getProperties().length === 0
            )
          ) {
            hasObject = true;
          }
        }
      }

      // If we have both a primitive (except string) and an object, it's an impossible intersection
      if (hasPrimitive && hasObject && !hasStringType) {
        return "never";
      }

      // If we have string and an object with properties, it's an impossible intersection
      // (except for special cases like String object vs string primitive)
      if (hasStringType && hasObject) {
        const objectTypes = type.types.filter((t) => t.flags & flags.Object);
        for (const objType of objectTypes) {
          // Check if it's a normal object with properties and not the String interface/object
          if (
            objType.getProperties().length > 0 &&
            objType.symbol &&
            objType.symbol.name !== "String"
          ) {
            return "never";
          }
        }
      }

      const parts = type.types.map((t, i) =>
        this.expandType(t, {
          depth: depth + 1,
          seen,
          path: `${path}|intersect${i}`,
        })
      );
      return parts.join(" & ");
    }

    if (type.isUnion()) {
      const parts = type.types.map((t, i) =>
        this.expandType(t, {
          depth: depth + 1,
          seen,
          path: `${path}|union${i}`,
        })
      );
      return parts.join(" | ");
    }

    if (type.aliasSymbol && type.aliasSymbol.flags & ts.SymbolFlags.TypeAlias) {
      const aliasTarget = this.checker.getDeclaredTypeOfSymbol(
        type.aliasSymbol
      );
      if (aliasTarget !== type) {
        return this.expandType(aliasTarget, {
          depth: depth + 1,
          seen,
          path: `${path}|alias:${type.aliasSymbol.name}`,
        });
      }
    }

    if (type.getProperties && type.getProperties().length > 0) {
      const props = type
        .getProperties()
        .map((symbol) => {
          const propType = this.checker.getTypeOfSymbolAtLocation(
            symbol,
            symbol.valueDeclaration!
          );
          const expanded = this.expandType(propType, {
            depth: depth + 1,
            seen,
            path: `${path}.${symbol.name}`,
          });
          return `${symbol.name}: ${expanded}`;
        })
        .join("; ");
      return `{ ${props} }`;
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
      if (objType.objectFlags & ts.ObjectFlags.Reference)
        return "GenericInstance";
      if (objType.objectFlags & ts.ObjectFlags.Anonymous)
        return "ObjectLiteral";
      if (objType.objectFlags & ts.ObjectFlags.Tuple) return "Tuple";
      if (objType.objectFlags & ts.ObjectFlags.Class) return "Class";
      if (objType.objectFlags & ts.ObjectFlags.Interface) return "Interface";
    }

    if (type.flags & flags.IndexedAccess) return "IndexedAccess";
    if (type.flags & flags.Conditional) return "Conditional";

    return "Unknown";
  }

  private printInterface(name: string, options?: PrintOptions): void {
    const node = this.sourceFile.statements.find(
      (n): n is ts.InterfaceDeclaration =>
        ts.isInterfaceDeclaration(n) && n.name.text === name
    );
    if (!node) return;

    const type = this.checker.getTypeAtLocation(node);

    console.log("==============================================");
    console.log("Original (interface):\n" + node.getText() + "\n");
    console.log("→ Evaluated (inferred):\n" + this.getObjectTypeString(type));

    if (options?.expanded) {
      console.log(
        "\n🔍 Expanded (flattened):\n" +
          this.expandType(type, { depth: 1, seen: new Set(), path: "root" })
      );
    }

    console.log("==============================================");
  }

  private printVariable(name: string, options?: PrintOptions): void {
    for (const node of this.sourceFile.statements) {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            const symbol = this.checker.getSymbolAtLocation(decl.name);
            if (!symbol) return;
            const type = this.checker.getTypeOfSymbolAtLocation(symbol, decl);

            console.log("==============================================");
            console.log("Original (variable):\n" + node.getText() + "\n");
            console.log("→ Evaluated (inferred):\n" + this.formatType(type));

            if (options?.expanded) {
              console.log(
                "\n🔍 Expanded (flattened):\n" +
                  this.expandType(type, {
                    depth: 1,
                    seen: new Set(),
                    path: "root",
                  })
              );
            }

            console.log("==============================================");
            return;
          }
        }
      }
    }
  }

  private printFunction(name: string, options?: PrintOptions): void {
    for (const node of this.sourceFile.statements) {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            const symbol = this.checker.getSymbolAtLocation(decl.name);
            if (!symbol) return;
            const type = this.checker.getTypeOfSymbolAtLocation(symbol, decl);
            const sigs = type.getCallSignatures();

            console.log("==============================================");
            console.log(
              "Original (function variable):\n" + node.getText() + "\n"
            );
            if (sigs.length > 0) {
              console.log(
                "→ Evaluated (signature):\n" +
                  this.checker.signatureToString(sigs[0])
              );
            }

            if (options?.expanded) {
              console.log(
                "\n🔍 Expanded (flattened):\n" +
                  this.expandType(type, {
                    depth: 1,
                    seen: new Set(),
                    path: "root",
                  })
              );
            }

            console.log("==============================================");
            return;
          }
        }
      }
    }
  }

  private formatType(type: ts.Type): string {
    return this.checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation |
        ts.TypeFormatFlags.UseFullyQualifiedType |
        ts.TypeFormatFlags.MultilineObjectLiterals
    );
  }

  private getObjectTypeString(type: ts.Type): string {
    const properties = type.getProperties();
    if (properties.length === 0) return "{}";

    const props = properties.map((prop) => {
      const propType = this.checker.getTypeOfSymbolAtLocation(
        prop,
        this.sourceFile
      );
      const isOptional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
      return (
        "  " +
        prop.name +
        (isOptional ? "?" : "") +
        ": " +
        this.formatType(propType)
      );
    });

    return "{\n" + props.join(",\n") + "\n}";
  }

  private isBasicType(typeStr: string): boolean {
    return [
      "string",
      "number",
      "boolean",
      "any",
      "void",
      "null",
      "undefined",
      "never",
      "unknown",
    ].includes(typeStr);
  }
}
