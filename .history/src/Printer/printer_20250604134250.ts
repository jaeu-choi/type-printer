import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import {
  PrintOptions,
  AnalyzableKind,
  TypeInfo,
  TypeCollectionContext,
  TypeStructure,
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
    const expanded = options?.expanded || false;
    const mappedAnalysis = options?.mappedAnalysis;

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
      expanded,
    };

    let mappingInfo = null;
    if (mappedAnalysis && mappedAnalysis.enabled) {
      mappingInfo = this.collectMappingAnalysisInfo(mappedAnalysis, typeName);
    }

    switch (kind) {
      case AnalyzableKind.TYPEALIAS:
        const typeInfo = this.collectTypeAliasInfo(typeName, context);
        const formatted = this.formatter.format(typeInfo, options, mappingInfo);
        console.log(formatted);
        break;
      case AnalyzableKind.INTERFACE:
        const interfaceInfo = this.collectInterfaceInfo(typeName, context);
        const interfaceFormatted = this.formatter.format(
          interfaceInfo,
          options,
          mappingInfo
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

  // 🎯 핵심 수정: 시뮬레이션 기반 매핑 분석
  private collectMappingAnalysisInfo(
    mappedAnalysis: { pattern: string; typeArgs: string[] },
    targetTypeName: string
  ) {
    try {
      // 1. 매핑 패턴 정보 수집
      const mappedDecl = this.findTypeDeclaration(mappedAnalysis.pattern);
      if (!mappedDecl || !ts.isTypeAliasDeclaration(mappedDecl)) {
        console.log(`⚠️ Cannot find mapped pattern: ${mappedAnalysis.pattern}`);
        return null;
      }

      // 2. 타입 인자들의 정의 수집
      const typeArgDefinitions = mappedAnalysis.typeArgs.map((argName) => {
        const argDecl = this.findTypeDeclaration(argName);
        return {
          name: argName,
          definition: argDecl?.getText() || "unknown",
          declaration: argDecl,
        };
      });

      // 3. 🎯 최종 결과 타입 가져오기 (TypeChecker 활용)
      const targetSymbol = this.findSymbolByName(targetTypeName);
      if (!targetSymbol) {
        console.log(`⚠️ Cannot find target type: ${targetTypeName}`);
        return null;
      }

      const finalType = this.checker.getTypeOfSymbolAtLocation(
        targetSymbol,
        targetSymbol.valueDeclaration!
      );

      // 4. 🎯 시뮬레이션: 최종 결과로부터 이터레이션 재구성
      const iterations = this.simulateMappingIterations(
        mappedDecl,
        typeArgDefinitions,
        finalType
      );

      const result = {
        name: mappedAnalysis.pattern,
        pattern: mappedDecl.type.getText(),
        typeParameters:
          mappedDecl.typeParameters?.map((tp) => tp.getText()) || [],
        originalSource: mappedDecl.getText(),
        typeArgs: typeArgDefinitions,
        iterations,
      };

      console.log(
        "🔍 Mapping analysis completed, iterations count:",
        iterations.length
      );
      return result;
    } catch (error) {
      console.log(`⚠️ Mapping analysis failed: ${error}`);
      return null;
    }
  }

  // 🎯 핵심: 타입 인자 기반 매핑 시뮬레이션
  private simulateMappingIterations(
    mappedDecl: ts.TypeAliasDeclaration,
    typeArgDefinitions: any[],
    finalType: ts.Type
  ): any[] {
    const iterations: any[] = [];

    try {
      // 매핑 패턴 분석: [K in keyof T]: F[T[K]]
      const patternText = mappedDecl.type.getText();
      const mappingMatch = patternText.match(/\[(.+) in (.+)\]: (.+)/);

      if (!mappingMatch) {
        console.log("⚠️ Cannot parse mapping pattern:", patternText);
        return [];
      }

      const [, iteratorVar, constraint, valueExpr] = mappingMatch;
      console.log("🔍 Parsed mapping pattern:", {
        iteratorVar,
        constraint,
        valueExpr,
      });

      // 🎯 타입 인자들로부터 실제 타입 구조 분석
      if (typeArgDefinitions.length < 2) {
        console.log("⚠️ Need at least 2 type arguments for mapping simulation");
        return [];
      }

      const fromTypeInfo = this.analyzeTypeArgument(typeArgDefinitions[0].name); // From
      const toTypeInfo = this.analyzeTypeArgument(typeArgDefinitions[1].name); // To

      if (!fromTypeInfo || !toTypeInfo) {
        console.log("⚠️ Failed to analyze type arguments");
        return [];
      }

      console.log("🔍 Type analysis:", {
        from: fromTypeInfo.properties?.length || 0,
        to: toTypeInfo.properties?.length || 0,
      });

      // 🎯 To 타입의 각 키에 대해 매핑 과정 시뮬레이션
      if (toTypeInfo.properties) {
        for (const toProp of toTypeInfo.properties) {
          const toKey = toProp.name; // "ID", "NAME", "EMAIL"
          const toValue = toProp.value; // "id", "name", "email"

          // From 타입에서 해당 값에 해당하는 프로퍼티 찾기
          const fromProp = fromTypeInfo.properties?.find(
            (p) => p.name === toValue
          );
          if (!fromProp) {
            console.log(`⚠️ Cannot find property "${toValue}" in From type`);
            continue;
          }

          const resultType = fromProp.typeString; // number, string, string

          // 이터레이션 단계 생성
          iterations.push({
            type: "reference",
            name: `[Step: ${toKey}]`,
            children: [
              {
                type: "literal",
                value: `${iteratorVar} = "${toKey}"`,
                metadata: { description: "Iterator variable value" },
              },
              {
                type: "literal",
                value: `T[${iteratorVar}] = "${toValue}"`,
                metadata: { description: "Key lookup in mapping type" },
              },
              {
                type: "literal",
                value: `F[T[${iteratorVar}]] = F["${toValue}"] = ${resultType}`,
                metadata: { description: "Final mapped value" },
              },
            ],
            metadata: {
              description: `Mapping iteration for key "${toKey}"`,
              keyValue: toKey,
              mappedKey: toValue,
              resultType,
            },
          });
        }
      }

      console.log(`✅ Generated ${iterations.length} mapping iterations`);
      // JSON 로그 제거 (순환 참조 문제 해결)
    } catch (error) {
      console.log(`⚠️ Iteration simulation failed: ${error}`);
    }

    return iterations;
  }

  // 🆕 타입 인자 분석 헬퍼
  private analyzeTypeArgument(
    typeName: string
  ): {
    properties?: Array<{ name: string; value?: string; typeString: string }>;
  } | null {
    try {
      const typeDecl = this.findTypeDeclaration(typeName);
      if (!typeDecl) {
        console.log(`⚠️ Cannot find type declaration: ${typeName}`);
        return null;
      }

      if (ts.isInterfaceDeclaration(typeDecl)) {
        return this.analyzeInterfaceProperties(typeDecl);
      }

      if (ts.isTypeAliasDeclaration(typeDecl)) {
        return this.analyzeTypeAliasProperties(typeDecl);
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Type analysis failed for ${typeName}:`, error);
      return null;
    }
  }

  // 🆕 인터페이스 프로퍼티 분석
  private analyzeInterfaceProperties(interfaceDecl: ts.InterfaceDeclaration) {
    const properties: Array<{
      name: string;
      value?: string;
      typeString: string;
    }> = [];

    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const propName = member.name.getText().replace(/['"]/g, ""); // 따옴표 제거
        const typeNode = member.type;
        const typeString = this.checker.typeToString(
          this.checker.getTypeFromTypeNode(typeNode)
        );

        // 리터럴 타입인 경우 값 추출
        let value: string | undefined;
        if (ts.isLiteralTypeNode(typeNode)) {
          value = typeNode.literal.getText().replace(/['"]/g, "");
        }

        properties.push({ name: propName, value, typeString });
      }
    }

    return { properties };
  }

  // 🆕 타입 별칭 프로퍼티 분석
  private analyzeTypeAliasProperties(typeDecl: ts.TypeAliasDeclaration) {
    if (ts.isTypeLiteralNode(typeDecl.type)) {
      const properties: Array<{
        name: string;
        value?: string;
        typeString: string;
      }> = [];

      for (const member of typeDecl.type.members) {
        if (ts.isPropertySignature(member) && member.name && member.type) {
          const propName = member.name.getText().replace(/['"]/g, "");
          const typeNode = member.type;
          const typeString = this.checker.typeToString(
            this.checker.getTypeFromTypeNode(typeNode)
          );

          let value: string | undefined;
          if (ts.isLiteralTypeNode(typeNode)) {
            value = typeNode.literal.getText().replace(/['"]/g, "");
          }

          properties.push({ name: propName, value, typeString });
        }
      }

      return { properties };
    }

    return null;
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

    // 최종 계산된 타입 가져오기
    const symbol = this.checker.getSymbolAtLocation(interfaceDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, interfaceDecl)
      : null;
    const finalTypeString = finalType
      ? this.checker.typeToString(finalType)
      : "";

    const structure = this.collectInterfaceStructure(
      interfaceDecl,
      context,
      finalTypeString
    );

    return {
      kind: AnalyzableKind.INTERFACE,
      name,
      originalSource,
      structure,
    };
  }

  private collectInterfaceStructure(
    node: ts.InterfaceDeclaration,
    context: TypeCollectionContext,
    finalTypeString: string
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

    const structure: TypeStructure = {
      type: "object",
      properties,
      metadata: {
        originalText: node.getText(),
        finalTypeString,
      },
    };

    // 최종 결과를 computedResult에 저장 (간소화된 형태)
    if (!context.expanded) {
      structure.computedResult = {
        type: "object",
        properties,
        metadata: { finalTypeString },
      };
    }

    return structure;
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

    // 최종 계산된 타입 가져오기
    const symbol = this.checker.getSymbolAtLocation(aliasDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, aliasDecl)
      : null;
    const finalTypeString = finalType
      ? this.checker.typeToString(finalType)
      : "";

    const structure = this.collector.collect(aliasDecl.type, context);

    // ✨ 명시적이고 확장 가능한 체크
    if (!structure.metadata?.skipRecomputation) {
      // 최종 타입 정보 추가
      if (structure.metadata) {
        structure.metadata.finalTypeString = finalTypeString;
      } else {
        structure.metadata = { finalTypeString };
      }
    }

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
