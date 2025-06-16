// src/printer.ts

// Node.js 내장 모듈
import * as fs from "fs";
import * as path from "path";

// 외부 라이브러리
import * as ts from "typescript";

// 로컬 타입 정의
import { AnalyzableKind, PrintOptions, TypeInfo } from "./types";
import {
  EducationalStep,
  TypeCreationContext,
  TypeNode,
  createTypeCreationContext,
} from "./ir";

// 로컬 컴포넌트
import { TypeFormatter } from "./formatter";

// 핸들러 시스템
import {
  GenericProcessor,
  GenericProcessResult,
  isGenericInstance,
} from "./handlers/genericProcessor";
import {
  globalHandlerRegistry,
  getRegistryInfo,
  setGlobalDebugMode,
} from "./handlers/registry";
import {
  diagnoseHandlerRegistry,
  initializeAvailableHandlers,
  testHandlerRegistration,
} from "./handlers/setup";

/**
 * 🎯 새로운 IR 시스템 기반 TypeScript 타입 분석 프린터
 *
 * 주요 변경사항:
 * - TypeStructureCollector → TypeHandlerRegistry 사용
 * - TypeStructure → TypeNode(IR) 반환
 * - 핸들러 시스템 완전 통합
 * - Method 2 (InTypeAlias) 플래그 사용으로 실제 확장된 타입 표시
 */
export class TypeAliasPrinter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;
  private fileName: string;
  private sourceCode: string;
  private formatter: TypeFormatter;
  private initialized: boolean = false;
  private genericProcessor: GenericProcessor;

  constructor(indexFilePath: string, options?: { debugMode?: boolean }) {
    this.fileName = path.resolve(indexFilePath);
    this.sourceCode = fs.readFileSync(this.fileName, "utf-8");

    // TypeScript 프로그램 초기화
    this.program = ts.createProgram([this.fileName], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strictNullChecks: true, // 🔧 추가!
      strict: true, // 🔧 추가!
    });

    this.checker = this.program.getTypeChecker();
    const src = this.program.getSourceFile(this.fileName);
    if (!src) throw new Error("Cannot find source file: " + this.fileName);
    this.sourceFile = src;

    this.formatter = new TypeFormatter();
    this.genericProcessor = new GenericProcessor(this.checker, this.sourceFile);

    // 🚀 핸들러 시스템 초기화
    this.initializeHandlerSystem(options?.debugMode);
  }

  /**
   * 🚀 핸들러 시스템 초기화
   */
  private initializeHandlerSystem(debugMode?: boolean): void {
    try {
      console.log("🚀 Initializing new IR-based type analysis system...");

      // 디버그 모드 설정
      if (debugMode) {
        setGlobalDebugMode(true);
      }

      // 현재 사용 가능한 핸들러들 등록
      initializeAvailableHandlers();

      // 등록 상태 확인
      if (!testHandlerRegistration()) {
        throw new Error("Handler registration failed");
      }

      // 상태 진단 (디버그 모드일 때만)
      if (debugMode) {
        diagnoseHandlerRegistry();
      }

      this.initialized = true;
      console.log("✅ Handler system initialization completed");
    } catch (error) {
      console.error("❌ Failed to initialize handler system:", error);
      throw error;
    }
  }

  /**
   * 🎯 메인 엔트리 포인트 - IR 시스템 기반 타입 분석
   */
  public printType(name: string, options?: PrintOptions): void {
    if (!this.initialized) {
      throw new Error("Handler system not initialized");
    }

    const maxDepth = options?.maxDepth || 10;
    const expanded = options?.expanded || false;

    try {
      console.log(`🔍 Analyzing type: ${name}`);

      // Step 1: 타입 종류 식별
      const kind = this.identifyKind(name);
      console.log(`📋 Detected kind: ${kind}`);

      // Step 2: TypeCreationContext 생성 (새로운 IR 시스템)
      const context = this.createAnalysisContext(maxDepth, expanded);

      // Step 3: 타입별 처리 (새로운 IR 시스템 기반)
      let typeInfo: TypeInfo;

      switch (kind) {
        case AnalyzableKind.TYPEALIAS:
          typeInfo = this.analyzeTypeAlias(name, context);
          break;

        case AnalyzableKind.INTERFACE:
          typeInfo = this.analyzeInterface(name, context);
          break;

        case AnalyzableKind.ENUM:
          typeInfo = this.analyzeEnum(name, context);
          break;

        case AnalyzableKind.CLASS:
          typeInfo = this.analyzeClass(name, context);
          break;

        default:
          throw new Error(`Cannot analyze type kind: ${kind} for '${name}'`);
      }

      // Step 4: 포맷팅 및 출력
      const formatted = this.formatter.format(typeInfo, options);
      console.log(formatted);
    } catch (error) {
      console.error(`❌ Error analyzing type '${name}':`, error);
    }
  }

  /**
   * 🆕 새로운 분석 컨텍스트 생성 (IR 시스템)
   */
  private createAnalysisContext(
    maxDepth: number,
    expanded: boolean
  ): TypeCreationContext {
    return createTypeCreationContext(
      this.checker,
      this.program,
      this.sourceFile,
      {
        maxDepth,
        expanded,
        includeDebugInfo: true,
      }
    );
  }

  /**
   * 🎯 타입 별칭 분석 (개선된 버전 - finalTypeString 보존)
   */
  private analyzeTypeAlias(
    name: string,
    context: TypeCreationContext
  ): TypeInfo {
    // const aliasDecl = this.findTypeAliasDeclaration(name);
    const aliasDecl = this.findTypeAliasDeclaration("DirectInfer");
    console.log(
      "Is conditional node:",
      ts.isConditionalTypeNode(aliasDecl?.type)
    );
    console.log("Node text:", aliasDecl?.type.getText());
    if (!aliasDecl) {
      throw new Error(`Type alias '${name}' not found`);
    }

    console.log(`🔍 Analyzing type alias: ${name}`);
    const originalSource = aliasDecl.getText();

    // 🆕 제네릭 인스턴스 감지 및 처리
    if (isGenericInstance(aliasDecl.type)) {
      console.log(`📋 Generic instance detected: ${aliasDecl.type.getText()}`);

      try {
        const genericResult = this.genericProcessor.processGenericInstance(
          aliasDecl.type,
          context
        );

        return this.handleGenericResult(
          name,
          originalSource,
          genericResult,
          aliasDecl
        );
      } catch (error) {
        console.warn(
          `⚠️ Generic processing failed: ${error}, falling back to standard analysis`
        );
        // Fallback to standard processing
      }
    }

    // 기존 표준 처리
    const aliasType = this.checker.getTypeFromTypeNode(aliasDecl.type);
    const typeNode = globalHandlerRegistry.createTypeNode(
      aliasType,
      aliasDecl.type,
      context
    );

    const checkerTypeString = this.checker.typeToString(aliasType);

    // 🎯 핵심 수정: 핸들러가 설정한 finalTypeString 보존!
    if (typeNode.metadata) {
      // 핸들러가 이미 finalTypeString을 설정했다면 보존
      if (!typeNode.metadata.finalTypeString) {
        typeNode.metadata.finalTypeString = checkerTypeString;
        console.log(
          `🔧 Using checker's finalTypeString: "${checkerTypeString}"`
        );
      } else {
        console.log(
          `🎯 Preserving handler's finalTypeString: "${typeNode.metadata.finalTypeString}"`
        );
        console.log(`🔍 Checker would have used: "${checkerTypeString}"`);
      }

      typeNode.metadata.originalTypeName = name;
    }

    console.log(
      `✅ Type alias analysis completed: ${
        typeNode.metadata?.finalTypeString || checkerTypeString
      }`
    );

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name,
      originalSource,
      structure: typeNode,
    };
  }

  /**
   * 🔄 제네릭 결과 처리 (분할 유니온 지원 개선)
   */
  private handleGenericResult(
    name: string,
    originalSource: string,
    genericResult: GenericProcessResult,
    aliasDecl: ts.TypeAliasDeclaration
  ): TypeInfo {
    console.log(`🔄 Processing generic result for: ${name}`);

    // 🎯 핵심: 실제 TypeScript가 계산한 최종 결과 사용!
    const actualType = this.checker.getTypeFromTypeNode(aliasDecl.type);
    const actualFinalTypeString = this.checker.typeToString(
      actualType,
      aliasDecl.type,
      ts.TypeFormatFlags.InTypeAlias // Method 2 사용!
    );

    console.log(`🎯 Actual TypeScript result: "${actualFinalTypeString}"`);

    // 보강된 컨텍스트로 정의 처리 (교육적 목적)
    const definitionType = this.checker.getTypeFromTypeNode(aliasDecl.type);
    const typeNode = globalHandlerRegistry.createTypeNode(
      definitionType,
      aliasDecl.type,
      genericResult.enhancedContext
    );

    // 🔥 핵심: 실제 계산된 결과를 finalTypeString으로 사용
    if (typeNode.metadata) {
      // 핸들러가 설정한 값이 있어도 실제 최종 결과로 덮어쓰기
      typeNode.metadata.finalTypeString = actualFinalTypeString;
      typeNode.metadata.originalTypeName = name;

      // 제네릭 정보 추가
      typeNode.metadata.genericInfo = {
        isGeneric: true,
        isInstantiated: true,
        typeParameters: Array.from(genericResult.parameterMappings.keys()),
        resolvedArguments: Array.from(
          genericResult.parameterMappings.values()
        ).map((mapping) => mapping.argumentText),
      };

      // 교육적 정보 추가
      typeNode.metadata.educationalSteps = genericResult.educationalSteps;
    }

    console.log(`✅ Generic type analysis completed: ${actualFinalTypeString}`);

    return {
      kind: AnalyzableKind.TYPEALIAS,
      name,
      originalSource,
      structure: typeNode,
      analysisInfo: {
        handlerUsed: "GenericProcessor",
        analysisTime: performance.now(),
        depth: genericResult.enhancedContext.depth,
        warnings: [],
      },
    };
  }

  /**
   * 🎯 인터페이스 분석 (새로운 IR 시스템)
   */
  private analyzeInterface(
    name: string,
    context: TypeCreationContext
  ): TypeInfo {
    const interfaceDecl = this.findInterfaceDeclaration(name);
    if (!interfaceDecl) {
      throw new Error(`Interface '${name}' not found`);
    }

    console.log(`🔍 Analyzing interface: ${name}`);

    const originalSource = interfaceDecl.getText();

    // TypeChecker로 인터페이스 타입 가져오기
    const symbol = this.checker.getSymbolAtLocation(interfaceDecl.name);
    const interfaceType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, interfaceDecl)
      : this.checker.getAnyType();

    // 🎯 새로운 방식: TypeHandlerRegistry로 인터페이스 분석
    const typeNode = globalHandlerRegistry.createTypeNode(
      interfaceType,
      undefined, // 인터페이스는 TypeNode가 없음
      context
    );

    // 메타데이터 보강
    if (typeNode.metadata) {
      typeNode.metadata.originalTypeName = name;
      typeNode.metadata.finalTypeString =
        this.checker.typeToString(interfaceType);
    }

    console.log(`✅ Interface analysis completed`);

    return {
      kind: AnalyzableKind.INTERFACE,
      name,
      originalSource,
      structure: typeNode,
    };
  }

  /**
   * 🎯 Enum 분석 (새로운 IR 시스템)
   */
  private analyzeEnum(name: string, context: TypeCreationContext): TypeInfo {
    const enumDecl = this.findEnumDeclaration(name);
    if (!enumDecl) {
      throw new Error(`Enum '${name}' not found`);
    }

    console.log(`🔍 Analyzing enum: ${name}`);

    const originalSource = enumDecl.getText();

    // Enum 타입 가져오기
    const symbol = this.checker.getSymbolAtLocation(enumDecl.name);
    const enumType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, enumDecl)
      : this.checker.getAnyType();

    // TypeHandlerRegistry로 분석
    const typeNode = globalHandlerRegistry.createTypeNode(
      enumType,
      undefined,
      context
    );

    console.log(`✅ Enum analysis completed`);

    return {
      kind: AnalyzableKind.ENUM,
      name,
      originalSource,
      structure: typeNode,
    };
  }

  /**
   * 🎯 클래스 분석 (새로운 IR 시스템)
   */
  private analyzeClass(name: string, context: TypeCreationContext): TypeInfo {
    const classDecl = this.findClassDeclaration(name);
    if (!classDecl) {
      throw new Error(`Class '${name}' not found`);
    }

    console.log(`🔍 Analyzing class: ${name}`);

    const originalSource = classDecl.getText();

    // 클래스 타입 가져오기
    const symbol = this.checker.getSymbolAtLocation(classDecl.name!);
    const classType = symbol
      ? this.checker.getTypeOfSymbolAtLocation(symbol, classDecl)
      : this.checker.getAnyType();

    // TypeHandlerRegistry로 분석
    const typeNode = globalHandlerRegistry.createTypeNode(
      classType,
      undefined,
      context
    );

    console.log(`✅ Class analysis completed`);

    return {
      kind: AnalyzableKind.CLASS,
      name,
      originalSource,
      structure: typeNode,
    };
  }

  // ==============================
  // 🔧 기존 유지되는 유틸리티들
  // ==============================

  /**
   * 타입 종류 식별 (기존 로직 유지)
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
   * 심볼 검색 (기존 로직 유지)
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
   * 타입 별칭 선언 찾기
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
   * 인터페이스 선언 찾기
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

  /**
   * Enum 선언 찾기
   */
  private findEnumDeclaration(name: string): ts.EnumDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (ts.isEnumDeclaration(statement) && statement.name?.text === name) {
        return statement;
      }
    }
    return null;
  }

  /**
   * 클래스 선언 찾기
   */
  private findClassDeclaration(name: string): ts.ClassDeclaration | null {
    for (const statement of this.sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name?.text === name) {
        return statement;
      }
    }
    return null;
  }

  // ==============================
  // 🔧 디버깅 및 상태 확인
  // ==============================

  /**
   * 핸들러 시스템 상태 확인
   */
  public getSystemStatus(): {
    initialized: boolean;
    handlerCount: number;
    handlers: Array<{ name: string; priority: number }>;
  } {
    const registryInfo = getRegistryInfo();
    return {
      initialized: this.initialized,
      handlerCount: registryInfo.handlerCount,
      handlers: registryInfo.handlers,
    };
  }

  /**
   * 디버그 정보 출력
   */
  public printDebugInfo(): void {
    console.log("\n🔍 TypeAliasPrinter Debug Information:");
    console.log(`   File: ${this.fileName}`);
    console.log(`   Initialized: ${this.initialized}`);

    const status = this.getSystemStatus();
    console.log(`   Handler count: ${status.handlerCount}`);
    console.log("   Registered handlers:");
    status.handlers.forEach((h) => {
      console.log(`     - ${h.name} (priority: ${h.priority})`);
    });
  }
}
