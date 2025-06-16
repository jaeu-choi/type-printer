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

  /**
   * 🎯 간소화된 메인 엔트리 포인트 - 순수한 오케스트레이터
   */
  public printType(name: string, options?: PrintOptions): void {
    const maxDepth = options?.maxDepth || 10;
    const expanded = options?.expanded || false;

    try {
      //  Step 1: 타입 종류 식별 (기본만)
      const kind = this.identifyKind(name);
      console.log("Kind:", kind);

      // Step 2: 기본 컨텍스트 생성
      const context = this.createBasicContext(maxDepth, expanded);

      //  Step 3: 타입별 처리 (간소화)
      switch (kind) {
        case AnalyzableKind.TYPEALIAS:
          const typeInfo = this.collectSimpleTypeAliasInfo(name, context);
          const formatted = this.formatter.format(typeInfo, options);
          console.log(formatted);
          break;

        case AnalyzableKind.INTERFACE:
          const interfaceInfo = this.collectSimpleInterfaceInfo(name, context);
          const interfaceFormatted = this.formatter.format(
            interfaceInfo,
            options
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
   * 🎯 간소화된 컨텍스트 생성 (복잡한 제네릭 처리 제거)
   */
  private createBasicContext(
    maxDepth: number,
    expanded: boolean
  ): TypeCollectionContext {
    return {
      checker: this.checker,
      program: this.program,
      depth: 0,
      maxDepth,
      referencePath: [],
      genericContext: undefined, // 일단 제거
      isInstantiated: false, // 일단 제거
      sourceFile: this.sourceFile,
      expanded,
    };
  }

  /**
   * 🎯 간소화된 타입 별칭 정보 수집 (복잡한 분석 로직 제거)
   */
  private collectSimpleTypeAliasInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const aliasDecl = this.findTypeAliasDeclaration(name);

    if (!aliasDecl) {
      throw new Error(`Type alias ${name} not found`);
    }

    const originalSource = aliasDecl.getText();

    // 🎯 기본 TypeChecker 사용 (복잡한 인스턴스화 제거)
    const symbol = this.checker.getSymbolAtLocation(aliasDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, aliasDecl)
      : this.checker.getTypeFromTypeNode(aliasDecl.type);
    const finalTypeString = this.checker.typeToString(finalType);

    console.log("🔍 Final type from TypeChecker:", finalTypeString);

    // 🎯 TypeStructureCollector에게 구조 분석 완전 위임
    const structure = this.collector.collect(aliasDecl.type, context);

    // 최종 타입 정보 추가
    if (structure.metadata) {
      structure.metadata.finalTypeString = finalTypeString;
    } else {
      structure.metadata = { finalTypeString };
    }

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name,
      originalSource,
      structure,
    };
  }

  /**
   * 🎯 간소화된 인터페이스 정보 수집
   */
  private collectSimpleInterfaceInfo(
    name: string,
    context: TypeCollectionContext
  ): TypeInfo {
    const interfaceDecl = this.findInterfaceDeclaration(name);

    if (!interfaceDecl) {
      throw new Error(`Interface ${name} not found`);
    }

    const originalSource = interfaceDecl.getText();

    // TypeChecker로 기본 타입 정보 얻기
    const symbol = this.checker.getSymbolAtLocation(interfaceDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, interfaceDecl)
      : this.checker.getAnyType();
    const finalTypeString = this.checker.typeToString(finalType);

    // TypeStructureCollector에게 구조 분석 위임
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

  /**
   * 🎯 인터페이스 구조 수집 (기존 유지)
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
   * 🎯 타입 종류 식별 (기존 유지)
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
   * 🎯 심볼 검색 (기존 유지)
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
   * 🔧 타입 별칭 선언 찾기 (기존 유지)
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
   * 🔧 인터페이스 선언 찾기 (기존 유지)
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

// 🗑️ 제거된 메서드들 (참고용 주석):
/*
제거된 복잡한 메서드들:
- analyzeInput() - 제네릭 파싱 로직
- inferMappingFromAlias() - 매핑 정보 추론
- prepareEnhancedOptions() - 복잡한 옵션 처리
- createEnhancedContext() - 고급 컨텍스트 생성
- collectAdvancedTypeAliasInfo() - 고급 분석 로직
- calculateInstantiatedType() - 복잡한 인스턴스화
- parseTypeArguments() - 타입 인자 파싱

이 기능들은 다음 단계에서 다른 컴포넌트로 이동 예정:
- GenericResolver: 제네릭 관련 로직
- MappingAnalyzer: 매핑 분석 로직  
- TypeAnalyzer: 고급 분석 기능
- Collector: 타입 구조 수집
*/
