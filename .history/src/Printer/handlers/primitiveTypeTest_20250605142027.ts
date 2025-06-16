// src/test/primitiveHandlerTest.ts

import * as ts from "typescript";
import {
  globalHandlerRegistry,
  registerHandler,
  convertToTypeNode,
  getRegistryInfo,
  setGlobalDebugMode,
} from "../handlers/registry";
import { PrimitiveTypeHandler } from "../handlers/primitiveTypeHandler";
import { createTypeCreationContext } from "../ir";

/**
 * 🧪 PrimitiveTypeHandler 테스트
 */
export class PrimitiveHandlerTest {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private sourceFile: ts.SourceFile;

  constructor() {
    // 간단한 TypeScript 프로그램 생성
    const testCode = `
      type TestString = string;
      type TestNumber = number;
      type TestBoolean = boolean;
      type TestAny = any;
      type TestUnknown = unknown;
      type TestVoid = void;
      type TestNull = null;
      type TestUndefined = undefined;
    `;

    this.program = ts.createProgram(
      ["test.ts"],
      { target: ts.ScriptTarget.ES2022 },
      {
        getSourceFile: (fileName) => {
          if (fileName === "test.ts") {
            return ts.createSourceFile(
              "test.ts",
              testCode,
              ts.ScriptTarget.ES2022
            );
          }
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "",
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => "",
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
      }
    );

    this.checker = this.program.getTypeChecker();
    this.sourceFile = this.program.getSourceFile("test.ts")!;
  }

  /**
   * 🚀 전체 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log("🧪 Starting PrimitiveTypeHandler Tests...\n");

    try {
      // 1. 디버그 모드 활성화
      setGlobalDebugMode(true);

      // 2. 핸들러 등록
      this.testHandlerRegistration();

      // 3. 레지스트리 상태 확인
      this.testRegistryState();

      // 4. 각 원시 타입 테스트
      await this.testPrimitiveTypes();

      console.log("\n✅ All tests completed successfully!");
    } catch (error) {
      console.error("\n❌ Test failed:", error);
    }
  }

  /**
   * 📋 핸들러 등록 테스트
   */
  private testHandlerRegistration(): void {
    console.log("📋 Testing handler registration...");

    // PrimitiveTypeHandler 등록
    const primitiveHandler = new PrimitiveTypeHandler();
    registerHandler(primitiveHandler);

    console.log(`✅ Registered: ${primitiveHandler.name}`);
    console.log(`   Priority: ${primitiveHandler.priority}`);
  }

  /**
   * 📊 레지스트리 상태 확인
   */
  private testRegistryState(): void {
    console.log("\n📊 Testing registry state...");

    const info = getRegistryInfo();
    console.log(`   Handler count: ${info.handlerCount}`);
    console.log(`   Handlers:`, info.handlers);

    if (info.handlerCount === 0) {
      throw new Error("No handlers registered!");
    }
  }

  /**
   * 🎯 원시 타입들 테스트
   */
  private async testPrimitiveTypes(): Promise<void> {
    console.log("\n🎯 Testing primitive types...");

    const testCases = [
      { typeName: "string", expected: "string" },
      { typeName: "number", expected: "number" },
      { typeName: "boolean", expected: "boolean" },
      { typeName: "any", expected: "any" },
      { typeName: "unknown", expected: "unknown" },
      { typeName: "void", expected: "void" },
      { typeName: "null", expected: "null" },
      { typeName: "undefined", expected: "undefined" },
    ];

    const context = createTypeCreationContext(
      this.checker,
      this.program,
      this.sourceFile,
      { expanded: true, includeDebugInfo: true }
    );

    for (const testCase of testCases) {
      try {
        console.log(`\n   Testing ${testCase.typeName}...`);

        // TypeScript 타입 추출
        const tsType = this.getTypeByName(testCase.typeName);
        if (!tsType) {
          console.log(`   ⚠️ Could not find type: ${testCase.typeName}`);
          continue;
        }

        // TypeNode 변환
        const typeNode = convertToTypeNode(tsType, undefined, context);

        // 결과 검증
        this.verifyTypeNode(typeNode, testCase.expected, testCase.typeName);
      } catch (error) {
        console.log(`   ❌ ${testCase.typeName} failed:`, error);
      }
    }
  }

  /**
   * 🔍 타입 이름으로 TypeScript 타입 찾기
   */
  private getTypeByName(typeName: string): ts.Type | null {
    try {
      // TypeScript의 내장 타입들 가져오기
      switch (typeName) {
        case "string":
          return this.checker.getStringType();
        case "number":
          return this.checker.getNumberType();
        case "boolean":
          return this.checker.getBooleanType();
        case "any":
          return this.checker.getAnyType();
        case "unknown":
          return this.checker.getUnknownType();
        case "void":
          return this.checker.getVoidType();
        case "null":
          return this.checker.getNullType();
        case "undefined":
          return this.checker.getUndefinedType();
        default:
          return null;
      }
    } catch (error) {
      console.log(`   ⚠️ Error getting type ${typeName}:`, error);
      return null;
    }
  }

  /**
   * ✅ TypeNode 검증
   */
  private verifyTypeNode(
    typeNode: any,
    expected: string,
    typeName: string
  ): void {
    console.log(`   📝 Result for ${typeName}:`, {
      kind: typeNode.kind,
      literal: typeNode.literal,
      metadata: {
        originalText: typeNode.metadata?.originalText,
        finalTypeString: typeNode.metadata?.finalTypeString,
        isBuiltin: typeNode.metadata?.isBuiltin,
      },
    });

    // 기본 검증
    if (typeNode.kind !== "primitive") {
      throw new Error(`Expected kind 'primitive', got '${typeNode.kind}'`);
    }

    if (typeNode.literal !== expected) {
      throw new Error(
        `Expected literal '${expected}', got '${typeNode.literal}'`
      );
    }

    if (!typeNode.metadata?.isBuiltin) {
      throw new Error(`Expected isBuiltin to be true`);
    }

    console.log(`   ✅ ${typeName} passed all checks!`);
  }
}

/**
 * 🚀 테스트 실행 함수
 */
export async function runPrimitiveHandlerTest(): Promise<void> {
  const test = new PrimitiveHandlerTest();
  await test.runAllTests();
}

// 모듈로 실행될 때 자동 테스트
if (require.main === module) {
  runPrimitiveHandlerTest().catch(console.error);
}
