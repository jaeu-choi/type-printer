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

/**
 * 🎯 간소화된 TypeAliasPrinter
 *
 * 책임:
 * 1. 엔트리 포인트 제공 (printType)
 * 2. 기본 타입 정보 수집
 * 3. TypeStructureCollector와 TypeFormatter 조합
 * 4. 에러 처리
 *
 * 제거된 기능들:
 * - 제네릭 파싱 및 컨텍스트 생성
 * - 매핑 분석 시뮬레이션
 * - 복잡한 타입 인자 분석
 */
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
   * 🎯 메인 엔트리 포인트 - 간소화됨
   */
  public printType(name: string, options?: PrintOptions): void {
    const maxDepth = options?.maxDepth || 10;
    const expanded = options?.expanded || false;

    // 🔧 간소화: 제네릭 파싱 제거, 단순 이름만 처리
    const kind = this.identifyKind(name);
    console.log("Kind:", kind);

    const context: TypeCollectionContext = {
      checker: this.checker,
      depth: 0,
      program: this.program,
      maxDepth,
      referencePath: [],
      isInstantiated: false, // 간소화: 항상 false
      genericContext: undefined, // 간소화: 제네릭 컨텍스트 제거
      sourceFile: this.sourceFile,
      expanded,
    };

    try {
      switch (kind) {
        case AnalyzableKind.TYPEALIAS:
          const typeInfo = this.collectTypeAliasInfo(name, context);
          const formatted = this.formatter.format(typeInfo, options);
          console.log(formatted);
          break;

        case AnalyzableKind.INTERFACE:
          const interfaceInfo = this.collectInterfaceInfo(name, context);
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
   * 🎯 인터페이스 정보 수집 - 간소화됨
   */
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

    // TypeChecker로 최종 타입 정보 얻기
    const symbol = this.checker.getSymbolAtLocation(interfaceDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, interfaceDecl)
      : null;
    const finalTypeString = finalType
      ? this.checker.typeToString(finalType)
      : "";

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
   * 🎯 타입 별칭 정보 수집 - 간소화됨 (복잡한 제네릭 로직 제거)
   */
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

    // 🎯 TypeChecker로 최종 타입 정보 얻기
    const symbol = this.checker.getSymbolAtLocation(aliasDecl.name);
    const finalType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, aliasDecl)
      : null;
    const finalTypeString = finalType
      ? this.checker.typeToString(finalType)
      : "";

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
   * 🎯 인터페이스 구조 수집 - 간소화됨
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

    // 간소화된 computedResult 생성
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
   * 🎯 타입 종류 식별 - 기존 유지
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
   * 🎯 심볼 검색 - 기존 유지
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
}

// 🗑️ 제거된 메서드들 (참고용 주석):
/*
제거된 메서드들:
- parseTypeRequest() - 제네릭 파싱 로직
- parseTypeArguments() - 타입 인자 파싱
- createGenericContext() - 제네릭 컨텍스트 생성
- collectMappingAnalysisInfo() - 매핑 분석 (가장 복잡했던 부분)
- simulateMappingIterations() - 매핑 시뮬레이션
- analyzeTypeArgument() - 타입 인자 분석
- analyzeInterfaceProperties() - 인터페이스 프로퍼티 분석
- analyzeTypeAliasProperties() - 타입 별칭 프로퍼티 분석
- isObjectType() - 간단한 헬퍼
- findTypeDeclaration() - 타입 선언 검색 (일부 중복 기능)

이 기능들은 다음으로 이동 예정:
- GenericResolver: 제네릭 관련 로직
- MappingAnalyzer: 매핑 분석 로직
- TypeLookupService: 타입 검색 로직
*/
