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
import { TypeAnalyzer } from "./typeAnalyzer";

export class TypeAliasPrinter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;
  private fileName: string;
  private sourceCode: string;
  private formatter: TypeFormatter;
  private collector: TypeStructureCollector;
  private typeAnalyzer: TypeAnalyzer;

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
    this.typeAnalyzer = new TypeAnalyzer(this.checker, this.sourceFile);
  }

  /**
   * 🎯 메인 엔트리 포인트 - 완전히 새로운 버전
   */
  public printType(name: string, options?: PrintOptions): void {
    const maxDepth = options?.maxDepth || 10;
    const expanded = options?.expanded || false;

    try {
      // 🎯 Step 1: 입력 분석 (단순 vs 제네릭 인스턴스화)
      const inputAnalysis = this.analyzeInput(name);
      console.log("Input Analysis:", inputAnalysis);

      // 🎯 Step 2: 타입 종류 식별
      const kind = this.identifyKind(inputAnalysis.targetName);
      console.log("Kind:", kind);

      // 🎯 Step 3: 고급 분석 (제네릭 + 매핑)
      const enhancedOptions = this.prepareEnhancedOptions(
        inputAnalysis,
        options
      );
      const advancedAnalysis = this.typeAnalyzer.analyzeAdvancedType(
        inputAnalysis.originalInput,
        enhancedOptions
      );
      console.log("Advanced Analysis:", advancedAnalysis);

      // 🎯 Step 4: 컨텍스트 생성
      const context = this.createEnhancedContext(
        maxDepth,
        expanded,
        advancedAnalysis
      );

      // 🎯 Step 5: 타입별 처리
      switch (kind) {
        case AnalyzableKind.TYPEALIAS:
          const typeInfo = this.collectAdvancedTypeAliasInfo(
            inputAnalysis,
            advancedAnalysis,
            context
          );
          const formatted = this.formatter.format(
            typeInfo,
            enhancedOptions,
            advancedAnalysis.mappingInfo
          );
          console.log(formatted);
          break;

        case AnalyzableKind.INTERFACE:
          const interfaceInfo = this.collectAdvancedInterfaceInfo(
            inputAnalysis,
            advancedAnalysis,
            context
          );
          const interfaceFormatted = this.formatter.format(
            interfaceInfo,
            enhancedOptions
          );
          console.log(interfaceFormatted);
          break;

        default:
          console.log("Cannot find analyzable symbol: '" + name + "'.");
      }
    } catch (error) {
      console.error("Error analyzing type:", error);
    }
  }

  /**
   * 🎯 입력 분석: "flat" vs "Flatten<Nested>" 구분
   */
  private analyzeInput(input: string): {
    originalInput: string;
    targetName: string;
    isDirectGeneric: boolean;
    inferredMappingInfo?: {
      pattern: string;
      typeArgs: string[];
    };
  } {
    // Case 1: 직접 제네릭 ("Flatten<Nested>")
    const genericMatch = input.match(/^([^<]+)<(.+)>$/);
    if (genericMatch) {
      const typeName = genericMatch[1].trim();
      const typeArgsString = genericMatch[2];
      const typeArgs = this.parseTypeArguments(typeArgsString);

      return {
        originalInput: input,
        targetName: typeName,
        isDirectGeneric: true,
        inferredMappingInfo: {
          pattern: typeName,
          typeArgs: typeArgs,
        },
      };
    }

    // Case 2: 간접 참조 ("flat")
    const inferredMapping = this.inferMappingFromAlias(input);
    return {
      originalInput: input,
      targetName: input,
      isDirectGeneric: false,
      inferredMappingInfo: inferredMapping,
    };
  }

  /**
   * 🎯 타입 별칭에서 매핑 정보 추론
   * type flat = Flatten<Nested> → { pattern: "Flatten", typeArgs: ["Nested"] }
   */
  private inferMappingFromAlias(aliasName: string):
    | {
        pattern: string;
        typeArgs: string[];
      }
    | undefined {
    const aliasDecl = this.findTypeAliasDeclaration(aliasName);
    if (!aliasDecl || !ts.isTypeReferenceNode(aliasDecl.type)) {
      return undefined;
    }

    const refNode = aliasDecl.type;
    const typeName = refNode.typeName.getText();
    const typeArgs = refNode.typeArguments?.map((arg) => arg.getText()) || [];

    // 매핑 타입인지 확인 (간단한 휴리스틱)
    const mappingDecl = this.findTypeAliasDeclaration(typeName);
    if (mappingDecl && ts.isMappedTypeNode(mappingDecl.type)) {
      return {
        pattern: typeName,
        typeArgs: typeArgs,
      };
    }

    return undefined;
  }

  /**
   * 🎯 강화된 옵션 준비
   */
  private prepareEnhancedOptions(
    inputAnalysis: ReturnType<typeof this.analyzeInput>,
    originalOptions?: PrintOptions
  ): PrintOptions {
    const enhancedOptions: PrintOptions = {
      ...originalOptions,
      expanded: originalOptions?.expanded || false,
    };

    // 자동 매핑 분석 활성화
    if (inputAnalysis.inferredMappingInfo) {
      enhancedOptions.mappedAnalysis = {
        enabled: true,
        pattern: inputAnalysis.inferredMappingInfo.pattern,
        typeArgs: inputAnalysis.inferredMappingInfo.typeArgs,
      };
    }

    return enhancedOptions;
  }

  /**
   * 🎯 강화된 컨텍스트 생성
   */
  private createEnhancedContext(
    maxDepth: number,
    expanded: boolean,
    advancedAnalysis: ReturnType<typeof this.typeAnalyzer.analyzeAdvancedType>
  ): TypeCollectionContext {
    return {
      checker: this.checker,
      program: this.program,
      depth: 0,
      maxDepth,
      referencePath: [],
      genericContext: advancedAnalysis.genericContext,
      isInstantiated: advancedAnalysis.isInstantiated,
      sourceFile: this.sourceFile,
      expanded,
    };
  }

  /**
   * 🎯 고급 타입 별칭 정보 수집
   */
  private collectAdvancedTypeAliasInfo(
    inputAnalysis: ReturnType<typeof this.analyzeInput>,
    advancedAnalysis: ReturnType<typeof this.typeAnalyzer.analyzeAdvancedType>,
    context: TypeCollectionContext
  ): TypeInfo {
    const targetName = advancedAnalysis.typeName;
    const aliasDecl = this.findTypeAliasDeclaration(targetName);

    if (!aliasDecl) {
      throw new Error(`Type alias ${targetName} not found`);
    }

    const originalSource = aliasDecl.getText();

    // 🎯 TypeChecker로 최종 타입 정보 얻기
    let finalType: ts.Type;
    let finalTypeString: string;

    if (advancedAnalysis.isInstantiated) {
      // 제네릭 인스턴스화된 경우: TypeChecker로 정확한 계산
      finalType = this.calculateInstantiatedType(advancedAnalysis, context);
      finalTypeString = context.checker.typeToString(finalType);
    } else {
      // 일반 타입 별칭: 기본 처리
      const symbol = context.checker.getSymbolAtLocation(aliasDecl.name);
      finalType = symbol
        ? context.checker.getTypeOfSymbolAtLocation(symbol, aliasDecl)
        : context.checker.getTypeFromTypeNode(aliasDecl.type);
      finalTypeString = context.checker.typeToString(finalType);
    }

    console.log("🔍 Final type from TypeChecker:", finalTypeString);

    // 🎯 TypeStructureCollector에게 구조 분석 위임
    const structure = this.collector.collect(aliasDecl.type, context);

    // 최종 타입 정보 추가
    if (structure.metadata) {
      structure.metadata.finalTypeString = finalTypeString;
    } else {
      structure.metadata = { finalTypeString };
    }

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name: inputAnalysis.originalInput,
      originalSource,
      structure,
    };
  }

  /**
   * 🎯 인스턴스화된 타입 계산
   */
  private calculateInstantiatedType(
    advancedAnalysis: ReturnType<typeof this.typeAnalyzer.analyzeAdvancedType>,
    context: TypeCollectionContext
  ): ts.Type {
    try {
      // TypeScript factory를 이용해 제네릭 타입 인스턴스 생성
      const factory = ts.factory;

      const typeArgsNodes = advancedAnalysis.typeArgs.map((arg) =>
        factory.createTypeReferenceNode(arg)
      );

      const instantiatedTypeNode = factory.createTypeReferenceNode(
        advancedAnalysis.typeName,
        typeArgsNodes
      );

      // TypeChecker로 최종 타입 계산
      return context.checker.getTypeFromTypeNode(instantiatedTypeNode);
    } catch (error) {
      console.log(`⚠️ Instantiated type calculation failed: ${error}`);
      // Fallback: 기본 타입 별칭으로 처리
      const aliasDecl = this.findTypeAliasDeclaration(
        advancedAnalysis.typeName
      );
      if (aliasDecl) {
        return context.checker.getTypeFromTypeNode(aliasDecl.type);
      }
      return context.checker.getAnyType();
    }
  }

  /**
   * 🎯 고급 인터페이스 정보 수집
   */
  private collectAdvancedInterfaceInfo(
    inputAnalysis: ReturnType<typeof this.analyzeInput>,
    advancedAnalysis: ReturnType<typeof this.typeAnalyzer.analyzeAdvancedType>,
    context: TypeCollectionContext
  ): TypeInfo {
    const targetName = advancedAnalysis.typeName;
    const interfaceDecl = this.findInterfaceDeclaration(targetName);

    if (!interfaceDecl) {
      throw new Error(`Interface ${targetName} not found`);
    }

    const originalSource = interfaceDecl.getText();

    // TypeChecker로 최종 타입 정보 얻기
    const symbol = context.checker.getSymbolAtLocation(interfaceDecl.name);
    const finalType = symbol
      ? context.checker.getTypeOfSymbolAtLocation(symbol, interfaceDecl)
      : context.checker.getAnyType();
    const finalTypeString = context.checker.typeToString(finalType);

    // TypeStructureCollector에게 구조 분석 위임
    const structure = this.collectInterfaceStructure(
      interfaceDecl,
      context,
      finalTypeString
    );

    return {
      kind: AnalyzableKind.INTERFACE,
      name: inputAnalysis.originalInput,
      originalSource,
      structure,
    };
  }

  /**
   * 🎯 인터페이스 구조 수집
   */
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

        // TypeStructureCollector에게 프로퍼티 타입 분석 위임
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

    // computedResult 생성
    if (!context.expanded) {
      structure.computedResult = {
        type: "object",
        properties,
        metadata: { finalTypeString },
      };
    }

    return structure;
  }

  /**
   * 🎯 타입 인자 문자열 파싱
   */
  private parseTypeArguments(argsString: string): string[] {
    return argsString.split(",").map((arg) => arg.trim());
  }

  /**
   * 🎯 타입 종류 식별
   */
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

  /**
   * 🎯 심볼 검색
   */
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

  /**
   * 🔧 타입 별칭 선언 찾기
   */
  private findTypeAliasDeclaration(
    name: string
  ): ts.TypeAliasDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (
        ts.isTypeAliasDeclaration(statement) &&
        statement.name?.text === name
      ) {
        return statement;
      }
    }
    return null;
  }

  /**
   * 🔧 인터페이스 선언 찾기
   */
  private findInterfaceDeclaration(
    name: string
  ): ts.InterfaceDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (
        ts.isInterfaceDeclaration(statement) &&
        statement.name?.text === name
      ) {
        return statement;
      }
    }
    return null;
  }
}
