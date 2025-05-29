import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { 
  PrintOptions, 
  AnalyzableKind, 
  TypeInfo, 
  TypeCollectionContext, 
  TypeStructure 
} from "./types";
import { TypeFormatter } from "./formatter";
import { TypeStructureCollector } from "./handlers";

export class TypeAliasPrinter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;
  private fileName: string;
  private sourceCode: string;
  private formatter: TypeFormatter;
  private collector: TypeStructureCollector;

  constructor(indexFilePath: string) {
    this.fileName = path.resolve(indexFilePath);
    this.sourceCode = fs.readFileSync(this.fileName, "utf-8");

    this.program = ts.createProgram([this.fileName], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    });
    this.checker = this.program.getTypeChecker();
    const src = this.program.getSourceFile(this.fileName);
    if (!src) throw new Error("Cannot find source file: " + this.fileName);
    this.sourceFile = src;
    this.formatter = new TypeFormatter();
    this.collector = new TypeStructureCollector();
  }

  public printType(name: string, options?: PrintOptions): void {
    const maxDepth = options?.maxDepth || 10;
    const { typeName, isInstantiated, typeArgs } = this.parseTypeRequest(name);
    const kind = this.identifyKind(typeName);
    console.log("Kind:", kind);

    const context: TypeCollectionContext = {
      checker: this.checker,
      depth: 0,
      program: this.program,
      maxDepth,
      referencePath: [],
      isInstantiated,
      genericContext: isInstantiated
        ? this.createGenericContext(typeName, typeArgs)
        : undefined,
      sourceFile: this.sourceFile,
    };

    switch (kind) {
      case AnalyzableKind.TYPEALIAS:
        const typeInfo = this.collectTypeAliasInfo(typeName, context);
        const formatted = this.formatter.format(typeInfo, options?.format);
        console.log(formatted);
        break;
      case AnalyzableKind.INTERFACE:
        const interfaceInfo = this.collectInterfaceInfo(typeName, context);
        const interfaceFormatted = this.formatter.format(
          interfaceInfo,
          options?.format
        );
        console.log(interfaceFormatted);
        break;
      default:
        console.log("Cannot find analyzable symbol: '" + typeName + "'.");
    }
  }

  private parseTypeRequest(input: string): {
    typeName: string;
    isInstantiated: boolean;
    typeArgs: string[];
  } {
    const genericMatch = input.match(/^([^<]+)<(.+)>$/);
    if (genericMatch) {
      const typeName = genericMatch[1].trim();
      const typeArgsString = genericMatch[2];
      const typeArgs = this.parseTypeArguments(typeArgsString);
      return { typeName, isInstantiated: true, typeArgs };
    }
    return { typeName: input, isInstantiated: false, typeArgs: [] };
  }

  private parseTypeArguments(argsString: string): string[] {
    return argsString.split(",").map((arg) => arg.trim());
  }

  private createGenericContext(
    typeName: string,
    typeArgs: string[]
  ): Map<string, TypeStructure> {
    const context = new Map<string, TypeStructure>();

    const declaration = this.findTypeDeclaration(typeName);
    if (
      declaration &&
      "typeParameters" in declaration &&
      declaration.typeParameters
    ) {
      declaration.typeParameters.forEach((param, index) => {
        if (index < typeArgs.length) {
          const paramName = param.name.text;
          const argType = typeArgs[index];
          context.set(paramName, {
            type: "primitive",
            value: argType,
          });
        }
      });
    }

    return context;
  }

  private findTypeDeclaration(
    name: string
  ): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (
        (ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return statement;
      }
    }
    return null;
  }

  private collectInterfaceInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const interfaceDecl = this.sourceFile.statements.find(
      (n): n is ts.InterfaceDeclaration =>
        ts.isInterfaceDeclaration(n) && n.name.text === name
    );

    if (!interfaceDecl) {
      throw new Error(`Interface ${name} not found`);
    }

    const originalSource = interfaceDecl.getText();
    const structure = this.collectInterfaceStructure(interfaceDecl, context);

    return {
      kind: AnalyzableKind.INTERFACE,
      name,
      originalSource,
      structure,
    };
  }

  private collectInterfaceStructure(
    node: ts.InterfaceDeclaration,
    context: TypeCollectionContext
  ): TypeStructure {
    const properties = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText();
        const optional = !!member.questionToken;
        const readonly =
          member.modifiers?.some(
            (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
          ) || false;

        const propType = member.type
          ? this.collector.collect(member.type, context)
          : { type: "primitive" as const, value: "any" };

        properties.push({
          name: propName,
          type: propType,
          optional,
          readonly,
        });
      }
    }

    return {
      type: "object",
      properties,
      metadata: { originalText: node.getText() },
    };
  }

  private collectTypeAliasInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const aliasDecl = this.sourceFile.statements.find(
      (n): n is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(n) && n.name.text === name
    );

    if (!aliasDecl) {
      throw new Error(`Alias ${name} not found`);
    }

    const originalSource = aliasDecl.getText();
    const structure = this.collector.collect(aliasDecl.type, context);

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name,
      originalSource,
      structure,
    };
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
}